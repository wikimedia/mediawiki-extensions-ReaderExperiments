<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest;

use CirrusSearch\Parser\FullTextKeywordRegistry;
use CirrusSearch\SearchConfig;
use MediaWiki\Api\ApiBase;
use MediaWiki\Config\Config;
use MediaWiki\Config\ConfigException;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\Exception;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\MediaWikiApi;
use MediaWiki\Language\Language;
use MediaWiki\MainConfigNames;
use MediaWiki\MediaWikiServices;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Rest\Handler;
use MediaWiki\Rest\HttpException;
use MediaWiki\Rest\Response;
use MediaWiki\Search\SearchEngine;
use MediaWiki\Title\Title;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\ParamValidator\TypeDef\IntegerDef;

/**
 * Rest endpoint to provide the necessary data relevant to Special:SemanticSearch.
 * It's essentially just a pass-through to the action API search (wih a load of
 * props for additional data we'll want to enrich the output with), but given that
 * we'll be doing that both on frontend (snappy interactive experience) and backend
 * (no-JS fallback), this is being bundled in a single place to avoid duplication.
 *
 * GET /semanticsearch/v0/{term}
 */
class GetSemanticSearch extends Handler {
	// Public to enable testing
	public const TYPE_SEMANTIC = 'semantic';
	private const TYPE_LEXICAL = 'lexical';

	// Protected to enable testing
	protected ?SearchConfig $searchConfig = null;
	protected string $localActionApiUrl;
	protected string $localRestUrl;
	protected string $externalActionApiUrl;
	protected string $externalRestApiUrl;

	protected MediaWikiApi $mwApiRequest;
	protected Config $config;
	protected Language $contentLanguage;

	public function __construct(
		MediaWikiApi $mwApiRequest,
		Config $config,
		Language $contentLanguage,
		?SearchConfig $searchConfig = null,
	) {
		$this->mwApiRequest = $mwApiRequest;
		$this->config = $config;
		$this->contentLanguage = $contentLanguage;

		$mwServices = MediaWikiServices::getInstance();
		try {
			$this->searchConfig = $searchConfig ?? $mwServices
				->getConfigFactory()
				->makeConfig( 'CirrusSearch' );
		} catch ( ConfigException ) {
			// CirrusSearch not installed
		}

		$this->localActionApiUrl = $config->get( MainConfigNames::ScriptPath ) . '/api.php';
		$this->localRestUrl = $config->get( MainConfigNames::RestPath );
		$this->externalActionApiUrl = $this->config->get( 'ReaderExperimentsApiBaseUri' );
		$this->externalRestApiUrl = $this->config->get( 'ReaderExperimentsRestApiBaseUri' );
	}

