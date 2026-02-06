<template>
	<div
		tabindex="0"
		@focus="onFocusTrapStart"
	></div>
	<div
		ref="tocRef"
		class="readerExperiments-minerva-toc__toc"
		@keydown.esc="onClose"
	>
		<a
			class="readerExperiments-minerva-toc__toc__top-link"
			:class="{ 'readerExperiments-minerva-toc__toc__active': [ null, 'firstHeading' ].includes( activeHeadingId ) }"
			href="#"
			@click="onTopLinkClick"
		>
			{{ $i18n( 'readerexperiments-minerva-toc-top-link' ).text() }}
		</a>
		<!-- eslint-disable-next-line vue/no-v-html -->
		<div class="readerExperiments-minerva-toc__toc__contents" v-html="toc"></div>
	</div>

	<div
		tabindex="0"
		@focus="onFocusTrapEnd"
	></div>
</template>

<script>
const { defineComponent, useTemplateRef, onMounted } = require( 'vue' );

/**
 * Focus the first or last focusable element in a container.
 *
 * @param {HTMLElement} container - TableOfContents container
 * @param {boolean} backwards - If true, focus the last focusable element
 */
function focusFirstFocusableElement( container, backwards = false ) {
	let candidates = Array.from(
		container.querySelectorAll( `
			a, button,
			[tabindex]:not([tabindex^="-"])
		` )
	);

	if ( backwards ) {
		candidates = candidates.reverse();
	}

	for ( const candidate of candidates ) {
		candidate.focus();
		if ( document.activeElement === candidate ) {
			return;
		}
	}
}

// @vue/component
module.exports = exports = defineComponent( {
	name: 'TableOfContents',
	props: {
		activeHeadingId: {
			type: String,
			default: null
		}
	},
	emits: [ 'close' ],
	setup( props, { emit } ) {
		const tocRef = useTemplateRef( 'tocRef' );

		const original = document.querySelector( '#toc > ul' );
		if ( !original ) {
			throw new Error( 'TOC not found' );
		}

		// Clone the TOC HTML & parse, then add a class indicating the currently active heading
		const clone = document.createElement( 'div' );
		clone.innerHTML = original.outerHTML;
		// using [id="..."] instead of #... selector, as the latter may be invalid
		// when ids start with numbers
		const activeHeading = clone.querySelector( `a[href="#${ props.activeHeadingId }"]` );
		if ( activeHeading ) {
			activeHeading.classList.add( 'readerExperiments-minerva-toc__toc__active' );
		}
		const toc = clone.innerHTML;

		const closeToc = ( { scrollToTop = false, restoreFocus = true } = {} ) => {
			if ( scrollToTop ) {
				// Trigger hashchange: clear the hash and fire toc close hook
				// Setting hash triggers scroll
				window.location.hash = '';
				// Tidy up URL by removing the dangling '#'
				history.replaceState(
					'',
					document.title,
					window.location.pathname + window.location.search
				);
			} else {
				// Update the URL without triggering scroll then manually fire hashchange
				history.pushState(
					'',
					document.title,
					window.location.pathname + window.location.search
				);
				window.dispatchEvent( new HashChangeEvent( 'hashchange' ) );
			}

			emit( 'close', { restoreFocus } );
		};

		const onTopLinkClick = ( event ) => {
			event.preventDefault();
			// Don't restore focus since user is navigating to the top of the page
			closeToc( { scrollToTop: true, restoreFocus: false } );
		};

		const onFocusTrapStart = () => {
			focusFirstFocusableElement( tocRef.value, true );
		};

		const onFocusTrapEnd = () => {
			focusFirstFocusableElement( tocRef.value, false );
		};

		onMounted( () => {
			focusFirstFocusableElement( tocRef.value, false );

			// Handle clicks on TOC links to emit close event
			tocRef.value.addEventListener( 'click', ( event ) => {
				const link = event.target.closest( 'a[href^="#"]' );
				if ( link && link.getAttribute( 'href' ) !== '#' ) {
					// Let the browser handle the navigation, then emit close
					// Don't restore focus since user is navigating to a section
					emit( 'close', { restoreFocus: false } );
				}
			} );
		} );

		function onClose() {
			closeToc( { scrollToTop: false } );

			// TODO: Instrument TOC close event
		}

		return {
			tocRef,
			toc,
			onTopLinkClick,
			onFocusTrapStart,
			onFocusTrapEnd,
			onClose
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';
/* stylelint-disable selector-class-pattern */
// Prevent body scroll when TOC is open
body:has( .readerExperiments-minerva-toc__toc ) {
	overflow: hidden;
}

.readerExperiments-minerva-toc__toc {
	&__contents ul,
	&__contents ul > li > ul,
	&__contents ul > li > ul > li > ul,
	&__contents ul > li > ul > li > ul > li > ul,
	&__contents ul > li > ul > li > ul > li > ul > li > ul,
	&__contents ul > li > ul > li > ul > li > ul > li > ul > li > ul {
		// Override Minerva list styles and nested list items
		list-style-type: none;
	}

	&__top-link {
		color: inherit;
		// Vertically align the top link to Minerva <ul> element
		padding-left: 1em;
		padding-inline: 1em 0;
	}

	&__contents {
		// Match spacing between Minerva <li> elements
		margin-top: 10px;
	}

	&__active {
		font-weight: @font-weight-bold;
	}
}
</style>
