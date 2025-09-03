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
			}
		} )
	};
}

/**
 * Run SmartCrop on a MediaWiki file by name.
 *
 * @param {string} apiBaseUri
 * @param {string} fileName
 * @param {number} width
 * @param {number} height
 * @return {Promise<Object>}
 */
module.exports = async function useSmartCrop( apiBaseUri, fileName, width, height ) {
	// Make a ForeignApi client
	const foreign = new mw.ForeignApi( apiBaseUri, { anonymous: true } );

	// Ask for the canonical file URL
	const result = await foreign.get( {
		action: 'query',
		titles: fileName,
		prop: 'imageinfo',
		iiprop: 'url',
		format: 'json'
	} );

	if ( !result.query || !result.query.pages ) {
		throw new Error( `[useSmartCrop] Invalid API response for ${ fileName }` );
	}

	const pages = result.query.pages;
	const firstPage = Object.values( pages )[ 0 ];
	if ( !firstPage || !firstPage.imageinfo ) {
		throw new Error( `[useSmartCrop] Could not resolve URL for ${ fileName }` );
	}

	const url = firstPage.imageinfo[ 0 ].url;

	// Load the image with CORS enabled
	const image = new Image();
	image.crossOrigin = 'anonymous';
	image.src = url;
	await image.decode();

	// Run SmartCrop
	const cropResult = await SmartCrop.crop( image, { width, height } );
	return cropResult;
};
