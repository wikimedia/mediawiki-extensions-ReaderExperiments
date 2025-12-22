'use strict';

const Vue = require( 'vue' );
const { FloatingButtonApp } = require( 'ext.readerExperiments.minervaToc' );

const container = document.createElement( 'div' );
container.setAttribute( 'id', 'readerExperiments-minerva-toc' );
document.getElementById( 'content' ).appendChild( container );
Vue.createMwApp( FloatingButtonApp ).mount( '#readerExperiments-minerva-toc' );
