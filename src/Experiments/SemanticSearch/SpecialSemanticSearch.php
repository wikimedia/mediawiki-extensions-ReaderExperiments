<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch;

use MediaWiki\Config\Config;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\Exception;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\RestApi;
use MediaWiki\Html\Html;
use MediaWiki\Html\TemplateParser;
use MediaWiki\MainConfigNames;
use MediaWiki\Message\Message;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Request\WebRequest;
use MediaWiki\Search\TitleMatcher;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsManager;

class SpecialSemanticSearch extends SpecialPage {
	public function __construct(
		private readonly RestApi $restApiRequest,
		private readonly Config $config,
		private readonly TitleMatcher $titleMatcher,
		private readonly UserOptionsManager $userOptionsManager,
		private readonly TemplateParser $templateParser = new TemplateParser( __DIR__ . '/templates' ),
		string $name = 'SemanticSearch'
	) {
		parent::__construct( $name );
	}

	public function isListed(): bool {
		return $this->config->get( 'ReaderExperimentsSemanticSearchAllowOptIn' );
	}

	public function getDescription(): Message {
		return $this->msg( 'readerexperiments-semanticsearch-title' );
	}

	protected function getGroupName(): string {
		return 'pages';
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subPage ) {
		$userLanguage = $this->getLanguage();

		// url & querystring params of this page, in tests this is sometimes unset
		$request = $this->getRequest();
		$url = $request instanceof FauxRequest && !$request->hasRequestURL() ? null : $request->getRequestURL();

		// Discard query param keys or values that are not strings to sanitize before using
		$queryParams = array_filter( $request->getValues(), static function ( $v, $k ) {
			return is_string( $k ) && is_string( $v );
		}, ARRAY_FILTER_USE_BOTH );

		$term = str_replace( "\n", ' ', $request->getText( 'search' ) );
		$redirectUrl = $this->findExactMatchRedirectUrl( $request, $term );
		if ( $redirectUrl !== null ) {
			$this->getOutput()->redirect( $redirectUrl );
			return;
		}

		$requestedNamespaces = $this->getRequestedNamespaces( $queryParams );
		$namespaces = $requestedNamespaces ?: [ NS_MAIN ];
		$sort = $request->getText( 'sort', 'relevance' );
		$limit = $request->getText( 'limit' ) ? (int)$request->getText( 'limit' ) : 10;
		$currentContinue = (int)$request->getText( 'continue' );

		// Template params that allow rebuilding a form to (re)submit the same
		// search request (by iterating all existing params as hidden inputs)
		$mappedQueryParams = array_map( static function ( $key, $value ) {
			return [
				'key' => $key,
				'value' => $value,
				// Convenience for singling out individual params,
				// e.g. {{^isContinue}}
				'is' . ucfirst( $key ) => true,
			];
		}, array_keys( $queryParams ), array_values( $queryParams ) );

		$responses = [];
		try {
			$responses['lexical'] = $this->search(
				$term,
				[
					'type' => 'lexical',
					'namespace' => $namespaces,
					'limit' => $limit,
					'continue' => $currentContinue,
					'sort' => $sort,
					'uselang' => $userLanguage->getCode(),
				]
			);
		} catch ( Exception $e ) {
			$responses['lexical']['error'] = $e->getMessage();
		}
		// Only get a handful of semantic results, only on the first page
		$responses['semantic'] = [];
		if ( $currentContinue === 0 ) {
			try {
				$responses['semantic'] = $this->search(
					$term,
					[
						'type' => 'semantic',
						'namespace' => $namespaces,
						'limit' => 3,
						'continue' => 0,
						'sort' => $sort,
						'data' => [ 'referencecount' ],
						'uselang' => $userLanguage->getCode(),
					]
				);
			} catch ( Exception $e ) {
				$responses['semantic']['error'] = $e->getMessage();
			}
		}

		// Handle optional searchinfo that may be present in the API response:
		$nextContinue = $responses['lexical']['continue'] ?? null;
		$totalHits = $responses['lexical']['info']['totalhits'] ?? 0;
		$didYouMean = $responses['lexical']['info']['suggestion'] ?? null;

		$data = [
			'request' => [
				'queryParams' => $mappedQueryParams,
				'page' => $url,
				'term' => $term,
				'hasTerm' => $term !== '',
				'namespaces' => $namespaces,
				'sort' => $sort,
				'limit' => $limit,
				'continue' => $currentContinue,
				// Localised 'Special:Search' plus the namespaces the reader
				// asked for, so the frontend can rebuild the "switch to classic
				// search" link when the search term changes
				'specialSearchPage' => SpecialPage::getTitleFor( 'Search' )->getPrefixedText(),
				'requestedNamespaces' => $requestedNamespaces,
			],
			'response' => array_combine( [ 'lexical', 'semantic' ], array_map(
				fn ( $type ) => [
					'continue' => $responses[$type]['continue'] ?? null,
					'results' => array_map(
						fn ( $result ) => $this->getResultData( $result ),
						$responses[$type]['results'] ?? []
					),
					'info' => $responses[$type]['info'] ?? [],
					'error' => $responses[$type]['error'] ?? null,
					'warnings' => $responses[$type]['warnings'] ?? [],
				],
				[ 'lexical', 'semantic' ]
			) ),
			'output' => [
				'pagination' => $this->generatePaginationUrls( $queryParams, $limit, $currentContinue, $nextContinue ),
				'errorTitleText' => $this->msg( 'readerexperiments-semanticsearch-error-message' )->text(),
				'errorText' => $this->msg( 'readerexperiments-semanticsearch-error-text' )->text(),
				'errorMessageText' => $this->msg( 'readerexperiments-semanticsearch-search-button' )->text(),
				'searchButtonText' => $this->msg( 'readerexperiments-semanticsearch-search-button' )->text(),
				'searchPlaceholderText' => $this->msg( 'readerexperiments-semanticsearch-input-placeholder' )->text(),
				'continueText' => $this->msg( 'readerexperiments-semanticsearch-load-more-results' )->text(),
				'previousText' => $this->msg( 'readerexperiments-semanticsearch-load-less-results' )->text(),
				'noResultsText' => $this->msg( 'readerexperiments-semanticsearch-no-results' )->text(),
				'specialSearchUrl' => $this->generateSpecialSearchUrl( $term, $requestedNamespaces ),
				'switchToSpecialSearchText' => $this->msg(
					'readerexperiments-semanticsearch-switch-classic-search'
				)->text(),
				'didYouMeanText' => $didYouMean
					? $this->msg( 'readerexperiments-semanticsearch-did-you-mean' )->rawParams(
						Html::element(
							'a',
							[ 'href' => $this->generateSearchUrl( $didYouMean, $namespaces, $limit, $sort ) ],
							$didYouMean,
						),
					)->parse()
					: null,
				'resultsCountText' => $totalHits > 0
					? $this->msg(
						'readerexperiments-semanticsearch-results-count',
						$userLanguage->formatNum( $totalHits )
					)->text()
					: null,
			],
		];

		$this->getOutput()->addHTML(
			Html::rawElement(
				'span',
				[ 'id' => 'ext-readerExperiments-semanticsearch', 'class' => 'ext-readerExperiments-semanticsearch' ],
				$this->templateParser->processTemplate( 'SearchResultsPage', $data ) )
		);
		$this->getOutput()->addModuleStyles( [ 'codex-styles', 'ext.readerExperiments/semanticSearch.styles' ] );
		$this->getOutput()->addModules( [ 'ext.readerExperiments/semanticSearch' ] );
		$this->getOutput()->addJsConfigVars( [ 'semanticSearch' => $data ] );

		parent::execute( $subPage );
	}

