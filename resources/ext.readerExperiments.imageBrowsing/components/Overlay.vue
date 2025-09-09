<template>
	<div
		tabindex="0"
		@focus="onFocusTrapStart"
	></div>

	<div class="ib-overlay-backdrop" @click="onClose">
		<div
			ref="overlayElement"
			class="ib-overlay-container"
			tabindex="-1"
			@keydown.esc="onClose"
			@click.stop
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
	</div>

	<div
		tabindex="0"
		@focus="onFocusTrapEnd"
	></div>
</template>

<script>
const { defineComponent, onMounted, onBeforeUnmount, useTemplateRef } = require( 'vue' );
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
		const existingBodyOverflow = document.body.style.overflow;
		onMounted( () => {
			// Prevent body scroll
			document.body.style.overflow = 'hidden';
			focusFirstFocusableElement( overlayElement.value, false );
		} );
		onBeforeUnmount( () => {
			// Restore body scroll
			document.body.style.overflow = existingBodyOverflow;
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

.ib-overlay-backdrop {
	position: fixed;
	top: 0;
	left: 0;
	z-index: @z-index-overlay-backdrop;
	width: @size-viewport-width-full;
	height: @size-viewport-height-full;
	background-color: @background-color-backdrop-light;
	display: flex;
	align-items: center;
	justify-content: center;
}

.ib-overlay-container {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	width: 100%;
	max-width: 1110px;
	height: 100%;
	background-color: @background-color-base;
	border-left: @border-base;
	border-right: @border-base;
	box-shadow: @box-shadow-large;
	overflow-y: auto;
	position: relative;
	z-index: @z-index-overlay;
}

.ib-overlay__close {
	position: absolute;
	top: @spacing-100;
	right: @spacing-100;
	z-index: @z-index-overlay;
}
</style>
