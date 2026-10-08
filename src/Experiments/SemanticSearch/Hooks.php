<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch;

use MediaWiki\Config\Config;
use MediaWiki\Extension\ReaderExperiments\Common\FeatureFlagExperiment;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\SemanticSearchRequestInspector;
use MediaWiki\Extension\TestKitchen\Sdk\ExperimentManager;
use MediaWiki\Hook\BeforeInitializeHook;
use MediaWiki\Preferences\Hook\GetPreferencesHook;
use MediaWiki\Request\WebRequest;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsManager;

class Hooks implements GetPreferencesHook, BeforeInitializeHook {
	// TODO set up experiment on GrowthBook, update name as needed (T437394)
	public const EXPERIMENT_NAME = 'semantic-search-for-web';
	public const GROUP_CONTROL = 'control';
	public const GROUP_TREATMENT = 'hybrid-srp';
	/**
	 * Minimum number of words (whitespace-separated) the query term
	 * must have to qualify for the semantic search redirect.
	 * Queries with wordCount < MIN_QUERY_WORDS do not qualify.
	 */
	public const MIN_QUERY_WORDS = 5;

	public function __construct(
		private readonly Config $config,
		private readonly UserOptionsManager $userOptionsManager,
		private readonly SemanticSearchRequestInspector $inspector,
		private readonly ?ExperimentManager $experimentManager = null,
	) {
	}

	/**
	 * Experiment gating logic.
	 * The user is routed to Special:SemanticSearch if all the following criteria are met:
	 * - the user is logged out
	 * - the search request qualifies for semantic search, as per meetsQualification()
	 * - the user is enrolled into the experiment
	 *
	 * If the user has already been routed to Special:SemanticSearch
	 * or they directly landed on it, then prevent from jumping to Special:Search,
	 * and viceversa.
	 *
	 * @inheritDoc
	 */
	public function onBeforeInitialize(
		$title, $unused, $output, $user, $request, $mediaWikiEntryPoint
	): void {
		// The user is already on Special:SemanticSearch: don't jump to Special:Search.
		// The check is first in line, since it allows any user
		// to explicitly navigate to Special:SemanticSearch.
		// The typeahead search bar uses the `search-special-page` user option
		// as the form's target destination. The option won't persist for logged-out users
		// (we aren't saving it, and even if unrelated later code does so, it won't persist),
		// but that's fine: we only need to ensure that the
		// next request comes back to the same page.
		if ( $title->isSpecial( 'SemanticSearch' ) ) {
			$this->userOptionsManager->setOption( $user, 'search-special-page', 'SemanticSearch' );
			return;
		}

		// Only anonymous users eligible
		if ( $user->isRegistered() && !$user->isTemp() ) {
			return;
		}

		// Search request needs to match semantic search qualifications
		if ( !$this->meetsQualification( $request ) ) {
			return;
		}

		// Users need to be enrolled into the experiment
		if ( !$this->isEnrolled( $request ) ) {
			return;
		}

		// If the search request comes from the in-page form of Special:Search:
		// don't jump to Special:SemanticSearch.
		// These requests contain a `fulltext` query param: if present,
		// it's a clear sign that the user is already on Special:Search.
		if ( isset( $request->getQueryValuesOnly()['fulltext'] ) ) {
			return;
		}

		// If the search request initiates from Special:Search:
		// don't jump to Special:SemanticSearch.
		// Look into the referer header to achieve so.
		// Not bullet-proof, but enough for the experiment
		// (some browsers/extensions may strip the referer).
		$referer = $request->getHeader( 'REFERER' );
		$queryString = parse_url( $referer ?? '', PHP_URL_QUERY );
		parse_str( $queryString ?? '', $queryStringArray );
		if (
			isset( $queryStringArray['title'] ) &&
			Title::newFromText( $queryStringArray['title'] )->isSpecial( 'Search' )
		) {
			return;
		}

		// All eligibility criteria met: redirect to Special:SemanticSearch
		$output->redirect(
			$this->buildRedirectUrl( $request, 'SemanticSearch' )
		);
	}

	/**
	 * Whether the user is enrolled in any group of the experiment.
	 *
	 * Development note: the ?mpo experiment enrollment override won't work here,
	 * since the search request doesn't carry that URL parameter anymore.
	 * Use the HTTP header method instead, see
	 * https://wikitech.wikimedia.org/wiki/Test_Kitchen/Conduct_an_experiment#HTTP_header.
	 *
	 * @param WebRequest $request
	 * @return bool
	 */
	private function isEnrolled( WebRequest $request ): bool {
		$experiment = new FeatureFlagExperiment(
			$this->experimentManager,
			$request,
			self::EXPERIMENT_NAME
		);

		return $experiment->isAssignedGroup( self::GROUP_TREATMENT, self::GROUP_CONTROL );
	}

	/**
	 * Whether the current search request qualifies for the semantic redirect.
	 *
	 * All the following criteria must be true:
	 *   - the query term is non-empty
	 *   - it has >= MIN_QUERY_WORDS words
	 *     OR contains an English question word (who/what/when/where/why/how)
	 *   - the request URL does not carry any advanced filter params
	 *     (profile, sort, offset, prefix, ns<N>)
	 *   - the term does not contain a namespace prefix other than NS_MAIN
	 *   - the term does not carry advanced query logic
	 *     (CirrusSearch keywords, Lucene operators)
	 *
	 * @param WebRequest $request
	 * @return bool
	 */
	protected function meetsQualification( WebRequest $request ): bool {
		$term = trim( $request->getText( 'search' ) );

		if ( $term === '' ) {
			return false;
		}

		if (
			$this->inspector->wordCount( $term ) < self::MIN_QUERY_WORDS &&
			!$this->inspector->hasQuestionWord( $term )
		) {
			return false;
		}

		if ( $this->inspector->hasAdvancedSearchParams( $request ) ) {
			return false;
		}

		if ( $this->inspector->hasNonMainNamespace( $term ) ) {
			return false;
		}

		if ( $this->inspector->hasAdvancedSyntax( $term ) ) {
			return false;
		}

		return true;
	}

	/**
	 * Builds the redirect URL for the given search page target.
	 *
	 * Preserves the current request's relevant query params
	 * (?search, ?uselang, ?useskin, etc.);
	 * removes ?title, since it holds the initial target and can conflict with
	 * the given one. It is re-created in the redirect URL.
	 *
	 * Split out so that tests can stub it (SpecialPage::getTitleFor
	 * requires MediaWikiServices which are not available in pure unit
	 * tests).
	 *
	 * @param WebRequest $request
	 * @param string $target
	 * @return string
	 */
	protected function buildRedirectUrl( WebRequest $request, string $target ): string {
		$values = $request->getQueryValues();
		// On the first typeahead search, the ?title URL parameter carries the default target:
		// remove now and re-create later.
		unset( $values['title'] );
		// Drop array params: these are internal / form state
		// and shouldn't be reflected in a redirect URL.
		$params = array_filter( $values, static fn ( $v ) => is_scalar( $v ) );

		return SpecialPage::getTitleFor( $target )->getFullURL( $params );
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
