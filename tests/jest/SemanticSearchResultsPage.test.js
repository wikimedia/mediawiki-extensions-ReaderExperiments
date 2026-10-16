'use strict';

const { mount } = require( '@vue/test-utils' );

const SearchResultsPage = require( '../../resources/experiments/semanticSearch/components/SearchResultsPage.vue' );

const SWITCH_LINK = '.ext-readerExperiments-semanticsearch-switch-search a';

const request = {
	queryParams: [],
	page: '/wiki/Special:SemanticSearch?search=why+is+the+sky+blue',
	term: 'why is the sky blue',
	hasTerm: true,
	namespaces: [ 0 ],
	sort: 'relevance',
	limit: 10,
	continue: 0,
	classicSearchPage: 'Special:Search',
	// Empty unless the reader explicitly passed ns<N> query params
	requestedNamespaces: []
};

const response = {
	lexical: { results: [], info: {}, continue: null, warnings: [], error: null },
	semantic: { results: [], info: {}, continue: null, warnings: [], error: null }
};

/**
 * Replaces the shared mw.util.getUrl mock, which ignores its params, so that
 * tests can assert on the generated query string.
 *
 * @param {string|null} pageName
 * @param {Object} params
 * @return {string}
 */
function getUrl( pageName, params ) {
	return `/wiki/${ pageName }?${ new URLSearchParams( params ).toString() }`;
}

describe( 'SearchResultsPage', () => {
	beforeEach( () => {
		mw.util.getUrl.mockImplementation( getUrl );
	} );

	it( 'links back to Special:Search with the current search prepopulated', () => {
		const wrapper = mount( SearchResultsPage, { props: { request, response } } );

		const href = wrapper.find( SWITCH_LINK ).attributes( 'href' );
		expect( href ).toContain( '/wiki/Special:Search?' );
		expect( href ).toContain( 'search=why+is+the+sky+blue' );
		// Without fulltext, Special:Search would redirect to an exact title match
		expect( href ).toContain( 'fulltext=1' );
		// The typeahead provenance param must not leak through, or the routing
		// mechanism (T438878) would bounce the reader back to semantic search
		expect( href ).not.toContain( 'wprov' );
	} );

	it( 'does not override the reader\'s own Special:Search settings', () => {
		const wrapper = mount( SearchResultsPage, { props: { request, response } } );

		const href = wrapper.find( SWITCH_LINK ).attributes( 'href' );
		// Special:Search prefers these params over the reader's searchlimit
		// preference and its own default of 20 results, so we must not send them
		expect( href ).not.toContain( 'limit=' );
		expect( href ).not.toContain( 'sort=' );
		// ns0 is only this page's default, not a choice the reader made; sending
		// it would suppress the namespace preferences Special:Search applies
		expect( href ).not.toContain( 'ns0=' );
	} );

	it( 'carries namespaces the reader explicitly requested', () => {
		const wrapper = mount( SearchResultsPage, {
			props: { request: { ...request, requestedNamespaces: [ 0, 14 ] }, response }
		} );

		const href = wrapper.find( SWITCH_LINK ).attributes( 'href' );
		expect( href ).toContain( 'ns0=1' );
		expect( href ).toContain( 'ns14=1' );
	} );

	it( 'updates the link when the search term changes', async () => {
		const wrapper = mount( SearchResultsPage, { props: { request, response } } );

		expect( wrapper.find( SWITCH_LINK ).attributes( 'href' ) )
			.toContain( 'search=why+is+the+sky+blue' );

		await wrapper.getComponent( { name: 'CdxSearchInput' } )
			.vm.$emit( 'submit-click', 'how do birds fly' );

		expect( wrapper.find( SWITCH_LINK ).attributes( 'href' ) )
			.toContain( 'search=how+do+birds+fly' );
	} );

	it( 'shows the link even when there is no search term', () => {
		const wrapper = mount( SearchResultsPage, {
			props: { request: { ...request, term: '', hasTerm: false }, response }
		} );

		// The link is persistent so there is always a route back to classic
		// search, even from the bare landing page
		expect( wrapper.find( SWITCH_LINK ).exists() ).toBe( true );
	} );
} );
