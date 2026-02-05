'use strict';

const { ref } = require( 'vue' );

/**
 * Composable to coordinate TOC open state with URL hash & fire relevant events.
 *
 * @param {number} topMargin Amount of pixels from the top of the viewport
 * @type {Function<import('vue').Ref<Element | null>>}
 */
module.exports = exports = ( topMargin = 0 ) => {
	const intersectionThreshold = 0.5;
	const activeHeading = ref( null );
	const headings = Array.from( document.querySelectorAll( '.page-heading, .mw-heading' ) );
	const intersectingHeadings = new Set();

	const updateActiveHeading = ( entries ) => {
		// We'd rather not traverse & process all headings on every intersection change,
		// so we'll try to use the intersecting entries to reduce the set of headings
		// to work with.
		// We can't rely on those intersecting, because that set might be empty (in 2
		// different ways: heading fell off from the top, or from the bottom of the
		// viewport)
		// We could solely rely on those that come into/fall out of the viewport (i.e.
		// those given to this handler) as a starting point, but (especially in the case
		// of collapsed sections) that could still mean having to process a lot of
		// irrelevant headings between the newly-entered-from-the-bottom heading and
		// the one we actually care about.
		// Instead, we'll use both the set of headings we know to be intersecting, and
		// those that we just lost. The very first one from that combined list should
		// always be pretty damn close to the heading we're interested in, effectively
		// minimizing the work we need to do here.
		const relevantHeadings = new Set( intersectingHeadings );
		entries.forEach( ( entry ) => {
			if ( entry.isIntersecting ) {
				intersectingHeadings.add( entry.target );
				relevantHeadings.add( entry.target );
			} else {
				intersectingHeadings.delete( entry.target );
			}
		} );

		const firstKnownHeadingCloseToViewportIndex = Array.from( relevantHeadings ).reduce(
			( index, heading ) => Math.min( index, headings.indexOf( heading ) ),
			headings.length - 1
		);

		// Find the first heading that is below the top of the viewport
		let firstUpcomingHeadingIndex = headings.length - 1;
		for ( let i = firstKnownHeadingCloseToViewportIndex; i < headings.length; i++ ) {
			const headingRect = headings[ i ].getBoundingClientRect();
			if ( headingRect.top + headingRect.height * intersectionThreshold > topMargin ) {
				firstUpcomingHeadingIndex = i;
				break;
			}
		}

		// Find the last non-hidden (e.g. no collapsed subsections) heading before that
		// first upcoming one
		let lastVisibleHeadingIndex = -1;
		for ( let i = firstUpcomingHeadingIndex - 1; i >= 0; i-- ) {
			// innerText will produce an empty string for elements that are not rendered
			if ( headings[ i ].innerText ) {
				lastVisibleHeadingIndex = i;
				break;
			}
		}

		const newHeading = lastVisibleHeadingIndex in headings ? headings[ lastVisibleHeadingIndex ] : null;
		if ( activeHeading.value !== newHeading ) {
			activeHeading.value = newHeading;
		}
	};

	// eslint-disable-next-line compat/compat
	const intersectionObserver = new IntersectionObserver(
		updateActiveHeading,
		{
			rootMargin: `-${ topMargin }px 0px 0px 0px`,
			// 0.5 in order to have a single consistent position at which the element falls
			// in/out of view: at half the height the element; otherwise, we may be
			// triggered from either the top of the bottom of the element entering/leaving
			// the viewport (depending on scroll direction) and can not implement consistent
			// handling logic
			threshold: intersectionThreshold
		}
	);
	headings.forEach( ( heading ) => {
		intersectionObserver.observe( heading );
	} );

	return activeHeading;
};
