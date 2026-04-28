/**
 * Utilities for generating text fragment URLs.
 * Text fragments allow linking to specific text passages in a page.
 * Spec: https://wicg.github.io/scroll-to-text-fragment/
 */

// We use the `wprov` URL query parameter to indicate that the text fragment comes from ShareHighlight.
// Comply with the naming convention at
// https://wikitech.wikimedia.org/wiki/Provenance#Description_of_wprov_parameter:
// - 3-char feature = 'shh' for SHare Highlight
// - platform one char = 'u' for unknown, since we don't know the platform a priori
// - major version of feature = '0', experiment version
const WPROV_VALUE = 'shhu0';
// Thresholds for using 'start,end' range format
const CHARS_THRESHOLD = 100;
const WORDS_THRESHOLD = 20; // Whitespace will appear as separate segments

/**
 * Encode text for use in a text fragment URL.
 * Special characters must be percent-encoded, including the "-" minus character.
 *
 * @param {string} text - Raw text to encode
 * @return {string} Encoded text safe for URL fragment
 */
function encodeTextFragment( text ) {
	// Normalize whitespace
	const normalized = text.trim().replace( /\s+/g, ' ' );
	return encodeURIComponent( normalized ).replace( /-/g, '%2d' );
}

/**
 * Generate a text fragment directive for the given text.
 * For long texts, uses start,end range format.
 *
 * Format: :~:text=[prefix-,]start[,end][,-suffix]
 *
 * @param {string} text - The selected text
 * @return {string} Text fragment directive (without leading #)
 */
function createTextFragmentDirective( text ) {
	const normalized = text.trim().replace( /\s+/g, ' ' );

	if ( normalized.length > CHARS_THRESHOLD ) {
		// Use a primitive ASCII word break if no Intl.Segmenter:
		let words = normalized.split( /\b/ );

		if ( typeof Intl === 'object' && typeof Intl.Segmenter === 'function' ) {
			try {
				const segmenter = new Intl.Segmenter( undefined, {
					granularity: 'word'
				} );
				words = [ ...segmenter.segment( normalized ) ].map( ( s ) => s.segment );
			} catch ( e ) {
				// Silently fall back
			}
		}

		if ( words.length > WORDS_THRESHOLD ) {
			const startWords = words.slice( 0, WORDS_THRESHOLD / 2 ).join( '' );
			const endWords = words.slice( -WORDS_THRESHOLD / 2 ).join( '' );

			return ':~:text=' + encodeTextFragment( startWords ) + ',' + encodeTextFragment( endWords );
		}
	}

	return ':~:text=' + encodeTextFragment( normalized );
}

/**
 * Build the full shareable URL with text fragment for the current article.
 * Uses mw.util.getUrl() to resolve the article path, so both display titles
 * (wgTitle) and DB keys (wgPageName) are accepted.
 *
 * @param {string} articleTitle - Article title (display or DB key form)
 * @param {string} selectedText - The quoted text
 * @return {string} Full URL with text fragment
 */
function buildShareUrl( articleTitle, selectedText ) {
	const articlePath = mw.util.getUrl( articleTitle );
	const baseUrl = new URL( articlePath, location.origin ).href;
	const fragment = createTextFragmentDirective( selectedText );

	return baseUrl + '?wprov=' + WPROV_VALUE + '#' + fragment;
}

module.exports = {
	CHARS_THRESHOLD,
	buildShareUrl,
	createTextFragmentDirective,
	encodeTextFragment
};