	public function execute(): Response {
		$params = $this->getValidatedParams();

		if ( !$this->isSupportedType( $params['type'], $params['term'], $params['namespace'] ) ) {
			throw new HttpException(
				"Search of type {$params['type']} is not supported for this query",
				400,
			);
		}

		$request = new FauxRequest();
		$request->setParams(
			[
				'format' => 'json',
				'uselang' => $params['uselang'],
				'action' => 'query',
				'generator' => 'search',
				'gsrwhat' => 'text',
				'gsrsearch' => $params['term'],
				'gsrnamespace' => implode( '|', $params['namespace'] ),
				'gsrlimit' => $params['limit'],
				'gsroffset' => $params['continue'] ?: 0,
				'gsrsort' => $params['sort'],
				'gsrinfo' => 'totalhits|suggestion',
				'gsrprop' => 'size|wordcount|timestamp|snippet|redirecttitle|sectiontitle',
				'prop' => 'info|categoryinfo|pageimages',
				'inprop' => 'url',
				'piprop' => 'thumbnail',
				'pithumbsize' => '48',
				'pilimit' => $params['limit'],
				'pilicense' => 'any',
				'pilangcode' => $params['uselang'],
			] + ( $params['type'] === self::TYPE_SEMANTIC ? [ 'cirrusSemanticSearch' => 'hl' ] : [] )
		);
		// Grab external results if configured as such; otherwise from local wiki
		$apiUrl = $this->externalActionApiUrl ?: $this->localActionApiUrl;
		$request->setRequestURL( $apiUrl . '?' . http_build_query( $request->getQueryValues() ) );

		try {
			$response = $this->mwApiRequest->execute( $request );
		} catch ( Exception $e ) {
			throw new HttpException(
				// We are executing the API in internal mode which means there's no error
				// handling for us, ergo, the API would directly throw ApiUsageException
				// when any non-good status object is returned from the search request.
				// Here, we catch that exception and turn it into a user error as it would
				// have been done by ApiMain if the search API request were to come
				// from a remote client.
				// See T379293 and its numerous subtasks and their duplicates.
				$e->getMessage(),
				400,
			);
		}

		if ( isset( $response['error'] ) ) {
			throw new HttpException(
				$response['error']['info'] ?? '',
				400,
				array_diff_key( $response['error'], [ 'info' => '' ] )
			);
		}

		$results = array_values( $response['query']['pages'] ?? [] );
		uasort( $results, static function ( $a, $b ) {
			return $a['index'] <=> $b['index'];
		} );

		// Enrich each search result with attribution data if requested
		$attributionApiData = [ 'referencecount' ];
		$needsAttributionApi = (bool)array_intersect( $attributionApiData, $params[ 'data' ] );
		if ( $needsAttributionApi ) {
			foreach ( $results as &$result ) {
				$attribution = $this->fetchAttribution( $result['title'] ?? null );
				$referenceCount = $attribution['trust_and_relevance']['reference_count'] ?? null;
				// TODO add contributors count (T438419):
				//      $attribution['trust_and_relevance']['contributor_counts']

				if (
					$referenceCount !== null &&
					in_array( 'referencecount', $params[ 'data' ], true )
				) {
					// Use 'referencecount' for consistency with other keys
					$result['referencecount'] = $referenceCount;
				}
			}
			unset( $result );
		}

		return $this->getResponseFactory()->createJson( [
			'results' => $results,
			'info' => $response['query']['searchinfo'] ?? [],
			'continue' => $response['continue']['gsroffset'] ?? null,
			'warnings' => $response['warnings']['search']['warnings'] ?? null,
		] );
	}

	/**
	 * Fetches the reference count of a page from the
	 * WikimediaCustomizations signals REST endpoint:
	 * /attribution/v0-beta/pages/{title}/signals?expand=trust_and_relevance
	 *
	 * Should be called alongside a search request. Any failure
	 * (null title, API URL not built, failed request, response with an error message)
	 * degrades to a null return value so that the search response is not affected.
	 *
	 * @param string|null $titleText
	 * @return array|null
	 */
	protected function fetchAttribution( ?string $titleText ): ?array {
		if ( $titleText === null ) {
			return null;
		}

		$url = $this->buildSignalsApiUrl( $titleText );
		if ( $url === null ) {
			return null;
		}

		$request = new FauxRequest();
		$request->setParams( [ 'expand' => [ 'trust_and_relevance' ] ] );
		$request->setRequestURL( $url );

		try {
			$response = $this->mwApiRequest->execute( $request );
		} catch ( Exception ) {
			return null;
		}

		// Successful request, but error message in the response
		if ( isset( $response['errorKey'] ) ) {
			return null;
		}

		return $response;
	}

	/**
	 * Builds the WikimediaCustomizations signals REST URL for the given page title.
	 *
	 * @param string $titleText
	 * @return string|null
	 */
	protected function buildSignalsApiUrl( string $titleText ): ?string {
		$title = Title::newFromText( $titleText );

		// Invalid title
		if ( $title === null || $title->getDBkey() === '' ) {
			return null;
		}
		// Interwiki title
		if ( $title->getInterwiki() !== '' ) {
			return null;
		}

		$base = $this->externalRestApiUrl ?: $this->localRestUrl;

		return $base . '/attribution/v0-beta/pages/' . rawurlencode( $title->getDBkey() ) . '/signals';
	}

	/**
	 * Thin wrapper around SearchEngine::parseNamespacePrefixes to enable testing.
	 *
	 * The real implementation reaches into MediaWikiServices via the message system.
	 */
	protected function parseNamespacePrefixes( string $term ): array|false {
		return SearchEngine::parseNamespacePrefixes( $term, true, true );
	}

