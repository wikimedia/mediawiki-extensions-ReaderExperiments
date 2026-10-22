<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests\Unit\Experiments\SemanticSearch\Rest;

use MediaWiki\Config\HashConfig;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest\GetSemanticSearch;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\SemanticSearchRequestInspector;
use MediaWiki\Rest\HttpException;
use MediaWikiUnitTestCase;
use ReflectionMethod;

/**
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest\GetSemanticSearch::execute
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest\GetSemanticSearch::isSupportedType
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest\GetSemanticSearch::getTargetUrl
 */
class GetSemanticSearchTest extends MediaWikiUnitTestCase {

	/** @dataProvider provideRequestedData */
	public function testOnlyRequestsDisplayedData( array $data, string $info, string $prop ): void {
		$actionApi = $this->createMock(
			\MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\ActionApi::class
		);
		$restApi = $this->createMock(
			\MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api\RestApi::class
		);
		$restApi->expects( $this->never() )->method( 'execute' );
		$engine = $this->getMockBuilder( GetSemanticSearch::class )
			->setConstructorArgs( [
				$actionApi, $restApi, new HashConfig( [ 'ReaderExperimentsSemanticSearchEnabled' => true ] ),
				$this->createMock( \MediaWiki\Language\Language::class ), $this->newInspector( null ),
			] )
			->onlyMethods( [ 'getValidatedParams', 'getResponseFactory' ] )->getMock();
		$engine->method( 'getValidatedParams' )->willReturn( [
			'type' => 'lexical', 'term' => 'cats', 'namespace' => [ NS_MAIN ],
			'limit' => 20, 'continue' => 0, 'sort' => 'relevance', 'uselang' => 'en', 'data' => $data,
		] );
		$engine->method( 'getResponseFactory' )->willReturn( new \MediaWiki\Rest\ResponseFactory( [] ) );
		$actionApi->expects( $this->once() )->method( 'execute' )
			->willReturnCallback( function ( $request ) use ( $info, $prop ) {
				$params = $request->getQueryValues();
				$this->assertSame( 'cats', $params['gsrsearch'] );
				$this->assertSame( $info, $params['gsrinfo'] );
				$this->assertSame( 'snippet|redirecttitle|sectiontitle', $params['gsrprop'] );
				$this->assertSame( $prop, $params['prop'] );
				$this->assertSame( str_contains( $prop, 'pageimages' ), isset( $params['piprop'] ) );
				return [ 'query' => [ 'pages' => [ [
					'index' => 1, 'title' => 'Cat', 'canonicalurl' => 'https://example.org/wiki/Cat',
				] ] ] ];
			} );
		$engine->execute();
	}

	public static function provideRequestedData(): iterable {
		yield 'basic search' => [ [], '', 'info' ];
		yield 'lexical UI' => [ [ 'thumbnail', 'suggestion' ], 'suggestion', 'info|pageimages' ];
		yield 'thumbnail only' => [ [ 'thumbnail' ], '', 'info|pageimages' ];
		yield 'explicit total hits' => [ [ 'totalhits' ], 'totalhits', 'info' ];
	}

	private const STUB_KEYWORDS = [
		'intitle', 'incategory', 'insource', 'hastemplate',
		'linksto', 'prefix', 'morelike', 'neartitle', 'filesize',
	];

	/**
	 * A SemanticSearchRequestInspector whose keyword list is fixed (no
	 * CirrusSearch / MediaWikiServices needed) and whose non-main namespace
	 * check always reports false (the namespace-prefix check runs inline in
	 * isSupportedType() independent of the inspector).
	 *
	 * hasAdvancedSyntax() is left as the real implementation so the Lucene /
	 * boolean-operator checks still run against the given keyword list.
	 */
	private function newInspector( ?array $keywords ): SemanticSearchRequestInspector {
		return new class( $keywords ?? self::STUB_KEYWORDS ) extends SemanticSearchRequestInspector {
			public function __construct(
				private readonly array $keywords,
			) {
				parent::__construct( null );
			}

			public function getSearchKeywords(): array {
				return $this->keywords;
			}

			public function hasNonMainNamespace( string $term ): bool {
				return false;
			}
		};
	}

	/**
	 * Bypass the real constructor (it requires MediaWikiServices, which are
	 * unavailable in a unit test) by extending GetSemanticSearch with a no-op
	 * __construct and injecting a stub inspector.
	 *
	 * @param array|null $keywords keyword prefixes used by the inspector
	 *   (defaults to STUB_KEYWORDS; pass [] to simulate CirrusSearch not being
	 *   installed)
	 */
	private function newEngine( ?array $keywords = null ): GetSemanticSearch {
		$inspector = $this->newInspector( $keywords );

		return new class( $inspector ) extends GetSemanticSearch {
			public function __construct(
				protected SemanticSearchRequestInspector $inspector,
			) {
			}
		};
	}

	private function invokeIsSupportedType(
		GetSemanticSearch $engine,
		string $term,
		array $namespaces
	): bool {
		$method = new ReflectionMethod( GetSemanticSearch::class, 'isSupportedType' );
		return $method->invoke( $engine, GetSemanticSearch::TYPE_SEMANTIC, $term, $namespaces );
	}

