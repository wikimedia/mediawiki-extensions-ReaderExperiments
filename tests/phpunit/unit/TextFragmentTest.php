<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests;

use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\TextFragment;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\TextFragment
 */
class TextFragmentTest extends MediaWikiUnitTestCase {

	private const URL = 'https://en.wikipedia.org/wiki/Purr';
	private const WPROV = '?wprov=sscw1';

	public function provideSnippets(): iterable {
		// Only the three words at the start and the two at the end have to match,
		// which leaves the article free to render reference superscripts and the
		// like through the middle of the passage.
		yield 'passage is linked as a start,end range' => [
			self::URL,
			'Cats purr <span class="searchmatch">when they are hungry, happy, or anxious and the '
				. 'purring continues through both inhalation and exhalation without pause</span> '
				. 'in most cases.',
			null,
			self::URL . self::WPROV . '#:~:text=when%20they%20are,without%20pause',
		];

		yield 'five words is enough to range over' => [
			self::URL,
			'Cats also purr <span class="searchmatch">to manage pain and soothe</span> themselves',
			null,
			self::URL . self::WPROV . '#:~:text=to%20manage%20pain,and%20soothe',
		];

		// ',' separates the two anchors in the directive syntax.
		yield 'commas inside an anchor are encoded' => [
			self::URL,
			'pets like <span class="searchmatch">cats, dogs and other pets here</span> too',
			null,
			self::URL . self::WPROV . '#:~:text=cats%2C%20dogs%20and,pets%20here',
		];

		// Under five words there is nothing to range over, so the preceding text
		// pins the passage down instead.
		yield 'short highlight gets a prefix instead' => [
			self::URL,
			'a <span class="searchmatch">purring cat</span> b',
			null,
			self::URL . self::WPROV . '#:~:text=a-,purring%20cat',
		];

		yield 'html entities are decoded' => [
			self::URL,
			'with a rolled <span class="searchmatch">&#039;r&#039; in human speech</span> and more',
			null,
			self::URL . self::WPROV . '#:~:text=with%20a%20rolled-,%27r%27%20in%20human%20speech',
		];

		// '-' separates the prefix from the match, so it has to be escaped even
		// though rawurlencode() considers it safe.
		yield 'hyphens are percent-encoded' => [
			self::URL,
			'the <span class="searchmatch">well-known cold-blooded trait</span> here',
			null,
			self::URL . self::WPROV . '#:~:text=the-,well%2dknown%20cold%2dblooded%20trait',
		];

		yield 'ampersands are encoded' => [
			self::URL,
			'cats <span class="searchmatch">purr &amp; knead</span> often',
			null,
			self::URL . self::WPROV . '#:~:text=cats-,purr%20%26%20knead',
		];

		yield 'prefix stays inside the highlight\'s own elided segment' => [
			self::URL,
			"first segment about dogs\nCats purr when <span class=\"searchmatch\">they are content"
				. "</span>. Later text\nthird segment",
			null,
			self::URL . self::WPROV . '#:~:text=Cats%20purr%20when-,they%20are%20content',
		];

		yield 'longest of several highlights wins' => [
			self::URL,
			'a <span class="searchmatch">cat</span> b <span class="searchmatch">the longer passage '
				. 'here</span> c',
			null,
			self::URL . self::WPROV . '#:~:text=a%20cat%20b-,the%20longer%20passage%20here',
		];

		yield 'highlight with nothing before it' => [
			self::URL,
			'<span class="searchmatch">purring</span> is a soft sound',
			null,
			self::URL . self::WPROV . '#:~:text=purring',
		];

		// The anchor makes the section :target, which is what keeps a collapsed
		// Minerva section visible long enough for the directive to match.
		yield 'section anchor and directive are emitted together' => [
			self::URL,
			'Cats purr <span class="searchmatch">when they are hungry, happy, or anxious</span> too',
			'Purr',
			self::URL . self::WPROV . '#Purr:~:text=when%20they%20are,or%20anxious',
		];

		yield 'anchor is emitted alongside a short prefixed highlight too' => [
			self::URL,
			'a <span class="searchmatch">purring cat</span> b',
			'Cat_intelligence',
			self::URL . self::WPROV . '#Cat_intelligence:~:text=a-,purring%20cat',
		];

		// insource: snippets quote wikitext that the rendered article never shows,
		// so there is nothing to scroll to; the section anchor is the best we can do.
		yield 'wikitext snippet falls back to the section anchor' => [
			self::URL,
			'[[<span class="searchmatch">Purring</span>]] may have developed as a signaling mechanism',
			'Cat_intelligence',
			self::URL . self::WPROV . '#Cat_intelligence',
		];

		yield 'escaped ref markup also counts as wikitext' => [
			self::URL,
			'tilting its head.&lt;ref name=Crowell-davis2004/&gt; <span class="searchmatch">Purring'
				. '</span> may have developed',
			'Purr',
			self::URL . self::WPROV . '#Purr',
		];

		yield 'snippet without a highlight falls back to the section anchor' => [
			self::URL,
			'The purr is a continuous, soft, vibrating sound.',
			'Purr',
			self::URL . self::WPROV . '#Purr',
		];

		yield 'whitespace-only highlight falls back to the section anchor' => [
			self::URL,
			'text <span class="searchmatch">   </span> more',
			'Purr',
			self::URL . self::WPROV . '#Purr',
		];

		yield 'no snippet falls back to the section anchor' => [
			self::URL,
			null,
			'Purr',
			self::URL . self::WPROV . '#Purr',
		];

		// Still tagged with wprov even with nothing to scroll to, so the
		// clickthrough is still counted - see buildUrl()'s docblock.
		yield 'no snippet and no section still gets tagged with wprov' => [
			self::URL,
			null,
			null,
			self::URL . self::WPROV,
		];

		yield 'empty section anchor still gets tagged with wprov' => [
			self::URL,
			null,
			'',
			self::URL . self::WPROV,
		];

		// A section titled "0" is a legitimate anchor, not an absent
		// one. It must not be coerced to falsy and dropped.
		yield 'a section anchor of "0" is not treated as absent' => [
			self::URL,
			null,
			'0',
			self::URL . self::WPROV . '#0',
		];

		yield 'wprov joins an existing query string' => [
			'https://example.org/index.php?title=Purr',
			'x <span class="searchmatch">a purring cat</span> y',
			null,
			'https://example.org/index.php?title=Purr&wprov=sscw1#:~:text=x-,a%20purring%20cat',
		];

		yield 'missing url yields nothing to link to' => [
			'',
			'a <span class="searchmatch">purring cat</span> b',
			'Purr',
			'',
		];
	}

