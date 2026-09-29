// Tracking key as registered in Test Kitchen / GrowthBook (see T435229).
const EXPERIMENT_NAME = 'preferred-sources';
const GROUP_TREATMENT = 'treatment';
const SUPPRESS_STORAGE_KEY = 'ext-readerexperiments-preferredsources-cta';
const CTA_MODULE = 'ext.readerExperiments/preferredSources.cta';
const WME_TEST_KITCHEN_MODULE = 'ext.wikimediaEvents.testKitchen';

// Google serves origin-only referrers ("https://www.google.com/"), so only
// the hostname is meaningful. Matches google.com, google.de, google.co.uk,
// google.com.au, etc. AI Overview clicks are indistinguishable from ordinary
// search clicks.
const GOOGLE_HOSTNAME_PATTERN = /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/;

/**
 * @param {string} referrer Typically document.referrer
 * @return {boolean}
 */
function isGoogleReferrer( referrer ) {
	if ( !referrer ) {
		return false;
	}

	let url;
	try {
		url = new URL( referrer );
	} catch ( e ) {
		return false;
	}

	return GOOGLE_HOSTNAME_PATTERN.test( url.hostname );
}

/**
 * Logged-out Minerva article views only. Test Kitchen enrolls readers
 * regardless of skin or login state. mw.user.isAnon() is false for
 * temporary accounts.
 *
 * @return {boolean}
 */
function isEligible() {
	return mw.config.get( 'skin' ) === 'minerva' &&
		mw.config.get( 'wgNamespaceNumber' ) === 0 &&
		mw.user.isAnon();
}

/**
 * Clicking the CTA or hard-dismissing it sets a permanent flag; a soft
 * dismissal sets one that lasts for the rest of the browsing session.
 *
 * @return {boolean}
 */
function isSuppressed() {
	return !!(
		mw.storage.get( SUPPRESS_STORAGE_KEY ) ||
		mw.storage.session.get( SUPPRESS_STORAGE_KEY )
	);
}

function getExperiment( experimentName ) {
	return mw.loader.using( 'ext.testKitchen' )
		.then( () => mw.testKitchen.getExperiment( experimentName ) )
		.catch( () => null );
}

/**
 * Produce the standard page_visit events (with the referrer class
 * in action_source) via WikimediaEvents' reusable anyPageVisit
 * instrumentation (T434837).
 *
 * @param {mw.testKitchen.ExperimentInterface} experiment
 */
function trackPageVisits( experiment ) {
	mw.loader.using( WME_TEST_KITCHEN_MODULE ).then( ( req ) => {
		const { anyPageVisit } = req( WME_TEST_KITCHEN_MODULE );
		experiment.use( anyPageVisit( { recordReferrerClass: true } ) );
	} ).catch( () => {
		// WikimediaEvents may be absent on development wikis.
	} );
}

function init() {
	// $wgReaderExperimentsPreferredSourcesDebug: local development only.
	const { debug } = require( './config.json' );

	getExperiment( EXPERIMENT_NAME ).then( ( experiment ) => {
		// Non-cache-splitting experiment: enrollment is only knowable here,
		// via the async Test Kitchen API. Bail if not enrolled.
		if ( !experiment || experiment.getAssignedGroup() === null ) {
			return;
		}

		if ( !isEligible() ) {
			return;
		}

		if ( debug || isGoogleReferrer( document.referrer ) ) {
			if (
				experiment.isAssignedGroup( GROUP_TREATMENT ) &&
				( debug || !isSuppressed() )
			) {
				mw.loader.using( CTA_MODULE ).then( ( req ) => {
					req( CTA_MODULE ).show( experiment, debug );
				} );
			}

			experiment.sendExposure();
		}

		trackPageVisits( experiment );
	} );
}

init();

module.exports = {
	SUPPRESS_STORAGE_KEY,
	isGoogleReferrer
};
