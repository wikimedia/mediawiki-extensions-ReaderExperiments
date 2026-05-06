const thumbExtractor = require( './thumbExtractor.js' );

module.exports = {
	thumbExtractor,
	getCaptionIfAvailable: thumbExtractor.getCaptionIfAvailable,
	fullUrls: thumbExtractor.fullUrls,
	imageSelectors: thumbExtractor.imageSelectors,
	excludedImageSelectors: require( './excludedImageSelectors.js' ),
	useBackgroundColor: require( './composables/useBackgroundColor.js' ),
	useContentImages: require( './composables/useContentImages.js' ),
	useImageModel: require( './composables/useImageModel.js' ),
	useSummary: require( './composables/useSummary.js' )
};
