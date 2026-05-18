const Vue = require( 'vue' );
const App = require( './App.vue' );

// Don't initialize if the browser doesn't support CSS has (T424873).
// https://developer.mozilla.org/en-US/docs/Web/API/CSS/supports_static#examples
if ( !CSS.supports( 'selector(:has(a))' ) ) {
	const shareButton = document.getElementById( 'page-actions-re-share' );
	if ( shareButton ) {
		shareButton.style.display = 'none';
	}
	return;
}

const container = document.createElement( 'div' );
container.setAttribute( 'id', 'ext-readerExperiments-shareHighlight' );
document.getElementById( 'content' ).appendChild( container );

// Toolbar "Share" button fires a hook that App.vue component can subscribe to.
const toolbarShareButton = document.getElementById( 'ca-re-share' );
if ( toolbarShareButton ) {
	toolbarShareButton.addEventListener( 'click', ( event ) => {
		event.preventDefault();
		mw.hook( 'ext.readerExperiments.shareHighlight.toolbarClick' ).fire();
	} );
}

// Find the article content container to monitor for text selection.
const contentElement = document.querySelector( '#bodyContent' );
if ( !contentElement ) {
	return;
}

const shareHighlightApp = Vue.createMwApp( App, {
	contentElement: contentElement
} );

shareHighlightApp.mount( '#ext-readerExperiments-shareHighlight' );
