<template>
	<div
		class="ib-vtoc-item"
		:style="gridRowSpan ? { 'grid-row-end': gridRowSpan } : {}"
	>
		<figure ref="figure" class="ib-vtoc-item__figure">
			<button
				class="ib-vtoc-item__figure__button"
				:style="imageDimensionsStyle"
				aria-controls="mw-ext-readerExperiments-imageBrowsing-detail-view"
				:aria-disabled="selected"
				:aria-selected="selected"
				:aria-label="imageLabel"
				@keydown.enter.prevent="void 0"
				@keyup.enter.prevent="onItemClick( image )"
				@click.prevent="onItemClick( image )"
			>
				<cropped-image
					class="ib-vtoc-item__figure__image"
					:image="image"
					:style="imageDimensionsStyle"
				></cropped-image>
			</button>

			<!-- eslint-disable vue/no-v-html -->
			<figcaption
				v-if="caption"
				ref="captionTextElement"
				v-html="caption"
			></figcaption>
			<!-- eslint-enable vue/no-v-html -->

			<!-- Only use v-html if we have real, sanitized HTML content from
			the parser. Otherwise use regular interpolation. -->
			<figcaption
				v-else-if="image.alt"
				ref="captionTextElement"
			>
				{{ image.alt }}
			</figcaption>

			<cdx-button
				class="ib-vtoc-item__view-in-article"
				action="progressive"
				@click.prevent="onViewInArticle( image )"
			>
				{{ $i18n( 'readerexperiments-imagebrowsing-vtoc-view-button-label' ).text() }}
			</cdx-button>
		</figure>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onMounted, onUnmounted, useTemplateRef } = require( 'vue' );
const { CdxButton, useResizeObserver } = require( '@wikimedia/codex' );
const CroppedImage = require( './CroppedImage.vue' );
const { getCaptionIfAvailable } = require( '../thumbExtractor.js' );
const useImageLabel = require( '../composables/useImageLabel.js' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'VisualTableOfContentsItem',
	components: {
		CroppedImage,
		CdxButton
	},
	props: {
		image: {
			type: Object,
			required: true
		},
		selected: {
			type: Boolean,
			required: true
		}
	},
	emits: [
		'vtoc-item-click',
		'vtoc-view-in-article'
	],
	setup( props, { emit } ) {
		const supportsResizeObserver = 'ResizeObserver' in window;
		const figure = useTemplateRef( 'figure' );
		const figureDimensions = supportsResizeObserver ?
			useResizeObserver( figure ) :
			{ value: { height: 0 } };

		// For desktop display, get the "masonry" block height
		// of the current VTOC item by calculating the current
		// height of the figure element and rounding it to the
		// nearest 10px (to match the grid-auto-rows used in
		// the VisualTableOfContents parent component).
		const computedHeight = computed( () => {
			const height = figureDimensions.value.height + 48;
			const roundedHeight = Math.ceil( height / 10 ) * 10;
			return roundedHeight;
		} );

		/**
		 * Translate the computedHeight property into a string
		 * suitable for use in CSS. The string is conditionally applied to
		 * grid-row-end style only when ResizeObserver is supported to avoid
		 * 'span NaN' in legacy browsers.
		 */
		const gridRowSpan = computed( () => {
			return supportsResizeObserver ?
				`span ${ computedHeight.value / 10 }` :
				undefined;
		} );

		const caption = computed( () => {
			if ( !props.image ) {
				return;
			}
			const paragraphText = props.image.paragraph;
			const figcaption = getCaptionIfAvailable( props.image.container );
			return paragraphText || figcaption;
		} );
		const captionTextElement = useTemplateRef( 'captionTextElement' );

		// Calculate width corresponding to fixed height.
		const imageHeight = 300;
		const imageDimensionsStyle = computed( () => ( {
			width: 'min( 100%, ' + props.image.width / props.image.height * imageHeight + 'px )',
			height: imageHeight + 'px'
		} ) );

		//
		// Event handlers.
		//

		// Instrumentation plugin.
		const submitInteraction = inject( 'submitInteraction' );
		const manageLinkEventListeners = inject( 'manageLinkEventListeners' );

		onMounted( () => {
			manageLinkEventListeners( captionTextElement, onCaptionLinkClick );
		} );

		// When the component is unmounted,
		// remove wikilinks' click event listeners.
		onUnmounted( () => {
			manageLinkEventListeners(
				captionTextElement, onCaptionLinkClick, true
			);
		} );

		function onItemClick( image ) {
			emit( 'vtoc-item-click', image );
		}

		/* eslint-disable camelcase */
		function onCaptionLinkClick() {
			// Instrument click on a VTOC caption's link.
			submitInteraction(
				'click',
				{
					action_subtype: 'caption_link',
					action_source: 'visual_table_of_contents'
				}
			);
		}

		function onViewInArticle( image ) {
			emit( 'vtoc-view-in-article', image );

			submitInteraction(
				'click',
				{
					action_subtype: 'view_in_article',
					action_source: 'visual_table_of_contents'
				}
			);
		}
		/* eslint-enable camelcase */

		const imageLabel = computed( () => useImageLabel( props.image ) );

		return {
			caption,
			captionTextElement,
			onItemClick,
			onViewInArticle,
			figure,
			gridRowSpan,
			imageDimensionsStyle,
			imageLabel
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ib-vtoc-item {
	border-style: @border-style-base;
	border-color: @border-color-subtle;
	border-width: 0.5px; // Use a fractional width so overlapping borders appear normal
	padding: @spacing-150;

	&__figure {
		text-align: center;

		// Button wrapper for the image
		button:not( .cdx-button ) {
			display: block;
			margin: 1em auto;
			border: none;
			cursor: pointer;
			padding: 0;
			// Override Safari and iOS Chrome browser button background color
			background-color: unset;
		}

		figcaption {
			margin-top: @spacing-75;
			text-align: left;
		}
	}

	&__view-in-article {
		display: block;
		margin-top: @spacing-75;
	}
}
</style>
