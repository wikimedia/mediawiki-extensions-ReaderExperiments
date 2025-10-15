/**
 * Wrap a pleasing internationalized message around the short
 * description / alt text of the image.
 *
 * @param {importTypes('../types.d.ts').ImageData?} image
 * @return {string?}
 */
function useAltText( image ) {
	if ( image ) {
		return image.alt ?
			image.alt :
			mw.message(
				'readerexperiments-imagebrowsing-image-alt-text',
				image.title ?
					image.title.getFileNameTextWithoutExtension() :
					image.name
			).text();
	}
	return null;
}

module.exports = exports = useAltText;
