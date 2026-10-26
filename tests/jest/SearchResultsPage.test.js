'use strict';

const { mount } = require( '@vue/test-utils' );
jest.mock( 'mediawiki.DateFormatter', () => ( {
	formatTimeAndDate: () => 'Last edited date'
} ), { virtual: true } );
const SearchResultsPage = require( '../../resources/experiments/semanticSearch/components/SearchResultsPage.vue' );

describe( 'SearchResultsPage', () => {
	const defaultProps = {
		request: {
			term: 'test query',
			namespaces: [ 0 ],
			limit: 10,
			sort: 'relevance',
			continue: 0
		},
		response: {
			lexical: {
				continue: null,
				results: [],
				info: {},
				error: null
			},
			semantic: {
				continue: null,
				results: [],
				info: {},
				error: null
			}
		}
	};

	it( 'renders the search input with ext-readerExperiments-semanticsearch-form class', () => {
		const wrapper = mount( SearchResultsPage, {
			props: defaultProps
		} );

		const searchInput = wrapper.find( '.ext-readerExperiments-semanticsearch-form' );
		expect( searchInput.exists() ).toBe( true );
	} );

	it( 'updates inputValueRef on submit', async () => {
		const wrapper = mount( SearchResultsPage, {
			props: defaultProps
		} );

		expect( wrapper.vm.inputValueRef ).toBe( 'test query' );
		await wrapper.vm.onSubmit( 'new query' );
		expect( wrapper.vm.inputValueRef ).toBe( 'new query' );
		expect( wrapper.vm.termRef ).toBe( 'new query' );
	} );

	it( 'calls onSearchRegister callback prop on mount', () => {
		const onSearchRegister = jest.fn();
		mount( SearchResultsPage, {
			props: {
				...defaultProps,
				onSearchRegister
			}
		} );

		expect( onSearchRegister ).toHaveBeenCalledTimes( 1 );
		expect( typeof onSearchRegister.mock.calls[ 0 ][ 0 ] ).toBe( 'function' );
	} );
} );
