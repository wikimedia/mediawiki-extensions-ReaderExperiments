const Vue = require( 'vue' );
const App = require( './App.vue' );

// Entry point UI (toolbar button) lands in T434882.
const container = document.createElement( 'div' );
container.setAttribute( 'id', 'ext-readerExperiments-readAloud' );
document.getElementById( 'content' ).appendChild( container );

const readAloudApp = Vue.createMwApp( App );
readAloudApp.mount( '#ext-readerExperiments-readAloud' );
