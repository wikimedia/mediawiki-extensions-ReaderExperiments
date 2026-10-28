<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests\Unit\Experiments\SemanticSearch;

use MediaWiki\Config\HashConfig;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Hooks;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\SemanticSearchRequestInspector;
use MediaWiki\Output\OutputPage;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsManager;
use MediaWiki\User\User;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Hooks
 */
class SemanticSearchHooksTest extends MediaWikiUnitTestCase {
	private function newHooks( HashConfig $config ): Hooks {
		return new Hooks(
			$config,
			$this->createMock( UserOptionsManager::class ),
			$this->createMock( SemanticSearchRequestInspector::class )
		);
	}

	public function testOnSpecialPage_initListUnsetsWhenDisabled(): void {
		$config = new HashConfig( [
			'ReaderExperimentsSemanticSearchEnabled' => false,
		] );
		$hooks = $this->newHooks( $config );

		$list = [
			'Search' => 'SpecialSearch',
			'SemanticSearch' => 'SpecialSemanticSearch',
		];

		$hooks->onSpecialPage_initList( $list );

		$this->assertArrayNotHasKey( 'SemanticSearch', $list );
		$this->assertArrayHasKey( 'Search', $list );
	}

	public function testOnSpecialPage_initListKeepsWhenEnabled(): void {
		$config = new HashConfig( [
			'ReaderExperimentsSemanticSearchEnabled' => true,
		] );
		$hooks = $this->newHooks( $config );

		$list = [
			'Search' => 'SpecialSearch',
			'SemanticSearch' => 'SpecialSemanticSearch',
		];

		$hooks->onSpecialPage_initList( $list );

		$this->assertArrayHasKey( 'SemanticSearch', $list );
	}

	public function testOnGetPreferencesDoesNothingWhenDisabled(): void {
		$config = new HashConfig( [
			'ReaderExperimentsSemanticSearchEnabled' => false,
			'ReaderExperimentsSemanticSearchAllowOptIn' => true,
		] );
		$hooks = $this->newHooks( $config );

		$user = $this->createMock( User::class );
		$preferences = [];

		$hooks->onGetPreferences( $user, $preferences );

		$this->assertSame( [], $preferences );
	}

	public function testOnGetPreferencesDoesNothingWhenOptInNotAllowed(): void {
		$config = new HashConfig( [
			'ReaderExperimentsSemanticSearchEnabled' => true,
			'ReaderExperimentsSemanticSearchAllowOptIn' => false,
		] );
		$hooks = $this->newHooks( $config );

		$user = $this->createMock( User::class );
		$preferences = [];

		$hooks->onGetPreferences( $user, $preferences );

		$this->assertSame( [], $preferences );
	}

	public function testOnGetPreferencesAddsPreferenceWhenEnabledAndOptInAllowed(): void {
		$config = new HashConfig( [
			'ReaderExperimentsSemanticSearchEnabled' => true,
			'ReaderExperimentsSemanticSearchAllowOptIn' => true,
		] );
		$hooks = $this->newHooks( $config );

		$user = $this->createMock( User::class );
		$preferences = [];

		$hooks->onGetPreferences( $user, $preferences );

		$msgKey = 'readerexperiments-semanticsearch-preference-semanticsearch-label';
		$this->assertArrayHasKey( 'search-special-page', $preferences );
		$this->assertSame( 'select', $preferences['search-special-page']['type'] );
		$this->assertSame(
			'SemanticSearch',
			$preferences['search-special-page']['options-messages'][$msgKey]
		);
	}

	public function testOnGetPreferencesAppendsToExistingSelectPreference(): void {
		$config = new HashConfig( [
			'ReaderExperimentsSemanticSearchEnabled' => true,
			'ReaderExperimentsSemanticSearchAllowOptIn' => true,
		] );
		$hooks = $this->newHooks( $config );

		$user = $this->createMock( User::class );
		$preferences = [
			'search-special-page' => [
				'type' => 'select',
				'options-messages' => [
					'existing-label' => 'ExistingSearch',
				],
			],
		];

		$hooks->onGetPreferences( $user, $preferences );

		$msgKey = 'readerexperiments-semanticsearch-preference-semanticsearch-label';
		$this->assertSame(
			'ExistingSearch',
			$preferences['search-special-page']['options-messages']['existing-label']
		);
		$this->assertSame(
			'SemanticSearch',
			$preferences['search-special-page']['options-messages'][$msgKey]
		);
	}

	public function testOnBeforeInitializeDoesNothingWhenDisabled(): void {
		$config = new HashConfig( [
			'ReaderExperimentsSemanticSearchEnabled' => false,
		] );
		$hooks = $this->newHooks( $config );

		$title = $this->createMock( Title::class );
		$output = $this->createMock( OutputPage::class );
		$output->expects( $this->never() )->method( 'redirect' );
		$user = $this->createMock( User::class );
		$request = new FauxRequest();

		$hooks->onBeforeInitialize( $title, null, $output, $user, $request, 'index.php' );
	}
}
