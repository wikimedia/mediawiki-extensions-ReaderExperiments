<template>
	<button
		class="ib-carousel-item"
		:aria-label="$i18n( 'readerexperiments-imagebrowsing-carousel-item-button-label' ).text()"
	>
		<img
			ref="imageElement"
			class="ib-carousel-item__image"
			crossorigin="anonymous"
			:src="thumbnailSrc"
			:width="thumbnailWidth"
			:height="thumbnailHeight"
			:alt="image.alt ?
				image.alt :
				$i18n(
					'readerexperiments-imagebrowsing-image-alt-text',
					image.title.getFileNameTextWithoutExtension()
				).text()"
			loading="lazy"
		>
	</button>
</template>

<script>
const { defineComponent, useTemplateRef, toRef } = require( 'vue' );
const useBackgroundColor = require( '../composables/useBackgroundColor.js' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'CarouselItem',
	components: {},
	props: {
		image: {
			type: Object,
			required: true
		}
	},
	setup( props ) {
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

		return {
			thumbnailSrc: props.image.resizeUrl( standardizedThumbnailWidth ),
			thumbnailWidth,
			thumbnailHeight,
			imageElement
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
