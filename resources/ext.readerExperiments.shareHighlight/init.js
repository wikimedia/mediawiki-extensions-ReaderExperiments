const Vue = require( 'vue' );
const App = require( './App.vue' );

// Find the article content container to monitor for text selection.
const contentElement = document.querySelector( '#bodyContent' );
if ( !contentElement ) {
	return;
}

const shareHighlightApp = Vue.createMwApp( App, {
	contentElement: contentElement
} );

shareHighlightApp.mount( '#ext-readerExperiments-shareHighlight' );
