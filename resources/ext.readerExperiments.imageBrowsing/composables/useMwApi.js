/**
 * @todo would be great to type this properly
 * @return {Object} MW API instance
 */
module.exports = exports = function useMwApi() {
	const apiBaseUri = mw.config.get( 'ReaderExperimentsApiBaseUri' );
	const api = apiBaseUri ?
		new mw.ForeignApi( apiBaseUri, { anonymous: true } ) :
		new mw.Api();
	return api;
};
