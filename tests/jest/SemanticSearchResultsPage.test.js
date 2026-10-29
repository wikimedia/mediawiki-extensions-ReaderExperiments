'use strict';

const { enableAutoUnmount, flushPromises, mount } = require( '@vue/test-utils' );

const SearchResultsPage = require( '../../resources/experiments/semanticSearch/components/SearchResultsPage.vue' );

enableAutoUnmount( afterEach );

const SWITCH_LINK = '.ext-readerExperiments-semanticsearch-classic';

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
	requestedNamespaces: [],
	semanticEnabled: true
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

/**
 * mw.Rest returns a jQuery promise, whose catch() handler receives the error
 * code and its details as separate arguments. Native promises can't express
 * that, so fake just enough of one for search() to consume.
 *
 * @param {Object} body Response body, as mw.Rest resolves it
 * @return {Object}
 */
function restResolve( body ) {
	return { catch: () => Promise.resolve( body ) };
}

/**
 * @param {Object} details Rejection details, as mw.Rest passes them
 * @return {Object}
 */
function restReject( details ) {
	return {
		catch: ( handler ) => {
			try {
				const result = handler( 'http', details );
				return Promise.resolve( result );
			} catch ( e ) {
				return Promise.reject( e );
			}
		}
	};
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

	async function runSearch( props, term ) {
		const calls = [];
		mw.Rest.prototype.get.mockImplementation( ( url, params ) => {
			calls.push( params.type );
			return Promise.resolve( { results: {}, info: {}, continue: null, warnings: [] } );
		} );

		let registeredSearch;
		mount( SearchResultsPage, {
			props: {
				...props,
				onSearchRegister: ( fn ) => {
					registeredSearch = fn;
				}
			}
		} );

		await registeredSearch( term );
		return calls;
	}

	describe( 'browser history', () => {
		beforeEach( () => {
			window.history.replaceState( {}, '', request.page );
			mw.Rest.prototype.get.mockImplementation( ( path ) => restResolve( {
				results: [ { title: decodeURIComponent( path.split( '/' ).pop() ), index: 0, ns: 0 } ],
				info: {}, continue: null, warnings: []
			} ) );
		} );

		it.each( [ true, false ] )( 'restores results on Back and Forward (semanticEnabled=%s)', async ( semanticEnabled ) => {
			const wrapper = mount( SearchResultsPage, {
				props: { request: { ...request, semanticEnabled }, response }
			} );
			await wrapper.vm.onSubmit( 'birds & bees' );
			const historyLength = window.history.length;
			const navigate = async ( direction ) => {
				await new Promise( ( resolve ) => {
					window.addEventListener( 'popstate', resolve, { once: true } );
					window.history[ direction ]();
				} );
				await flushPromises();
			};

			await navigate( 'back' );
			expect( wrapper.vm.inputValueRef ).toBe( request.term );
			expect( wrapper.findAllComponents( { name: 'SearchResult' } ).map( ( card ) => card.props( 'result' ).title ) )
				.toEqual( semanticEnabled ? [ request.term, request.term ] : [ request.term ] );

			await navigate( 'forward' );
			expect( wrapper.vm.inputValueRef ).toBe( 'birds & bees' );
			expect( wrapper.vm.responseLexicalRef.results[ 0 ].title ).toBe( 'birds & bees' );
			expect( window.history.length ).toBe( historyLength );
		} );

		it( 'restores the lexical offset from the URL', async () => {
			const wrapper = mount( SearchResultsPage, { props: { request, response } } );
			await wrapper.vm.onSubmit( 'birds' );
			mw.Rest.prototype.get.mockClear();
			window.history.replaceState( {}, '', request.page + '&continue=20' );
			window.dispatchEvent( new PopStateEvent( 'popstate' ) );
			await flushPromises();
			expect( mw.Rest.prototype.get ).toHaveBeenCalledWith(
				'/semanticsearch/v0/' + encodeURIComponent( request.term ),
				expect.objectContaining( { type: 'lexical', continue: 20 } )
			);
			expect( mw.Rest.prototype.get ).toHaveBeenCalledWith(
				'/semanticsearch/v0/' + encodeURIComponent( request.term ),
				expect.objectContaining( { type: 'semantic', continue: 0 } )
			);
		} );

		it( 'clears results when returning to a URL without a search and removes its listener on unmount', async () => {
			const wrapper = mount( SearchResultsPage, { props: { request, response } } );
			await wrapper.vm.onSubmit( 'birds' );
			window.history.replaceState( {}, '', '/wiki/Special:SemanticSearch' );
			window.dispatchEvent( new PopStateEvent( 'popstate' ) );
			await flushPromises();
			expect( wrapper.vm.inputValueRef ).toBe( '' );
			expect( wrapper.findAllComponents( { name: 'SearchResult' } ) ).toHaveLength( 0 );
			wrapper.unmount();
			mw.Rest.prototype.get.mockClear();
			window.history.replaceState( {}, '', request.page );
			window.dispatchEvent( new PopStateEvent( 'popstate' ) );
			expect( mw.Rest.prototype.get ).not.toHaveBeenCalled();
		} );

		it( 'keeps the latest results when older requests finish after history navigation', async () => {
			const pending = [];
			mw.Rest.prototype.get.mockImplementation( () => new Promise( ( resolve ) => {
				pending.push( resolve );
			} ) );
			const wrapper = mount( SearchResultsPage, { props: { request, response } } );
			const submitted = wrapper.vm.onSubmit( 'birds' );
			window.history.replaceState( {}, '', request.page );
			window.dispatchEvent( new PopStateEvent( 'popstate' ) );
			pending.slice( 0, 2 ).forEach( ( resolve ) => resolve( { results: [ { title: 'Old' } ] } ) );
			await submitted;
			expect( wrapper.vm.isLoading ).toBe( true );
			expect( wrapper.vm.responseLexicalRef ).toEqual( [] );
			pending.slice( 2 ).forEach( ( resolve ) => resolve( { results: [], continue: null } ) );
			await flushPromises();
			expect( wrapper.vm.isLoading ).toBe( false );
			expect( wrapper.vm.termRef ).toBe( request.term );
		} );
	} );

	describe( 'treatment group', () => {
		const treatmentRequest = { ...request, semanticEnabled: true };

		it( 'renders the semantic results section', () => {
			const result = { title: 'Example', targeturl: '/wiki/Example', ns: 0, index: 0, snippet: 'Example' };
			const wrapper = mount( SearchResultsPage, {
				props: {
					request: treatmentRequest,
					response: {
						semantic: { ...response.semantic, results: [ result ] },
						lexical: { ...response.lexical, results: [ result ] }
					}
				}
			} );

			const sections = wrapper.findAll( 'section.ext-readerExperiments-semanticsearch-results' );
			expect( sections.map( ( w ) => w.attributes( 'aria-label' ) ) ).toContain( 'readerexperiments-semanticsearch-semantic-results-label' );
		} );

		it( 'fetches semantic and lexical results on new searches', async () => {
			const calls = await runSearch( { request: treatmentRequest, response }, 'how do birds fly' );
			expect( calls ).toEqual( [ 'lexical', 'semantic' ] );
		} );
	} );

	describe( 'control group', () => {
		const controlRequest = { ...request, semanticEnabled: false };

		it( 'does not render the semantic results section', () => {
			const result = { title: 'Example', targeturl: '/wiki/Example', ns: 0, index: 0, snippet: 'Example' };
			const wrapper = mount( SearchResultsPage, {
				props: {
					request: controlRequest,
					response: {
						semantic: { ...response.semantic, results: [ result ] },
						lexical: { ...response.lexical, results: [ result ] }
					}
				}
			} );

			const sections = wrapper.findAll( 'section.ext-readerExperiments-semanticsearch-results' );
			expect( sections.map( ( w ) => w.attributes( 'aria-label' ) ) ).not.toContain( 'readerexperiments-semanticsearch-semantic-results-label' );
		} );

		it( 'only fetches lexical results on new searches', async () => {
			const calls = await runSearch( { request: controlRequest, response }, 'how do birds fly' );
			expect( calls ).toEqual( [ 'lexical' ] );
		} );
	} );

	describe( 'when the semantic search fails', () => {
		const lexicalResponse = {
			results: {
				0: { index: 0, ns: 0, title: 'Sky', timestamp: '2026-01-01T00:00:00Z' }
			},
			info: { totalhits: 1 },
			continue: null,
			warnings: []
		};

		let originalRest;
		let restInstances;
		let semanticFailure;

		beforeEach( () => {
			originalRest = mw.Rest;
			restInstances = [];
			mw.Rest = function ( options ) {
				this.options = options;
				restInstances.push( this );
			};
			mw.Rest.prototype.abort = jest.fn();
			mw.Rest.prototype.get = jest.fn( function ( path, params ) {
				this.searchType = params.type;
				return params.type === 'semantic' ?
					restReject( semanticFailure ) :
					restResolve( lexicalResponse );
			} );
		} );

		afterEach( () => {
			mw.Rest = originalRest;
		} );

		/**
		 * Mount the page and submit a new search, settling both requests
		 *
		 * @return {Promise<Object>} The mounted wrapper
		 */
		async function submitSearch() {
			const semanticRequest = { ...request, semanticEnabled: true };
			const wrapper = mount( SearchResultsPage, { props: { request: semanticRequest, response } } );
			await wrapper.getComponent( { name: 'CdxSearchInput' } )
				.vm.$emit( 'submit-click', 'how do birds fly' );
			await flushPromises();
			return wrapper;
		}

		it( 'gives up on the semantic request after 5 seconds, but not the lexical one', async () => {
			semanticFailure = { xhr: { status: 0 }, textStatus: 'timeout' };
			await submitSearch();

			const semantic = restInstances.find( ( rest ) => rest.searchType === 'semantic' );
			const lexical = restInstances.find( ( rest ) => rest.searchType === 'lexical' );
			expect( semantic.options ).toEqual( { ajax: { timeout: 5000 } } );
			expect( lexical.options ).toBeUndefined();
		} );

		it.each( [
			[ 'times out', { xhr: { status: 0 }, textStatus: 'timeout' }, 'Request timed out' ],
			[ 'errors without a message', { xhr: { status: 503 }, textStatus: 'error' }, 'Unknown error' ]
		] )( 'still shows lexical results and logs the cause when it %s', async ( _, failure, cause ) => {
			semanticFailure = failure;
			const wrapper = await submitSearch();

			// Only the lexical card renders; the failed semantic section stays empty
			const cards = wrapper.findAllComponents( { name: 'SearchResult' } );
			expect( cards ).toHaveLength( 1 );
			expect( cards[ 0 ].props( 'result' ).title ).toBe( 'Sky' );

			expect( mw.log.error ).toHaveBeenCalledWith( 'Semantic search request failed:', cause );
		} );

		it( 'does not log or show an error when the request was superseded', async () => {
			// A newer search aborting this one is not a real failure (T441802);
			// a genuine failure is covered by the cases above
			semanticFailure = { xhr: { status: 0 }, textStatus: 'abort' };
			const wrapper = await submitSearch();

			expect( mw.log.error ).not.toHaveBeenCalled();
			expect( wrapper.vm.responseSemanticRef ).not.toHaveProperty( 'error' );
		} );
	} );
} );

test( 'provides distinct accessible labels for the result sections', () => {
	const result = { title: 'Example', targeturl: '/wiki/Example', ns: 0, index: 0, snippet: 'Example' };
	const wrapper = mount( SearchResultsPage, {
		props: {
			request,
			response: {
				semantic: { ...response.semantic, results: [ result ] },
				lexical: { ...response.lexical, results: [ result ] }
			}
		}
	} );
	const sections = wrapper.findAll( 'section.ext-readerExperiments-semanticsearch-results' );
	expect( sections ).toHaveLength( 2 );
	expect( sections[ 0 ].attributes( 'aria-label' ) )
		.toBe( 'readerexperiments-semanticsearch-semantic-results-label' );
	expect( sections[ 1 ].attributes( 'aria-label' ) )
		.toBe( 'readerexperiments-semanticsearch-lexical-results-label' );
} );

test( 'omits empty result sections', () => {
	const wrapper = mount( SearchResultsPage, { props: { request, response } } );
	expect( wrapper.findAll( 'section.ext-readerExperiments-semanticsearch-results' ) ).toHaveLength( 0 );
} );
