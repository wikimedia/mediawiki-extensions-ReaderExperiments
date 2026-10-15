// TODO(image-carousel-retest-v2): Remove this experiment-only file after the retest.
// See README.md for the coordinated cleanup across ReaderExperiments and MMV.
const instrumentation = require( 'ext.readerExperiments.imageCarouselRetest' );
let started;

/**
 * Apply the server-selected arm only after confirming the client SDK agrees.
 * A shared promise makes repeated initialization harmless on the same page.
 *
 * @return {Promise<boolean>} Whether tracking and UI initialization succeeded
 */
function start() {
	if ( !started ) {
		started = applyExperience().catch( ( error ) => {
			mw.log.warn( '[Image Carousel Retest] Could not initialize the assigned experience.', error );
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
	if ( !experience.eligible ) {
		return false;
	}
	if ( experience.assignment.group !== config.group ) {
		mw.errorLogger.logError(
			new Error( `[Image Carousel Retest] Assignment mismatch: server=${ config.group }, client=${ experience.assignment.group }.` ),
			'error.ReaderExperiments'
		);
		return false;
	}

	// The server has already varied the page output. Record both arms before
	// treatment initialization, so a carousel failure cannot suppress exposure.
	// A telemetry failure returns false but must not prevent UI initialization.
	const recorded = await experience.experienceReady();

	if ( experience.assignment.showCarousel ) {
		const require = await mw.loader.using( 'mmv.carousel' );
		const applied = await require( 'mmv.carousel' ).initialize( experience.assignment );
		if ( !applied ) {
			return false;
		}
		await experience.carouselInitialized();
	} else if ( document.getElementById( 'mmv-carousel-root' ) ) {
		// Control must never expose a carousel, including one from another loader.
		document.getElementById( 'mmv-carousel-root' ).remove();
	}

	return recorded;
}

// MMV adds the carousel markup during page rendering. Wait until the DOM is
// ready before applying the assigned UI.
$( () => {
	start();
} );

module.exports = start;
