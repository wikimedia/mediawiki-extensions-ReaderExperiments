'use strict';

const Vue = require( 'vue' );
const { StickyHeaderApp } = require( 'ext.readerExperiments.minervaToc' );

// Insert the page heading toggle button next to the article title h1
const pageHeading = document.querySelector( '.page-heading' );
const pageHeadingH1 = pageHeading && pageHeading.querySelector( 'h1' );
let buttonContainer = null;
if ( pageHeading && pageHeadingH1 ) {
	// Wrap h1 and tagline so they are aligned with each other and positioned next to the button
	const contentsWrapper = document.createElement( 'div' );
	contentsWrapper.className = 'ext-readerExperiments-minerva-toc__page-heading-contents';
	pageHeadingH1.before( contentsWrapper );
	contentsWrapper.appendChild( pageHeadingH1 );
	const tagline = pageHeading.querySelector( '.tagline' );
	if ( tagline ) {
		contentsWrapper.appendChild( tagline );
	}

	buttonContainer = document.createElement( 'div' );
	buttonContainer.className = 'ext-readerExperiments-minerva-toc__page-heading-button-container';
	contentsWrapper.before( buttonContainer );
}

// Mount the sticky header
const container = document.createElement( 'div' );
container.setAttribute( 'id', 'ext-readerExperiments-minerva-toc' );
document.getElementById( 'content' ).prepend( container );
Vue.createMwApp(
	StickyHeaderApp,
	{ buttonContainer }
).mount( '#ext-readerExperiments-minerva-toc' );
