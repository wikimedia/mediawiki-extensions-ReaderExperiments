const { computed } = require( 'vue' );
const { getCaptionIfAvailable } = require( '../thumbExtractor.js' );

/**
 * @typedef {import('vue').ComputedRef}
 */

/**
 * Vue composable for getting image caption text with fallback options
 *
 * Accepts an ImageData object or a reactive reference.
 *
 * @param {import('../types').ImageData|import('vue').Ref<import('../types').ImageData>} imageData
 *
 * @return {ComputedRef<string|null>} Object with caption computed property
 */
module.exports = exports = function useImageCaption( imageData ) {
	/**
	 * Try different ways to get caption text for the image.
	 * Falls back through multiple options:
	 * 1. figcaption from getCaptionIfAvailable
	 * 2. nearby paragraph text
	 * 3. escaped alt text
	 * 4. escaped filename without extension
	 */
	const caption = computed( () => {
		const image = imageData.value || imageData;
		if ( !image ) {
			return null;
		}
		const figcaption = getCaptionIfAvailable( image.container );
		const paragraphText = image.paragraph && image.paragraph;
		const altText = image.alt && mw.html.escape( image.alt );
		const titleText = image.title &&
			mw.html.escape( image.title.getFileNameTextWithoutExtension() );

		return (
			figcaption ||
			paragraphText ||
			altText ||
			titleText
		);
	} );

	return {
		caption
	};
};
