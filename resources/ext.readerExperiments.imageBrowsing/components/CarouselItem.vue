<template>
	<button
		class="ib-carousel-item"
		aria-controls="mw-ext-readerExperiments-imageBrowsing-detail-view"
		:aria-disabled="selected"
		:aria-selected="selected"
		:aria-label="imageLabel"
		@keydown.enter.prevent="void 0"
		@keyup.enter.prevent="onClick( image, $event )"
		@click="onClick( image, $event )"
	>
		<img
			ref="imageElement"
			class="ib-carousel-item__image"
			crossorigin="anonymous"
			:src="thumbnailSrc"
			:width="thumbnailWidth"
			:height="thumbnailHeight"
			:alt="imageAlt"
			loading="lazy"
		>
	</button>
</template>

<script>
const { computed, defineComponent, toRef, useTemplateRef } = require( 'vue' );
const useAltText = require( '../composables/useAltText.js' );
const useBackgroundColor = require( '../composables/useBackgroundColor.js' );
const useImageLabel = require( '../composables/useImageLabel.js' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'CarouselItem',
	components: {},
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
		'carousel-item-click'
	],
	setup( props, { emit } ) {
		const thumbnailHeight = 175;
		const minThumbnailWidth = 100;

		let thumbnailWidth = parseInt(
			props.image.width * ( thumbnailHeight / props.image.height )
		);
		if ( thumbnailWidth < minThumbnailWidth ) {
			thumbnailWidth = minThumbnailWidth;
		}

		// Standardize thumbnail widths to the nearest standard limit to increase the
		// chances of one being ready to serve right away, having been rendered before
		const acceptableThumbnailWidths = mw.config.get( 'ReaderExperimentsImageBrowsingThumbLimits' ).filter( ( limit ) => limit >= thumbnailWidth );
		const standardizedThumbnailWidth = Math.min.apply(
			null, acceptableThumbnailWidths.length ? acceptableThumbnailWidths : [ thumbnailWidth ]
		);

		// Nit: background color is not actively used here, but it pre-populates the
		// color cache for when these images may later be loaded in different dimensions
		// elsewhere
		const imageRef = toRef( props, 'image' );
		const imageElement = useTemplateRef( 'imageElement' );
		useBackgroundColor( imageRef, imageElement );
		const imageAlt = computed( () => useAltText( imageRef.value ) );
		const imageLabel = computed( () => useImageLabel( imageRef.value ) );

		const onClick = ( image ) => {
			// By now, this is either a mouse-induced click, a <Space> keyup,
			// an <Enter> keyup, or a synthetic event from accessibility tools.
			emit( 'carousel-item-click', image );
		};

		return {
			thumbnailSrc: props.image.resizeUrl( standardizedThumbnailWidth ),
			thumbnailWidth,
			thumbnailHeight,
			imageElement,
			onClick,
			imageAlt,
			imageLabel
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ib-carousel-item {
	max-width: 33.33%;
	cursor: pointer;
	border: 1px solid transparent;
	padding: 0;

	&:not( :last-child ) {
		margin-right: 10px;
	}

	&:hover {
		border: 1px solid @border-color-interactive--hover;
	}

	img {
		object-fit: cover;
		max-width: 100%;
	}
}
</style>
