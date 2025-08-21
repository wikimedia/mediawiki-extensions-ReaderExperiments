const { FastAverageColor } = require( 'fast-average-color' );

/**
 * @param {string} src
 * @param {number} width
 * @param {number} height
 *
 * @return {import('fast-average-color').FastAverageColorResult}
 */
module.exports = exports = async function useBackgroundColor(
	src,
	width,
	height
) {
	const apiBaseUri = mw.config.get( 'ReaderExperimentsApiBaseUri' );
	const image = new Image();

	if ( apiBaseUri ) {
		image.crossOrigin = 'anonymous';
	}

	image.src = src;
	await image.decode();

	const color = new FastAverageColor().getColor( image, {
		algorithm: 'simple',
		width: width,
		height: height
	} );

	return color;
};
