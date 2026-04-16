/**
 * Override any incorrect scrolling on load or `hashchange` done by
 * MobileFrontend's logic which doesn't know about our sticky headers
 * and obscures the target.
 *
 * Immediately re-scrolling using the modern `element.scrollIntoView()`
 * fixes the offsets by paying attention to our `scroll-margin-top`
 * in styles. There is no FOUC, as these happen in the same event loop
 * run as the original scroll and are not animated.
 *
 * @todo when productizing this back into MobileFrontend, fix the jQuery
 *       `scroll()` calls in `Toggler.js` etc to use `scrollIntoView()`.
 */
function checkHash() {
	const hash = window.location.hash;
	if ( hash && hash.slice( 0, 1 ) === '#' ) {
		let id = hash.slice( 1 );
		if ( id ) {
			let element = document.getElementById( id );
			if ( !element ) {
				id = mw.util.percentDecodeFragment( id );
				if ( id ) {
					element = document.getElementById( id );
				}
			}
			if ( element ) {
				element.scrollIntoView();
			}
		}
	}
}

function setupStickyHeaders( headings ) {
	// Observe headings whose content intersects the viewport
	const intersectingHeadings = new Set();

	const setStickyHeading = ( heading ) => {
		intersectingHeadings.add( heading );
		heading.classList.add( 'ext-readerExperiments-stickyHeaders' );
	};
	const unsetStickyHeading = ( heading ) => {
		intersectingHeadings.delete( heading );
		heading.classList.remove( 'ext-readerExperiments-stickyHeaders' );
		heading.style.removeProperty( 'top' );
	};

	const setHeadingPosition = ( heading ) => {
		const content = heading.nextElementSibling;
		const contentBottom = content.getBoundingClientRect().bottom;
		const headingHeight = heading.getBoundingClientRect().height;
		if ( contentBottom >= 0 ) {
			heading.style.top = Math.min( 0, contentBottom - headingHeight ) + 'px';
		} else {
			// The heading has scrolled up offscreen, we can de-sticky it safely
			// If it comes back on screen the observers will catch it and we'll
			// correct its position.
			unsetStickyHeading( heading );
		}
	};

	// eslint-disable-next-line compat/compat
	const intersectionObserver = new IntersectionObserver( ( sections ) => {
		sections.forEach( ( section ) => {
			const heading = section.target.previousSibling;
			if ( section.isIntersecting ) {
				if ( !intersectingHeadings.has( heading ) ) {
					setStickyHeading( heading );
					setHeadingPosition( heading );
				}
			} else if ( intersectingHeadings.has( heading ) ) {
				unsetStickyHeading( heading );
			}
		} );
	} );

	headings.forEach( ( heading ) => {
		const background = document.createElement( 'div' );
		background.classList.add( 'ext-readerExperiments-stickyHeaders-background' );
		heading.insertBefore( background, heading.firstChild );
		intersectionObserver.observe( heading.nextSibling );
	} );

	// Because headings may be of different size, we need to make sure they don't overlap,
	// so we'll make sure they don't remain sticky at the top for longer then the height of
	// the content of their section (in order not to interfere/overlap with the next section)
	const scrollHandler = () => {
		intersectingHeadings.forEach( setHeadingPosition );
	};
	window.addEventListener( 'scroll', mw.util.throttle( scrollHandler, 100 ), { capture: true }, true );

	// Scroll overrides:
	mw.hook( 'wikipage.content' ).add( checkHash );
	window.addEventListener( 'hashchange', checkHash );
}

module.exports = {
	checkHash,
	setupStickyHeaders
};
