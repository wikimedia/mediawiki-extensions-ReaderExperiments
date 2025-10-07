const useUniqueExternalGlobalUsageWikis = require( './useUniqueExternalGlobalUsageWikis.js' );

/**
 * @param {string} entityId
 * @param {string} language
 * @param {number} limit
 * @param {number} offset
 * @param {string|false} [gucontinue] Undefined for a fresh start, string for continuation, false to stop
 * @param {string|false} [iicontinue] Undefined for a fresh start, string for continuation, false to stop
 * @return {Promise<mw.Api~AbortablePromise>}
 */
function search( entityId, language, limit, offset, gucontinue, iicontinue ) {
	// Reject any entity IDs which are not structured like Q12345
	// before interpolating this value into a URL param for an API request
	if ( !/^Q\d+$/.test( entityId ) ) {
		throw new Error( 'Invalid entity ID format' );
	}

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
		gsrqiprofile: 'popular_inclinks', // Prioritize popular (by incoming links) media

		// Prop parameters:
		// - entityterms - Gets Wikidata entity labels/descriptions
		// - globalusage - Shows which wikis use each file
		// - imageinfo - Gets image metadata, URLs, dimensions
		prop: 'entityterms|globalusage|imageinfo',

		// Wikibase parameters:
		wbetlanguage: language, // Get labels in specified language

		// Global Usage parameters:
		gunamespace: 0, // Only show usage in main namespace (articles)
		gufilterlocal: 1, // Don't include local (on Commons) usage links
		gulimit: 500, // Limit for global usage results
		gucontinue, // Continuation "index" for global usage

		// Image Info parameters:
		iiprop: 'url', // Image & thumbnail URLs
		iiurlwidth: 300, // Generate thumbnail urls at this width
		iilimit: 1, // Only 1 revision per result
		iicontinue, // Continuation "index" for imageinfo

		// An explicit "false" continuation value means we've already exhausted
		// the results for that prop, so it needs to be added to this list to
		// avoid starting over again
		continue: '||entityterms' + ( gucontinue === false ? '|globalusage' : '' ) + ( iicontinue === false ? '|imageinfo' : '' )
	} );
}

