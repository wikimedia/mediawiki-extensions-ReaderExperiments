const { SUPPRESS_STORAGE_KEY } = require( 'ext.readerExperiments/preferredSources' );
const CTA_BASE_URL = 'https://www.google.com/preferences/source?q=';

function teardownCta( app, container ) {
	app.unmount();
	container.remove();
}

/**
 * Keep the CTA from coming back on later arrivals from Google.
 *
 * @param {mw.SafeStorage} store `mw.storage` for good, after a click on the CTA
 *  or a hard dismissal; `mw.storage.session` for the rest of the session, after
 *  a soft dismissal
 * @param {boolean} debug Skip the flag so the CTA returns on every page view
 */
function suppressCta( store, debug ) {
	if ( !debug ) {
		store.set( SUPPRESS_STORAGE_KEY, '1' );
	}
}

/**
 * Mount the CTA and wire up its instrumentation.
 *
 * @param {mw.testKitchen.ExperimentInterface} experiment
 * @param {boolean} debug Skip localStorage suppression (local development)
 */
function show( experiment, debug ) {
	const Vue = require( 'vue' );
	const App = require( './App.vue' );

	const container = document.createElement( 'div' );
	document.body.appendChild( container );

	const app = Vue.createMwApp( App, {
		/**
		 * Fired when the user clicks the "learn more" button in the Toast
		 */
		onNoticeClick: () => {
			// eslint-disable-next-line camelcase
			experiment.send( 'click', { element_friendly_name: 'preferred_source_notice' } );
		},

		/**
		 * Fired when the user dismisses the Toast via swipe or x button
		 */
		onNoticeDismiss: () => {
			// eslint-disable-next-line camelcase
			experiment.send( 'dismiss', { element_friendly_name: 'preferred_source_notice' } );
			suppressCta( mw.storage.session, debug );
			teardownCta( app, container );
		},

		/**
		 * Stage 2 of the funnel: the CTA Dialog renders
		 */
		onCtaImpression: () => {
			// eslint-disable-next-line camelcase
			experiment.send( 'impression', { element_friendly_name: 'preferred_source_cta' } );
		},

		/**
		 * Fired when the user clicks the primary action in the CTA dialog.
		 * Opens a new tab with the Google preferred sources preference visible.
		 */
		onCtaClick: () => {
			// eslint-disable-next-line camelcase
			experiment.send( 'click', { element_friendly_name: 'preferred_source_cta' } );
			window.open(
				CTA_BASE_URL + encodeURIComponent( mw.config.get( 'wgServerName' ) ),
				'_blank',
				'noopener'
			);
			suppressCta( mw.storage, debug );
			teardownCta( app, container );
		},

		/**
		 * Fired when the user dismisses the dialog with close button, Esc key, or backdrop click.
		 * This is treated as a "soft dismiss" and persists for the session.
		 */
		onCtaDismiss: () => {
			// eslint-disable-next-line camelcase
			experiment.send( 'dismiss', { element_friendly_name: 'preferred_source_cta' } );
			suppressCta( mw.storage.session, debug );
			teardownCta( app, container );
		},

		/**
		 * Fired when the user clicks the "don't show again" button in the dialog.
		 * This is treated as a "hard dismiss", and persists indefinitely (in localstorage).
		 */
		onCtaSuppress: () => {
			experiment.send( 'dismiss', {
				// eslint-disable-next-line camelcase
				element_friendly_name: 'preferred_source_cta_dont_show_again'
			} );
			suppressCta( mw.storage, debug );
			teardownCta( app, container );
		}
	} );

	app.mount( container );

	// Stage 1 of the funnel: the notice actually rendered.
	// eslint-disable-next-line camelcase
	experiment.send( 'impression', { element_friendly_name: 'preferred_source_notice' } );
}

module.exports = { show };
