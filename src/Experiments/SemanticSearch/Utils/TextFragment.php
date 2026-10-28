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
 * interleaves reference superscripts, pronunciation guides, and other markup that
 * the index strips out. Anything matched straight across the middle of a passage
 * is therefore liable to fail.
 *
 * So a passage is encoded as a 'start,end' range rather than as one exact
 * match. Only the few tokens at either end have to match; whatever the article
 * renders in between is free to differ, and a range may also span block
 * boundaries.
 * If a passage is too short, context terms are used to disambiguate the match.
 * This is encoded as prefix-,passage,-suffix.
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
 * - Markup inside start, end, prefix, passage, or suffix still breaks the match.
 * - A passage in a collapsed Minerva section with no sectiontitle to anchor to
 *   is still unmatchable; in practice such results are in the lead section,
 *   which Minerva never collapses.
 * - Token splitting is whitespace-based, so languages that do not space their
 *   tokens (Thai, Japanese, Chinese) always take the exact-match branch below.
 *   PHP offers us no equivalent of JS's Intl.Segmenter.
 */
class TextFragment {

	// Provenance parameter, so that clickthroughs on these links can be told
	// apart in web request logs. Complies with the naming convention at
	// https://wikitech.wikimedia.org/wiki/Provenance#Description_of_wprov_parameter
	public const WPROV_VALUE = 'sscw1';

	// A passage is ranged over as soon as it has the tokens to spare for two
	// disjoint anchors. Anchor sizes are kept deliberately small; see docblock.
	// Note that the unit here is a token, not a word, since we also take into
	// account punctuation signs.
	private const RANGE_MIN_TOKENS = 5;
	private const START_TOKENS = 3;
	private const END_TOKENS = 2;

	// Tokens immediately before and after the highlighted passage,
	// encoded as prefix- and -suffix respectively.
	// Used to disambiguate passages below RANGE_MIN_TOKENS,
	// where there aren't enough tokens for a 'start,end' range.
	private const CONTEXT_TOKENS = 3;

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
	 * Format: :~:text=[prefix-,]start[,end][,-suffix]
	 */
	private static function createDirective( string $snippet ): ?string {
		if ( preg_match( self::WIKITEXT_PATTERN, $snippet ) ) {
			return null;
		}

		$parts = self::extractHighlight( $snippet );
		if ( $parts === null ) {
			return null;
		}

		[ $prefix, $highlight, $suffix ] = $parts;
		$tokens = self::tokenize( $highlight );

		// Large-enough highlight: start,end
		if ( count( $tokens ) >= self::RANGE_MIN_TOKENS ) {
			$start = implode( ' ', array_slice( $tokens, 0, self::START_TOKENS ) );
			$end = implode( ' ', array_slice( $tokens, -self::END_TOKENS ) );

			return ':~:text=' . self::encode( $start ) . ',' . self::encode( $end );
		}

		// Small highlight: prefix-,highlight,-suffix
		$directive = ':~:text=';
		if ( $prefix !== '' ) {
			$directive .= self::encode( $prefix ) . '-,';
		}
		$directive .= self::encode( $highlight );
		if ( $suffix !== '' ) {
			$directive .= ',-' . self::encode( $suffix );
		}

		return $directive;
	}

	/**
	 * Pull the highlighted passage out of a snippet, along with prefix and suffix tokens.
	 *
	 * Semantic results wrap one contiguous passage in a single searchmatch span;
	 * where there are several, the longest is the most distinctive to link to.
	 *
	 * @return array|null [ prefix, highlight, suffix ] or null if there is no highlight
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
			$start = (int)$match[0][1];
			// $start is a byte offset from PREG_OFFSET_CAPTURE.
			// Later we extract the suffix via substr(), also byte-based.
			// Hence, use strlen instead of mb_strlen.
			$end = $start + strlen( $match[0][0] );
			$inner = $match[1][0];
			if ( $best === null || mb_strlen( $inner ) > mb_strlen( $best['inner'] ) ) {
				$best = [ 'inner' => $inner, 'start' => $start, 'end' => $end ];
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
		$before = substr( $snippet, 0, $best['start'] );
		$boundary = strrpos( $before, "\n" );
		if ( $boundary !== false ) {
			$before = substr( $before, $boundary + 1 );
		}
		$after = substr( $snippet, $best['end'] );
		$boundary = strpos( $after, "\n" );
		if ( $boundary !== false ) {
			$after = substr( $after, 0, $boundary );
		}

		$prefix = self::tokenize( self::normalizeText( $before ) );
		$suffix = self::tokenize( self::normalizeText( $after ) );

		return [
			implode( ' ', array_slice( $prefix, -self::CONTEXT_TOKENS ) ),
			$highlight,
			implode( ' ', array_slice( $suffix, 0, self::CONTEXT_TOKENS ) ),
		];
	}

	/**
	 * @return string[]
	 */
	private static function tokenize( string $text ): array {
		if ( $text === '' ) {
			return [];
		}
		return preg_split( '/\s+/u', $text, flags: PREG_SPLIT_NO_EMPTY ) ?: [];
	}

	/**
	 * Percent-encode text for use in a directive. '-' and ',' are both significant
	 * in the directive syntax; rawurlencode() handles ',' but leaves '-' alone.
	 */
	private static function encode( string $text ): string {
		return str_replace( '-', '%2d', rawurlencode( $text ) );
	}
}
