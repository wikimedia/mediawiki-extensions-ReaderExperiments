<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils;

/**
 * Builds article urls carrying a text fragment directive that points at the
 * passage a search result matched on, so that clicking a result scrolls to and
 * highlights that passage rather than dropping the reader at the top of the
 * article. No JS involved: browsers resolve the directive natively.
 *
 * Spec: https://wicg.github.io/scroll-to-text-fragment/
 *
 * The catch is that a snippet is built from the indexed text, while the
 * directive has to match the rendered article. The two differ: the article
 * interleaves reference superscripts, pronunciation guides and other markup that
 * the index strips out. Anything matched straight across the middle of a passage
 * is therefore liable to fail.
 *
 * So a passage is linked as a short 'start,end' range rather than as one exact
 * match. Only the few words at either end have to match; whatever the article
 * renders in between is free to differ, and a range may also span block
 * boundaries.
 *
 * A trailing '-suffix' is deliberately not emitted. The spec requires it to sit
 * immediately after the match, and a reference superscript at the end of a
 * sentence - a very common place for one - breaks that adjacency. Trimming
 * punctuation off the front of such a suffix, to avoid a bare '.', only moves it
 * further from the match and breaks it outright.
 *
 * Note that this is why the thresholds here differ from
 * resources/experiments/shareHighlight/utils/textFragment.js, which this is
 * otherwise a port of: that feature links text the reader selected in the
 * rendered page themselves and reproduces it verbatim, so it has no such
 * mismatch to absorb. The encoding is shared; the thresholds are not.
 *
 * Free of services and globals so that it is unit-testable, which is why the
 * caller passes an already-escaped $sectionAnchor: Sanitizer::escapeIdForLink()
 * reads $wgFragmentMode from globals, and MediaWikiUnitTestCase forbids that.
 *
 * Known limitations, which land the reader at the section anchor where there is
 * one and at the top of the article otherwise, since browsers ignore a directive
 * they cannot resolve:
 * - Markup falling inside one of the two short anchors still breaks the match.
 * - A passage in a collapsed Minerva section with no sectiontitle to anchor to
 *   is still unmatchable; in practice such results are in the lead section,
 *   which Minerva never collapses.
 * - Word splitting is whitespace-based, so languages that do not space their
 *   words (Thai, Japanese, Chinese) always take the exact-match branch below.
 *   PHP offers us no equivalent of JS's Intl.Segmenter.
 */
class TextFragment {

	// Provenance parameter, so that clickthroughs on these links can be told
	// apart in web request logs. Complies with the naming convention at
	// https://wikitech.wikimedia.org/wiki/Provenance#Description_of_wprov_parameter
	public const WPROV_VALUE = 'sscw1';

	// A passage is ranged over as soon as it has the words to spare for two
	// disjoint anchors. Anchor sizes are kept deliberately small; see docblock.
	private const RANGE_MIN_WORDS = 5;
	private const START_WORDS = 3;
	private const END_WORDS = 2;

	// Only used on the short path (passages under RANGE_MIN_WORDS words), where
	// there aren't enough words in the highlight itself for a 'start,end' range.
	// These are the N words immediately before the highlight - from the same
	// snippet segment, see extractHighlight() - included as a 'prefix-,' before
	// the match. Without them, a short highlight could land on the first
	// occurrence of that exact phrase anywhere in the article, rather than the
	// one the search actually matched. A range match doesn't need this:
	// start+end anchors are already distinctive enough on their own.
	private const CONTEXT_WORDS = 3;

	// Snippets for `insource:`-style queries quote raw wikitext, which never appears
	// in the rendered article, so there would be nothing for the directive to match.
	private const WIKITEXT_PATTERN = '/\[\[|\]\]|\{\{|\}\}|&lt;/';

	// Matches CirrusSearch's <span class="searchmatch">...</span> markup,
	// capturing the text inside. '#' is used as the regex delimiter instead of
	// the usual '/', since '/' appears in the closing tag and would otherwise
	// need escaping. '.*?' is non-greedy, so each capture stops at its own
	// </span> rather than running on to a later one when a snippet highlights
	// more than one passage. The trailing 's' modifier makes '.' also match
	// newline characters, in case a highlight ever contains one.
	private const HIGHLIGHT_PATTERN = '#<span class="searchmatch">(.*?)</span>#s';

