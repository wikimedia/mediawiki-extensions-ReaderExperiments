const Vue = require( 'vue' );
const App = require( './App.vue' );

const toolbar = document.querySelector( '.page-actions-menu__list' );
if ( toolbar && !document.getElementById( 'ext-readerExperiments-readAloud' ) ) {
	const container = document.createElement( 'li' );
	container.id = 'ext-readerExperiments-readAloud';
	// Use Minerva's existing toolbar item layout in both standard and minimal mode.
	container.className = 'page-actions-menu__list-item';
	const watch = toolbar.querySelector( '#page-actions-watch' );
	toolbar.insertBefore( container, watch );
	Vue.createMwApp( App ).mount( container );
}
