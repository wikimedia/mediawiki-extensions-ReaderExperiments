<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests\Unit\Experiments\SemanticSearch\Utils;

use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Snippet;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Snippet
 */
class SnippetTest extends MediaWikiUnitTestCase {
	public function testShortPassageIsUnchanged(): void {
		$html = 'Before <span class="searchmatch">the answer</span> after.';
		$this->assertSame( $html, ( new Snippet( $html ) )->truncate() );
	}

	public function testKeepsPreviousSentenceAndHighlight(): void {
		$html = str_repeat( 'Old context ', 40 ) . '. Previous sentence. The answer is ' .
			'<span class="searchmatch">forty two</span>' . str_repeat( ' following context', 40 );
		$excerpt = ( new Snippet( $html ) )->truncate();
		$this->assertStringStartsWith( 'Previous sentence. The answer is ', $excerpt );
		$this->assertStringContainsString( '<span class="searchmatch">forty two</span>', $excerpt );
		$this->assertStringEndsWith( '…', $excerpt );
		$this->assertLessThanOrEqual( 250, mb_strlen( strip_tags( $excerpt ) ) );
	}

	public function testLongPreviousSentenceAndUnicode(): void {
		$html = str_repeat( 'café &amp; tea ', 80 ) . '<span class="searchmatch">答え 😀</span>' .
			str_repeat( ' more context', 80 );
		$excerpt = ( new Snippet( $html ) )->truncate();
		$this->assertStringContainsString( '<span class="searchmatch">答え 😀</span>', $excerpt );
		$this->assertStringContainsString( 'more context', $excerpt );
		$this->assertLessThanOrEqual( 250, mb_strlen( html_entity_decode( strip_tags( $excerpt ) ) ) );
	}

	public function testOversizedHighlightIsAlsoCut(): void {
		$highlightText = str_repeat( 'answer ', 50 );
		$snippetText = 'Before <span class="searchmatch">' . $highlightText . '</span> after';
		$excerpt = ( new Snippet( $snippetText ) )->truncate();
		$this->assertLessThanOrEqual( 250, mb_strlen( strip_tags( $excerpt ) ) );
		$this->assertStringNotContainsString( 'Before', $excerpt );
		$this->assertStringNotContainsString( 'After', $excerpt );
		$this->assertStringContainsString( 'answer', $excerpt );
		$this->assertStringNotContainsString( $highlightText, $excerpt );
	}

	public function testMissingHighlightAlsoTruncated(): void {
		$html = str_repeat( 'No highlight. ', 50 );
		$excerpt = ( new Snippet( $html ) )->truncate();
		$this->assertNotSame( $html, $excerpt );
		$this->assertLessThanOrEqual( 250, mb_strlen( $excerpt ) );
	}

	public function testEscapedContentStaysText(): void {
		$html = str_repeat( 'Earlier. ', 40 ) .
			'<span class="searchmatch">&lt;script&gt; &amp; answer</span>' .
			str_repeat( ' later', 50 );
		$excerpt = ( new Snippet( $html ) )->truncate();
		$this->assertStringContainsString( '&lt;script> &amp; answer', $excerpt );
		$this->assertStringNotContainsString( '<script>', $excerpt );
	}

	public function testMultipleHighlightsAreLost(): void {
		$html = '<span class="searchmatch">first</span>' . str_repeat( ' context', 50 ) .
			'<span class="searchmatch">second</span>';
		$excerpt = ( new Snippet( $html ) )->truncate();
		$this->assertStringContainsString( '<span class="searchmatch">first</span>', $excerpt );
		$this->assertStringNotContainsString( '<span class="second">first</span>', $excerpt );
	}
}
