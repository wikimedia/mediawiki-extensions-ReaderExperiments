<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests;

use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\SemanticExcerpt;
use MediaWikiUnitTestCase;

/** @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\SemanticExcerpt */
class SemanticExcerptTest extends MediaWikiUnitTestCase {
	public function testShortPassageIsUnchanged(): void {
		$html = 'Before <span class="searchmatch">the answer</span> after.';
		$this->assertSame( $html, SemanticExcerpt::format( $html ) );
	}

	public function testKeepsPreviousSentenceAndHighlight(): void {
		$html = str_repeat( 'Old context. ', 40 ) . 'Previous sentence. The answer is ' .
			'<span class="searchmatch">forty two</span>' . str_repeat( ' following context', 40 );
		$excerpt = SemanticExcerpt::format( $html );
		$this->assertStringStartsWith( '…Previous sentence. The answer is ', $excerpt );
		$this->assertStringContainsString( '<span class="searchmatch">forty two</span>', $excerpt );
		$this->assertStringEndsWith( '…', $excerpt );
		$this->assertLessThanOrEqual( 250, mb_strlen( strip_tags( $excerpt ) ) );
	}

	public function testLongPreviousSentenceAndUnicode(): void {
		$html = str_repeat( 'café &amp; tea ', 80 ) . '<span class="searchmatch">答え 😀</span>' .
			str_repeat( ' more context', 80 );
		$excerpt = SemanticExcerpt::format( $html );
		$this->assertStringContainsString( '<span class="searchmatch">答え 😀</span>', $excerpt );
		$this->assertStringContainsString( 'more context', $excerpt );
		$this->assertLessThanOrEqual( 250, mb_strlen( html_entity_decode( strip_tags( $excerpt ) ) ) );
	}

	public function testOversizedHighlightIsNeverCut(): void {
		$highlight = '<span class="searchmatch">' . str_repeat( 'answer ', 50 ) . '</span>';
		$this->assertSame( '…' . $highlight . '…', SemanticExcerpt::format( 'Before ' . $highlight . ' after' ) );
	}

	public function testMissingHighlightIsUnchanged(): void {
		$html = str_repeat( 'No highlight. ', 50 );
		$this->assertSame( $html, SemanticExcerpt::format( $html ) );
	}

	public function testEscapedContentStaysText(): void {
		$html = str_repeat( 'Earlier. ', 40 ) . '<span class="searchmatch">&lt;script&gt; &amp; answer</span>' .
			str_repeat( ' later', 50 );
		$excerpt = SemanticExcerpt::format( $html );
		$this->assertStringContainsString( '&lt;script&gt; &amp; answer', $excerpt );
		$this->assertStringNotContainsString( '<script>', $excerpt );
	}

	public function testMultipleHighlightsAreNotLost(): void {
		$html = '<span class="searchmatch">first</span>' . str_repeat( ' context', 50 ) .
			'<span class="searchmatch">second</span>';
		$this->assertSame( $html, SemanticExcerpt::format( $html ) );
	}

}
