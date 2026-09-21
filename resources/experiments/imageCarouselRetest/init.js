// TODO(image-carousel-retest): Remove this experiment-only file after the retest.
// See README.md for the coordinated cleanup across ReaderExperiments and MMV.
const instrumentation = require( 'ext.readerExperiments.imageCarouselRetest' );
let started;

/**
 * Apply the server-selected arm only after confirming the client SDK agrees.
 * A shared promise makes repeated initialization harmless on the same page.
 *
 * @return {Promise<boolean>} Whether readiness was successfully recorded
 */
function start() {
	if ( !started ) {
		started = applyExperience().catch( () => {
			mw.log.warn( '[Image Carousel Retest] Could not initialize the assigned experience.' );
			return false;
		} );
	}
	return started;
}

/**
 * MMV owns page/image eligibility; consume its result rather than counting the
 * rendered thumbnails, which do not exist for control.
 *
 * @return {Promise<boolean>}
 */
async function applyExperience() {
	const config = mw.config.get( 'wgReaderExperimentsImageCarouselRetest' );
	if ( !config ) {
		return false;
	}
	const experience = await instrumentation.prepareExperience( {
		isLoggedOut: mw.user.isAnon(),
		isMobile: mw.config.get( 'wgMFMode', null ) !== null,
		skin: mw.config.get( 'skin' ),
		namespaceId: mw.config.get( 'wgNamespaceNumber' ),
		pageEligible: config.pageEligible,
		imageCount: config.imageCount
	} );
	if ( !experience.eligible || experience.assignment.group !== config.group ) {
		// Fail closed: leave deferred treatment markup hidden and send no exposure.
		return false;
	}

	if ( experience.assignment.showCarousel ) {
		const require = await mw.loader.using( 'mmv.carousel' );
		const applied = await require( 'mmv.carousel' ).initialize( experience.assignment );
		if ( !applied ) {
			return false;
		}
	} else if ( document.getElementById( 'mmv-carousel-root' ) ) {
		// Control must never expose a carousel, including one from another loader.
		document.getElementById( 'mmv-carousel-root' ).remove();
	}

	// Treatments have mounted and applied all options; control has no carousel.
	// Register action logging and delegate exposure/page visits to the helper.
	return experience.experienceReady();
}

// MMV adds the carousel markup during page rendering. Wait until the DOM is
// ready before applying the assigned UI.
$( () => {
	start();
} );

module.exports = start;
