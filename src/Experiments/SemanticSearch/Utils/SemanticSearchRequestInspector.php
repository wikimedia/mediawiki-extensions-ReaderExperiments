<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils;

use CirrusSearch\Parser\FullTextKeywordRegistry;
use CirrusSearch\SearchConfig;
use MediaWiki\Request\WebRequest;
use MediaWiki\Search\SearchEngine;

/**
 * Shared search request checks for the SemanticSearch experiment.
 *
 * Used by:
 * - Hooks::meetsQualification()
 * - GetSemanticSearch::isSupportedType()
 *
 * State is carried by a single CirrusSearch `SearchConfig` injected via the
 * constructor (`null` when CirrusSearch is not installed). The purely string
 * based checks (`wordCount()`, `hasQuestionWord()`, and the operator / boolean
 * part of `hasAdvancedSyntax()`) work regardless; keyword-prefix and
 * namespace-prefix checks are skipped (treated as absent) when no
 * SearchConfig is available.
 */
class SemanticSearchRequestInspector {
	/**
	 * The English question words that mark a query as conversational /
	 * natural-language (English is the only target language for the
	 * experiment).
	 *
	 * @var string[]
	 */
	public const QUESTION_WORDS = [ 'who', 'what', 'when', 'where', 'why', 'how' ];

	/**
	 * URL query parameters that disqualify the semantic search redirect,
	 * since they indicate the user has explicitly chosen advanced search configuration.
	 *
	 * fulltext, title, wprov, uselang, useskin, continue, and search
	 * are all considered "plain" search params and are NOT in this list.
	 *
	 * @var string[]
	 */
	public const array DISQUALIFYING_FILTER_PARAMS = [
		'profile',
		'sort',
		'offset',
		'prefix',
	];

	/**
	 * @param SearchConfig|null $searchConfig The CirrusSearch SearchConfig,
	 * or null when CirrusSearch is not installed.
	 */
	public function __construct( private readonly ?SearchConfig $searchConfig = null ) {
	}

	/**
	 * Counts words in a query term. Empty or whitespace-only terms return 0.
	 *
	 * Rough implementation that targets English only.
	 *
	 * @param string $term
	 * @return int
	 */
	public function wordCount( string $term ): int {
		// Alternatives:
		// - count( preg_split( '/\s+/', trim( $term ) ) )
		// - count( preg_split( '/[\w-]+/', trim( $term ) ) ) - 1
		return count( preg_split( '/\W+/', $term, flags: PREG_SPLIT_NO_EMPTY ) );
	}

	/**
	 * Whether a query term contains one of the English question words
	 * as a case-insensitive whole word, anywhere in the string.
	 *
	 * @param string $term
	 * @return bool
	 */
	public function hasQuestionWord( string $term ): bool {
		$pattern = '/\b(' . implode( '|', self::QUESTION_WORDS ) . ')\b/i';

		return (bool)preg_match( $pattern, $term );
	}

	/**
	 * Whether a query term contains advanced search syntax that semantic
	 * search can't handle.
	 *
	 * Keywords and Lucene/CirrusSearch operators:
	 * - keywords (insource:, incategory:, hastemplate:, filesize:, etc.),
	 *   optionally negated with - or !
	 * - wildcard (*)
	 * - boosting (^)
	 * - fuzzy / proximity search (~)
	 * - boolean (AND, OR, NOT)
	 *
	 * Ignore the following operators, since they can be common in natural language
	 * and can lead to false positives:
	 * - bare negations (-, !)
	 * - question mark wildcard (?)
	 * - exact match ("...")
	 * - grouping with parentheses ()
	 *
	 * @param string $term The query term.
	 * @param string[]|null $keywords The CirrusSearch keyword prefixes. When null,
	 *   the keywords from the inspector's own SearchConfig are used (an empty
	 *   list if none is available); the operator / boolean checks still apply
	 *   in that case.
	 * @return bool True when the query contains advanced logic.
	 */
	public function hasAdvancedSyntax( string $term, ?array $keywords = null ): bool {
		if ( $keywords === null ) {
			$keywords = $this->getSearchKeywords();
		}

		$quotedKeywords = array_map( 'preg_quote', $keywords );
		$pattern = '/'
			// Keywords
			. '(?<=^|\s)[-!]?(' . implode( '|', $quotedKeywords ) . '):\S+'
			// Wildcard, boosting, fuzzy / proximity
			. '|[*^~]'
			// Boolean operators
			. '|(?<=^|\s)(?:AND|OR|NOT)(?=$|\s)'
			. '/';

		return (bool)preg_match( $pattern, $term );
	}

	/**
	 * Returns the list of search keyword prefixes supported by CirrusSearch
	 * (e.g., insource, incategory, hastemplate), or an empty list when no
	 * SearchConfig is available.
	 *
	 * @return string[]
	 */
	public function getSearchKeywords(): array {
		if ( $this->searchConfig === null ) {
			return [];
		}

		$features = ( new FullTextKeywordRegistry( $this->searchConfig ) )->getKeywords();
		$keywords = [];
		foreach ( $features as $feature ) {
			$keywords = array_merge( $keywords, $feature->getKeywordPrefixes() );
		}

		return $keywords;
	}

	/**
	 * Whether a query term contains a namespace prefix other than NS_MAIN.
	 *
	 * Returns false if no SearchConfig is available.
	 *
	 * @param string $term The query term.
	 * @return bool
	 */
	public function hasNonMainNamespace( string $term ): bool {
		if ( $this->searchConfig === null ) {
			return false;
		}

		$namespacesInTerm = SearchEngine::parseNamespacePrefixes( $term, true, true );
		if (
			$namespacesInTerm &&
			( count( $namespacesInTerm[1] ) !== 1 || !in_array( NS_MAIN, $namespacesInTerm[1] ) )
		) {
			return true;
		}

		return false;
	}

	/**
	 * Whether a request URL carries any of the advanced
	 * query params defined in DISQUALIFYING_FILTER_PARAMS,
	 * or any namespace checkbox (ns<N>).
	 *
	 * @param WebRequest $request
	 * @return bool
	 */
	public function hasAdvancedSearchParams( WebRequest $request ): bool {
		$keys = array_keys( $request->getQueryValues() );
		foreach ( $keys as $key ) {
			if ( in_array( (string)$key, self::DISQUALIFYING_FILTER_PARAMS, true ) ) {
				return true;
			}

			if ( preg_match( '/^ns\d+$/', (string)$key ) ) {
				return true;
			}
		}

		return false;
	}
}
