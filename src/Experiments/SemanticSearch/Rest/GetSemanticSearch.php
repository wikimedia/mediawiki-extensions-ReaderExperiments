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
	private const TYPE_LEXICAL = 'lexical';
	private const TYPE_SEMANTIC = 'semantic';

	private ?SearchConfig $searchConfig = null;
	private readonly string $localApiUrl;
	private readonly string $externalApiUrl;

	public function __construct(
		private readonly MediaWikiApi $mwApiRequest,
		private readonly Config $config,
		private readonly Language $contentLanguage,
		?SearchConfig $searchConfig = null,
	) {
		$mwServices = MediaWikiServices::getInstance();
		try {
			$this->searchConfig = $searchConfig ?? $mwServices
				->getConfigFactory()
				->makeConfig( 'CirrusSearch' );
		} catch ( ConfigException ) {
			// CirrusSearch not installed
		}

		$this->localApiUrl = $config->get( MainConfigNames::ScriptPath ) . '/api.php';
		$this->externalApiUrl = $this->config->get( 'ReaderExperimentsApiBaseUri' );
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
				'gsrsearch' => $params['term'],
				'gsrnamespace' => implode( '|', $params['namespace'] ),
				'gsrlimit' => $params['limit'],
				'gsroffset' => $params['continue'] ?: 0,
				'gsrsort' => $params['sort'],
				'gsrinfo' => 'totalhits|suggestion',
				'gsrprop' => 'size|wordcount|timestamp|snippet',
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
		$apiUrl = $this->externalApiUrl ?: $this->localApiUrl;
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

		return $this->getResponseFactory()->createJson( [
			'results' => $results,
			'info' => $response['query']['searchinfo'] ?? [],
			'continue' => $response['continue']['gsroffset'] ?? null,
			'warnings' => $response['warnings']['search']['warnings'] ?? null,
		] );
	}

	/**
	 * Returns a boolean to indicate whether the given search type
	 * is one that can be handled.
	 *
	 * Non-NS_MAIN namespace searches, and special lexical search
	 * features are not currently supported in semantic search.
	 */
	private function isSupportedType( string $type, string $term, array $namespaces ): bool {
		if ( $type === self::TYPE_SEMANTIC ) {
			if ( count( $namespaces ) !== 1 || !in_array( NS_MAIN, $namespaces ) ) {
				return false;
			}

			if ( $this->searchConfig ) {
				// check for namespace-specific directive within search query
				$nsInTerm = SearchEngine::parseNamespacePrefixes( $term, true, true );
				if ( $nsInTerm && ( count( $nsInTerm[1] ) !== 1 || !in_array( NS_MAIN, $nsInTerm[1] ) ) ) {
					return false;
				}

				// Check for keywords, like `insource:`, `incategory:`,
				// `hastemplate:`, `filesize:` etc.
				$keywords = $this->getSearchKeywords();
				$match = preg_match(
					'/(?<=^|\s)(' . implode( '|', $keywords ) . '):.+?(?=$|\s)/',
					$term
				);
				if ( $match ) {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * Returns a list of supported search keyword prefixes.
	 *
	 * @throws NoCirrusSearchException
	 */
	private function getSearchKeywords(): array {
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
			'uselang' => [
				self::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => $this->contentLanguage->getCode(),
			],
		];
	}
}
