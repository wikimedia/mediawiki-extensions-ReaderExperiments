<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests\Integration\Experiments\SemanticSearch;

use MediaWiki\Config\HashConfig;
use MediaWiki\Exception\ErrorPageError;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\SpecialSemanticSearch;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\RestApi;
use MediaWiki\Search\TitleMatcher;
use MediaWiki\User\Options\UserOptionsManager;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\SpecialSemanticSearch
 */
class SpecialSemanticSearchTest extends MediaWikiIntegrationTestCase {
	private function newSpecialPage( array $configVars = [] ): SpecialSemanticSearch {
		$restApi = $this->createMock( RestApi::class );
		$config = new HashConfig( $configVars );
		$titleMatcher = $this->createMock( TitleMatcher::class );
		$userOptionsManager = $this->createMock( UserOptionsManager::class );

		return new SpecialSemanticSearch(
			$restApi,
			$config,
			$titleMatcher,
			$userOptionsManager
		);
	}

	public function testIsListedReturnsFalseWhenDisabled(): void {
		$page = $this->newSpecialPage( [
			'ReaderExperimentsSemanticSearchEnabled' => false,
			'ReaderExperimentsSemanticSearchAllowOptIn' => true,
		] );

		$this->assertFalse( $page->isListed() );
	}

	public function testIsListedReturnsFalseWhenEnabledWithoutOptIn(): void {
		$page = $this->newSpecialPage( [
			'ReaderExperimentsSemanticSearchEnabled' => true,
			'ReaderExperimentsSemanticSearchAllowOptIn' => false,
		] );

		$this->assertFalse( $page->isListed() );
	}

	public function testIsListedReturnsTrueWhenEnabledWithOptIn(): void {
		$page = $this->newSpecialPage( [
			'ReaderExperimentsSemanticSearchEnabled' => true,
			'ReaderExperimentsSemanticSearchAllowOptIn' => true,
		] );

		$this->assertTrue( $page->isListed() );
	}

	public function testExecuteThrowsErrorPageErrorWhenDisabled(): void {
		$page = $this->newSpecialPage( [
			'ReaderExperimentsSemanticSearchEnabled' => false,
		] );

		try {
			$page->execute( null );
			$this->fail( 'Expected ErrorPageError was not thrown' );
		} catch ( ErrorPageError $e ) {
			$this->assertSame( 'nosuchspecialpage', $e->title );
			$this->assertSame( 'nospecialpagetext', $e->msg );
		}
	}
}
