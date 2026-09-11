<?php

use MediaWiki\Api\ApiMain;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\ActionApi;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\ExternalApi;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\RestApi;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\RoutedApi;
use MediaWiki\MainConfigNames;
use MediaWiki\MediaWikiServices;
use MediaWiki\Request\FauxRequest;

/** @phpcs-require-sorted-array */
return [
	'ReaderExperiments.SemanticSearch.Api.ActionApi' => static function ( MediaWikiServices $services ): ActionApi {
		$config = $services->getService( 'MainConfig' );
		return new ActionApi(
			$config->get( MainConfigNames::ServerName ),
			$config->get( MainConfigNames::ScriptPath ) . '/api.php',
			new ApiMain( new FauxRequest() ),
		);
	},
	'ReaderExperiments.SemanticSearch.Api.ExternalApi' => static function ( MediaWikiServices $services ): ExternalApi {
		return new ExternalApi(
			$services->getService( 'HttpRequestFactory' ),
		);
	},
	'ReaderExperiments.SemanticSearch.Api.RestApi' => static function ( MediaWikiServices $services ): RestApi {
		$config = $services->getService( 'MainConfig' );
		return new RestApi(
			$config->get( MainConfigNames::ServerName ),
			$config->get( MainConfigNames::RestPath ),
			$config->get( MainConfigNames::LanguageCode ),
		);
	},
	'ReaderExperiments.SemanticSearch.Api.RoutedApi' => static function ( MediaWikiServices $services ): RoutedApi {
		return new RoutedApi( [
			$services->getService( 'ReaderExperiments.SemanticSearch.Api.ActionApi' ),
			$services->getService( 'ReaderExperiments.SemanticSearch.Api.RestApi' ),
			$services->getService( 'ReaderExperiments.SemanticSearch.Api.ExternalApi' ),
		] );
	},
];
