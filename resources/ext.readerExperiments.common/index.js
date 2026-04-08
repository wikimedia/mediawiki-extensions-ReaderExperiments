const thumbExtractor = require( './thumbExtractor.js' );

module.exports = {
	thumbExtractor,
	getCaptionIfAvailable: thumbExtractor.getCaptionIfAvailable,
	fullUrls: thumbExtractor.fullUrls,
	excludedImageSelectors: require( './excludedImageSelectors.js' ),
	useContentImages: require( './composables/useContentImages.js' ),
	useBackgroundColor: require( './composables/useBackgroundColor.js' )
};
