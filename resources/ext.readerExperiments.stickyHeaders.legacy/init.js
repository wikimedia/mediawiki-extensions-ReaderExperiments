// Sticky Headers Prototype – Legacy Parser support

const { setupStickyHeaders } = require( 'ext.readerExperiments.stickyHeaders.common' );

/**
 * @type {HTMLElement[]}
 */
let headings = [];

/**
 * If a given header is collapsed, it'll drag the remaining content up.
 * We'll find the collapsed header in the  sequence of headers we set
 * up earlier, try to locate the element in the list, then scroll the
 * starting position of that header back into view.
 *
 * @param {Object} options
 * @param {boolean} options.isExpanded Whether the given section was previously expanded
 * @param {HTMLElement} options.heading Heading element for the section
 */
function onHeadingToggle( options ) {
	const { isExpanded, heading } = options;

	function findChildHeaderId( el ) {
		const h2Element = el.querySelector( 'h2' );
		if ( h2Element ) {
			return h2Element.id;
		}
	}

	if ( !isExpanded ) {
		const index = headings.findIndex( ( node ) => {
			if ( findChildHeaderId( node ) ) {
				return findChildHeaderId( node ) === findChildHeaderId( heading );
			} else {
				return false;
			}
		} );

		if ( headings[ index ] ) {
			// In order to find the actual position to scroll to, we can't rely
			// on the heading's position, as position:sticky moves the offset;
			// we also can't rely on the position of its content, because iOS
			// Safari reports that as 0 when the element is collapsed.
			// Let's just temporarily insert a dummy node instead & get that
			// one's position...
			const dummy = document.createElement( 'div' );
			heading.before( dummy );
			let offset = 0;
			for ( let node = dummy; node; node = node.offsetParent ) {
				offset += node.offsetTop;
			}
			dummy.remove();
			if ( window.scrollY > offset ) {
				window.scroll( {
					top: offset,
					left: 0
				} );
			}
		}
	}
}

mw.loader.using( 'mobile.init' ).then( () => {
	headings = Array.from( document.querySelectorAll( '.collapsible-heading:has( + .collapsible-block )' ) );
	setupStickyHeaders( headings );
	mw.hook( 'readerExperiments.section-toggled' ).add( onHeadingToggle );
} );
