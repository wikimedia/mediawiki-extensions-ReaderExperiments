<template>
	<div class="ib-vtoc-item" :style="{ 'grid-row-end': gridRowSpan }">
		<figure ref="figure" class="ib-vtoc-item__figure">
			<button
				@click.prevent="onItemClick( image )"
			>
				<img
					class="ib-vtoc-item__figure__image"
					:src="image.src"
					:srcset="image.srcset"
					:alt="image.alt"
				>
			</button>

			<!-- eslint-disable-next-line vue/no-v-html -->
			<figcaption v-html="caption"></figcaption>

			<cdx-button
				class="ib-vtoc-item__view-in-article"
				action="progressive"
				@click.prevent="onViewInArticle( image )"
			>
				{{ $i18n( 'readerexperiments-imagebrowsing-vtoc-link' ) }}
			</cdx-button>
		</figure>
	</div>
</template>

<script>
const { defineComponent, useTemplateRef, computed, toRef } = require( 'vue' );
const { CdxButton, useResizeObserver } = require( '@wikimedia/codex' );
const useImageCaption = require( '../composables/useImageCaption.js' );

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

		// Use the composable for caption logic
		const imageRef = toRef( props, 'image' );
		const { caption } = useImageCaption( imageRef );

		function onItemClick( image ) {
			emit( 'vtoc-item-click', image );
		}

		function onViewInArticle( image ) {
			emit( 'vtoc-view-in-article', image );
		}

		return {
			caption,
			onItemClick,
			onViewInArticle,
			figure,
			gridRowSpan
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

@ib-vtoc-image-height: 12em;

.ib-vtoc-item {
	border-bottom: @border-subtle;
	padding: @spacing-150;

	&__figure {
		text-align: center;

		&__image {
			max-height: @ib-vtoc-image-height;
			max-width: @size-full;
		}

		button:not( .cdx-button ) {
			border: none;
			cursor: pointer;
			padding: 0;
		}

		figcaption {
			margin: @spacing-75 0;
			text-align: left;
		}
	}

	&__view-in-article {
		display: block;
	}

	@media screen and ( min-width: @min-width-breakpoint-tablet ) {
		border-right: @border-subtle;
	}
}
</style>
