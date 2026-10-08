<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api;

use GuzzleHttp\Psr7\Uri;
use MediaWiki\Config\ServiceOptions;
use MediaWiki\Context\RequestContext;
use MediaWiki\MediaWikiServices;
use MediaWiki\Message\TextFormatter;
use MediaWiki\Request\WebRequest;
use MediaWiki\Rest\CorsUtils;
use MediaWiki\Rest\EntryPoint;
use MediaWiki\Rest\RequestData;

readonly class InternalRestApi implements RestApi {
	public function __construct(
		private string $host,
		private string $languageCode,
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

		$services = MediaWikiServices::getInstance();
		$context = RequestContext::getMain();
		$requestData = new RequestData( [
			'uri' => new Uri( $url ),
			'queryParams' => $request->getQueryValuesOnly(),
			'postParams' => $request->getPostValues(),
		] );
		$textFormatters = [ new TextFormatter( $this->languageCode ) ];
		$router = EntryPoint::createRouter(
			$services,
			$context,
			$requestData,
			$textFormatters,
			false,
			new CorsUtils(
				new ServiceOptions(
					CorsUtils::CONSTRUCTOR_OPTIONS,
					$services->getMainConfig()
				),
				$context->getUser(),
			)
		);

		// Also temporarily override original request so that invoked code that reaches
		// into e.g. RequestContext::getMain()->getRequest() rather than reading from
		// the $requestData passed in directly, at least gets to see the intended request
		$originalContext = RequestContext::getMain();
		$originalRequest = $originalContext->getRequest();
		$originalContext->setRequest( $request );

		$response = $router->execute( $requestData );

		$originalContext->setRequest( $originalRequest );

		$body = (string)$response->getBody();
		$data = json_decode( $body, true ) ?? [];
		if ( $response->getStatusCode() !== 200 ) {
			throw new Exception(
				$data['messageTranslations'][$this->languageCode] ??
				$data['message'] ??
				$data['httpReason'] ??
				'Unknown error'
			);
		}

		return $data;
	}
}
