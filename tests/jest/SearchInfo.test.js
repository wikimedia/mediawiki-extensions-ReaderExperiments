'use strict';

const { mount } = require( '@vue/test-utils' );

const SearchInfo = require( '../../resources/experiments/semanticSearch/components/SearchInfo.vue' );

const NO_RESULTS_MESSAGE = 'readerexperiments-semanticsearch-no-results';

const baseProps = {
	term: 'why is the sky blue',
	namespaces: [ 0 ],
	limit: 10,
	sort: 'relevance'
};

describe( 'SearchInfo', () => {
	it( 'shows the no-results message when results come back empty', () => {
		// results defaults to [], which is truthy in JS;
		// the message must render in that default case
		const wrapper = mount( SearchInfo, { props: baseProps } );

		expect( wrapper.text() ).toContain( NO_RESULTS_MESSAGE );
	} );

	it( 'does not show the no-results message when there are results', () => {
		const wrapper = mount( SearchInfo, {
			props: { ...baseProps, results: [ { title: 'Sky' } ] }
		} );

		expect( wrapper.text() ).not.toContain( NO_RESULTS_MESSAGE );
	} );

	it( 'does not show the no-results message when there is an error', () => {
		const wrapper = mount( SearchInfo, {
			props: { ...baseProps, error: 'Something went wrong' }
		} );

		expect( wrapper.text() ).not.toContain( NO_RESULTS_MESSAGE );
	} );

	it( 'does not show the no-results message when there is no search term', () => {
		const wrapper = mount( SearchInfo, {
			props: { ...baseProps, term: '' }
		} );

		expect( wrapper.text() ).not.toContain( NO_RESULTS_MESSAGE );
	} );
} );
