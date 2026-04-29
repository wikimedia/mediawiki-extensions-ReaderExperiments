const { ref, watch } = require( 'vue' );
const { apiBaseUri } = require( '../config.json' );

/**
 * @type {Map<string, import('vue').Ref<Object | null>>}
 */
const cacheMap = new Map();

/**
 * @param {mw.Title} title
 * @return {Promise<Object>}
 */
async function fetchSummary( title ) {
	const encodedTitle = encodeURIComponent( title.getPrefixedDb() );
	const origin = apiBaseUri ? new URL( apiBaseUri ).origin : '';
	const url = `${ origin }/api/rest_v1/page/summary/${ encodedTitle }`;
	const response = await fetch( url );
	if ( !response.ok ) {
		throw new Error( response.status );
	}
	return await response.json();
}

/**
 * @callback errorHandler
 * @param {Error} error
 */

/**
 * Fetch the article's summary through the REST API.
 *
 * Returns a reactive ref that starts as an empty object and is populated
 * once the API call resolves.
 *
 * @param {import('vue').Ref<mw.Title>} titleRef
 * @param {errorHandler} onError
 * @return {import('vue').Ref<Object | null>}
 */
function useSummary(
	titleRef,
	// eslint-disable-next-line no-unused-vars
	onError = ( error ) => {}
) {
	const result = ref( null );

	watch(
		titleRef,
		async ( title ) => {
			if ( !title ) {
				result.value = null;
				return;
			}

			const cacheKey = title.getPrefixedDb();
			let cachedRef = cacheMap.get( cacheKey );
			if ( cachedRef ) {
				result.value = cachedRef.value;
				return;
			}

			cachedRef = ref( null );
			cacheMap.set( cacheKey, cachedRef );

			fetchSummary( title ).then(
				( response ) => {
					result.value = response;
					cachedRef.value = response;
				},
				( error ) => {
					cacheMap.delete( cacheKey );
					onError( error );
				}
			);
		},
		{ immediate: true }
	);

	return result;
}

module.exports = exports = useSummary;
exports.fetchSummary = fetchSummary;
