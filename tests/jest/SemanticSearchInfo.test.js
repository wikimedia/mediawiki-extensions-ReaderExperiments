'use strict';

const { mount } = require( '@vue/test-utils' );
jest.mock( 'ext.readerExperiments', () => ( {
	rawParamsMessage: () => {
		let label;
		return {
			rawParams: ( params ) => {
				label = params[ 0 ];
			},
			parse: () => `Did you mean ${ label }`
		};
	}
} ) );
const SearchInfo = require( '../../resources/experiments/semanticSearch/components/SearchInfo.vue' );

const props = { term: 'missing article', namespaces: [ 0 ], limit: 10, sort: 'relevance' };
const noResultsMessage = 'readerexperiments-semanticsearch-no-results';

test( 'shows plain text for an empty results array and clears it when results arrive', async () => {
	const wrapper = mount( SearchInfo, { props: { ...props, results: [] } } );

	expect( wrapper.get( 'p[aria-live="polite"]' ).text() ).toBe( noResultsMessage );
	expect( wrapper.find( '.cdx-message' ).exists() ).toBe( false );

	await wrapper.setProps( { results: [ { title: 'An article' } ] } );
	expect( wrapper.text() ).not.toContain( noResultsMessage );
} );

test.each( [
	{ term: '' },
	{ error: 'Search failed' }
] )( 'does not show an empty-results message for %j', ( overrides ) => {
	const wrapper = mount( SearchInfo, { props: { ...props, ...overrides, results: [] } } );

	expect( wrapper.text() ).not.toContain( noResultsMessage );
} );

test( 'shows an unboxed suggestion with corrected words marked and links to the plain query', () => {
	const generateSearchUrl = jest.fn( () => '/wiki/Special:SemanticSearch?search=woodchuck' );
	const wrapper = mount( SearchInfo, {
		props: {
			...props,
			info: { suggestion: 'woodchuck', suggestionsnippet: '<em>woodchuck</em>' },
			generateSearchUrl
		}
	} );
	const suggestion = wrapper.get( '.ext-readerExperiments-semanticsearch-suggestion' );
	expect( suggestion.element.tagName ).toBe( 'P' );
	expect( suggestion.get( 'a em' ).text() ).toBe( 'woodchuck' );
	expect( suggestion.find( '.cdx-message__icon' ).exists() ).toBe( false );
	expect( generateSearchUrl ).toHaveBeenCalledWith( 'woodchuck', [ 0 ], 10, 'relevance' );
} );
