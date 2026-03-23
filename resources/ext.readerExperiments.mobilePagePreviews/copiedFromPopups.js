'use strict';

/*
 * All code in this file is an (almost) exact copy of code in
 * Extension:Popups, which I half-expect this feature to end up
 * being implemented in if this experiment turns out successful,
 * so deviations from the original are to be avoided or as
 * minimal as possible.
 */
/* eslint-disable unicorn/prefer-includes */

const { apiBaseUri } = require( './config.json' );

// Copied over from Popups/src/index.js
const excludedLinksSelector = [
	'.extiw',
	// ignore links that point to the same article
	'.mw-selflink',
	'.image',
	'.new',
	'.internal',
	'.external',
	'.mw-cite-backlink a',
	'.oo-ui-buttonElement-button',
	'.ve-ce-surface a', // T259889
	'.ext-discussiontools-init-timestamplink',
	'.cancelLink a',
	// T198652: lists to hash fragments are ignored.
	// Note links that include the path will still trigger a hover,
	// e.g. <a href="Foo#foo"> will trigger a preview but <a href="#foo"> will not.
	// This is intentional behaviour that will not be handled by page previews, to avoid
	// introducing complex behaviour. If a link must include the path it should make use of
	// the .mw-selflink-fragment class.
	'.mw-selflink-fragment',
	'[href^="#"]'
].join( ', ' );

// Copied over from Popups/src/title.js
// There is a minor divergence from the original to support content
// served through MobileFrontendContentProvider
function isOwnPageAnchorLink( el ) {
	return el.hash &&
		// Note: The protocol is ignored for the sake of simplicity.
		// Can't compare username and password because they aren't readable from `location`.
		// Note: line below diverges from Popups/src/title.js to also support content
		// served through MobileFrontendContentProvider
		( el.host === location.host || ( apiBaseUri && el.host !== new URL( apiBaseUri ).host ) ) &&
		el.pathname === location.pathname &&
		el.search === location.search;
}

// Copied over from Popups/src/title.js
// There is a minor divergence from the original to support content
// served through MobileFrontendContentProvider
function getTitle( href, config ) {
	// Skip every URL that cannot be parsed
	let linkHref;
	try {
		linkHref = new URL( href );
	} catch ( e ) {
		// treat as relative URI
		try {
			linkHref = new URL( href, location.origin );
		} catch ( errRelative ) {
			// could not be parsed.
			return undefined;
		}
	}

	// External links
	// Note: section below diverges from Popups/src/title.js to also support content
	// served through MobileFrontendContentProvider
	const remote = linkHref.hostname !== location.hostname;
	const remoteProvider = remote &&
		( apiBaseUri && linkHref.hostname === new URL( apiBaseUri ).hostname );
	if ( remote && !remoteProvider ) {
		return undefined;
	}

	const searchParams = linkHref.searchParams;
	// Note that we use Array.from and length rather than `size` as Selenium browser tests fail
	// with `size` being undefined. `size` property is relatively new (April 2023)
	// https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/size
	const queryLength = Array.from( searchParams ).length;
	let title;

	// No query params (pretty URL)
	if ( !queryLength ) {
		// If it's a MobileFrontendContentProvider-sourced remote page,
		// hardcode the article path to the Wikimedia one.
		const articlePath = remoteProvider ? '/wiki/$1' : config.get( 'wgArticlePath' );
		const pattern = mw.util.escapeRegExp( articlePath ).replace( '\\$1', '([^?#]+)' ),
			// eslint-disable-next-line security/detect-non-literal-regexp
			matches = new RegExp( pattern ).exec( linkHref.pathname );

		// We can't be sure decodeURIComponent() is able to parse every possible match
		try {
			title = matches && decodeURIComponent( matches[ 1 ] );
		} catch ( e ) {
			// Will return undefined below
		}
	} else if ( queryLength === 1 && searchParams.has( 'title' ) ) {
		// URL is not pretty, but only has a `title` parameter
		title = searchParams.get( 'title' );
	}

	return title ? `${ title }${ linkHref.hash ? linkHref.hash : '' }` : undefined;
}

// Copied over from Popups/src/title.js
function isValid( title, contentNamespaces ) {
	if ( !title ) {
		return null;
	}

	// Is title in a content namespace?
	const mwTitle = mw.Title.newFromText( title );
	if ( mwTitle && contentNamespaces.indexOf( mwTitle.namespace ) >= 0 ) {
		return mwTitle;
	}

	return null;
}

// Copied over from Popups/src/title.js
function fromElement( el, config ) {
	if ( el.dataset.title ) {
		return mw.Title.newFromText( el.dataset.title );
	}
	if ( isOwnPageAnchorLink( el ) ) {
		// No need to check the namespace. A self-link can't point to different one.
		try {
			return mw.Title.newFromText( config.get( 'wgPageName' ) + decodeURIComponent( el.hash ) );
		} catch ( e ) {
			return null;
		}
	}

	return isValid(
		getTitle( el.href, config ),
		config.get( 'wgContentNamespaces' )
	);
}

module.exports = {
	excludedLinksSelector,
	fromElement
};
