const { apiBaseUri } = require( '../config.json' );
const useMwApi = require( './useMwApi.js' );

let cacheEntityId = null;

/**
 * Most pages have an associated Wikibase entity ID, which can be used to link
 * similar pages across wikis together.
 * See e.g. https://www.wikidata.org/wiki/Q146, which has sitelinks to 200+
 * other wikipedias and a couple dozen pages on other projects.
 *
 * The page's associated entity ID (if it has one) is usually available via a
 * config variable, but we have some setups (local, patchdemo) where we may be
 * mirroring production content (via MobileFrontendContentProvider) and that
 * entity ID is not readily available, in which case we'll go fetch it through
 * that wiki's API.
 *
 * @return {Promise<string|null>}
 */
module.exports = async function useEntityId() {
	if ( cacheEntityId !== null ) {
		return cacheEntityId;
	}

	// Images from other wiki are based on the page's associated Wikibase entity ID
	cacheEntityId = mw.config.get( 'wgWikibaseItemId' );

	if ( cacheEntityId === null && apiBaseUri ) {
		// Instances that reach out to an external endpoint to serve their data
		// (e.g. local environments, patchdemo) are unlikely to have the associated
		// entity ID set, which makes things rather annoying to test.
		// So, for those environments only, we'll go ahead and try to grab it from
		// that endpoint's API.
		// Render time will be slightly delayed here because it requires an
		// additional request, which luckily is not required in production.
		const response = await useMwApi().get( {
			formatversion: 2,
			action: 'query',
			prop: 'pageprops',
			titles: mw.config.get( 'wgPageName' ),
			ppprop: 'wikibase_item'
		} );
		if ( !response.query.pages ) {
			return null;
		}

		const data = Object.values( response.query.pages );
		cacheEntityId = data[ 0 ] &&
			data[ 0 ].pageprops &&
			data[ 0 ].pageprops.wikibase_item ||
			null;
	}

	return cacheEntityId;
};
