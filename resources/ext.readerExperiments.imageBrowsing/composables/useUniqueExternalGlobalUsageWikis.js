/**
 * @param {Array<{title: string, wiki: string, url: string}>} globalusage
 * @return {Array<string>}
 */
module.exports = function useUniqueExternalGlobalUsageWikis( globalusage ) {
	const globalUsage = globalusage.map( ( usage ) => usage.wiki );
	const uniqueGlobalUsage = Array.from( new Set( globalUsage ) );

	// We only care about external wikis, so we're going to filter
	// out the local wiki
	let localWiki = mw.config.get( 'wgServerName' );
	const apiBaseUri = mw.config.get( 'ReaderExperimentsApiBaseUri' );
	if ( apiBaseUri ) {
		// Wikis for which we're mirroring content from another source
		// (e.g. local dev & patchdemo, through
		// MobileFrontendContentProvider) will not have an accurate
		// wgServerName, so we'll extract that from the API base URI
		// to accurately reflect the "local" wiki
		localWiki = new URL( apiBaseUri ).hostname;
	}

	// And we only allow select domains (our main content projects)
	const allowedWikis = Object.keys( mw.config.get( 'ReaderExperimentsImageBrowsingExternalWikis' ) );

	return uniqueGlobalUsage
		.filter( ( wiki ) => wiki !== localWiki )
		.filter( ( wiki ) => allowedWikis.find( ( allowedWiki ) => wiki.endsWith( allowedWiki ) ) );
};