/**
 * This performs a search for & collects data on images matching
 * a specific entity, but has to perform a couple of tricks:
 * - we don't want images that are already on the page
 * - we don't want images that are not used on other wikipedia's/-data
 * - globalusage maxes out at 500 so we may need additional
 *   requests to get the remaining data if some of the results
 *   have an absurd amount of usage on other wikis; to make matters
 *   worse, globalusage is filled out alphabetically, not in search
 *   relevance order, as we intend to consume the data.
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
	const guUnprocessed = {};
	const iiUnprocessed = {};

	// We may need to do multiple API requests to get all the data we need;
	// offset & limit will be adjusted as we go along, but we'll cap it
	// at a certain maximum offset because at some point it simply becomes
	// pointless: too many requests will keep users waiting for too long,
	// and the odds of finding a relevant result will be dwindling anyway.
	let searchOffset = 0;
	const maxSearchOffset = ( 3 * limit ) + excludeTitles.length;

	// Ask for more than needed to account for some loss through "excludeTitles"
	// and images without relevant external global usage
	let searchLimit = ( 2 * limit ) + excludeTitles.length;
	// But cap the limit: while over-fetching as much as possible would
	// be ideal, the globalusage/imageinfo limitations, and the fact that they
	// are not filled in the same relevance order as the search results, means
	// that a single result (with tons of global usage, early on in the
	// alphabet) could stall all the other results (for which no data will
	// become available until the other one has been fully fetched). That
	// stalling result may not even be relevant anyway if there are already
	// enough other results before it (in terms of search relevance, not
	// alphabetically) that we reach the requested limit.
	const maxSearchLimit = 20;

	let gucontinue;
	let iicontinue;

	// Search API will return pages in prefixedText format, so let's
	// build a comparison array in that same format
	const excludeFilenames = excludeTitles.map( ( title ) => title.getPrefixedText() );

	while ( results.length < limit && searchOffset <= maxSearchOffset ) {
		const requestLimit = Math.min( searchLimit, maxSearchLimit );
		const response = await search(
			entityId,
			language,
			requestLimit,
			searchOffset,
			gucontinue,
			iicontinue
		);

		// Both globalusage & imageinfo are capped; the former at 500 total
		// globalusage entries, the latter at 50 results (1 revision each)
		// In order to fetch all the available data, we might need to do
		// multiple requests to get the next batch of data, and the point to
		// start that batch from will be indicated in the request.
		// Because we have multiple props that can be capped, we might need to
		// continue fetching results for one, while we've already exhausted the
		// other, so we'll keep explicit track of when *not* to continue one
		// of these (in which case the continue value will be set to "false",
		// as opposed to "undefined" which will be a fresh start)
		gucontinue = response.continue && response.continue.gucontinue || !response.continue.continue.includes( 'globalusage' ) && undefined;
		iicontinue = response.continue && response.continue.iicontinue || !response.continue.continue.includes( 'imageinfo' ) && undefined;

		// Based on above continue values, we could know that our data is not
		// yet entirely complete, but that might not matter. The result for
		// which we are still lacking data, and any that follow it, may be
		// irrelevant if we wish to exclude them (via `excludeTitles`)
		// As we iterate the results we'll toggle this bool if we find that
		// one of the results for which we are missing data *is* relevant, and
		// adapt accordingly
		let isIncomplete = false;

		// Sort results array based on relevance (when used as generator,
		// the order of the search results in the results array does not
		// correspond to their relevance, but they have an "index"
		// property that does
		const sortedPages = response.query && response.query.pages && response.query.pages.sort( ( a, b ) => a.index - b.index ) || [];
		for ( const index in sortedPages ) {
			const page = sortedPages[ index ];

			// Merge in existing globalusage/imageinfo data from previous
			// request(s), for cases where we maxed out and needed more calls
			page.globalusage = ( page.globalusage || [] ).concat( guUnprocessed[ page.title ] || [] );
			delete guUnprocessed[ page.title ];
			page.imageinfo = ( page.imageinfo || [] ).concat( iiUnprocessed[ page.title ] || [] );
			delete iiUnprocessed[ page.title ];

			if ( excludeFilenames.includes( page.title ) && !isIncomplete ) {
				// We're not interested in this result, but we were
				// accounting for this one to appear and over-fetched,
				// so that's one less we need to take into account
				// next time
				searchOffset++;
				searchLimit--;
				continue;
			}

			const title = mw.Title.newFromText( page.title );
			if (
				// page.title is in `getPrefixedText` format, while the titles
				// in *continue are in `getMain` format
				( gucontinue && title.getMain() >= gucontinue.match( /^(.+?)\|([^|]*)\|([^|]*)$/ )[ 1 ] ) ||
				( iicontinue && title.getMain() >= iicontinue.match( /^(.+?)\|([^|]+?)$/ )[ 1 ] )
			) {
				// This one's quite annoying... globalusage and imageinfo props
				// are filled out alphabetically, which does not match the
				// search results relevance order. This may mean that we have a
				// result at position X that is incomplete, while another
				// further down (in terms of relevance) is actually complete.
				// That said, there's no point in processing the (complete) ones
				// further down the line, because they may end up not being
				// needed if incomplete inbetweens end up being valid results.
				// Anyway... as soon as we find one for which we're missing data
				// (i.e. at or further up the alphabet than our continuation
				// title), we'll mark all subsequent ones as incomplete, keep
				// track of whatever data they may already have had, and process
				// them later on once we have data for every result inbetween.
				isIncomplete = true;
			}

			if ( isIncomplete ) {
				// The remainder of the resultset might still contain entries
				// for which we have complete data (i.e. those that come
				// before "*continue" alphabetically), but because we're
				// going to have to pick things up from the very first
				// (in order of search relevant) incomplete result, we'll
				// end up processing those later on anyway, so rather than
				// futzing with the order of results, we'll just hang on to
				// the data we've already collected and process those later on
				guUnprocessed[ page.title ] = page.globalusage || [];
				iiUnprocessed[ page.title ] = page.imageinfo || [];
				continue;
			}

			const externalGlobalUsage = useUniqueExternalGlobalUsageWikis( page.globalusage );
			if ( externalGlobalUsage.length === 0 ) {
				// Ignore results with no (relevant) external usage;
				// increase offset to not see this result again
				// but don't decrease the limit - we weren't
				// necessarily expecting this one to be useless...
				searchOffset++;
				continue;
			}

			searchOffset++;
			searchLimit--;
			results.push( page );

			if ( results.length >= limit ) {
				return results;
			}
		}

		if ( !isIncomplete ) {
			// It is possible that we exhausted an earlier continuation and
			// are now interested in fetching a new round of results, and it's
			// also possible that we had a continuation for globalusage/
			// imageinfo, but that none of those results after (and including)
			// that one were relevant to us (all excluded)
			// Either way, reset continuation values!
			gucontinue = undefined;
			iicontinue = undefined;
		}

		if ( gucontinue ) {
			// Hack: this is a minor optimization to handle cases with extensive
			// usage (e.g. icons) - since we only really care about which wikis
			// they're used on (not which of the potentially hundreds of pages
			// on that wiki), we'll fast-forward to beyond the last page id on
			// that wiki, thus ensuring the next request immediately starts of
			// with usage on another wiki instead of potentially another couple
			// hundred or more from the same wiki...
			gucontinue = gucontinue.replace( /[0-9]+$/, '999999999999999' );
		}

		if ( response.query.pages.length < requestLimit ) {
			// We didn't even get the amount of results that we
			// requested; i.e. this search has been exhausted
			// and whatever data we have at this point will have
			// to suffice
			return results;
		}
	}

	return results;
};
