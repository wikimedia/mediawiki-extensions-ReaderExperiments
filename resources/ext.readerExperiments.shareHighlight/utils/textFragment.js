/**
 * Utilities for generating text fragment URLs.
 * Text fragments allow linking to specific text passages in a page.
 * Spec: https://wicg.github.io/scroll-to-text-fragment/
 */

/**
 * Encode text for use in a text fragment URL.
 * Special characters must be percent-encoded.
 *
 * @param {string} text - Raw text to encode
 * @return {string} Encoded text safe for URL fragment
 */
function encodeTextFragment( text ) {
	// Normalize whitespace
	const normalized = text.trim().replace( /\s+/g, ' ' );
	return encodeURIComponent( normalized );
}

/**
 * Generate a text fragment directive for the given text.
 * For long texts (>100 chars), uses start,end range format.
 *
 * Format: :~:text=[prefix-,]start[,end][,-suffix]
 *
 * @param {string} text - The selected text
 * @return {string} Text fragment directive (without leading #)
 */
function createTextFragmentDirective( text ) {
	const normalized = text.trim().replace( /\s+/g, ' ' );

	// For long quotes, use start and end range format
	if ( normalized.length > 100 ) {
		const words = normalized.split( ' ' );
		const startWords = words.slice( 0, 5 ).join( ' ' );
		const endWords = words.slice( -5 ).join( ' ' );

		return ':~:text=' + encodeTextFragment( startWords ) + ',' + encodeTextFragment( endWords );
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

	return baseUrl + '#' + fragment;
}

module.exports = {
	buildShareUrl: buildShareUrl
};
