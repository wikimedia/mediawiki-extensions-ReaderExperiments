const CONFIG_KEY = 'wgReaderExperimentsPreferredSources';
const GROUP_TREATMENT = 'treatment';
const SUPPRESS_STORAGE_KEY = 'ext-readerexperiments-preferredsources-cta';
const CTA_BASE_URL = 'https://www.google.com/preferences/source?q=';

// Google serves origin-only referrers ("https://www.google.com/"), so only
// the hostname is meaningful. Matches google.com, google.de, google.co.uk,
// google.com.au, etc. AI Overview clicks are indistinguishable from ordinary
// search clicks.
const GOOGLE_HOSTNAME_PATTERN = /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/;

// Stand-in when Test Kitchen is unavailable (local dev, where the ?mpo
// enrollment override is mimicked in PHP): the CTA still renders, events
// go nowhere.
const NOOP_EXPERIMENT = {
	send: () => {},
	sendExposure: () => {}
};

/**
 * Classify document.referrer for instrumentation.
 *
 * @return {string} One of 'google', 'internal', 'external' or 'none'
 */
function classifyReferrer() {
	if ( !document.referrer ) {
		return 'none';
	}

	let url;
	try {
		url = new URL( document.referrer );
	} catch ( e ) {
		return 'none';
	}

	if ( GOOGLE_HOSTNAME_PATTERN.test( url.hostname ) ) {
		return 'google';
	}

	return url.hostname === location.hostname ? 'internal' : 'external';
}

function getExperiment( experimentName ) {
	return mw.loader.using( 'ext.testKitchen' )
		.then( () => mw.testKitchen.getExperiment( experimentName ) )
		.catch( () => null );
}

function teardownCta( app, container, debug ) {
	if ( !debug ) {
		mw.storage.set( SUPPRESS_STORAGE_KEY, '1' );
	}
	app.unmount();
	container.remove();
}

function showCta( experiment, debug ) {
	const Vue = require( 'vue' );
	const App = require( './App.vue' );

	const container = document.createElement( 'div' );
	document.body.appendChild( container );

	const app = Vue.createMwApp( App, {
		onCtaClick: () => {
			// eslint-disable-next-line camelcase
			experiment.send( 'click', { element_friendly_name: 'cta_button' } );
			window.open(
				CTA_BASE_URL + encodeURIComponent( mw.config.get( 'wgServerName' ) ),
				'_blank',
				'noopener'
			);
			teardownCta( app, container, debug );
		},
		onCtaDismiss: () => {
			// Covers both the dismiss button and swipe-dismissal on mobile.
			// eslint-disable-next-line camelcase
			experiment.send( 'click', { element_friendly_name: 'cta_dismiss_button' } );
			teardownCta( app, container, debug );
		}
	} );

	app.mount( container );

	// Impressions metric: the CTA actually rendered. Exposure alone
	// overcounts here, since suppressed users still log exposure.
	// eslint-disable-next-line camelcase
	experiment.send( 'show', { element_friendly_name: 'cta_toast' } );
}

function init() {
	const config = mw.config.get( CONFIG_KEY );

	if ( !config || !config.experimentName ) {
		return;
	}

	const referrerClass = classifyReferrer();
	// $wgReaderExperimentsPreferredSourcesDebug: local development only.
	const debug = !!config.debug;

	getExperiment( config.experimentName ).then( ( experiment ) => {
		experiment = experiment || NOOP_EXPERIMENT;

		// Every enrolled pageview, both groups, any referrer: per-subject
		// pageview counts are computed from these events (T435229).
		// eslint-disable-next-line camelcase
		experiment.send( 'page_visit', { action_source: referrerClass } );

		if ( !debug && referrerClass !== 'google' ) {
			return;
		}

		// Point of divergence: treatment sees the CTA, control does not.
		// Exposure must fire in both groups so the arms stay comparable.
		experiment.sendExposure();

		if (
			config.group === GROUP_TREATMENT &&
			( debug || !mw.storage.get( SUPPRESS_STORAGE_KEY ) )
		) {
			showCta( experiment, debug );
		}
	} );
}

init();

// Export for tests
module.exports = {
	classifyReferrer
};
