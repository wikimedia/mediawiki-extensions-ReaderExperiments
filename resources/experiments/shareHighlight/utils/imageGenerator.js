/**
 * Image generation utilities for converting DOM elements to images.
 * Uses html-to-image library for reliable DOM-to-canvas conversion.
 */

const htmlToImage = require( 'ext.readerExperiments/lib/html-to-image' );

/**
 * Generate a PNG image blob from a DOM element.
 *
 * The background color is read from the element's computed style.
 *
 * @param {HTMLElement} element - The DOM element to capture
 * @param {Object} [options] - Generation options
 * @param {number} [options.scale] - Pixel density multiplier (default: 2 for retina)
 * @return {Promise<Blob>} PNG image as Blob
 */
function generateImageBlob( element, options ) {
	const scale = ( options && options.scale ) || 2;
	const computedBg = window.getComputedStyle( element ).backgroundColor;
	const backgroundColor = computedBg;
	const toBlobOptions = {
		pixelRatio: scale,
		// Skip elements that might cause issues
		filter: function ( node ) {
			// Skip script tags
			if ( node.tagName === 'SCRIPT' ) {
				return false;
			}
			return true;
		}
	};

	if ( backgroundColor ) {
		toBlobOptions.backgroundColor = backgroundColor;
	}

	return htmlToImage.toBlob( element, toBlobOptions );
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
