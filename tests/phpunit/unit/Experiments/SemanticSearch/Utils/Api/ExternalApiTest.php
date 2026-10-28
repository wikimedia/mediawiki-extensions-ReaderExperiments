<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests\Unit\Experiments\SemanticSearch\Utils\Api;

use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\Exception;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\ExternalApi;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Request\WebRequest;
use MediaWikiUnitTestCase;

/**
 * @coversDefaultClass \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\ExternalApi
 */
class ExternalApiTest extends MediaWikiUnitTestCase {
	public function provideGetRequestUrl(): array {
		return [
			// conflicting uri information yields error
			'different protocol' => [
				'http://en.wikipedia.org/w/api.php',
				'https://en.wikipedia.org/w/api.php',
				// phpcs:ignore Generic.Files.LineLength.TooLong
				new Exception( 'Request url (https://en.wikipedia.org/w/api.php) conflicts with expected base url (http://en.wikipedia.org/w/api.php)' ),
			],
			'different user/pass' => [
				'https://user:pass@en.wikipedia.org/w/api.php',
				'https://other:auth@en.wikipedia.org/w/api.php',
				// phpcs:ignore Generic.Files.LineLength.TooLong
				new Exception( 'Request url (https://other:auth@en.wikipedia.org/w/api.php) conflicts with expected base url (https://user:pass@en.wikipedia.org/w/api.php)' ),
			],
			'different host' => [
				'https://en.wikipedia.org/w/api.php',
				'https://fr.wikipedia.org/w/api.php',
				// phpcs:ignore Generic.Files.LineLength.TooLong
				new Exception( 'Request url (https://fr.wikipedia.org/w/api.php) conflicts with expected base url (https://en.wikipedia.org/w/api.php)' ),
			],
			'different port' => [
				'https://en.wikipedia.org:80/w/api.php',
				'https://fr.wikipedia.org:8080/w/api.php',
				// phpcs:ignore Generic.Files.LineLength.TooLong
				new Exception( 'Request url (https://fr.wikipedia.org:8080/w/api.php) conflicts with expected base url (https://en.wikipedia.org:80/w/api.php)' ),
			],
			'different path' => [
				'https://en.wikipedia.org/w/api.php',
				'https://en.wikipedia.org/w/rest.php',
				// phpcs:ignore Generic.Files.LineLength.TooLong
				new Exception( 'Request url (https://en.wikipedia.org/w/rest.php) conflicts with expected base url (https://en.wikipedia.org/w/api.php)' ),
			],
			'different query' => [
				'https://en.wikipedia.org/w/api.php?one=one',
				'https://en.wikipedia.org/w/api.php?one=two',
				// phpcs:ignore Generic.Files.LineLength.TooLong
				new Exception( 'Request url (https://en.wikipedia.org/w/api.php?one=two) conflicts with expected base url (https://en.wikipedia.org/w/api.php?one=one)' ),
			],

			// missing uri information is rejected if earlier part was provided
			'missing user/pass' => [
				'https://user:pass@en.wikipedia.org',
				'https://en.wikipedia.org',
				// phpcs:ignore Generic.Files.LineLength.TooLong
				new Exception( 'Request url (https://en.wikipedia.org) conflicts with expected base url (https://user:pass@en.wikipedia.org)' ),
			],
			'missing host' => [
				'https://en.wikipedia.org',
				'https:',
				// phpcs:ignore Generic.Files.LineLength.TooLong
				new Exception( 'Request url (https:) conflicts with expected base url (https://en.wikipedia.org)' ),
			],
			'missing port' => [
				'https://en.wikipedia.org:80',
				'https://en.wikipedia.org',
				// phpcs:ignore Generic.Files.LineLength.TooLong
				new Exception( 'Request url (https://en.wikipedia.org) conflicts with expected base url (https://en.wikipedia.org:80)' ),
			],
			'missing path' => [
				'https://en.wikipedia.org/w/api.php?one=one',
				'https://en.wikipedia.org/w/api.php',
				// phpcs:ignore Generic.Files.LineLength.TooLong
				new Exception( 'Request url (https://en.wikipedia.org/w/api.php) conflicts with expected base url (https://en.wikipedia.org/w/api.php?one=one)' ),
			],
			'missing query' => [
				'https://en.wikipedia.org/w/api.php?one=one',
				'https://en.wikipedia.org/w/api.php#fragment',
				// phpcs:ignore Generic.Files.LineLength.TooLong
				new Exception( 'Request url (https://en.wikipedia.org/w/api.php#fragment) conflicts with expected base url (https://en.wikipedia.org/w/api.php?one=one)' ),
			],

			// omitted uri information is filled in up to the first given part
			'omitted protocol' => [
				'https://en.wikipedia.org',
				'//en.wikipedia.org/w/api.php',
				'https://en.wikipedia.org/w/api.php',
			],
			'omitted user/pass/host/port' => [
				'https://user:pass@en.wikipedia.org:80',
				'/w/api.php',
				'https://user:pass@en.wikipedia.org:80/w/api.php',
			],
			'omitted path' => [
				'https://en.wikipedia.org/w/api.php',
				'?one=one',
				'https://en.wikipedia.org/w/api.php?one=one',
			],
			'omitted query' => [
				'https://en.wikipedia.org/w/api.php?one=one',
				'#fragment',
				'https://en.wikipedia.org/w/api.php?one=one#fragment',
			],

			// incomplete but matching base part is accepted
			'incomplete path' => [
				'https://en.wikipedia.org/w/rest.php',
				'/w/rest.php/path/to/rest/endpoint',
				'https://en.wikipedia.org/w/rest.php/path/to/rest/endpoint',
			],
			'incomplete query' => [
				'https://en.wikipedia.org/w/rest.php?one=one',
				'?one=one&two=two',
				'https://en.wikipedia.org/w/rest.php?one=one&two=two',
			],

			// query params are reordered alphabetically
			'reordered query' => [
				'https://en.wikipedia.org/w/rest.php',
				'?one=one&two=two&three=three',
				'https://en.wikipedia.org/w/rest.php?one=one&three=three&two=two',
			],
			'differently ordered query' => [
				'https://en.wikipedia.org/w/rest.php?three=three&one=one&two=two',
				'?one=one&two=two&three=three',
				'https://en.wikipedia.org/w/rest.php?one=one&three=three&two=two',
			],
		];
	}

	/**
	 * @dataProvider provideGetRequestUrl
	 * @covers ::getRequestUrl
	 * @covers ::buildUrlFromParts
	 */
	public function testGetRequestUrl(
		string $baseUrl,
		string $requestUrl,
		\Exception|string $expect,
	) {
		$api = new readonly class ( $baseUrl ) extends ExternalApi {
			public function __construct( protected string $baseUrl ) {
			}

			public function getRequestUrl( WebRequest $request ): string {
				return parent::getRequestUrl( $request );
			}
		};

		$request = new FauxRequest();
		$request->setRequestURL( $requestUrl );

		if ( $expect instanceof Exception ) {
			$this->expectException( Exception::class );
			$this->expectExceptionMessage( $expect->getMessage() );
		}
		$url = $api->getRequestUrl( $request );
		if ( is_string( $url ) ) {
			$this->assertEquals( $expect, $url );
		}
	}
}
