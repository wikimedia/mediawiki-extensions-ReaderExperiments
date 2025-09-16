const useMediaSearchResults = require( './useMediaSearchResults.js' );
const useUniqueExternalGlobalUsageWikis = require( './useUniqueExternalGlobalUsageWikis.js' );

const cacheExternalImages = {};

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
		label: result.entityterms &&
			result.entityterms.label &&
			result.entityterms.label[ 0 ] ||
			null,
		externalSources: useUniqueExternalGlobalUsageWikis( result.globalusage ),
		resizeUrl: resizeUrl || ( () => result.imageinfo[ 0 ].url )
	};
}

/**
 * @param {string} entityId
 * @param {import('./types').ImageData[]} excludes
 * @return {Promise<import('./types').ImageData[]>}
 */
module.exports = async function useExternalImages( entityId, excludes ) {
	const cacheKey = entityId + '-' + excludes.map( ( img ) => img.title.getPrefixedDb() ).join( '|' );
	if ( cacheExternalImages[ cacheKey ] ) {
		return cacheExternalImages[ cacheKey ];
	}

	const searchResults = await useMediaSearchResults(
		entityId,
		mw.config.get( 'wgContentLanguage' ),
		10,
		excludes.map( ( image ) => image.title )
	);

	cacheExternalImages[ cacheKey ] = searchResults
		.map( resultToImageData )
		// Access name on valid image data objects (null check), else a null reference error
		// prevents other wikis UI from loading.
		.filter( ( img ) => img && img.name );
	return cacheExternalImages[ cacheKey ];
};
