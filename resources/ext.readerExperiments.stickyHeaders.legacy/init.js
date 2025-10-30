// Sticky Headers Prototype – Legacy Parser support

/**
 * @type {HTMLElement[]}
 */
let headings = [];

/**
 * Adds a new CSS class to the mobile headers, making them sticky.
 */
function setupStickyHeaders() {
	headings = Array.from( document.querySelectorAll( '.collapsible-heading' ) );
	headings.forEach( ( heading ) => {
		heading.classList.add( 'ext-readerExperiments-stickyHeaders' );
	} );
}

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

		if ( index !== -1 && headings[ index + 1 ] ) {
			const nextHeading = headings[ index + 1 ];
			if ( nextHeading ) {
				nextHeading.scrollIntoView( {
					behavior: 'smooth',
					block: 'start'
				} );
			}
		}
	}
}

mw.loader.using( 'mobile.init' ).then( setupStickyHeaders );
mw.hook( 'readerExperiments.section-toggled' ).add( onHeadingToggle );
