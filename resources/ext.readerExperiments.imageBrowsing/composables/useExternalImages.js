const useContentImages = require( './useContentImages.js' );
const useMediaSearchResults = require( './useMediaSearchResults.js' );
const useUniqueExternalGlobalUsageWikis = require( './useUniqueExternalGlobalUsageWikis.js' );
const useMwApi = require( './useMwApi.js' );

let cacheEntityId = null;
let cacheExternalImages = null;

/**
 * @return {Promise<string|null>}
 */
async function getEntityId() {
	if ( cacheEntityId !== null ) {
		return cacheEntityId;
	}

	// Images from other wiki are based on the page's associated Wikibase entity ID
	cacheEntityId = mw.config.get( 'wgWikibaseItemId' );

	if ( cacheEntityId === null && mw.config.get( 'ReaderExperimentsApiBaseUri' ) ) {
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
		cacheEntityId = data[ 0 ] && data[ 0 ].pageprops && data[ 0 ].pageprops.wikibase_item || null;
		return cacheEntityId;
	}
}

/**
 * @param {Object} result A singular value from the results of useMediaSearchResults
 * @return {import('./types').ImageData|null}
 */
function resultToImageData( result ) {
	if ( !result.imageinfo || !result.imageinfo[ 0 ] ) {
		return null;
	}

	const thumbnailUrl = result.imageinfo[ 0 ].thumburl || result.imageinfo[ 0 ].url;

	// eslint-disable-next-line no-unused-vars
	const { name, width, resizeUrl } = mw.util.parseImageUrl( thumbnailUrl );

	return {
		name: name,
		src: thumbnailUrl,
		srcset: thumbnailUrl, // Use thumbnail for now, could be enhanced
		width: result.imageinfo[ 0 ].thumbwidth,
		height: result.imageinfo[ 0 ].thumbheight,
		title: mw.Title.newFromText( result.title ),
		label: result.entityterms && result.entityterms.label && result.entityterms.label[ 0 ] || null,
		externalSources: useUniqueExternalGlobalUsageWikis( result.globalusage ),
		resizeUrl: resizeUrl || ( () => result.imageinfo[ 0 ].url )
	};
}

/**
 * @return {Promise<import('./types').ImageData[]>}
 */
module.exports = async function useExternalImages() {
	if ( cacheExternalImages !== null ) {
		return cacheExternalImages;
	}

	const entityId = await getEntityId();
	if ( !entityId ) {
		return [];
	}

	const searchResults = await useMediaSearchResults(
		entityId,
		mw.config.get( 'wgContentLanguage' ),
		10,
		useContentImages().map( ( image ) => image.title )
	);

	cacheExternalImages = searchResults
		.map( resultToImageData )
		// Access name on valid image data objects (null check), else a null reference error
		// prevents other wikis UI from loading.
		.filter( ( img ) => img && img.name );
	return cacheExternalImages;
};
