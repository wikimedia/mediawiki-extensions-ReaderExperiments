/**
 * Truncate text to a maximum length with ellipsis.
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @return {string} Truncated text
 */
module.exports = function truncateText( text, maxLength ) {
	if ( text.length <= maxLength ) {
		return text;
	}
	return text.slice( 0, maxLength - 1 ).trim() + '\u2026';
};
