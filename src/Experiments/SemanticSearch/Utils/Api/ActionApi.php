<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Request\WebRequest;

class ActionApi implements MediaWikiApi {
	public function __construct(
		private readonly string $host,
		private readonly string $path,
		private readonly ApiBase $api,
	) {
	}

	public function supports( WebRequest $request ): bool {
		$url = $request->getRequestURL();
		$host = parse_url( $url, PHP_URL_HOST );

		return ( !$host || $host === $this->host ) &&
			preg_match( '/' . preg_quote( $this->path, '/' ) . '/', $url );
	}

	public function execute( WebRequest $request ): array {
		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setRequest( $request );

		try {
			$this->api->setContext( $context );
			$this->api->execute();
			return $this->api->getResult()->getResultData( [], [ 'Strip' => 'all' ] );
		} catch ( ApiUsageException $e ) {
			throw new Exception(
				// We are executing the API in internal mode which means there's no error
				// handling for us, ergo, the API would directly throw ApiUsageException
				// when any non-good status object is returned from the search request.
				// Here, we catch that exception and turn it into a user error as it would
				// have been done by ApiMain if the search API request were to come
				// from a remote client.
				// See T379293 and its numerous subtasks and their duplicates.
				$e->getMessageObject()->parse(),
			);
		}
	}
}
