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
 * Store a list of promises for images that are currently loading.
 *
 * @type {Map<HTMLImageElement, Promise<HTMLImageElement>>}
 */
const loadMap = new Map();

/**
 * @param {HTMLImageElement} imageElement
 * @return {Promise<HTMLImageElement>}
 */
function waitForImageLoad( imageElement ) {
	const existing = loadMap.get( imageElement );
	if ( existing ) {
		// Prevent attaching multiple event listeners to the same node if we're
		// already monitoring it.
		return existing;
	}

	const promise = new Promise( ( resolve, reject ) => {
		if ( imageElement.complete ) {
			resolve( imageElement );
		} else {
			// Note: we can't use `await imageElement.decode()` because we want to respect
			// lazy-loading and only calculate once one of the thumbs gets loaded.

			// eslint-disable-next-line prefer-const
			let cleanup;

			const onLoad = () => {
				cleanup();
				resolve( imageElement );
			};

			const onError = () => {
				// Failed; likely a network error or the overlay was closed
				// during loading.
				cleanup();
				reject( 'Failed to load image ' + imageElement.src );
			};

			cleanup = () => {
				imageElement.removeEventListener( 'load', onLoad );
				imageElement.removeEventListener( 'error', onError );
			};

			imageElement.addEventListener( 'load', onLoad );
			imageElement.addEventListener( 'error', onError );
		}
	} );

	loadMap.set( imageElement, promise );
	return promise;
}

/**
 * @param {HTMLImageElement} imageElement
 * @param {ImageData} imageData
 * @return {ColorResult}
 */
function computeColor( imageElement, imageData ) {
	const cached = backgroundMap.get( imageData.name );
	if ( cached ) {
		// Another instance of this image loaded first, return cached data.
		return cached;
	}

	if ( !imageElement.complete ) {
		// Failure to load thumbnail, ignore.
		throw new Error( 'Failed to load image ' + imageElement.src );
	}

	const color = new FastAverageColor().getColor( imageElement, {
		algorithm: 'simple',
		silent: true,
		width: imageElement.naturalWidth,
		height: imageElement.naturalHeight
	} );

	if ( color.error ) {
		throw new Error( 'Failed to use image ' + imageElement.src );
	}

	backgroundMap.set( imageData.name, color );
	return color;
}

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
 * @param {import('vue').Ref<ImageData>} imageDataRef reference to ImageData struct
 * @param {import('vue').Ref<HTMLImageElement>} imageElementRef reference to live img
 * @return {ReadonlyColorRef}
 */
module.exports = exports = function useBackgroundColor( imageDataRef, imageElementRef ) {
	const colorResult = ref( null );

	watchEffect( () => {
		const imageData = imageDataRef.value;
		const imageElement = imageElementRef.value;

		if ( !imageData ) {
			colorResult.value = null;
			return;
		}

		const cached = backgroundMap.get( imageData.name );
		if ( cached ) {
			colorResult.value = cached;
			return;
		}

		const isStale = () => imageData !== imageDataRef.value || imageElement !== imageElementRef.value;
		const updateIfNotStale = ( color ) => {
			// It could take some time for images to have completed loading,
			// and this data having become available, so it is possible that
			// the data we worked on is no longer relevant.
			// We've cached whatever we could get from the image that was
			// loaded (in case we need it again later), but before we
			// actually update the result, we need to make sure it is still
			// accurate/relevant for the current input.
			if ( !isStale() ) {
				colorResult.value = color;
			}
		};

		// Bind to the given image event, to calculate the color as soon as the
		// image becomes available.
		if ( imageElement ) {
			waitForImageLoad( imageElement )
				.then( ( node ) => computeColor( node, imageData ) )
				.then( ( color ) => updateIfNotStale( color ) )
				.catch( () => {
					// Failures are acceptable, we just don't want them
					// polluting console
				} );
		}
	} );
	return readonly( colorResult );
};
