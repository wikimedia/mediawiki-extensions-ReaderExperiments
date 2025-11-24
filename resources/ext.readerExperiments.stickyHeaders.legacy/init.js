// Sticky Headers Prototype – Legacy Parser support

const { setupStickyHeaders } = require( 'ext.readerExperiments.stickyHeaders.common' );

/**
 * @type {HTMLElement[]}
 */
let headings = [];

/**
 * If a given header is collapsed, find it in the sequence of headers
 * we set up earlier. If we can locate the element in the list *and* if
 * there is another subsequent header element, then scroll the start of
 * the section corresponding to the next header into view.
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

		if ( index !== -1 ) {
			const contents = headings[ index ].nextElementSibling;
			if ( contents ) {
				// position:sticky moves our offset while it's still active
				// so to get where we should belong we just have to offset
				// it ourselves from the following section
				let offset = 0;
				for ( let node = contents; node; node = node.offsetParent ) {
					offset += node.offsetTop;
				}
				offset -= headings[ index ].offsetHeight;
				if ( window.scrollY > offset ) {
					window.scroll( {
						top: offset,
						left: 0
					} );
				}
			}
		}
	}
}

const setupPromise = mw.loader.using( 'mobile.init' ).then( () => {
	headings = Array.from( document.querySelectorAll( '.collapsible-heading:has( + .collapsible-block )' ) );
	setupStickyHeaders( headings );
} );
// Out of an abundance of caution: make sure not to toggle heading until setup is complete
mw.hook( 'readerExperiments.section-toggled' ).add( ( options ) => {
	setupPromise.then( () => onHeadingToggle( options ) );
} );
