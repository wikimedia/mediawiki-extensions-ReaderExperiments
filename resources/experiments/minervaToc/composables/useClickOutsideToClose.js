/* eslint-disable max-len */
'use strict';

const { onUnmounted, watch } = require( 'vue' );

/**
 * Composable to close the TOC when clicking outside of specified elements.
 *
 * @param {import('vue').Ref<boolean>} isOpen Reactive ref for TOC open state
 * @param {Function} getExcludedElements Function that returns array of elements to exclude from the click outside detection
 */
module.exports = exports = ( isOpen, getExcludedElements ) => {
	const onClickOutside = ( event ) => {
		const target = event.target;
		const excludedElements = getExcludedElements();

		for ( const element of excludedElements ) {
			if ( element && element.contains( target ) ) {
				return;
			}
		}

		// Close the TOC when clicks are outside all excluded elements
		isOpen.value = false;
	};

	// Add/remove listener when TOC opens/closes
	watch( isOpen, ( newValue ) => {
		if ( newValue ) {
			document.addEventListener( 'click', onClickOutside );
		} else {
			document.removeEventListener( 'click', onClickOutside );
		}
	}, { immediate: true } );

	// Clean up listener on unmount
	onUnmounted( () => {
		document.removeEventListener( 'click', onClickOutside );
	} );
};
