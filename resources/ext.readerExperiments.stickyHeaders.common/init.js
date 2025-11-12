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

module.exports = {
	checkHash
};
