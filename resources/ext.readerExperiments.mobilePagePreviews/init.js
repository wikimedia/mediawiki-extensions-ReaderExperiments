'use strict';

// ignore non-touch devices to ensure we're not conflicting with Extension:Popups
// (besides, this experiment doesn't look great on wider screens anyway)
const isTouchDevice = 'ontouchstart' in document.documentElement;
if ( !isTouchDevice ) {
	return;
}

const Vue = require( 'vue' );
const App = require( './App.vue' );

const container = document.createElement( 'div' );
container.setAttribute( 'id', 'ext-readerExperiments-mobile-page-previews' );
document.getElementById( 'content' ).appendChild( container );
Vue.createMwApp( App ).mount( '#ext-readerExperiments-mobile-page-previews' );
