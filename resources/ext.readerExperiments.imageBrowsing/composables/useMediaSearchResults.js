const useUniqueExternalGlobalUsageWikis = require( './useUniqueExternalGlobalUsageWikis.js' );

const maxGlobalUsage = 500;

/**
 * @param {string} entityId
 * @param {string} language
 * @param {number} limit
 * @param {number} offset
 * @return {Promise<mw.Api~AbortablePromise>}
 */
function search( entityId, language, limit, offset ) {
	const api = new mw.ForeignApi(
		'https://commons.wikimedia.org/w/api.php',
		{ anonymous: true }
	);

	return api.get( {
		action: 'query', // MediaWiki's Action API query module
		formatversion: 2, // API response format

		// Generator parameters:
		generator: 'search', // Use the search generator to find pages
		gsrsearch: `filetype:bitmap|drawing custommatch:linked_from=${ entityId } -fileres:0`, // Search query
		gsrnamespace: 6, // Namespace for global usage
		gsroffset: offset, // Result number to start at
		gsrlimit: limit, // Max number of results to return

		// Prop parameters:
		// - entityterms - Gets Wikidata entity labels/descriptions
		// - globalusage - Shows which wikis use each file
		// - imageinfo - Gets image metadata, URLs, dimensions
		prop: 'entityterms|globalusage|imageinfo',

		// Wikibase parameters:
		wbetlanguage: language, // Get labels in specified language

		// Global Usage parameters:
		gunamespace: 0, // Only show usage in main namespace (articles)
		gulimit: maxGlobalUsage, // Limit for global usage results
		gufilterlocal: 1, // Don't include local (on Commons) usage links

		// Image Info parameters:
		iiprop: 'url', // Image & thumbnail URLs
		iiurlwidth: '300' // Generate thumbnail urls at this width
	} );
}

/**
 * This performs a search for & collects data on images matching
 * a specific entity, but has to perform a couple of tricks:
 * - we don't want images that are already on the page
 * - we don't want images that are not used on other wikipedia's/-data
 * - globalusage maxes out at 500 so we may need additional
 *   requests to get the remaining data if some of the early
 *   results have an absurd amount of usage on other wikis
 *
 * This will execute a search request and try to process it in
 * such a way that it firstly limits the risk of having to do
 * additional (sequential) API requests (by overfetching), then
 * minimizes the payload of any additional requests it has to do
 * in case it needs to go back to fetch more globalusage data (by
 * keeping track of what's already been processed and minimizing
 * the request size), or more images because not enough matched the
 * globalusage criteria (usage on external wikis)
 *
 * @param {string} entityId
 * @param {string} language
 * @param {number} [limit]
 * @param {Array<mw.Title>} [excludeTitles]
 * @return {Promise<Object>}
 */
module.exports = async function useMediaSearchResults(
	entityId,
	language,
	limit = 10,
	excludeTitles = []
) {
	const results = [];

	// We may need to do multiple API requests to get all the data we need;
	// offset & limit will be adjusted as we go along, but we'll cap it
	// at a certain maximum offset because at some point it simply becomes
	// pointless: too many requests will keep users waiting for too long,
	// and the odds of finding a relevant result will be dwindling anyway
	let searchOffset = 0;
	let searchLimit = ( 2 * limit ) + excludeTitles.length;
	const maxSearchOffset = ( 4 * limit ) + excludeTitles.length;

	// Search API will return pages in prefixedText format, so let's
	// build a comparison array in that same format
	const excludeFilenames = excludeTitles.map( ( title ) => title.getPrefixedText() );

	while ( results.length < limit && searchOffset <= maxSearchOffset ) {
		// Over-fetch to account for results that may be excluded;
		// we'd rather deal with a somewhat inflated response than
		// having to make multiple sequential API calls.
		const response = await search( entityId, language, searchLimit, searchOffset );

		let countGlobalUsage = 0;
		if ( !response.query || !response.query.pages ) {
			return results;
		}

		for ( const index in response.query.pages ) {
			const page = response.query.pages[ index ];

			// Keep track of global usage across data, which is
			// limited to a maximum per API request; once that
			// limit has been reached, the rest of the search
			// results no longer get globalusage data & we'll
			// want to know when that threshold has been reached
			countGlobalUsage += page.globalusage.length;

			if ( excludeFilenames.includes( page.title ) ) {
				// Ignore results that we wish to exclude;
				// increase offset to not see this result again
				// and decrease limit because we no longer need
				// to overfetch for this one
				searchOffset++;
				searchLimit--;
				continue;
			}

			if ( countGlobalUsage >= maxGlobalUsage ) {
				// If globalusage limit has been reached, we can
				// no longer trust that data for this result,
				// so we'll stop processing these results, break
				// back into the while loop, where a new API
				// request will kick off (starting at this offset)
				// to get the data we're missing
				break;
			}

			const externalGlobalUsage = useUniqueExternalGlobalUsageWikis( page.globalusage );
			if ( externalGlobalUsage.length === 0 ) {
				// Ignore results that are not used on other wikis;
				// increase offset to not see this result again
				// but don't decrease the limit - we weren't
				// necessarily expecting this one to be useless...
				searchOffset++;
				continue;
			}

			// Good result!
			searchOffset++;
			searchLimit--;
			results.push( page );

			if ( results.length >= limit ) {
				return results;
			}
		}

		if ( response.query.pages.length < searchLimit ) {
			// We didn't even get the amount of results that we
			// requested; i.e. this search has been exhausted
			// and whatever data we have at this point will have
			// to suffice
			return results;
		}
	}

	return results;
};
