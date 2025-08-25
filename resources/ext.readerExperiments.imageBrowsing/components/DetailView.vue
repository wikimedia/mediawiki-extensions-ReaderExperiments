<template>
	<div class="ib-detail-view">
		<!-- Image -->
		<img
			:src="resizedSrc"
			:alt="activeImage.alt"
		>

		<!-- Caption -->
		<detail-view-caption
			:image="activeImage"
		></detail-view-caption>

		<!-- controls -->
		<detail-view-controls
			:image="activeImage"
		></detail-view-controls>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const DetailViewCaption = require( './DetailViewCaption.vue' );
const DetailViewControls = require( './DetailViewControls.vue' );

/**
 * @typedef {import("../types").ImageData} ImageData
 */

// @vue/component
module.exports = exports = defineComponent( {
	name: 'DetailView',
	components: {
		DetailViewCaption,
		DetailViewControls
	},
	props: {
		activeImage: {
			type: /** @type {import('vue').PropType<ImageData> */ ( Object ),
			required: true
		}
	},
	async setup( props ) {
		// Full-screen image src
		const fullscreenWidth = Math.max(
			window.innerWidth,
			parseInt(
				( window.innerHeight / props.activeImage.thumb.height ) *
				props.activeImage.thumb.width
			)
		);

		const resizedSrc = props.activeImage.resizeUrl( fullscreenWidth );

		return {
			resizedSrc
		};
	}
} );
</script>

<style lang="less">
.ib-detail-view {
	width: 100%;
	height: 100vh;
	display: flex;
	align-items: end;

	img {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: -1;
	}
}

</style>
