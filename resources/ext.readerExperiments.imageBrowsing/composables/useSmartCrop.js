/**
 * @typedef {import('types-mediawiki')} MediaWikiTypes
 */

let SmartCrop;
try {
	SmartCrop = require( 'smartcrop' );
} catch ( e ) {
	SmartCrop = {
		crop: async () => ( {
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			score: { detail: 0, saturation: 0, skin: 0, boost: 0, total: 0 }
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
	// Run SmartCrop
	const cropResult = await SmartCrop.crop( image, { minScale: 1.0, width, height } );

	// expose source dimensions
	return cropResult.topCrop;
};
