/**
 * @typedef {import('./types').InstrumentationPluginConfig} InstrumentationPluginConfig
 */

const Vue = require( 'vue' );
const App = require( './App.vue' );
const instrumentation = require( './plugins/instrumentationPlugin.js' );

// Analytics configuration
// Naming convention: mediawiki.product_metrics.<product>_<component>_<interaction>.
// See https://wikitech.wikimedia.org/wiki/Experimentation_Lab/Stream_configuration#Choosing_a_stream_name
const EVENT_STREAM = 'mediawiki.product_metrics.readerexperiments_imagebrowsing';
const SCHEMA = '/analytics/product_metrics/web/base/1.4.3';

/**
 * @type {InstrumentationPluginConfig}
 */
const analyticsConfig = {
	enabled: false,
	eventStream: EVENT_STREAM,
	schema: SCHEMA
};

mw.loader.using( [ 'ext.eventLogging' ] )
	// Use a soft-require to determine  whether the event logging system is
	// available; if so use it, if not then don't enable the instrumentation
	.then( () => {
		analyticsConfig.enabled = true;
	} )
	// Mount the Vue app regardless of whether logging is enabled, but if so
	// then ensure the instrumentation plugin gets the appropriate config
	.always( () => {
		const imageBrowsingApp = Vue.createMwApp( App );
		imageBrowsingApp.use( instrumentation, analyticsConfig );
		imageBrowsingApp.mount( '#ext-readerExperiments-imageBrowsing' );
	} );
