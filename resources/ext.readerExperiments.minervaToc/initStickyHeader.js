'use strict';

const Vue = require( 'vue' );
const { StickyHeaderApp } = require( 'ext.readerExperiments.minervaToc' );

const container = document.createElement( 'div' );
container.setAttribute( 'id', 'ext-readerExperiments-minerva-toc' );
document.getElementById( 'content' ).prepend( container );
Vue.createMwApp( StickyHeaderApp ).mount( '#ext-readerExperiments-minerva-toc' );
