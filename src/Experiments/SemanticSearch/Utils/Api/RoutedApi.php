<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api;

use MediaWiki\Request\WebRequest;

class RoutedApi implements MediaWikiApi {
	/**
	 * @param MediaWikiApi[] $apis
	 */
	public function __construct(
		private readonly array $apis,
	) {
	}

	public function supports( WebRequest $request ): bool {
		foreach ( $this->apis as $api ) {
			if ( $api->supports( $request ) ) {
				return true;
			}
		}

		return false;
	}

	public function execute( WebRequest $request ): array {
		foreach ( $this->apis as $api ) {
			if ( $api->supports( $request ) ) {
				return $api->execute( $request );
			}
		}

		throw new Exception( 'Request not supported' );
	}
}
