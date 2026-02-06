/**
 * Image generation utilities for converting DOM elements to images.
 * Uses html-to-image library for reliable DOM-to-canvas conversion.
 */

const htmlToImage = require( 'html-to-image' );

/**
 * Generate a PNG image blob from a DOM element.
 *
 * @param {HTMLElement} element - The DOM element to capture
 * @param {Object} [options] - Generation options
 * @param {number} [options.scale] - Pixel density multiplier (default: 2 for retina)
 * @param {string} [options.backgroundColor] - Background color (default: white)
 * @return {Promise<Blob>} PNG image as Blob
 */
function generateImageBlob( element, options ) {
	const scale = ( options && options.scale ) || 2;
	const backgroundColor = ( options && options.backgroundColor ) || '#ffffff';

	return htmlToImage.toBlob( element, {
		pixelRatio: scale,
		backgroundColor: backgroundColor,
		// Skip elements that might cause issues
		filter: function ( node ) {
			// Skip script tags
			if ( node.tagName === 'SCRIPT' ) {
				return false;
			}
			return true;
		}
	} );
}

/**
 * Convert a Blob to a File object for Web Share API.
 *
 * @param {Blob} blob - Image blob
 * @param {string} [filename] - Desired filename
 * @return {File} File object suitable for navigator.share()
 */
function blobToFile( blob, filename ) {
	return new File( [ blob ], filename || 'wikipedia-quote.png', {
		type: blob.type || 'image/png',
		lastModified: Date.now()
	} );
}

/**
 * Trigger a download of a blob as a file.
 *
 * @param {Blob} blob - The blob to download
 * @param {string} [filename] - Desired filename
 */
function downloadBlob( blob, filename ) {
	const url = URL.createObjectURL( blob );
	const link = document.createElement( 'a' );
	link.href = url;
	link.download = filename || 'wikipedia-quote.png';
	document.body.appendChild( link );
	link.click();
	document.body.removeChild( link );
	URL.revokeObjectURL( url );
}

module.exports = {
	generateImageBlob: generateImageBlob,
	blobToFile: blobToFile,
	downloadBlob: downloadBlob
};