	/**
	 * @dataProvider provideSnippets
	 */
	public function testBuildUrl(
		string $canonicalUrl,
		?string $snippet,
		?string $sectionAnchor,
		string $expected
	): void {
		$this->assertSame(
			$expected,
			TextFragment::buildUrl( $canonicalUrl, $snippet, $sectionAnchor )
		);
	}

	/**
	 * A '-suffix' has to sit immediately after the match, and a reference
	 * superscript at the end of a sentence breaks that adjacency often enough that
	 * we never emit one.
	 */
	public function testNoSuffixIsEmitted(): void {
		$url = TextFragment::buildUrl(
			self::URL,
			'reasons, including <span class="searchmatch">when they are hungry, happy, or anxious'
				. '</span>. In some cases, purring is thought to be a sign of contentment.',
			null
		);

		$this->assertStringNotContainsString( ',-', $url );
	}

	/**
	 * The /u patterns this class relies on fail against malformed utf-8, which the
	 * api should never hand us but which must not become a TypeError if it does.
	 */
	public function testMalformedUtf8DoesNotThrow(): void {
		$url = TextFragment::buildUrl(
			self::URL,
			"a <span class=\"searchmatch\">purr\xC3\x28ing</span> b",
			'Purr'
		);

		$this->assertStringStartsWith( self::URL . self::WPROV . '#', $url );
	}

	public function provideTextToNormalize(): iterable {
		yield 'entities are decoded' => [ '&#039;Purr&#039; &amp; more', "'Purr' & more" ];
		yield 'tags are stripped' => [ 'a <b>bold</b> section', 'a bold section' ];
		yield 'whitespace is collapsed' => [ "  spread \n over   lines ", 'spread over lines' ];
		yield 'empty stays empty' => [ '', '' ];
	}

	/**
	 * @dataProvider provideTextToNormalize
	 */
	public function testNormalizeText( string $text, string $expected ): void {
		$this->assertSame( $expected, TextFragment::normalizeText( $text ) );
	}
}
