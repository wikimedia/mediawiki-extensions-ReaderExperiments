<?php

use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\ActionApi;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\ExternalApi;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\InternalActionApi;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\InternalRestApi;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\RestApi;
use MediaWiki\MainConfigNames;
use MediaWiki\MediaWikiServices;

/** @phpcs-require-sorted-array */
return [
	'ReaderExperiments.SemanticSearch.Api.ActionApi' => static function ( MediaWikiServices $services ): ActionApi {
		$config = $services->getService( 'MainConfig' );
		$externalActionApiUrl = $config->get( 'ReaderExperimentsApiBaseUri' );

		if ( !$externalActionApiUrl ) {
			return $services->getService( 'ReaderExperiments.SemanticSearch.Api.InternalActionApi' );
		}

		return new ExternalApi(
			$services->getService( 'HttpRequestFactory' ),
			$externalActionApiUrl,
		);
	},
	// phpcs:ignore Generic.Files.LineLength.TooLong
	'ReaderExperiments.SemanticSearch.Api.InternalActionApi' => static function ( MediaWikiServices $services ): InternalActionApi {
		$config = $services->getService( 'MainConfig' );
		return new InternalActionApi(
			$config->get( MainConfigNames::ServerName ),
		);
	},
	// phpcs:ignore Generic.Files.LineLength.TooLong
	'ReaderExperiments.SemanticSearch.Api.InternalRestApi' => static function ( MediaWikiServices $services ): InternalRestApi {
		$config = $services->getService( 'MainConfig' );
		return new InternalRestApi(
			$config->get( MainConfigNames::ServerName ),
			$config->get( MainConfigNames::LanguageCode ),
		);
	},
	'ReaderExperiments.SemanticSearch.Api.RestApi' => static function ( MediaWikiServices $services ): RestApi {
		$config = $services->getService( 'MainConfig' );
		$externalRestApiUrl = $config->get( 'ReaderExperimentsRestApiBaseUri' );

		if ( !$externalRestApiUrl ) {
			return $services->getService( 'ReaderExperiments.SemanticSearch.Api.InternalRestApi' );
		}

		return new ExternalApi(
			$services->getService( 'HttpRequestFactory' ),
			$externalRestApiUrl,
		);
	},
];
