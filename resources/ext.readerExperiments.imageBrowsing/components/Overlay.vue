<template>
	<div
		tabindex="0"
		@focus="onFocusTrapStart"
	></div>

	<div
		ref="overlayElement"
		class="ib-overlay"
		tabindex="-1"
		@keydown.esc="onClose"
	>
		<cdx-button
			class="ib-overlay__close"
			@click="onClose"
		>
			<cdx-icon :icon="cdxIconClose"></cdx-icon>
		</cdx-button>

		<suspense>
			<detail-view
				ref="detailViewRef"
				:active-image="activeImage"
			></detail-view>
		</suspense>

		<visual-table-of-contents
			:images="images"
			@vtoc-item-click="onItemClick"
			@vtoc-view-in-article="onViewInArticle"
		></visual-table-of-contents>
	</div>

	<div
		tabindex="0"
		@focus="onFocusTrapEnd"
	></div>
</template>

<script>
const { defineComponent, onMounted, useTemplateRef } = require( 'vue' );
const DetailView = require( './DetailView.vue' );
const VisualTableOfContents = require( './VisualTableOfContents.vue' );
const { CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconClose } = require( '../icons.json' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'Overlay',
	components: {
		DetailView,
		VisualTableOfContents,
		CdxButton,
		CdxIcon
	},
	props: {
		images: {
			type: /** @type {import('vue').PropType<ImageData[]>} */ ( Array ),
			required: true
		},
		activeImage: {
			type: /** @type {import('vue').PropType<ImageData>} */ ( Object ),
			required: true
		}
	},
	emits: [
		'close-overlay',
		'vtoc-item-click',
		'vtoc-view-in-article'
	],
	setup( props, { emit } ) {
		function focusFirstFocusableElement( container, backwards = false ) {
			// Find all focusable elements in the container.
			// Exclude elements with a negative tabindex; those are technically focusable, but are
			// skipped when tabbing
			let candidates = Array.from(
				container.querySelectorAll( `
					input, select, textarea, button, object, a, area,
					[contenteditable], [tabindex]:not([tabindex^="-"])
				` )
			);

			// If we're looking for the previous element, reverse the array.
			if ( backwards ) {
				candidates = candidates.reverse();
			}

			for ( const candidate of candidates ) {
				// Try to focus each element.
				candidate.focus();
				// Once it works, return true.
				if ( document.activeElement === candidate ) {
					return true;
				}
			}
			return false;
		}

		const overlayElement = useTemplateRef( 'overlayElement' );
		onMounted( () => {
			focusFirstFocusableElement( overlayElement.value, false );
		} );
		const onFocusTrapStart = () => {
			focusFirstFocusableElement( overlayElement.value, true );
		};
		const onFocusTrapEnd = () => {
			focusFirstFocusableElement( overlayElement.value, false );
		};

		function onClose() {
			emit( 'close-overlay' );
		}

		const detailViewRef = useTemplateRef( 'detailViewRef' );

		/**
		 * @param {import('../types').ImageData} image
		 */
		function onItemClick( image ) {
			emit( 'vtoc-item-click', image );
			if ( detailViewRef.value && detailViewRef.value.$el ) {
				// Scroll the overlay back to the detail view at top.
				detailViewRef.value.$el.scrollIntoView( {
					behavior: 'smooth'
				} );
			}
		}

		/**
		 * @param {import('../types').ImageData} image
		 */
		function onViewInArticle( image ) {
			emit( 'vtoc-view-in-article', image );
		}

		return {
			overlayElement,
			detailViewRef,
			onFocusTrapStart,
			onFocusTrapEnd,
			onClose,
			onItemClick,
			onViewInArticle,
			cdxIconClose
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ib-overlay {
	width: 100vw;
	height: 100vh;
	background-color: @background-color-base;
	overflow-y: auto;
	position: fixed;
	top: 0;
	left: 0;

	&__close {
		position: absolute;
		top: @spacing-100;
		right: @spacing-100;
	}
}
</style>
