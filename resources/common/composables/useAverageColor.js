const { FastAverageColor } = require( 'ext.readerExperiments/lib/fast-average-color' );
const { onUnmounted, readonly, ref, watchEffect } = require( 'vue' );

/**
 * @typedef {import('types-mediawiki')} MediaWikiTypes
 * @typedef {import('../../lib/fast-average-color').FastAverageColorResult} ColorResult
 * @typedef {import('vue').Ref<ColorResult | null>} ColorRef
 * @typedef {import('vue').DeepReadonly<ColorRef>} ReadonlyColorRef
 */

/**
 * Store a list of previously calculated average colors.
 *
 * @type {Map<string, ColorRef>}
 */
const colorsMap = new Map();

/**
 * Store a list of previously bound listeners.
 *
 * @type {Map<HTMLImageElement, ColorRef>}
 */
const listenersMap = new Map();

/**
 * @param {HTMLImageElement} imageElement
 * @param {string} imageName
 * @return {ReadonlyColorRef}
 */
function computeColor( imageElement, imageName ) {
	const cached = colorsMap.get( imageName );
	if ( cached ) {
		// Another instance of this image loaded first, return cached data.
		return cached;
	}

	if ( !imageElement.complete ) {
		// Failure to load thumbnail, ignore.
		throw new Error( 'Image not complete' );
	}

	const colorRef = ref( null );
	colorsMap.set( imageName, colorRef );

	const color = new FastAverageColor().getColor( imageElement, {
		algorithm: 'simple',
		silent: true,
		width: imageElement.naturalWidth,
		height: imageElement.naturalHeight
	} );

	if ( color.error ) {
		colorsMap.delete( imageName );
		throw color.error;
	}

	colorRef.value = color;

	return readonly( colorRef );
}

/**
 * Calculate the background color for the given <img> element reference.
 *
 * If a cached result is already available it will be immediately
 * available in the reactive read-only ref result, otherwise it will
 * resolve when the image loads.
 *
 * Image element must be same-origin CORS-friendly so its raw data
 * can be read into a canvas. If it's not already loaded it will be
 * triggered to load.
 *
 * @param {import('vue').Ref<HTMLImageElement | null>} imageElementRef reference to live <img>
 * @return {ReadonlyColorRef}
 */
module.exports = exports = function useAverageColor( imageElementRef ) {
	const colorRef = ref( null );
	let previousElement = null;

	/**
	 * @param {string} src
	 * @return {string | null}
	 */
	const nameFromSrc = ( src ) => {
		const parsedUrl = mw.util.parseImageUrl( src );
		return parsedUrl ? parsedUrl.name : null;
	};

	/**
	 * @param {HTMLImageElement} loadedImageElement
	 */
	const process = async ( loadedImageElement ) => {
		const loadedImageName = nameFromSrc( loadedImageElement.src );
		if ( !loadedImageName ) {
			colorRef.value = null;
			return;
		}

		let color;
		try {
			color = await computeColor( loadedImageElement, loadedImageName );
		} catch ( e ) {
			// Failures are acceptable, we just don't want them
			// polluting console
			colorRef.value = null;
			return;
		}

		const currentImageElement = imageElementRef.value;
		const currentImageName = nameFromSrc( currentImageElement.src );
		if ( loadedImageName === currentImageName ) {
			// It could take some time for images to have completed loading,
			// and this data having become available, so it is possible that
			// the data we worked on is no longer relevant.
			// We've cached whatever we could get from the image that was
			// loaded (in case we need it again later), but before we
			// actually update the result, we need to make sure it is still
			// accurate/relevant for the current input.
			colorRef.value = color;
		}
	};

	const onLoad = ( event ) => process( event.target );

	// Send src mutations through the same process, where it can potentially
	// read from cache before the image is even loaded (or otherwise fail,
	// in which case we'll have to wait for the "load" handler to have a
	// go at it)
	const observer = new MutationObserver( ( records ) => {
		records.forEach( ( record ) => process( record.target ) );
	} );

	/**
	 * @param {HTMLImageElement} imageElement
	 */
	const addHandlers = ( imageElement ) => {
		imageElement.addEventListener( 'load', onLoad );
		observer.observe(
			imageElement,
			{
				attributes: true,
				attributeFilter: [ 'src' ]
			}
		);
	};

	/**
	 * @param {HTMLImageElement} [imageElement]
	 */
	const removeHandlers = ( imageElement ) => {
		if ( imageElement ) {
			imageElement.removeEventListener( 'load', onLoad );
		}
		observer.disconnect();
	};

	watchEffect( () => {
		if ( !imageElementRef.value ) {
			colorRef.value = null;
			return;
		}

		// Remove listeners on the old node
		removeHandlers( previousElement );
		previousElement = null;

		const cached = listenersMap.get( imageElementRef.value );
		if ( cached ) {
			// We're already listening to this node, in which case we can simply
			// re-use the already known (or in-flight) result
			colorRef.value = cached.value;
		} else {
			// Keep track of the fact that we'll be binding to this node, so that
			// subsequent calls to the same node can simply re-use this same color ref
			listenersMap.set( imageElementRef.value, colorRef );

			// If the image is already available, start processing it immediately
			if ( imageElementRef.value.complete ) {
				process( imageElementRef.value );
			}

			// Bind to the given image event, to calculate the color as soon as the
			// image becomes available.
			addHandlers( imageElementRef.value );
			previousElement = imageElementRef.value;
		}
	} );

	onUnmounted( () => {
		removeHandlers( previousElement );
		previousElement = null;
	} );

	return readonly( colorRef );
};