	/**
	 * Route search requests through the REST /semanticsearch/v0/<term>
	 * endpoint, the same one that will be used on the frontend.
	 *
	 * @throws Exception
	 */
	private function search( string $term, array $data ): array {
		if ( !$term ) {
			return [
				'results' => [],
				'info' => [],
				'continue' => null,
				'warnings' => [],
			];
		}

		$request = new FauxRequest();
		$request->setParams( $data );
		$base = $this->config->get( MainConfigNames::RestPath );
		$request->setRequestURL( $base . '/semanticsearch/v0/' . rawurlencode( $term ) );

		return $this->restApiRequest->execute( $request );
	}

	/**
	 * Find an exact title match if there is one, and if we ought to redirect to it then
	 * return its url
	 *
	 * @see SpecialSearch.php
	 */
	private function findExactMatchRedirectUrl( WebRequest $request, string $term ): ?string {
		if ( $request->getCheck( 'noredirect' ) || $request->getCheck( 'continue' ) ) {
			// If noredirect/continue is set, then the user is searching directly on
			// this page, so do not redirect (the redirect should only happen when
			// the user searches from the site-wide searchbox)
			return null;
		}
		// If the term cannot be used to create a title then there is no match
		if ( Title::newFromText( $term ) === null ) {
			return null;
		}
		// Find an exact (or very near) match
		$title = $this->titleMatcher->getNearMatch( $term );
		if ( $title === null ) {
			return null;
		}
		$url = null;
		if ( !$this->getHookRunner()->onSpecialSearchGoResult( $term, $title, $url ) ) {
			return null;
		}

		if (
			// If there is a preference set to NOT redirect on exact page match
			// then return null (which prevents direction)
			!$this->redirectOnExactMatch()
			// BUT ...
			// ... ignore no-redirect preference if the exact page match is an interwiki link
			&& !$title->isExternal()
			// ... ignore no-redirect preference if the exact page match is NOT in the main
			// namespace AND there's a namespace in the search string
			&& !( $title->getNamespace() !== NS_MAIN && strpos( $term, ':' ) > 0 )
		) {
			return null;
		}

		return $url ?? $title->getFullUrlForRedirect();
	}

