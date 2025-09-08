const { computed } = require( 'vue' );
const { getCaptionIfAvailable } = require( '../thumbExtractor.js' );

/**
 * @typedef {import('vue').ComputedRef}
 */

/**
 * Vue composable for getting image caption text with fallback options
 *
 * Accepts an ImageData reactive reference.
 *
 * @param {import('vue').Ref<import('../types').ImageData>} imageData
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
		if ( !imageData.value ) {
			return null;
		}
		const figcaption = getCaptionIfAvailable( imageData.value.container );
		const paragraphText = imageData.value.paragraph && imageData.value.paragraph;
		const altText = imageData.value.alt && mw.html.escape( imageData.value.alt );
		const titleText = imageData.value.title &&
			mw.html.escape( imageData.value.title.getFileNameTextWithoutExtension() );

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
