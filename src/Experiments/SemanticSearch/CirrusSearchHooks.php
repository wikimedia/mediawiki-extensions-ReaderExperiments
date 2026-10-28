<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch;

use CirrusSearch\Hooks\CirrusSearchProfileServiceHook;
use CirrusSearch\Profile\SearchProfileService;
use MediaWiki\Config\Config;

class CirrusSearchHooks implements CirrusSearchProfileServiceHook {
	public function __construct( private readonly Config $config ) {
	}

	/**
	 * @inheritDoc
	 */
	public function onCirrusSearchProfileService( SearchProfileService $service ): void {
		if ( !$this->config->get( 'ReaderExperimentsSemanticSearchEnabled' ) ) {
			return;
		}

		$service->registerFileRepository(
			SearchProfileService::QUERY_DISPATCH,
			// this string is to prevent overwriting, not used for retrieval
			'semantic_search',
			__DIR__ . '/Search/QueryDispatchProfiles.config.php'
		);
	}
}
