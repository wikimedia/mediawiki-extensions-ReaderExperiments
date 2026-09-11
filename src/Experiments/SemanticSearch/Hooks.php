<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch;

use MediaWiki\Config\Config;
use MediaWiki\Preferences\Hook\GetPreferencesHook;

class Hooks implements GetPreferencesHook {
	public function __construct(
		private readonly Config $config,
	) {
	}

	/**
	 * @inheritDoc
	 */
	public function onGetPreferences( $user, &$preferences ) {
		if ( !$this->config->get( 'ReaderExperimentsSemanticSearchAllowOptIn' ) ) {
			return;
		}

		if (
			isset( $preferences['search-special-page']['type'] ) &&
			$preferences['search-special-page']['type'] === 'select'
		) {
			// If preference already exists, just add to the list
			// phpcs:ignore Generic.Files.LineLength.TooLong
			$preferences['search-special-page']['options-messages']['readerexperiments-semanticsearch-preference-semanticsearch-label'] = 'SemanticSearch';
		} else {
			$preferences['search-special-page'] = [
				'type' => 'select',
				'section' => 'searchoptions/searchmisc',
				'label-message' => 'readerexperiments-semanticsearch-preference',
				'help-message' => 'readerexperiments-semanticsearch-preference-help',
				'options-messages' => [
					'readerexperiments-semanticsearch-preference-semanticsearch-label' => 'SemanticSearch',
					'readerexperiments-semanticsearch-preference-specialsearch-label' => 'Search',
				],
				'options-messages-parse' => true,
			];
		}
	}
}
