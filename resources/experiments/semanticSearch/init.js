'use strict';

const Vue = require( 'vue' );
const SearchResultsPage = require( './components/SearchResultsPage.vue' );
const data = mw.config.get( 'semanticSearch' );

// PHP arrays will often end up formatted into JS object literals,
// as is the case here. We want them to be proper arrays instead.
data.response.lexical.results = Object.values( data.response.lexical.results );
data.response.semantic.results = Object.values( data.response.semantic.results );

const container = document.getElementById( 'ext-readerExperiments-semanticsearch' );
container.innerHTML = '';
Vue.createMwApp(
	SearchResultsPage,
	{
		request: data.request,
		response: data.response
	}
).mount( container );
