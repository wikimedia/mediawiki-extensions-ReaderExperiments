/**
 * @typedef {import('./types').InstrumentationPluginConfig} InstrumentationPluginConfig
 */

const Vue = require( 'vue' );
const App = require( './App.vue' );
const instrumentation = require( './plugins/instrumentationPlugin.js' );

/**
 * Check if the current browser is supported.
 * Exclude iOS 14 and below, and Android 9 and below from
 * the image browsing experiment.
 *
 * User agent is not always reliable, so if we can't determine
 * the user agent then show the experimental feature.
 *
 * Examples of user agents: "iPhone OS 15_8", "Android 10", "Windows 10"
 *
 * @return {boolean}
 */
function isSupportedBrowser() {
	// Capture groups: 1 = iOS version, 2 = Android version
	const deviceRegExp = /iP(?:hone|ad|od).+OS (\d+)|Android (\d+)/;
	const match = navigator.userAgent.match( deviceRegExp );

	// If it's not iOS or Android, then allow all other browsers.
	if ( !match ) {
		return true;
	}

	const iOSVersion = match[ 1 ];
	if ( iOSVersion ) {
		// Exclude iOS 14 and below.
		return parseInt( iOSVersion, 10 ) >= 15;
	}

	const androidVersion = match[ 2 ];
	if ( androidVersion ) {
		// Exclude Android 9 and below.
		return parseInt( androidVersion, 10 ) >= 10;
	}

	// Versions are undetermined, allow by default.
	return true;
}

// Early exit if browser is not supported
if ( !isSupportedBrowser() ) {
	// eslint-disable-next-line no-console
	console.log( '[ImageBrowsing] Browser not supported; skipping initialization.' );
	// Exit early - do not initialize the app
	return;
}

//
// Instrumentation setup
//

// Tier 1: 10% Arabic, Chinese, French, Indonesian, and Vietnamese Wikipedias.
// https://mpic.wikimedia.org/experiment/fy2025-26-we3.1-image-browsing-ab-test
const TIER_ONE_EXPERIMENT_NAME = 'fy2025-26-we3.1-image-browsing-ab-test';
// Tier 2: 0.1% English Wikipedia.
// https://mpic.wikimedia.org/experiment/image-browsing-enwiki
const TIER_TWO_EXPERIMENT_NAME = 'image-browsing-enwiki';
const SCHEMA_NAME = '/analytics/product_metrics/web/base/2.0.0';
// Naming convention: mediawiki.product_metrics.<product>_<component>_<interaction>.
// See https://wikitech.wikimedia.org/wiki/Test_Kitchen/Stream_configuration#Choosing_a_stream_name
const STREAM_NAME = 'mediawiki.product_metrics.readerexperiments_imagebrowsing';
const INSTRUMENT_NAME = 'ImageBrowsingInstrument';

/**
 * @type {InstrumentationPluginConfig}
 */
const analyticsConfig = {
	enabled: false,
	instrumentName: INSTRUMENT_NAME,
	experiments: null
};

mw.loader.using( 'ext.testKitchen' )
	// Use a soft-require to determine whether Test Kitchen is available;
	// if so use it, if not then don't enable the instrumentation.
	.then( () => {
		const tierOne = mw.testKitchen.getExperiment( TIER_ONE_EXPERIMENT_NAME );
		tierOne.setSchema( SCHEMA_NAME );
		tierOne.setStream( STREAM_NAME );

		const tierTwo = mw.testKitchen.getExperiment( TIER_TWO_EXPERIMENT_NAME );
		tierTwo.setSchema( SCHEMA_NAME );
		tierTwo.setStream( STREAM_NAME );

		analyticsConfig.enabled = true;
		analyticsConfig.experiments = [ tierOne, tierTwo ];
	} )
	// Mount the Vue app regardless of whether logging is enabled, but if so
	// then ensure the instrumentation plugin gets the appropriate config
	.always( () => {
		const imageBrowsingApp = Vue.createMwApp( App );
		imageBrowsingApp.use( instrumentation, analyticsConfig );
		imageBrowsingApp.mount( '#ext-readerExperiments-imageBrowsing' );
	} );
