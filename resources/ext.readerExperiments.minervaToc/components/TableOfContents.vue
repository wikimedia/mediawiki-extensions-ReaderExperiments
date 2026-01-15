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
	setup() {
		const tocRef = useTemplateRef( 'tocRef' );

		const original = document.querySelector( '#toc > ul' );
		if ( !original ) {
			throw new Error( 'TOC not found' );
		}

		const toc = original.outerHTML;

		const closeToc = ( { scrollToTop = false } = {} ) => {
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
				history.replaceState(
					'',
					document.title,
					window.location.pathname + window.location.search
				);
				window.dispatchEvent( new HashChangeEvent( 'hashchange' ) );
			}
		};

		const onTopLinkClick = ( event ) => {
			event.preventDefault();
			closeToc( { scrollToTop: true } );
		};

		const onFocusTrapStart = () => {
			focusFirstFocusableElement( tocRef.value, true );
		};

		const onFocusTrapEnd = () => {
			focusFirstFocusableElement( tocRef.value, false );
		};

		onMounted( () => {
			focusFirstFocusableElement( tocRef.value, false );
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
		font-weight: @font-weight-bold;
		// Vertically align the top link to Minerva <ul> element
		padding-left: 1em;
		padding-inline: 1em 0;
	}

	&__contents {
		// Match spacing between Minerva <li> elements
		margin-top: 10px;
	}
}
</style>
