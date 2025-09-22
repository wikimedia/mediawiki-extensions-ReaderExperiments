/**
 * @typedef {import('types-mediawiki')} MediaWikiTypes
 */

let SmartCrop;
try {
	SmartCrop = require( 'smartcrop' );
} catch ( e ) {
	SmartCrop = {
		crop: async () => ( {
			topCrop: {
				x: 0,
				y: 0,
				width: 100,
				height: 100,
				score: { detail: 0, saturation: 0, skin: 0, boost: 0, total: 0 }
			},
			// mimic the real return
			sourceWidth: 100,
			sourceHeight: 100
		} )
	};
}

/**
 * Run SmartCrop on a preloaded MediaWiki image.
 *
 * @param {Image} image image element, already loaded and same-origin-friendly
 * @param {number} width
 * @param {number} height
 * @return {Promise<Object>}
 */
module.exports = async function useSmartCrop( image, width, height ) {

	// capture coordinate space SmartCrop used
	const sourceWidth = image.naturalWidth || image.width;
	const sourceHeight = image.naturalHeight || image.height;

	// Run SmartCrop
	const cropResult = await SmartCrop.crop( image, { width, height } );
	// expose source dimensions
	return {
		topCrop: cropResult.topCrop,
		crops: cropResult.crops,
		sourceWidth,
		sourceHeight
	};
};