	public function provideTerms(): iterable {
		// Namespace searches
		yield 'multiple namespaces rejected' => [
			'cat facts', [ NS_MAIN, NS_TALK ], false,
		];
		yield 'single non-main namespace rejected' => [
			'cat facts', [ NS_TALK ], false,
		];
		yield 'empty namespace list rejected' => [
			'cat facts', [], false,
		];
		yield 'single NS_MAIN namespace allowed to proceed' => [
			'cat facts', [ NS_MAIN ], true,
		];

		// Plain natural language: accept
		yield 'simple natural language query' => [
			'what is the capital of France', [ NS_MAIN ], true,
		];
		yield 'hyphenated word is not treated as negation' => [
			'well-known e-commerce trends', [ NS_MAIN ], true,
		];
		yield 'boolean-looking substring inside a word is ignored' => [
			'android phones compared', [ NS_MAIN ], true,
		];
		yield 'word that merely contains a keyword as substring' => [
			'the sun is a natural resource for energy', [ NS_MAIN ], true,
		];
		yield 'numbers and punctuation, no special syntax' => [
			'top 10 movies of 2024', [ NS_MAIN ], true,
		];

		// Keywords: reject
		yield 'intitle keyword' => [
			'intitle:London', [ NS_MAIN ], false,
		];
		yield 'incategory keyword mid-query' => [
			'find incategory:Music bands', [ NS_MAIN ], false,
		];
		yield 'insource regex keyword' => [
			'insource:/foo.*bar/', [ NS_MAIN ], false,
		];
		yield 'hastemplate keyword' => [
			'hastemplate:Infobox', [ NS_MAIN ], false,
		];
		yield 'filesize keyword' => [
			'filesize:>1000', [ NS_MAIN ], false,
		];
		yield 'quoted keyword value' => [
			'incategory:"music history"', [ NS_MAIN ], false,
		];

		// Negated keywords: reject
		yield 'negated keyword with hyphen' => [
			'-intitle:London', [ NS_MAIN ], false,
		];
		yield 'negated keyword with bang' => [
			'!hastemplate:Infobox', [ NS_MAIN ], false,
		];
		yield 'negated keyword not at start of query' => [
			'foo -incategory:Music', [ NS_MAIN ], false,
		];

		// Lucene/CirrusSearch operators: reject
		yield 'wildcard suffix' => [
			'cow*', [ NS_MAIN ], false,
		];
		yield 'wildcard mid-word' => [
			'wh*le', [ NS_MAIN ], false,
		];
		yield 'boost operator' => [
			'lighthouse^2', [ NS_MAIN ], false,
		];
		yield 'fuzzy operator with fraction' => [
			'nigtmare~.9', [ NS_MAIN ], false,
		];
		yield 'bare fuzzy operator' => [
			'flowers~', [ NS_MAIN ], false,
		];
		yield 'proximity phrase' => [
			'"flowers algernon"~2', [ NS_MAIN ], false,
		];
		yield 'explicit AND operator' => [
			'cats AND dogs', [ NS_MAIN ], false,
		];
		yield 'explicit OR operator' => [
			'cats OR dogs', [ NS_MAIN ], false,
		];
		yield 'explicit NOT operator' => [
			'cats NOT dogs', [ NS_MAIN ], false,
		];

		// Ignored operators: accept
		yield 'bare negations' => [
			'e-mail us!', [ NS_MAIN ], true,
		];
		yield 'question mark wildcard' => [
			'what?', [ NS_MAIN ], true,
		];
		yield 'exact match' => [
			'"flowers for algernon"', [ NS_MAIN ], true,
		];
		yield 'grouping with parentheses' => [
			'so long (and thanks for all the fish)', [ NS_MAIN ], true,
		];
	}

	/**
	 * @dataProvider provideTerms
	 */
	public function testIsSupportedType( string $term, array $namespaces, bool $expected ): void {
		$engine = $this->newEngine();
		$this->assertSame(
			$expected,
			$this->invokeIsSupportedType( $engine, $term, $namespaces ),
			"Unexpected result for term: {$term}"
		);
	}

	public function testIsSupportedTypeWithoutSearchConfig(): void {
		// CirrusSearch not installed: the inspector's keyword list is empty,
		// so an intitle: query is accepted (only operator/boolean/namespace
		// rules apply).
		$engine = $this->newEngine( [] );
		$this->assertTrue(
			$this->invokeIsSupportedType( $engine, 'intitle:London', [ NS_MAIN ] )
		);
	}

	/**
	 * These results carry no sectiontitle on purpose: the fallback path escapes one
	 * through Sanitizer, which reads $wgFragmentMode from globals and so is out of
	 * reach here. TextFragmentTest covers the fragment building itself.
	 */
	private function invokeGetTargetUrl( array $result ): string {
		$engine = new class() extends GetSemanticSearch {
			public function __construct() {
			}
		};

		$method = new ReflectionMethod( GetSemanticSearch::class, 'getTargetUrl' );
		return $method->invoke( $engine, $result );
	}

	public function testGetTargetUrlAddsFragment(): void {
		$url = $this->invokeGetTargetUrl( [
			'canonicalurl' => 'https://en.wikipedia.org/wiki/Purr',
			'snippet' => 'Cats also purr <span class="searchmatch">to manage pain</span> and soothe themselves',
		] );

		$this->assertSame(
			'https://en.wikipedia.org/wiki/Purr?wprov=sscw1'
				. '#:~:text=Cats%20also%20purr-,to%20manage%20pain,-and%20soothe%20themselves',
			$url
		);
	}

	public function testExecuteThrowsWhenDisabled(): void {
		$handler = new class( new HashConfig( [
			'ReaderExperimentsSemanticSearchEnabled' => false,
		] ) ) extends GetSemanticSearch {
			public function __construct( \MediaWiki\Config\Config $config ) {
				$this->config = $config;
			}
		};

		$this->expectException( HttpException::class );
		$this->expectExceptionCode( 404 );
		$handler->execute();
	}
}