	private function redirectOnExactMatch(): bool {
		if ( !$this->getConfig()->get( 'SearchMatchRedirectPreference' ) ) {
			// If the preference for whether to redirect is disabled, use the default setting
			return (bool)$this->userOptionsManager->getDefaultOption(
				'search-match-redirect',
				$this->getUser()
			);
		} else {
			// Otherwise use the user's preference
			return $this->userOptionsManager->getBoolOption( $this->getUser(), 'search-match-redirect' );
		}
	}

	/**
	 * Namespaces explicitly requested via ns<N> query params, which may be
	 * empty. Kept separate from the NS_MAIN default applied by the caller:
	 * the link to Special:Search must only carry namespaces the reader
	 * actually asked for, so that it does not override the namespace
	 * preferences Special:Search would otherwise apply for them.
	 */
	private function getRequestedNamespaces( array $queryParams ): array {
		return array_reduce(
			array_keys( $queryParams ),
			static function ( array $result, $param ) {
				if ( preg_match( '/^ns([0-9]+)$/', $param, $matches ) ) {
					$result[] = (int)$matches[1];
				}
				return $result;
			},
			[]
		);
	}

	/**
	 * If the search API returns a suggested search, generate a clickable link
	 * that allows the user to run the suggested query immediately.
	 */
	private function generateSearchUrl( string $term, array $namespaces, int $limit, string $sort ): string {
		return $this->getPageTitle()->getLocalURL( [
			'search' => $term,
			...$this->buildNamespaceParams( $namespaces ),
			'limit' => $limit,
			'sort' => $sort,
			'noredirect' => '',
		] );
	}