	/**
	 * Url to send the reader to for a single search result.
	 *
	 * Emits the section anchor and the text directive together where both are
	 * known, as '#Section_Anchor:~:text=start,end'. The browser splits ':~:' and
	 * everything after it off into the fragment directive, leaving the anchor as
	 * the ordinary fragment, so the two do not conflict: a resolved text directive
	 * still wins for scroll position, and the anchor is what the reader gets if it
	 * does not resolve.
	 *
	 * Emitting the anchor matters on narrow Minerva, where it is what makes the
	 * directive resolve at all. MobileFrontend hides collapsed section content with
	 * display:none until its JS has run (see the pre-JS rule in
	 * mobile.init.styles/main.less), and text directives are matched against
	 * rendered text only, so a passage inside a collapsed section is invisible to
	 * the match and the browser gives up without retrying. The anchor makes that
	 * section :target, which MobileFrontend already special-cases to keep visible
	 * before its JS runs, so the passage is there to be matched. Its checkHash()
	 * then expands the same section once JS does run, keeping the two in sync.
	 *
	 * With neither, the reader gets wprov on its own, with no fragment so a
	 * semantic search clickthrough is still counted.
	 *
	 * @param string $canonicalUrl Article url, as returned by the search api
	 * @param string|null $snippet Result snippet html, containing searchmatch spans
	 * @param string|null $sectionAnchor Escaped section anchor, or null if unknown
	 * @return string
	 */
	public static function buildUrl(
		string $canonicalUrl,
		?string $snippet,
		?string $sectionAnchor
	): string {
		if ( $canonicalUrl === '' ) {
			return '';
		}

		$url = wfAppendQuery( $canonicalUrl, [ 'wprov' => self::WPROV_VALUE ] );

		$directive = $snippet !== null ? self::createDirective( $snippet ) : null;
		$anchor = $sectionAnchor ?? '';

		if ( $directive === null && $anchor === '' ) {
			return $url;
		}

		return $url . '#' . $anchor . ( $directive ?? '' );
	}

	/**
	 * Collapse a snippet fragment down to the plain text that the article renders,
	 * so it can be matched against the page. Also used by callers to clean up a
	 * section title before escaping it into an anchor.
	 */
	public static function normalizeText( string $text ): string {
		$text = strip_tags( $text );
		$text = html_entity_decode( $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		// A /u pattern returns null against malformed utf-8; leave the whitespace
		// as-is in that case rather than losing the text altogether.
		return trim( preg_replace( '/\s+/u', ' ', $text ) ?? $text );
	}

	/**
	 * Build the directive for a snippet, or null if the snippet yields nothing
	 * usable to link to.
	 *
	 * Format: :~:text=[prefix-,]start[,end]
	 */
	private static function createDirective( string $snippet ): ?string {
		if ( preg_match( self::WIKITEXT_PATTERN, $snippet ) ) {
			return null;
		}

		$parts = self::extractHighlight( $snippet );
		if ( $parts === null ) {
			return null;
		}
		[ $prefix, $highlight ] = $parts;

		$words = self::splitWords( $highlight );

		if ( count( $words ) >= self::RANGE_MIN_WORDS ) {
			$start = implode( ' ', array_slice( $words, 0, self::START_WORDS ) );
			$end = implode( ' ', array_slice( $words, -self::END_WORDS ) );

			return ':~:text=' . self::encode( $start ) . ',' . self::encode( $end );
		}

		$directive = ':~:text=';
		if ( $prefix !== '' ) {
			$directive .= self::encode( $prefix ) . '-,';
		}

		return $directive . self::encode( $highlight );
	}

	/**
	 * Pull the highlighted passage out of a snippet, along with the few words that
	 * precede it.
	 *
	 * Semantic results wrap one contiguous passage in a single searchmatch span;
	 * where there are several, the longest is the most distinctive to link to.
	 *
	 * @return array|null [ prefix, highlight ], or null if there is no highlight
	 */
	private static function extractHighlight( string $snippet ): ?array {
		$matched = preg_match_all(
			self::HIGHLIGHT_PATTERN,
			$snippet,
			$matches,
			PREG_OFFSET_CAPTURE | PREG_SET_ORDER
		);
		if ( !$matched ) {
			return null;
		}

		$best = null;
		foreach ( $matches as $match ) {
			$offset = $match[0][1];
			$inner = $match[1][0];
			if ( $best === null || mb_strlen( $inner ) > mb_strlen( $best['inner'] ) ) {
				$best = [ 'inner' => $inner, 'offset' => $offset ];
			}
		}
		if ( $best === null ) {
			return null;
		}

		$highlight = self::normalizeText( $best['inner'] );
		if ( $highlight === '' ) {
			return null;
		}

		// The api joins elided snippet segments with newlines. Text on the far side
		// of one of those does not precede the highlight in the article, so it
		// cannot serve as context: keep to the segment the highlight sits in.
		$before = substr( $snippet, 0, $best['offset'] );
		$boundary = strrpos( $before, "\n" );
		if ( $boundary !== false ) {
			$before = substr( $before, $boundary + 1 );
		}

		$context = self::splitWords( self::normalizeText( $before ) );

		return [
			implode( ' ', array_slice( $context, -self::CONTEXT_WORDS ) ),
			$highlight,
		];
	}

	/**
	 * @return string[]
	 */
	private static function splitWords( string $text ): array {
		if ( $text === '' ) {
			return [];
		}
		return preg_split( '/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY ) ?: [];
	}

	/**
	 * Percent-encode text for use in a directive. '-' and ',' are both significant
	 * in the directive syntax; rawurlencode() handles ',' but leaves '-' alone.
	 */
	private static function encode( string $text ): string {
		return str_replace( '-', '%2d', rawurlencode( $text ) );
	}
}
