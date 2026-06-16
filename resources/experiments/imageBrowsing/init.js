/**
 * @typedef {import('./types').InstrumentationPluginConfig} InstrumentationPluginConfig
 */

const Vue = require( 'vue' );
const App = require( './App.vue' );

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

const imageBrowsingApp = Vue.createMwApp( App );
imageBrowsingApp.mount( '#ext-readerExperiments-imageBrowsing' );
