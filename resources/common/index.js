const thumbExtractor = require( './thumbExtractor.js' );

module.exports = {
	thumbExtractor,
	getCaptionIfAvailable: thumbExtractor.getCaptionIfAvailable,
	fullUrls: thumbExtractor.fullUrls,
	imageSelectors: thumbExtractor.imageSelectors,
	excludedImageSelectors: require( './excludedImageSelectors.js' ),
	useContentImages: require( './composables/useContentImages.js' ),
	useBackgroundColor: require( './composables/useBackgroundColor.js' ),
	useImageModel: require( './composables/useImageModel.js' )
};
