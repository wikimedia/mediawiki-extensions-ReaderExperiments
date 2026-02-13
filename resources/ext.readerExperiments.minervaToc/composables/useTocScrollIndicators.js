'use strict';

const { ref, watchEffect, onUnmounted } = require( 'vue' );

/**
 * Composable to manage TOC scroll indicators.
 * Tracks scroll position to show/hide gradient indicators at top/bottom.
 *
 * @param {import('vue').Ref<HTMLElement|null>} tocWrapperRef TOC wrapper element
 * @param {import('vue').Ref<boolean>} isOpen Whether the TOC is open
 * @return {{canScrollUp: import('vue').Ref<boolean>, canScrollDown: import('vue').Ref<boolean>}}
 */
module.exports = exports = ( tocWrapperRef, isOpen ) => {
	const canScrollUp = ref( false );
	const canScrollDown = ref( false );
	let currentEl = null;

	const handleScroll = () => {
		if ( !currentEl ) {
			return;
		}

		const newUp = currentEl.scrollTop > 0;
		const newDown = currentEl.scrollHeight - currentEl.scrollTop - currentEl.clientHeight > 1;
		canScrollUp.value = newUp;
		canScrollDown.value = newDown;
	};

	const cleanup = () => {
		if ( currentEl ) {
			currentEl.removeEventListener( 'scroll', handleScroll );
			currentEl = null;
		}
	};

	// Use watchEffect with flush: 'post' to run after DOM updates
	watchEffect( ( onCleanup ) => {
		// Clean up previous listener
		cleanup();

		if ( tocWrapperRef.value && isOpen.value ) {
			currentEl = tocWrapperRef.value;
			handleScroll();
			tocWrapperRef.value.addEventListener( 'scroll', handleScroll, { passive: true } );
		} else {
			canScrollUp.value = false;
			canScrollDown.value = false;
		}

		onCleanup( cleanup );
	}, { flush: 'post' } );

	onUnmounted( cleanup );

	return {
		canScrollUp,
		canScrollDown
	};
};
