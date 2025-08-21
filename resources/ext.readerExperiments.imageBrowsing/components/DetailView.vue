<!-- TODO refactor into smaller components -->
<template>
	<div class="ib-detail-view">
		<!-- Image -->
		<img :src="resizedSrc" alt="">

		<!-- Caption -->
		<detail-view-caption
			v-if="caption"
			:caption="caption"
			:dominant-color-hex="dominantColorHex"
			:dominant-color-is-dark="dominantColorIsDark"
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
const useBackgroundColor = require( '../composables/useBackgroundColor.js' );

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
		},

		caption: {
			type: [ String, null ],
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

		const color = await useBackgroundColor(
			props.activeImage.thumb.src,
			props.activeImage.thumb.width,
			props.activeImage.thumb.height
		);

		const dominantColorHex = color.hex;
		const dominantColorIsDark = color.isDark;

		return {
			resizedSrc,
			dominantColorHex,
			dominantColorIsDark
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
