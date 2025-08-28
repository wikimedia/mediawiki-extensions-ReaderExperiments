<template>
	<button class="ib-carousel-item">
		<img
			class="ib-carousel-item__image"
			:src="thumbnailSrc"
			:width="thumbnailWidth"
			:height="thumbnailHeight"
			:alt="image.alt">
	</button>
</template>

<script>
const { defineComponent } = require( 'vue' );

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

		let thumbnailWidth = parseInt( props.image.width * ( thumbnailHeight / props.image.height ) );
		if ( thumbnailWidth < minThumbnailWidth ) {
			thumbnailWidth = minThumbnailWidth;
		}

		// Standardize thumbnail widths to the nearest standard limit to increase the
		// chances of one being ready to serve right away, having been rendered before
		const acceptableThumbnailWidths = mw.config.get( 'ReaderExperimentsImageBrowsingThumbLimits' ).filter( ( limit ) => limit >= thumbnailWidth );
		const standardizedThumbnailWidth = Math.min.apply( null, acceptableThumbnailWidths.length ? acceptableThumbnailWidths : [ thumbnailWidth ] );

		return {
			thumbnailSrc: props.image.resizeUrl( standardizedThumbnailWidth ),
			thumbnailWidth,
			thumbnailHeight
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