	/**
	 * Generate a link back to Special:Search, prepopulated with the current
	 * search request, so users can switch to the classic search interface.
	 *
	 * Only the term and any explicitly requested namespaces are carried over.
	 * `limit` and `sort` deliberately are not: Special:Search prefers those
	 * params over the reader's own `searchlimit` preference and its default
	 * of 20 results, so forwarding ours would silently override both.
	 *
	 * This also deliberately does not carry over the `wprov` param, so that
	 * the routing mechanism (T438878), once merged, will treat following the
	 * link as manual navigation rather than a typeahead arrival.
	 */
	private function generateSpecialSearchUrl( string $term, array $namespaces ): string {
		return SpecialPage::getTitleFor( 'Search' )->getLocalURL( [
			'search' => $term,
			...$this->buildNamespaceParams( $namespaces ),
			// Without this, Special:Search redirects straight to an exact title
			// match instead of rendering its results page
			'fulltext' => 1,
		] );
	}

	/**
	 * Turn a list of namespace ids into the ns<N>=1 query params that both
	 * Special:SemanticSearch and Special:Search expect.
	 */
	private function buildNamespaceParams( array $namespaces ): array {
		return array_reduce(
			$namespaces,
			static fn ( array $params, int $namespace ): array => [ ...$params, "ns{$namespace}" => 1 ],
			[],
		);
	}

	private function generatePaginationUrls(
		array $queryParams,
		int $limit,
		int $currentContinue,
		?int $nextContinue
	): array {
		$links = [];

		if ( $currentContinue > 0 ) {
			$links['prev'] = $this->getPageTitle()->getLinkUrl(
				[ 'continue' => $currentContinue - $limit ] + $queryParams
			);
		}

		if ( $nextContinue !== null ) {
			$links['next'] = $this->getPageTitle()->getLinkUrl(
				[ 'continue' => $nextContinue ] + $queryParams
			);
		}

		return $links;
	}

	/**
	 * Return formatted data for an individual search result
	 *
	 * @param array $result
	 * @return array
	 */
	private function getResultData( array $result ): array {
		$userLanguage = $this->getLanguage();

		// Category info
		if ( isset( $result['categoryinfo'] ) ) {
			$categoryInfoParams = [
				$userLanguage->formatNum( $result['categoryinfo']['size'] ),
				$userLanguage->formatNum( $result['categoryinfo']['subcats'] ),
				$userLanguage->formatNum( $result['categoryinfo']['files'] )
			];
			$result += [
				'categoryInfoText' => $this->msg(
					'readerexperiments-semanticsearch-category-info',
					$categoryInfoParams
				)->text()
			];
		}

		// Namespace prefix
		$result['namespacePrefix'] = $result['ns'] === NS_MAIN ?
			null :
			$this->getContentLanguage()->getFormattedNsText( $result['ns'] );

		// Section
		$result['sectionText'] = isset( $result['sectiontitle'] ) ?
			$this->msg( 'readerexperiments-semanticsearch-match-section', $result['sectiontitle'] )->text() :
			null;

		// Redirect
		$result['redirectText'] = isset( $result['redirecttitle'] ) ?
			$this->msg( 'readerexperiments-semanticsearch-match-redirect', $result['redirecttitle'] )->text() :
			null;

		// Last edited date
		$result['lastEditedText'] = $userLanguage->timeanddate( $result['timestamp'] );

		// Formatted page size
		if ( isset( $result['size'] ) ) {
			$result['formattedPageSizeText'] = $userLanguage->formatSize( $result['size'] );
		}

		// Word count
		if ( isset( $result['wordcount'] ) ) {
			$result['wordcountText'] = $this->msg(
				'readerexperiments-semanticsearch-wordcount',
				$userLanguage->formatNum( $result['wordcount'] )
			)->text();
		}

		// Contributors
		// @todo

		// References
		if ( isset( $result['referencecount'] ) ) {
			$result['referencesText'] = $this->msg(
				'readerexperiments-semanticsearch-referencecount',
				$userLanguage->formatNum( $result['referencecount'] )
			)->text();
		}

		return $result;
	}
}
