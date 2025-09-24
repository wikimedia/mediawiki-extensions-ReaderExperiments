const { FastAverageColor } = require( 'fast-average-color' );
const { ref, watchEffect, readonly } = require( 'vue' );

/**
 * @typedef {import('types-mediawiki')} MediaWikiTypes
 * @typedef {import('../types').ImageData} ImageData
 * @typedef {import('fast-average-color').FastAverageColorResult} ColorResult
 * @typedef {import('vue').Ref<ColorResult | null>} ColorRef
 * @typedef {import('vue').DeepReadonly<ColorRef>} ReadonlyColorRef
 */

/**
 * Store a list of previously calculated average colors.
 *
 * @type {Map<string, ColorResult>}
 */
const backgroundMap = new Map();

/**
 * Calculate the background color for the given ImageData reference,
 * using the given `<img>` reference as a source.
 *
 * If a cached result is already available it will be immediately
 * available in the reactive read-only ref result, otherwise it will
 * resolve when the image loads.
 *
 * Image element must be same-origin CORS-friendly so its raw data
 * can be read into a canvas. If it's not already loaded it will be
 * triggered to load.
 *
 * @param {import('vue').Ref<ImageData>} imageRef reference to ImageData struct
 * @param {import('vue').Ref<Image>} imageElement reference to live img
 * @return {ReadonlyColorRef}
 */
module.exports = exports = function useBackgroundColor( imageRef, imageElement ) {
	const colorResult = ref( null );

	watchEffect( async () => {
		const image = imageRef.value;
		if ( !image ) {
			colorResult.value = null;
			return;
		}

		const cached = backgroundMap.get( image.name );
		if ( cached ) {
			colorResult.value = cached;
			return;
		}

		// No cached value ready, so we have to go looking at the HTML.
		const imgEl = imageElement.value;
		if ( !imgEl ) {
			return;
		}

		const compute = () => {
			if ( colorResult.value ||
				imageRef.value !== image ||
				imageElement.value !== imgEl
			) {
				// Stale load, ignore.
				return;
			}

			const recached = backgroundMap.get( image.name );
			if ( recached ) {
				// Another instance of this image loaded first, return cached data.
				colorResult.value = recached;
				return;
			}

			if ( !imgEl.complete ) {
				// Failure to load thumbnail, ignore.
				return;
			}

			// Check if the cache has been updated, otherwise calculate from the
			// loaded image.
			const color = new FastAverageColor().getColor( imgEl, {
				algorithm: 'simple',
				width: imgEl.naturalWidth,
				height: imgEl.naturalHeight
			} );
			backgroundMap.set( image.name, color );
			colorResult.value = color;
		};

		// Note: this will force thumbnails to load even if lazy-loading
		// would've kept them in limbo longer naturally.
		//
		// This *should* not be an issue at present, as we do not lazy-load
		// the images in the carousel or vtoc/scroll view.

		if ( imgEl.decode ) {
			await imgEl.decode();
		}
		if ( imgEl.complete ) {
			compute();
		} else {
			// Failed to load, but didn't throw an error.
			// This may happen in the test suite which doesn't support imageEl.decode().
		}
	} );
	return readonly( colorResult );
};
