<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api;

use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Request\WebRequest;

class ExternalApi implements MediaWikiApi {
	public function __construct(
		private readonly HttpRequestFactory $httpRequestFactory,
	) {
	}

	public function supports( WebRequest $request ): bool {
		return true;
	}

	public function execute( WebRequest $request ): array {
		$get = $request->getQueryValuesOnly();
		$post = $request->getPostValues();
		$url = $request->getRequestURL();
		$parts = parse_url( $url );

		// Request URL can't be relied on to have accurate query params
		// already if it was a manually created one and query params
		// were not supplied as part of the uri, but separately.
		// Let's erase any query params that may be present and put
		// available params into the url.
		if ( isset( $parts['query'] ) ) {
			$url = str_replace( '?' . $parts['query'], '', $url );
		}
		$url = preg_replace( '/(#|$)/', '?' . http_build_query( $get ) . '$1', $url, 1 );

		$httpRequest = $this->httpRequestFactory->create(
			$url,
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
