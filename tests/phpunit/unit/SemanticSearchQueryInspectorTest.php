<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests;

use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\SemanticSearchRequestInspector;
use MediaWiki\Request\FauxRequest;
use MediaWikiUnitTestCase;

/**
 * @group ReaderExperiments
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\SemanticSearchRequestInspector
 */
class SemanticSearchQueryInspectorTest extends MediaWikiUnitTestCase {
	/** @var SemanticSearchRequestInspector */
	private SemanticSearchRequestInspector $inspector;

	protected function setUp(): void {
		parent::setUp();
		$this->inspector = new SemanticSearchRequestInspector();
	}

	public function provideWordCounts(): iterable {
		yield [ '', 0 ];
		yield [ '   ', 0 ];
		yield [ 'a', 1 ];
		yield [ 'a b', 2 ];
		yield [ 'a b c d e', 5 ];
		yield [ 'a b c d e f', 6 ];
		// Extra whitespace collapses to 2
		yield [ '  a   b  ', 2 ];
		yield [ 'how do I bake a chocolate cake at home', 9 ];
		// Malformed punctuation and hyphens
		yield [ 'is there, a cook - book on - mars ???', 7 ];
	}

	/**
	 * @dataProvider provideWordCounts
	 */
	public function testWordCount( string $term, int $expected ): void {
		$this->assertSame( $expected, $this->inspector->wordCount( $term ), $term );
	}

	public function provideQuestionWords(): iterable {
		yield [ 'how to bake a cake', true ];
		yield [ 'what is the capital of France', true ];
		yield [ 'WHY is the sky blue', true ];
		yield [ 'where are my keys', true ];
		yield [ 'who is he', true ];
		yield [ 'to bake a cake in the oven', false ];
		yield [ 'whatnot is a good buy', false ];
		yield [ 'whichever you choose', false ];
		yield [ 'howdy everyone how about some coffee', true ];
		yield [ 'how are we doing', true ];
		yield [ 'how are we doing?', true ];
		yield [ 'who is he?', true ];
		yield [ '"who did this?"', true ];
		yield [ '  why all this trailing whitespace?   ', true ];
	}

	/**
	 * @dataProvider provideQuestionWords
	 */
	public function testHasQuestionWord( string $term, bool $expected ): void {
		$this->assertSame( $expected, $this->inspector->hasQuestionWord( $term ), $term );
	}

	private const KEYWORDS = [ 'intitle', 'incategory', 'insource', 'hastemplate', 'filesize', 'linksto', 'morelike' ];

	public function provideAdvancedSyntax(): iterable {
		yield 'natural language query' => [ 'how do I bake a chocolate cake at home', false ];
		yield 'intitle keyword' => [ 'intitle:London', true ];
		yield 'insource keyword' => [ 'insource:foo', true ];
		yield 'insource keyword negated' => [ '-insource:foo', true ];
		yield 'insource keyword negated with bang' => [ '!insource:foo', true ];
		yield 'incategory keyword' => [ 'find incategory:Music bands', true ];
		yield 'wildcard' => [ 'cow*', true ];
		yield 'wildcard mid-term' => [ 'wh*le', true ];
		yield 'boost' => [ 'lighthouse^1.2', true ];
		yield 'fuzzy' => [ 'flowers~', true ];
		yield 'proximity' => [ '"flowers algernon"~5', true ];
		yield 'AND operator' => [ 'cats AND dogs', true ];
		yield 'OR operator' => [ 'cats OR dogs', true ];
		yield 'NOT operator' => [ 'cats NOT dogs', true ];
		yield 'AND inside a word should not match' => [ 'sandwich' . ' sandwiches', false ];
	}

	/**
	 * @dataProvider provideAdvancedSyntax
	 */
	public function testHasAdvancedSyntax( string $term, bool $expected ): void {
		$this->assertSame(
			$expected,
			$this->inspector->hasAdvancedSyntax( $term, self::KEYWORDS ),
			$term
		);
	}

	/**
	 * @dataProvider provideAdvancedSyntax
	 */
	public function testHasAdvancedSyntaxWithoutKeywords( string $term, bool $expectedWithKeywords ): void {
		// With an empty keyword list, only operators (wildcard / boost /
		// fuzzy) and boolean words (AND/OR/NOT) can still be caught.
		$expected = preg_match( '/[*^~]/', $term )
			|| preg_match( '/(?<=^|\s)(?:AND|OR|NOT)(?=$|\s)/', $term );
		$this->assertSame(
			$expected,
			$this->inspector->hasAdvancedSyntax( $term, [] ),
			$term
		);
	}

	// -----------------------------------------------------------------
	//  getSearchKeywords (no-SearchConfig path)
	// -----------------------------------------------------------------

	public function testGetSearchKeywordsWithoutConfigIsEmpty(): void {
		// A default inspector has no SearchConfig, so no keywords are
		// reported (and no MediaWikiServices lookup is attempted).
		$this->assertSame( [], $this->inspector->getSearchKeywords() );
	}

	// -----------------------------------------------------------------
	//  hasAdvancedSearchParams
	// -----------------------------------------------------------------

	public function provideAdvancedSearchParams(): iterable {
		yield 'empty params' => [ [], false ];
		yield 'plain params' => [ [ 'search' => 'x', 'uselang' => 'en', 'fulltext' => 'x' ], false ];
		yield 'profile param' => [ [ 'profile' => 'advanced' ], true ];
		yield 'sort param' => [ [ 'sort' => 'date' ], true ];
		yield 'offset param' => [ [ 'offset' => '20' ], true ];
		yield 'prefix param' => [ [ 'prefix' => 'A' ], true ];
		yield 'mixed params' => [ [ 'search' => 'x', 'profile' => 'advanced', 'fulltext' => 'x' ], true ];
		yield 'ns0 namespace checkbox' => [ [ 'ns0' => '1' ], true ];
		yield 'ns1 namespace checkbox' => [ [ 'ns1' => '1' ], true ];
		yield 'ns3 namespace checkbox' => [ [ 'ns3' => '1' ], true ];
		yield 'ns namespace checkbox' => [ [ 'ns' => '1' ], false ];
		yield 'nsmixed is not a namespace checkbox' => [ [ 'nsmixed' => '1' ], false ];
	}

	/**
	 * @dataProvider provideAdvancedSearchParams
	 */
	public function testHasAdvancedSearchParams( array $params, bool $expected ): void {
		$request = new FauxRequest( $params );
		$keys = json_encode( $params );
		$this->assertSame(
			$expected,
			$this->inspector->hasAdvancedSearchParams( $request ),
			$keys
		);
	}

	public function testDisqualifyingFilterParamsConstant(): void {
		$this->assertSame(
			[ 'profile', 'sort', 'offset', 'prefix' ],
			SemanticSearchRequestInspector::DISQUALIFYING_FILTER_PARAMS
		);
	}

	public function provideNonMainNamespaceNoConfig(): iterable {
		yield [ '', false ];
		yield [ 'how do I bake a chocolate cake at home', false ];
		yield [ 'User:how do I bake a chocolate cake at home', false ];
		yield [ 'Talk:cat', false ];
		yield [ 'Project:Foo:Bar', false ];
	}

	/**
	 * @dataProvider provideNonMainNamespaceNoConfig
	 */
	public function testHasNonMainNamespaceWithoutConfigIsFalse( string $term ): void {
		// Short-circuits to false without config
		$this->assertFalse( $this->inspector->hasNonMainNamespace( $term ), $term );
	}
}
