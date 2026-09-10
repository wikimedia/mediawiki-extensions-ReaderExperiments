<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests;

use MediaWiki\Context\IContextSource;
use MediaWiki\Extension\ReaderExperiments\Experiments\MinervaCompactLead\Hooks;
use MediaWiki\Message\Message;
use MediaWiki\Output\OutputPage;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Skin\Skin;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use MediaWikiUnitTestCase;
use MobileContext;
use MobileFrontend\Transforms\QuickFactsTransform;
use Wikimedia\Parsoid\Core\DOMCompat;
use Wikimedia\Parsoid\Ext\DOMUtils;

/**
 * @group ReaderExperiments
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\MinervaCompactLead\Hooks
 */
class MinervaCompactLeadHooksTest extends MediaWikiUnitTestCase {

	/**
	 * @dataProvider provideGroups
	 */
	public function testAssignedFeatures( string $group, bool $lead, bool $infobox, bool $isParsoid ): void {
		if ( !class_exists( QuickFactsTransform::class ) || !class_exists( MobileContext::class ) ) {
			$this->markTestSkipped( 'MobileFrontend with QuickFactsTransform is required.' );
		}
		$html = '<div class="mw-parser-output"><section data-mw-section-id="0">'
			. '<p>Article lead</p><table class="infobox"><tr><td>Facts</td></tr></table>'
			. '</section><section data-mw-section-id="1"><h2>History</h2></section></div>';
		if ( !$isParsoid ) {
			$html = '<div class="mw-parser-output"><section id="mf-section-0">'
				. '<p>Article lead</p><table class="infobox"><tr><td>Facts</td></tr></table>'
				. '</section><div class="mw-heading mw-heading2"><h2>History</h2></div>'
				. '<section id="mf-section-1" class="collapsible-block"><p>History text</p></section></div>';
		}
		$config = [];
		$title = $this->createMock( Title::class );
		$title->method( 'getNamespace' )->willReturn( NS_MAIN );
		$title->method( 'isMainPage' )->willReturn( false );
		$user = $this->createMock( User::class );
		$user->method( 'isAnon' )->willReturn( true );
		$skin = $this->createMock( Skin::class );
		$skin->method( 'getSkinName' )->willReturn( 'minerva' );
		$skin->method( 'getUser' )->willReturn( $user );
		$context = $this->createMock( IContextSource::class );
		$context->method( 'getActionName' )->willReturn( 'view' );
		$message = $this->createMock( Message::class );
		$message->method( 'text' )->willReturn( 'Quick facts' );
		$out = $this->createMock( OutputPage::class );
		$out->method( 'getTitle' )->willReturn( $title );
		$out->method( 'getRequest' )->willReturn( new FauxRequest( [
			'mpo' => 'minerva-compact-lead:' . $group
		] ) );
		$out->method( 'getContext' )->willReturn( $context );
		$out->method( 'isArticle' )->willReturn( true );
		$out->method( 'msg' )->willReturn( $message );
		$out->method( 'getHTML' )->willReturn( $html );
		$out->method( 'addHTML' )->willReturnCallback( static function ( $value ) use ( &$html ) {
			$html = $value;
		} );
		$out->method( 'addJsConfigVars' )->willReturnCallback( static function ( $key, $value ) use ( &$config ) {
			$config[$key] = $value;
		} );
		$out->expects( $this->once() )->method( 'addModules' )
			->with( 'ext.readerExperiments/minervaCompactLead' );
		$out->expects( $infobox ? $this->once() : $this->never() )
			->method( 'addModuleStyles' )->with( 'mobile.quickFacts.styles' );
		$out->expects( $infobox ? $this->once() : $this->never() )->method( 'clearHTML' );
		$mobile = $this->createMock( MobileContext::class );
		$mobile->method( 'shouldDisplayMobileView' )->willReturn( true );

		( new Hooks( null, $mobile ) )->onBeforePageDisplay( $out, $skin );

		$this->assertSame( $lead, $config['wgMinervaTruncateLeadSection'] );
		$this->assertSame( $group, $config['wgReaderExperimentsMinervaCompactLead']['group'] );
		$body = DOMCompat::getBody( DOMUtils::parseHTML( $html ) );
		$this->assertSame( $infobox, DOMCompat::querySelector( $body, '.mf-quick-facts .infobox' ) !== null );
		$this->assertSame(
			!$infobox,
			DOMCompat::querySelector( $body,
				'section[data-mw-section-id="0"] .infobox, section#mf-section-0 .infobox' ) !== null
		);
		$this->assertNotNull( DOMCompat::querySelector( $body,
			$isParsoid ? 'section[data-mw-section-id="1"]' : 'section#mf-section-1' ) );
		if ( $infobox ) {
			$heading = DOMCompat::querySelector( $body, '#mf-quick-facts' );
			$this->assertNotNull( $heading );
			$this->assertSame( $isParsoid ? 'section' : 'div', $heading->parentNode->parentNode->localName );
		}
	}

	public static function provideGroups(): iterable {
		foreach ( [ 'parsoid' => true, 'legacy' => false ] as $parser => $isParsoid ) {
			yield "$parser control" => [ 'control', false, false, $isParsoid ];
			yield "$parser lead" => [ 'trunc-lead', true, false, $isParsoid ];
			yield "$parser both" => [ 'trunc-lead-infobox', true, true, $isParsoid ];
		}
	}
}
