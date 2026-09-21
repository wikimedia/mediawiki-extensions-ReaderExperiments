// TODO(image-carousel-retest): Remove this experiment-only file after the retest.
// See README.md for the coordinated cleanup across ReaderExperiments and MMV.
/**
 * Shared eligibility for all arms; independent of whether a carousel is rendered.
 * The caller supplies page eligibility and the count from the same image
 * extractor used to render treatments.
 *
 * @param {Object} context Page and reader facts
 * @param {Object} [rules] Provisional eligibility settings
 * @param {number} [rules.minimumImages] Minimum eligible image count
 * @return {boolean}
 */
function isEligible( context, { minimumImages = 3 } = {} ) {
	return context.isLoggedOut === true &&
		context.isMobile === true &&
		context.skin === 'minerva' &&
		context.namespaceId === 0 &&
		context.pageEligible === true &&
		Number.isInteger( minimumImages ) && minimumImages > 0 &&
		Number.isInteger( context.imageCount ) && context.imageCount >= minimumImages;
}

module.exports = isEligible;
