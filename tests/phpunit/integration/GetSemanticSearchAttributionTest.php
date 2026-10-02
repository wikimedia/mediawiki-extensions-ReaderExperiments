<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests;

use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest\GetSemanticSearch;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\Exception;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\MediaWikiApi;
use MediaWiki\Language\Language;
use MediaWikiIntegrationTestCase;
use ReflectionMethod;

/**
 * Integration test (rather than unit) because buildSignalsApiUrl() relies on
 * Title::newFromText(), which needs MediaWikiServices.
 *
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest\GetSemanticSearch::fetchAttribution
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest\GetSemanticSearch::buildSignalsApiUrl
 */
class GetSemanticSearchAttributionTest extends MediaWikiIntegrationTestCase {

	/**
	 * Build a handler with a mocked MediaWikiApi and known local/external
	 * REST bases, bypassing the real constructor.
	 */
	private function newHandlerWithStubbedApi( string $externalRestBase ): array {
		$apiMock = $this->createMock( MediaWikiApi::class );
		$language = $this->createMock( Language::class );
		$language->method( 'getCode' )->willReturn( 'en' );

		$engine = new class( $apiMock, $language, $externalRestBase ) extends GetSemanticSearch {
			public function __construct(
				MediaWikiApi $api,
				Language $language,
				string $externalRestBase
			) {
				$this->mwApiRequest = $api;
				$this->contentLanguage = $language;
				$this->searchConfig = null;
				$this->localActionApiUrl = '/w/api.php';
				$this->localRestUrl = '/w/rest.php';
				$this->externalActionApiUrl = '';
				$this->externalRestApiUrl = $externalRestBase;
			}
		};

		return [ $engine, $apiMock ];
	}

	private function callFetchAttribution( GetSemanticSearch $engine, ?string $title ): ?array {
		$method = new ReflectionMethod( GetSemanticSearch::class, 'fetchAttribution' );
		return $method->invoke( $engine, $title );
	}

	public function testUsesLocalRestUrlAndExpandParam(): void {
		[ $engine, $apiMock ] = $this->newHandlerWithStubbedApi( '' );

		$apiMock->expects( $this->once() )->method( 'execute' )
			->willReturnCallback( function ( $request ) {
				$this->assertStringContainsString(
					'/w/rest.php/attribution/v0-beta/pages/Mars/signals',
					$request->getRequestURL()
				);
				$this->assertSame(
					[ 'expand' => [ 'trust_and_relevance' ] ],
					$request->getQueryValues()
				);
				return [
					'essential' => [ 'title' => 'Mars' ],
					'trust_and_relevance' => [
						'reference_count' => 666,
						'page_views' => 1984,
						'last_updated' => '2026-10-02T07:08:33Z',
					],
				];
			} );

		$attribution = $this->callFetchAttribution( $engine, 'Mars' );
		$this->assertSame( 666, $attribution['trust_and_relevance']['reference_count'] );
	}

	public function testExternalRestBaseUriIsUsedAsIs(): void {
		[ $engine, $apiMock ] = $this->newHandlerWithStubbedApi(
			'https://en.wikipedia.org/w/rest.php'
		);

		$apiMock->expects( $this->once() )->method( 'execute' )
			->willReturnCallback( function ( $request ) {
				$this->assertStringStartsWith(
					'https://en.wikipedia.org/w/rest.php/attribution/v0-beta/pages/Venus/signals',
					$request->getRequestURL()
				);
				// The local REST path must not leak into the external URL
				$this->assertStringNotContainsString( '/w/rest.php/w/rest.php', $request->getRequestURL() );
				return [ 'trust_and_relevance' => [ 'reference_count' => 7 ] ];
			} );

		$attribution = $this->callFetchAttribution( $engine, 'Venus' );
		$this->assertSame( 7, $attribution['trust_and_relevance']['reference_count'] );
	}

	public function testTitleIsDbKeyedAndUrlEncoded(): void {
		[ $engine, $apiMock ] = $this->newHandlerWithStubbedApi( '' );

		$apiMock->expects( $this->once() )->method( 'execute' )
			->willReturnCallback( function ( $request ) {
				// Spaces become underscores (DB key), parentheses are percent-encoded
				$this->assertStringContainsString(
					'/attribution/v0-beta/pages/Foo_Bar_%28thing%29/signals',
					$request->getRequestURL()
				);
				return [ 'trust_and_relevance' => [ 'reference_count' => 42 ] ];
			} );

		$attribution = $this->callFetchAttribution( $engine, 'Foo Bar (thing)' );
		$this->assertSame( 42, $attribution['trust_and_relevance']['reference_count'] );
	}

	public function testReturnsNullWhenApiThrows(): void {
		[ $engine, $apiMock ] = $this->newHandlerWithStubbedApi( '' );

		$apiMock->method( 'execute' )
			->willThrowException( new Exception( 'restapihandler-notfound' ) );

		$attribution = $this->callFetchAttribution( $engine, 'Nonexistent' );
		$this->assertNull( $attribution );
	}

	public function testReturnsNullWhenResponseContainsErrorKey(): void {
		[ $engine, $apiMock ] = $this->newHandlerWithStubbedApi( '' );

		$apiMock->method( 'execute' )->willReturn( [
			'errorKey' => 'rest-nonexistent-title',
			'messageTranslations' => [ 'en' => 'The specified page does not exist' ],
		] );

		$attribution = $this->callFetchAttribution( $engine, 'Nonexistent' );
		$this->assertNull( $attribution );
	}

	public function testReturnsNullForNullTitleWithoutCallingApi(): void {
		[ $engine, $apiMock ] = $this->newHandlerWithStubbedApi( '' );

		$apiMock->expects( $this->never() )->method( 'execute' );
		$attribution = $this->callFetchAttribution( $engine, null );
		$this->assertNull( $attribution );
	}

	public function testReturnsNullForInvalidTitleWithoutCallingApi(): void {
		[ $engine, $apiMock ] = $this->newHandlerWithStubbedApi( '' );

		$apiMock->expects( $this->never() )->method( 'execute' );
		// Illegal characters: Title::newFromText() returns null
		$attribution = $this->callFetchAttribution( $engine, '<invalid>' );
		$this->assertNull( $attribution );
	}

	public function testReturnsNullForEmptyTitleWithoutCallingApi(): void {
		[ $engine, $apiMock ] = $this->newHandlerWithStubbedApi( '' );

		$apiMock->expects( $this->never() )->method( 'execute' );
		$attribution = $this->callFetchAttribution( $engine, '' );
		$this->assertNull( $attribution );
	}
}