	/**
	 * Returns a list of supported search keyword prefixes.
	 *
	 * Protected to enable testing.
	 *
	 * @throws NoCirrusSearchException
	 */
	protected function getSearchKeywords(): array {
		if ( !$this->searchConfig ) {
			throw new NoCirrusSearchException( 'CirrusSearch required for search keyword prefixes' );
		}
		$features = ( new FullTextKeywordRegistry( $this->searchConfig ) )->getKeywords();

		$keywords = [];
		foreach ( $features as $feature ) {
			$keywords = array_merge( $keywords, $feature->getKeywordPrefixes() );
		}
		return $keywords;
	}

	/**
	 * Returns a boolean to indicate whether the given search type
	 * is one that can be handled.
	 *
	 * Semantic search does not support:
	 * - non-main namespace search
	 * - non-main namespace prefixes
	 * - keywords like insource:, incategory:, hastemplate:, filesize:, etc.
	 * - Lucene/CirrusSearch operators
	 */
	private function isSupportedType( string $type, string $term, array $namespaces ): bool {
		// Non-main namespace search
		if ( $type === self::TYPE_SEMANTIC ) {
			if ( count( $namespaces ) !== 1 || !in_array( NS_MAIN, $namespaces ) ) {
				return false;
			}

			if ( $this->searchConfig ) {
				// Non-main namespace prefixes
				$nsInTerm = $this->parseNamespacePrefixes( $term );
				if ( $nsInTerm && ( count( $nsInTerm[1] ) !== 1 || !in_array( NS_MAIN, $nsInTerm[1] ) ) ) {
					return false;
				}

				// Keywords and Lucene/CirrusSearch operators:
				// - escape regex special characters as an extra-safe check
				// - keywords (insource:, incategory:, hastemplate:, filesize:, etc.),
				//   optionally negated with - or !
				// - wildcard (*)
				// - boosting (^)
				// - fuzzy / proximity search (~)
				// - boolean (AND, OR, NOT)
				//
				// Ignore the following operators, since they can be common in natural language
				// and can lead to false positives:
				// - bare negations (-, !)
				// - question mark wildcard (?)
				// - exact match ("...")
				// - grouping with parentheses ()
				$keywords = $this->getSearchKeywords();
				$quotedKeywords = array_map( 'preg_quote', $keywords );
				$pattern = '/'
					// Keywords
					. '(?<=^|\s)[-!]?(' . implode( '|', $quotedKeywords ) . '):\S+'
					// Wildcard, boosting, fuzzy / proximity
					. '|[*^~]'
					// Boolean operators
					. '|(?<=^|\s)(?:AND|OR|NOT)(?=$|\s)'
					. '/';

				if ( preg_match( $pattern, $term ) ) {
					return false;
				}
			}
		}

		return true;
	}

	public function needsWriteAccess(): bool {
		return false;
	}

	public function getParamSettings(): array {
		return [
			'term' => [
				self::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
			],
			'type' => [
				self::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => self::TYPE_LEXICAL,
			],
			'namespace' => [
				self::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_TYPE => 'integer',
				ParamValidator::PARAM_ISMULTI => true,
				ParamValidator::PARAM_DEFAULT => NS_MAIN,
			],
			'limit' => [
				self::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_TYPE => 'integer',
				ParamValidator::PARAM_DEFAULT => 40,
				IntegerDef::PARAM_MIN => 1,
				IntegerDef::PARAM_MAX => ApiBase::LIMIT_BIG1,
				IntegerDef::PARAM_MAX2 => ApiBase::LIMIT_BIG2
			],
			'continue' => [
				self::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_TYPE => 'integer',
				ParamValidator::PARAM_DEFAULT => 0,
			],
			'sort' => [
				self::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => 'relevance',
			],
			'data' => [
				self::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_TYPE => [
					'referencecount',
				],
				ParamValidator::PARAM_ISMULTI => true,
				ParamValidator::PARAM_DEFAULT => [],
			],
			'uselang' => [
				self::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => $this->contentLanguage->getCode(),
			],
		];
	}
}
