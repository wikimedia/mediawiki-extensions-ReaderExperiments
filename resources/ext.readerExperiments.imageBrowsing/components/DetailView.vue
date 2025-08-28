<template>
	<div class="ib-detail-view">
		<!-- Image -->
		<img
			ref="imageElement"
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
			@toggle-fullscreen="onFullScreen"
		></detail-view-controls>
	</div>
</template>

<script>
const { defineComponent, useTemplateRef } = require( 'vue' );
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
		const imageElement = useTemplateRef( 'imageElement' );
		// Full-screen image src
		const fullscreenWidth = Math.max(
			window.innerWidth,
			parseInt(
				( window.innerHeight / props.activeImage.height ) *
				props.activeImage.width
			)
		);
		// Standardize image widths to the nearest standard limit to increase the
		// chances of one being ready to serve right away, having been rendered before
		const acceptableWidths = mw.config.get( 'ReaderExperimentsImageBrowsingThumbLimits' ).filter( ( limit ) => limit >= fullscreenWidth );
		const standardizedWidth = Math.min.apply( null, acceptableWidths.length ? acceptableWidths : [ fullscreenWidth ] );
		const resizedSrc = props.activeImage.resizeUrl( standardizedWidth );

		/**
		 * Handle full-screen takeover here instead of in the child
		 * DetailViewControls component, since this component is the
		 * one that has access to a full-size image
		 */
		function onFullScreen() {
			if ( !document.fullScreenElement ) {
				imageElement.value.requestFullscreen();
			} else {
				document.exitFullscreen();
			}
		}

		return {
			resizedSrc,
			imageElement,
			onFullScreen
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
