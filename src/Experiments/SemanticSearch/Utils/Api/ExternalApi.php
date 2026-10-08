<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api;

use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Request\WebRequest;

readonly class ExternalApi implements ActionApi, RestApi {
	public function __construct(
		protected HttpRequestFactory $httpRequestFactory,
		protected string $baseUrl,
	) {
	}

	/**
	 * @throws Exception
	 */
	protected function getRequestUrl( WebRequest $request ): string {
		$url = $request->getRequestURL();
		$baseUrlParts = parse_url( $this->baseUrl );
		$requestUrlParts = parse_url( $url );

		// Request URL can't be relied on to have accurate query params
		// already if it was a manually created one and query params
		// were not supplied as part of the uri, but separately.
		$get = $request->getQueryValuesOnly();
		if ( $get ) {
			$requestUrlParts['query'] = http_build_query( $get );
		}

		// Sort query params; both comparison further down more reliable
		// and make cache hits more likely due to consistent url patterns
		$sortQuery = static function ( string $query ): string {
			parse_str( $query, $array );
			ksort( $array );
			return http_build_query( $array );
		};
		if ( isset( $requestUrlParts['query'] ) ) {
			$requestUrlParts['query'] = $sortQuery( $requestUrlParts['query'] );
		}
		if ( isset( $baseUrlParts['query'] ) ) {
			$baseUrlParts['query'] = $sortQuery( $baseUrlParts['query'] );
		}

		// Now build combined url, then make sure the base still matches,
		// i.e. request url does not conflict with base uri
		$parts = [ 'scheme', 'user', 'pass', 'host', 'port', 'path', 'query', 'fragment' ];
		foreach ( $parts as $part ) {
			if ( isset( $requestUrlParts[ $part ] ) ) {
				// Stop filling in gaps from baseUrl once later parts of
				// a URL have become available
				break;
			}
			if ( isset( $baseUrlParts[ $part ] ) ) {
				$requestUrlParts[ $part ] = $baseUrlParts[ $part ];
			}
		}
		$requestUrl = $this->buildUrlFromParts( $requestUrlParts );
		$baseUrl = $this->buildUrlFromParts( $baseUrlParts );
		if ( !str_starts_with( $requestUrl, $baseUrl ) ) {
			throw new Exception(
				"Request url ({$url}) conflicts with expected base url ({$this->baseUrl})"
			);
		}

		return $requestUrl;
	}

	protected function buildUrlFromParts( array $parts ): string {
		$scheme = isset( $parts['scheme'] ) && $parts['scheme'] ? $parts['scheme'] . '://' : '';
		$user = $parts['user'] ?? '';
		$pass = isset( $parts['pass'] ) && $parts['pass'] ? ':' . $parts['pass'] : '';
		$pass = ( $user || $pass ) ? "$pass@" : '';
		$host = $parts['host'] ?? '';
		$port = isset( $parts['port'] ) && $parts['port'] ? ':' . $parts['port'] : '';
		$path = $parts['path'] ?? '';
		$query = isset( $parts['query'] ) && $parts['query'] ? '?' . $parts['query'] : '';
		$fragment = isset( $parts['fragment'] ) && $parts['fragment'] ? '#' . $parts['fragment'] : '';

		return $scheme . $user . $pass . $host . $port . $path . $query . $fragment;
	}

	public function execute( WebRequest $request ): array {
		$requestUrl = $this->getRequestUrl( $request );
		$post = $request->getPostValues();

		$httpRequest = $this->httpRequestFactory->create(
			$requestUrl,
			[
				'method' => $request->getMethod(),
				'postData' => $post,
				'followRedirects' => true,
			],
			__METHOD__
		);
		$httpRequest->execute();
		if ( $httpRequest->getStatus() !== 200 ) {
			throw new Exception(
				$httpRequest->getContent()
			);
		}

		$data = $httpRequest->getContent();
		return json_decode( $data, true ) ?: [];
	}
}
