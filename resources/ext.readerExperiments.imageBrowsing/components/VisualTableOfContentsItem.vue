<template>
	<div class="ib-vtoc-item" :style="{ 'grid-row-end': gridRowSpan }">
		<figure ref="figure" class="ib-vtoc-item__figure">
			<button
				@click.prevent="onItemClick( image )"
			>
				<img
					ref="imageElement"
					class="ib-vtoc-item__figure__image"
					:src="image.src"
					:srcset="image.srcset"
					:width="image.width"
					:height="image.height"
					:alt="image.alt ?
						image.alt :
						$i18n(
							'readerexperiments-imagebrowsing-image-alt-text',
							image.title.getFileNameTextWithoutExtension()
						).text()"
					crossorigin="anonymous"
					loading="lazy"
				>
			</button>
			<!-- eslint-disable-next-line vue/no-v-html -->
			<figcaption v-html="caption"></figcaption>

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
const { defineComponent, useTemplateRef, computed, toRef } = require( 'vue' );
const { CdxButton, useResizeObserver } = require( '@wikimedia/codex' );
const { getCaptionIfAvailable } = require( '../thumbExtractor.js' );
const useBackgroundColor = require( '../composables/useBackgroundColor.js' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'VisualTableOfContentsItem',
	components: {
		CdxButton
	},
	props: {
		image: {
			type: Object,
			required: true
		}
	},
	emits: [
		'vtoc-item-click',
		'vtoc-view-in-article'
	],
	setup( props, { emit } ) {
		const figure = useTemplateRef( 'figure' );
		const figureDimensions = useResizeObserver( figure );

		/**
		 * For desktop display, get the "masonry" block height
		 * of the current VTOC item by calculating the current
		 * height of the figure element and rounding it to the
		 * nearest 10px (to match the grid-auto-rows used in
		 * the VisualTableOfContents parent component).
		 */
		const computedHeight = computed( () => {
			const height = figureDimensions.value.height + 48;
			const roundedHeight = Math.ceil( height / 10 ) * 10;
			return roundedHeight;
		} );

		/**
		 * Translate the computedHeight property into a string
		 * suitable for use in CSS
		 */
		const gridRowSpan = computed( () => {
			return `span ${ computedHeight.value / 10 }`;
		} );

		const caption = computed( () => {
			if ( !props.image ) {
				return;
			}
			const paragraphText = props.image.paragraph && props.image.paragraph;
			const figcaption = getCaptionIfAvailable( props.image.container );
			const altText = props.image.alt && mw.html.escape( props.image.alt );
			return paragraphText || figcaption || altText;
		} );

		function onItemClick( image ) {
			emit( 'vtoc-item-click', image );
		}

		function onViewInArticle( image ) {
			emit( 'vtoc-view-in-article', image );
		}

		const imageRef = toRef( props, 'image' );
		const imageElement = useTemplateRef( 'imageElement' );
		useBackgroundColor( imageRef, imageElement );

		return {
			caption,
			onItemClick,
			onViewInArticle,
			figure,
			gridRowSpan,
			imageElement
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

@ib-vtoc-image-height: 300px;

.ib-vtoc-item {
	border-style: @border-style-base;
	border-color: @border-color-subtle;
	border-width: 0.5px; // Use a fractional width so overlapping borders appear normal
	padding: @spacing-150;

	&__figure {
		text-align: center;

		&__image {
			width: @size-full;
			height: @ib-vtoc-image-height;
			object-fit: contain;
		}

		// Button wrapper for the image
		button:not( .cdx-button ) {
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
