const useAltText = require( './useAltText.js' );

/**
 * Wrap an internationalized message eg "select image <image description>"
 * around the alt text or short name of the image.
 *
 * @param {importTypes('../types.d.ts').ImageData?} image
 * @return {string?}
 */
function useImageLabel( image ) {
	if ( image ) {
		return mw.message(
			'readerexperiments-imagebrowsing-carousel-item-button-label',
			useAltText( image )
		).text();
	}
	return null;
}

module.exports = exports = useImageLabel;
