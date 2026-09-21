<?php

// TODO(image-carousel-retest): Remove this experiment-only file after the retest.
// Remove the hook registrations and modules listed in the experiment README too.

namespace MediaWiki\Extension\ReaderExperiments\Tests;

use MediaWiki\Extension\ReaderExperiments\Experiments\ImageCarouselRetest\Hooks;
use MediaWiki\Output\OutputPage;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Skin\Skin;
use MediaWiki\User\User;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\ImageCarouselRetest\Hooks
 */
class ImageCarouselRetestHooksTest extends MediaWikiUnitTestCase {
	/** @dataProvider provideGroups */
	public function testSharedEligibilityHandoff( ?string $group, ?bool $expectedRender ): void {
		$out = $this->createMock( OutputPage::class );
		$skin = $this->createMock( Skin::class );
		$skin->method( 'getSkinName' )->willReturn( 'minerva' );
		$user = $this->createMock( User::class );
		$user->method( 'isAnon' )->willReturn( true );
		$out->method( 'getSkin' )->willReturn( $skin );
		$out->method( 'getUser' )->willReturn( $user );
		$out->method( 'getRequest' )->willReturn( new FauxRequest( $group === null ? [] : [
			'mpo' => 'image-carousel-retest:' . $group
		] ) );
		if ( $expectedRender !== null ) {
			$out->expects( $this->once() )->method( 'addModules' )
				->with( 'ext.readerExperiments.imageCarouselRetest.init' );
			$out->expects( $this->once() )->method( 'addJsConfigVars' )->with(
				'wgReaderExperimentsImageCarouselRetest',
				[ 'group' => $group, 'imageCount' => 4, 'pageEligible' => true ]
			);
		} else {
			$out->expects( $this->never() )->method( 'addModules' );
		}
		$render = false;
		$attributes = [];
		( new Hooks() )->onMultimediaViewerBeforeMobileCarousel( $out, 4, $render, $attributes );
		$this->assertSame( $expectedRender ?? false, $render );
		$this->assertSame( $expectedRender === true, isset( $attributes['data-mmv-defer-init'] ) );
	}

	public static function provideGroups(): array {
		return [
			[ null, null ],
			[ 'control', false ],
			[ 'vanilla-carousel', true ],
			[ 'carousel-captions-only', true ],
			[ 'carousel-jump-only', true ],
			[ 'carousel-captions-jump', true ],
			[ 'unknown', null ]
		];
	}
}
