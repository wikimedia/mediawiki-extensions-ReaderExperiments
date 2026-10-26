'use strict';

/* global jest */

/**
 * Mock for the mediawiki.DateFormatter module (provided by MediaWiki
 * ResourceLoader at runtime).
 *
 * This is needed so Jest can load SearchResult.vue. No test calls
 * formatTimeAndDate directly. SearchResult.vue requires this module
 * at the top of its script block. SearchResultsPage.vue loads
 * SearchResult.vue as a child component, so loading
 * SearchResultsPage.vue also loads SearchResult.vue, which runs this
 * require, even in tests that never render a result.
 */
module.exports = {
	formatTimeAndDate: jest.fn( ( date ) => date.toISOString() )
};
