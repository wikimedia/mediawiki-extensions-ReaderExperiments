const { checkHash } = require( 'ext.readerExperiments.stickyHeaders.common' );

/**
 * @type {HTMLElement[]}
 */
let headings = [];

/**
 * Adds a new CSS class to the mobile headers, making them sticky.
 */
function setupStickyHeaders() {
	headings = Array.from( document.querySelectorAll( '.mf-collapsible-heading' ) );
	headings.forEach( ( heading ) => {
		heading.classList.add( 'ext-readerExperiments-stickyHeaders' );
	} );

	// Scroll overrides:
	mw.hook( 'wikipage.content' ).add( checkHash );
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

	if ( !isExpanded ) {
		// We can't just use `indexOf` because the elements might have been
		// mutated between when different hooks were fired; we need to match
		// by DOM id instead.
		const index = headings.findIndex( ( node ) => node.id === heading.id );

		if ( index !== -1 ) {
			const section = headings[ index ].parentElement;
			if ( section ) {
				// Use the offsetTop of the <section>
				let offset = 0;
				for ( let node = section; node; node = node.offsetParent ) {
					offset += node.offsetTop;
				}
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

mw.loader.using( 'mobile.init' ).then( setupStickyHeaders );
mw.hook( 'readerExperiments.section-toggled' ).add( onHeadingToggle );
