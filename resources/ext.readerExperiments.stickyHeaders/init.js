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

mw.loader.using( 'mobile.init' ).then( () => {
	headings = Array.from( document.querySelectorAll( '.mf-collapsible-heading:has( + .mf-collapsible-content )' ) );
	setupStickyHeaders( headings );
	mw.hook( 'readerExperiments.section-toggled' ).add( onHeadingToggle );
} );
