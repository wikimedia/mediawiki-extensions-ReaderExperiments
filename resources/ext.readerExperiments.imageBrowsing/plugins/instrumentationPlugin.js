/**
 * Instrumentation Plugin
 *
 * This plugin is adds a new `$submitInteraction` method to all components in the
 * target Vue app. Depending on the configuration provided, that method will either
 * call `mw.eventLog.submitInteraction` with appropriate arguments (including event
 * stream name and schema provided in config) or it will do nothing.
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
			if ( options.enabled ) {
				mw.eventLog.submitInteraction(
					options.eventStream,
					options.schema,
					action,
					interactionData
				);
			} else {
				// Do nothing if logging is not enabled explicitly.
				return;
			}
		};

		app.provide( 'submitInteraction', submitInteraction );
	}
};
