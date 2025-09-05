const { FastAverageColor } = require( 'fast-average-color' );
const { ref, watchEffect, readonly } = require( 'vue' );

/**
 * @typedef {import('../types').ImageData} ImageData
 * @typedef {import('fast-average-color').FastAverageColorResult} ColorResult
 * @typedef {import('vue').DeepReadonly<import('vue').Ref<ColorResult | null>>} ReadonlyColorRef
 */

/**
 * @param {import('vue').Ref<ImageData>} imageRef
 * @return {ReadonlyColorRef}
 */
module.exports = exports = function useBackgroundColor( imageRef ) {
	const colorResult = ref( null );

	watchEffect( async () => {
		const image = imageRef.value;
		if ( !image ) {
			return;
		}

		const apiBaseUri = mw.config.get( 'ReaderExperimentsApiBaseUri' );
		const imageElement = new Image();

		if ( apiBaseUri ) {
			imageElement.crossOrigin = 'anonymous';
		}

		imageElement.src = image.src;
		if ( imageElement.decode ) {
			await imageElement.decode();
		}

		const color = new FastAverageColor().getColor( imageElement, {
			algorithm: 'simple',
			width: image.width,
			height: image.height
		} );

		colorResult.value = color;
	} );

	return readonly( colorResult );
};
