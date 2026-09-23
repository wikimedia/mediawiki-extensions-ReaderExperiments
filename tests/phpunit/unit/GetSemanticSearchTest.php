<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests;

use CirrusSearch\SearchConfig;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest\GetSemanticSearch;
use MediaWikiUnitTestCase;
use ReflectionMethod;

/**
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest\GetSemanticSearch::isSupportedType
 */
class GetSemanticSearchTest extends MediaWikiUnitTestCase {

	private const STUB_KEYWORDS = [
		'intitle', 'incategory', 'insource', 'hastemplate',
		'linksto', 'prefix', 'morelike', 'neartitle', 'filesize',
	];

	/**
	 * A stub that returns STUB_KEYWORDS keyword prefixes,
	 * and treats every term as having no namespace prefix,
	 * so isSupportedType() never touches MediaWikiServices.
	 */
	private function newEngineWithKeywords( array $keywords ): GetSemanticSearch {
		$searchConfig = $this->createMock( SearchConfig::class );

		return new class( $keywords, $searchConfig ) extends GetSemanticSearch {
			public function __construct(
				private readonly array $stubKeywords,
				SearchConfig $searchConfig
			) {
				$this->searchConfig = $searchConfig;
			}

			protected function getSearchKeywords(): array {
				return $this->stubKeywords;
			}

			protected function parseNamespacePrefixes( string $term ): array|false {
				return false;
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
		$engine = $this->newEngineWithKeywords( self::STUB_KEYWORDS );
		$this->assertSame(
			$expected,
			$this->invokeIsSupportedType( $engine, $term, $namespaces ),
			"Unexpected result for term: {$term}"
		);
	}

	public function testIsSupportedTypeWithoutSearchConfig(): void {
		$engine = new class( [] ) extends GetSemanticSearch {
			public function __construct( array $unused ) {
				$this->searchConfig = null;
			}

			protected function getSearchKeywords(): array {
				return [];
			}
		};

		// When there's no CirrusSearch config, accept keywords
		$this->assertTrue(
			$this->invokeIsSupportedType( $engine, 'intitle:London', [ NS_MAIN ] )
		);
	}
}
