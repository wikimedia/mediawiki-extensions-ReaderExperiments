<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api;

use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Request\WebRequest;

readonly class InternalActionApi implements ActionApi {
	public function __construct(
		private string $host,
	) {
	}

	public function execute( WebRequest $request ): array {
		// Sanity check: *if* a host is provided, it must match
		$url = $request->getRequestURL();
		$host = parse_url( $url, PHP_URL_HOST );
		if ( $host && $host !== $this->host ) {
			throw new Exception(
				"Request url ({$url}) conflicts with internal host ({$this->host})"
			);
		}

		$originalContext = RequestContext::getMain();
		$originalRequest = $originalContext->getRequest();

		$context = new DerivativeContext( $originalContext );
		$context->setRequest( $request );

		// Also temporarily override original request so that invoked code that reaches
		// into e.g. RequestContext::getMain()->getRequest() rather than reading from
		// the API's context directly, at least gets to see the intended request
		$originalContext->setRequest( $request );

		try {
			$api = new ApiMain( internal: true );
			$api->setContext( $context );
			$api->execute();
			$data = $api->getResult()->getResultData( [], [ 'Strip' => 'all' ] );
			$originalContext->setRequest( $originalRequest );
			return $data;
		} catch ( ApiUsageException $e ) {
			$originalContext->setRequest( $originalRequest );
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
