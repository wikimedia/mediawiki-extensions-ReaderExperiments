'use strict';

const Vue = require( 'vue' );
const App = require( './App.vue' );

const container = document.createElement( 'div' );
container.setAttribute( 'id', 'ext-readerExperiments-mobile-page-previews' );
document.getElementById( 'content' ).appendChild( container );
Vue.createMwApp( App ).mount( '#ext-readerExperiments-mobile-page-previews' );
