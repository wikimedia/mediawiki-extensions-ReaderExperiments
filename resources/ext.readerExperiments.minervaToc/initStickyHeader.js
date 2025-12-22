'use strict';

const Vue = require( 'vue' );
const { StickyHeaderApp } = require( 'ext.readerExperiments.minervaToc' );

const container = document.createElement( 'div' );
container.setAttribute( 'id', 'readerExperiments-minerva-toc' );
document.getElementById( 'content' ).appendChild( container );
Vue.createMwApp( StickyHeaderApp ).mount( '#readerExperiments-minerva-toc' );
