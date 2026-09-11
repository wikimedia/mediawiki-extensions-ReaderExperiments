/**
 * Format a file size into something readable.
 *
 * Adapted from Special:Upload code in MediaWiki core. This isn't a
 * perfect solution—for example, it will use a dot as the decimal
 * separator, which isn't how it's done in every language — but it gets
 * us most of the way there without reimplementing the lengthy and
 * complex Language::formatNum method.
 *
 * @param {number} size
 * @return {string} Size to the hundredths place plus units
 */
module.exports = function formatSize( size ) {
	const sizeMsgs = [
		'size-bytes',
		'size-kilobytes',
		'size-megabytes',
		'size-gigabytes'
	];

	while ( size >= 1024 && sizeMsgs.length > 1 ) {
		size /= 1024;
		sizeMsgs.shift();
	}

	let decimalPlace = 1;
	// To match what the Language::formatSize method is doing, we'll
	// only show decimal places for MB and larger.
	if ( sizeMsgs.length <= 2 ) {
		decimalPlace = 100;
	}

	// Ensure that the rounded numerical digits fed to the size messages
	// are provided in the appropriate language; Bangle and Farsi must
	// not use Arabic numbers for example. https://phabricator.wikimedia.org/T274614
	const sizeDigitsInLanguage = mw.language.convertNumber(
		Math.round( size * decimalPlace ) / decimalPlace
	);

	// The following messages are used here:
	// * size-bytes
	// * size-kilobytes
	// * size-megabytes
	// * size-gigabytes
	return mw.msg( sizeMsgs[ 0 ], sizeDigitsInLanguage );
};
