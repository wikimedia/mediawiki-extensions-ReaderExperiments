<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests\Integration\Experiments\SemanticSearch\Rest;

use MediaWiki\Config\Config;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest\GetSemanticSearch;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\ActionApi;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\Exception;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\RestApi;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\SemanticSearchRequestInspector;
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
	private function newHandler(): array {
		$actionApiMock = $this->createMock( ActionApi::class );
		$restApiMock = $this->createMock( RestApi::class );
		$inspectorMock = $this->createMock( SemanticSearchRequestInspector::class );
		$languageMock = $this->createMock( Language::class );
		$languageMock->method( 'getCode' )->willReturn( 'en' );
		$configMock = $this->createMock( Config::class );
		$configMock
			->method( 'get' )
			->willReturnCallback( static fn ( $key ) => $key === 'RestPath' ? '/w/rest.php' : '' );

		$engine = new GetSemanticSearch(
			$actionApiMock,
			$restApiMock,
			$configMock,
			$languageMock,
			$inspectorMock
		);

		return [ $engine, $actionApiMock, $restApiMock ];
	}

	private function callFetchAttribution( GetSemanticSearch $engine, ?string $title ): ?array {
		$method = new ReflectionMethod( GetSemanticSearch::class, 'fetchAttribution' );
		return $method->invoke( $engine, $title );
	}

	public function testUsesLocalRestUrlAndExpandParam(): void {
		[ $engine, , $restApiMock ] = $this->newHandler();

		$restApiMock->expects( $this->once() )->method( 'execute' )
			->willReturnCallback( function ( $request ) {
				$this->assertSame(
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
						'contributor_counts' => [ 'total_unique' => 100 ],
						'reference_count' => 666,
						'page_views' => 1984,
						'last_updated' => '2026-10-02T07:08:33Z',
					],
				];
			} );

		$attribution = $this->callFetchAttribution( $engine, 'Mars' );
		$this->assertSame( 666, $attribution['trust_and_relevance']['reference_count'] );
		$this->assertSame( 100, $attribution['trust_and_relevance']['contributor_counts']['total_unique'] );
	}

	public function testTitleIsDbKeyedAndUrlEncoded(): void {
		[ $engine, , $restApiMock ] = $this->newHandler();

		$restApiMock->expects( $this->once() )->method( 'execute' )
			->willReturnCallback( function ( $request ) {
				// Spaces become underscores (DB key), parentheses are percent-encoded
				$this->assertStringContainsString(
					'/attribution/v0-beta/pages/Foo_Bar_%28thing%29/signals',
					$request->getRequestURL()
				);
				return [ 'trust_and_relevance' => [
					'reference_count' => 42,
					'contributor_counts' => [ 'total_unique' => 50 ] ]
				];
			} );

		$attribution = $this->callFetchAttribution( $engine, 'Foo Bar (thing)' );
		$this->assertSame( 42, $attribution['trust_and_relevance']['reference_count'] );
		$this->assertSame( 50, $attribution['trust_and_relevance']['contributor_counts']['total_unique'] );
	}

	public function testReturnsNullWhenApiThrows(): void {
		[ $engine, , $restApiMock ] = $this->newHandler();

		$restApiMock->method( 'execute' )
			->willThrowException( new Exception( 'restapihandler-notfound' ) );

		$attribution = $this->callFetchAttribution( $engine, 'Nonexistent' );
		$this->assertNull( $attribution );
	}

	public function testReturnsNullWhenResponseContainsErrorKey(): void {
		[ $engine, , $restApiMock ] = $this->newHandler();

		$restApiMock->method( 'execute' )->willReturn( [
			'errorKey' => 'rest-nonexistent-title',
			'messageTranslations' => [ 'en' => 'The specified page does not exist' ],
		] );

		$attribution = $this->callFetchAttribution( $engine, 'Nonexistent' );
		$this->assertNull( $attribution );
	}

	public function testReturnsNullForNullTitleWithoutCallingApi(): void {
		[ $engine, , $restApiMock ] = $this->newHandler();

		$restApiMock->expects( $this->never() )->method( 'execute' );
		$attribution = $this->callFetchAttribution( $engine, null );
		$this->assertNull( $attribution );
	}

	public function testReturnsNullForInvalidTitleWithoutCallingApi(): void {
		[ $engine, , $restApiMock ] = $this->newHandler();

		$restApiMock->expects( $this->never() )->method( 'execute' );
		// Illegal characters: Title::newFromText() returns null
		$attribution = $this->callFetchAttribution( $engine, '<invalid>' );
		$this->assertNull( $attribution );
	}

	public function testReturnsNullForEmptyTitleWithoutCallingApi(): void {
		[ $engine, , $restApiMock ] = $this->newHandler();

		$restApiMock->expects( $this->never() )->method( 'execute' );
		$attribution = $this->callFetchAttribution( $engine, '' );
		$this->assertNull( $attribution );
	}
}
