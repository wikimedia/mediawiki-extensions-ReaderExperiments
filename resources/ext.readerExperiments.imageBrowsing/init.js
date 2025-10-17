/**
 * @typedef {import('./types').InstrumentationPluginConfig} InstrumentationPluginConfig
 */

const Vue = require( 'vue' );
const App = require( './App.vue' );
const instrumentation = require( './plugins/instrumentationPlugin.js' );

// Instrumentation setup.
const EXPERIMENT_NAME = 'fy2025-26-we3.1-image-browsing-ab-test';
const SCHEMA_NAME = '/analytics/product_metrics/web/base/1.4.3';
// Naming convention: mediawiki.product_metrics.<product>_<component>_<interaction>.
// See https://wikitech.wikimedia.org/wiki/Experimentation_Lab/Stream_configuration#Choosing_a_stream_name
const STREAM_NAME = 'mediawiki.product_metrics.readerexperiments_imagebrowsing';
const INSTRUMENT_NAME = 'ImageBrowsingInstrument';

/**
 * @type {InstrumentationPluginConfig}
 */
const analyticsConfig = {
	enabled: false,
	experiment: null,
	instrumentName: INSTRUMENT_NAME
};

mw.loader.using( 'ext.xLab' )
	// Use a soft-require to determine whether xLab is available;
	// if so use it, if not then don't enable the instrumentation.
	.then( () => {
		const experiment = mw.xLab.getExperiment( EXPERIMENT_NAME );
		experiment.setSchema( SCHEMA_NAME );
		experiment.setStream( STREAM_NAME );

		analyticsConfig.enabled = true;
		analyticsConfig.experiment = experiment;
	} )
	// Mount the Vue app regardless of whether logging is enabled, but if so
	// then ensure the instrumentation plugin gets the appropriate config
	.always( () => {
		const imageBrowsingApp = Vue.createMwApp( App );
		imageBrowsingApp.use( instrumentation, analyticsConfig );
		imageBrowsingApp.mount( '#ext-readerExperiments-imageBrowsing' );
	} );
