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
				@vtoc-item-click="onVTOCItemClick"
				@vtoc-view-in-article="onVTOCViewInArticle"
			></visual-table-of-contents>

			<visual-table-of-contents-other-wikis
				:exclude-images="images"
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
		height: @size-viewport-height-full;
		background-color: @background-color-backdrop-light;
		display: flex;
		align-items: center;
		justify-content: center;
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
	}

	&__close {
		position: absolute;
		top: @spacing-100;
		right: @spacing-100;
		z-index: @z-index-overlay;
	}

	&__back-button.cdx-button {
		margin-top: @spacing-150;
		margin-bottom: @spacing-150;

		@media screen and ( min-width: @min-width-breakpoint-tablet ) {
			margin-left: @spacing-150;
			max-width: fit-content;
		}
	}
}

</style>
