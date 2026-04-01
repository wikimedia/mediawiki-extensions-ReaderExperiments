const { apiBaseUri } = require( '../config.json' );

/**
 * @typedef {import('types-mediawiki')} MediaWikiTypes
 */

/**
 * @return {mw.Api|mw.ForeignApi} MW API instance
 */
module.exports = exports = function useMwApi() {
	const api = apiBaseUri ?
		new mw.ForeignApi( apiBaseUri, { anonymous: true } ) :
		new mw.Api();
	return api;
};
