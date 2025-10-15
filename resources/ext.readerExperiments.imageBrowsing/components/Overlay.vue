<template>
	<div
		tabindex="0"
		@focus="onFocusTrapStart"
	></div>

	<div class="ib-overlay-backdrop" @click="onClose">
		<div
			ref="overlayElement"
			class="ib-overlay-container"
			role="dialog"
			aria-modal="true"
			:aria-label="$i18n(
				'readerexperiments-imagebrowsing-overlay-label'
			).text()"
			tabindex="-1"
			@keydown.esc="onClose"
			@click.stop
		>
			<cdx-button
				class="ib-overlay__close"
				:aria-label="$i18n(
					'readerexperiments-imagebrowsing-overlay-close-button-label'
				).text()"
				@click="onClose"
			>
				<cdx-icon :icon="cdxIconClose"></cdx-icon>
			</cdx-button>

			<detail-view
				ref="detailViewRef"
				:active-image="activeImage"
			></detail-view>

			<visual-table-of-contents
				:images="images"
				:active-image="activeImage"
				@vtoc-item-click="onVTOCItemClick"
				@vtoc-view-in-article="onVTOCViewInArticle"
			></visual-table-of-contents>

			<visual-table-of-contents-other-wikis
				:exclude-images="images"
				:active-image="activeImage"
				@vtoc-item-click="onVTOCItemClick"
			></visual-table-of-contents-other-wikis>

			<cdx-button
				class="ib-overlay__back-button"
				action="progressive"
				weight="primary"
				@click="onClose"
			>
				<cdx-icon :icon="cdxIconArrowPrevious"></cdx-icon>
				{{ $i18n( 'readerexperiments-imagebrowsing-overlay-back-button-label' ).text() }}
			</cdx-button>
		</div>
	</div>

	<div
		tabindex="0"
		@focus="onFocusTrapEnd"
	></div>
</template>

<script>
const { defineComponent, useTemplateRef, inject, onMounted, onBeforeUnmount } = require( 'vue' );
const DetailView = require( './DetailView.vue' );
const VisualTableOfContents = require( './VisualTableOfContents.vue' );
const VisualTableOfContentsOtherWikis = require( './VisualTableOfContentsOtherWikis.vue' );
const { CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconClose, cdxIconArrowPrevious } = require( '../icons.json' );

/*
 * Note for buttons used within this widget:
 *
 * Clicking the image is supposed to open the overlay, or
 * keep the overlay open if it's already open.
 * <Space> and <Enter> key presses will generate clicks
 * (and thus will also open the overlay).
 * <Space> and <Enter> are inconsistent, though: the former
 * causes a "click" event on "keyup", the latter on "keydown".
 * Because of this difference, there's this weird bug where
 * an <Enter>-key based "click" will cause the overlay to open,
 * which will in turn move the focus to the close button,
 * and they <Enter>-based "click" will once again fire on that
 * new button that now has focus, effectively immediately
 * closing the overlay again.
 *
 * Instead of that, we're binding keydown/keyup handlers for
 * enter specifically on thos buttons so we trigger on the
 * keyup instead of the keydown and avoid breaking the overlay.
 */

// @vue/component
module.exports = exports = defineComponent( {
	name: 'Overlay',
	components: {
		DetailView,
		VisualTableOfContents,
		VisualTableOfContentsOtherWikis,
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
		'overlay-close',
		'vtoc-item-click',
		'vtoc-view-in-article'
	],
	setup( props, { emit } ) {
		const overlayElement = useTemplateRef( 'overlayElement' );
		const detailViewRef = useTemplateRef( 'detailViewRef' );
		const existingBodyOverflow = document.body.style.overflow;

		const submitInteraction = inject( 'submitInteraction' ); // Instrumentation plugin

		function focusFirstFocusableElement( container, backwards = false, preventScroll = false ) {
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
				candidate.focus( {
					preventScroll
				} );
				// Once it works, return true.
				if ( document.activeElement === candidate ) {
					return true;
				}
			}
			return false;
		}

		//
		// Event handlers.
		//

		onMounted( () => {
			// Prevent body scroll.
			document.body.style.overflow = 'hidden';
			focusFirstFocusableElement( overlayElement.value, false );
		} );

		onBeforeUnmount( () => {
			// Restore body scroll.
			document.body.style.overflow = existingBodyOverflow;
		} );

		const onFocusTrapStart = () => {
			focusFirstFocusableElement( overlayElement.value, true );
		};

		const onFocusTrapEnd = () => {
			focusFirstFocusableElement( overlayElement.value, false );
		};

		function onClose() {
			emit( 'overlay-close' );

			// Instrument overlay close.
			// Same action as the carousel load, but 'close' instead of 'init'.
			// eslint-disable-next-line camelcase
			submitInteraction( 'image_carousel_load', { action_source: 'close' } );
		}

		/**
		 * @param {import('../types').ImageData} image
		 */
		function onVTOCItemClick( image ) {
			emit( 'vtoc-item-click', image );

			if ( detailViewRef.value && detailViewRef.value.$el ) {
				if ( overlayElement.value ) {
					focusFirstFocusableElement( overlayElement.value, false, true );
				}
				// Scroll the overlay back to the detail view at top.
				detailViewRef.value.$el.scrollIntoView( {
					behavior: 'smooth'
				} );
			}

			// Instrument click on a VTOC image.
			// There's no distinction between images in the article and from other wikis:
			// the event is the same, thus firing here.
			submitInteraction(
				'click',
				{
					/* eslint-disable camelcase */
					action_subtype: 'view_image',
					action_source: 'visual_table_of_contents'
					/* eslint-enable camelcase */
				}
			);
		}

		/**
		 * @param {import('../types').ImageData} image
		 */
		function onVTOCViewInArticle( image ) {
			emit( 'vtoc-view-in-article', image );
		}

		return {
			cdxIconClose,
			cdxIconArrowPrevious,
			overlayElement,
			detailViewRef,
			onFocusTrapStart,
			onFocusTrapEnd,
			onClose,
			onVTOCItemClick,
			onVTOCViewInArticle
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ib-overlay {
	&-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		z-index: @z-index-overlay-backdrop;
		width: @size-viewport-width-full;
		height: @size-viewport-height-full; // Legacy browsers support viewport height (vh)
		background-color: @background-color-backdrop-light;
		display: flex;
		align-items: center;
		justify-content: center;

		// Modern browsers support dynamic viewport height (dvh)
		@supports ( height: 100dvh ) {
			height: 100dvh; // Override height for modern browsers
		}
	}

	&-container {
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
		// Add bottom padding to prevent mobile browser UI (address bar, navigation buttons)
		// from overlaying the button when the browser chrome is visible T405992
		// Specifically needed for legacy browsers that do not support `dvh`.
		padding-bottom: @spacing-400;

		// If the browser supports the dynamic viewport height CSS feature, then remove padding.
		@supports ( height: 100dvh ) {
			padding-bottom: 0;
		}
	}

	&__close {
		position: absolute;
		top: @spacing-100;
		right: @spacing-100;
		z-index: @z-index-overlay;
	}

	&__back-button.cdx-button {
		margin-top: @spacing-200;
		margin-bottom: @spacing-200;
		margin-left: @spacing-150;
		max-width: fit-content;
	}
}

</style>
