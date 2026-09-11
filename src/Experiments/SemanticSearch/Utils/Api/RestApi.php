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
use MediaWiki\Rest\ResponseFactory;

class RestApi implements MediaWikiApi {
	public function __construct(
		private readonly string $host,
		private readonly string $path,
		private readonly string $languageCode,
	) {
	}

	public function supports( WebRequest $request ): bool {
		$url = $request->getRequestURL();
		$host = parse_url( $url, PHP_URL_HOST );

		return ( !$host || $host === $this->host ) &&
			preg_match( '/' . preg_quote( $this->path, '/' ) . '/', $url );
	}

	public function execute( WebRequest $request ): array {
		$services = MediaWikiServices::getInstance();
		$context = RequestContext::getMain();
		$requestData = new RequestData( [
			'uri' => new Uri( $request->getRequestURL() ),
			'queryParams' => $request->getQueryValuesOnly(),
			'postParams' => $request->getPostValues(),
		] );
		$textFormatters = [ new TextFormatter( $this->languageCode ) ];
		$responseFactory = new ResponseFactory( $textFormatters );
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
		$response = $router->execute( $requestData );
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
