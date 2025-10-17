/**
 * Instrumentation Plugin
 *
 * This plugin adds a new `$submitInteraction` method to all components in the
 * target Vue app. Depending on the configuration provided, that method will either
 * call `mw.xLab.Experiment#send` with appropriate arguments (including experiment
 * instance and instrument name provided in config) or it will do nothing.
 *
 * @see https://vuejs.org/guide/reusability/plugins
 */
module.exports = exports = {
	/**
	 * @param {import('vue').App} app
	 * @param {import('../types.d').InstrumentationPluginConfig} options
	 */
	install( app, options ) {
		/**
		 * @param {string} action
		 * @param {Object} interactionData
		 */
		const submitInteraction = ( action, interactionData ) => {
			if ( options.enabled && options.experiment ) {
				// eslint-disable-next-line camelcase
				interactionData.instrument_name = options.instrumentName;

				options.experiment.send(
					action,
					interactionData
				);
			} else {
				// Do nothing if logging is not enabled explicitly.
				return;
			}
		};

		// Add click event listeners to eventual links in a reactive container element.
		const manageLinkEventListeners = ( container, handler, remove = false ) => {
			const element = container.value;
			if ( !element ) {
				return;
			}
			const links = element.querySelectorAll( 'a' );
			links.forEach( ( link ) => {
				link.removeEventListener( 'click', handler );
				if ( !remove ) {
					link.addEventListener( 'click', handler );
				}
			} );
		};

		app.provide( 'submitInteraction', submitInteraction );
		app.provide( 'manageLinkEventListeners', manageLinkEventListeners );
	}
};
