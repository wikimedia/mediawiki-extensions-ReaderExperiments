'use strict';

const { ref, watch } = require( 'vue' );

let tocIsOpen = null;

/**
 * Composable to coordinate TOC open state with URL hash & fire relevant events.
 *
 * @param {string} implementation - The TOC implementation; to be added to hooks fired
 * @type {Function<import('vue').Ref<boolean>>}
 */
module.exports = exports = ( implementation ) => {
	if ( tocIsOpen !== null ) {
		return tocIsOpen;
	}

	const existing = document.querySelector( '.toc' );
	if ( existing === null ) {
		throw new Error( 'TOC not found' );
	}

	mw.hook( 'readerExperiments.toc.init' ).fire( implementation );

	// In-content TOC is not always hidden by default (on wider screens),
	// but we need to make sure it will never be visible alongside this feature
	existing.style.display = 'none';

	// Initialize as closed so that, if the page loads with #toc, the watcher
	// will pick up on it and immediately fire the open hook
	tocIsOpen = ref( false );

	const hasHash = () => window.location.hash === '#toc';

	watch(
		tocIsOpen,
		( isOpen ) => {
			if ( isOpen ) {
				mw.hook( 'readerExperiments.toc.open' ).fire( implementation );

				// Ensure URL accurately reflects TOC (in case another change,
				// i.e. button toggle), triggered it
				window.location.hash = 'toc';
			} else {
				mw.hook( 'readerExperiments.toc.close' ).fire( implementation );

				if ( hasHash() ) {
					// Only nix hash if it is still set to #toc, in order not to
					// override other hash changes
					history.pushState(
						'',
						document.title,
						window.location.pathname + window.location.search
					);
				}
			}
		}
	);

	// Set initial open state based on URL hash, and update if it changes
	tocIsOpen.value = hasHash();
	window.addEventListener( 'hashchange', () => ( tocIsOpen.value = hasHash() ) );

	return tocIsOpen;
};
