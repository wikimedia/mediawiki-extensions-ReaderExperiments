<template>
	<div class="ib-app">
		<carousel
			v-if="thumbnailData.length > 2"
			:images="thumbnailData"
			@carousel-item-click="onItemClick"
		>
		</carousel>

		<teleport :to="teleportTarget">
			<overlay
				v-if="activeImage"
				:images="thumbnailData"
				:active-image="activeImage"
				@close-overlay="onCloseOverlay"
				@vtoc-item-click="onItemClick"
				@vtoc-view-in-article="onViewInArticle"
			></overlay>
		</teleport>
	</div>
</template>

<script>
const { defineComponent, ref, inject } = require( 'vue' );
const { extractThumbInfo } = require( './thumbExtractor.js' );
const Carousel = require( './components/Carousel.vue' );
const Overlay = require( './components/Overlay.vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'ImageBrowsing',
	components: {
		Carousel,
		Overlay
	},
	setup() {
		// Reactive ref containing data for all images on the page
		const thumbnailData = ref( [] );

		// The currently active image, if any
		const activeImage = ref( null );

		// Extract thumbnail image (as an array of ThumbnailImageData)
		// from the content of the underlying article page.
		const content = document.getElementById( 'content' );
		if ( content ) {
			thumbnailData.value = extractThumbInfo( content );
		}

		const teleportTarget = inject( 'CdxTeleportTarget' );

		/**
		 * When a carousel item is clicked by the user, set that image as
		 * the active image and show the overlay part of the UI.
		 *
		 * @param {import("./types").ThumbnailImageData} image
		 */
		function onItemClick( image ) {
			activeImage.value = image;

			// eslint-disable-next-line no-console
			console.log( image );
		}

		function onViewInArticle( image ) {
			onCloseOverlay();
			image.thumb.scrollIntoView();
		}

		/**
		 * When a "close" event has been emitted from the Overlay component,
		 * clear the active image and hide the overlay part of the UI.
		 */
		function onCloseOverlay() {
			activeImage.value = null;

			// eslint-disable-next-line no-console
			console.log( 'Closed the overlay' );
		}

		return {
			thumbnailData,
			onItemClick,
			onViewInArticle,
			onCloseOverlay,
			activeImage,
			teleportTarget
		};
	}
} );
</script>

<style lang="less">
// @hack why is this necessary to get the overlay to show up properly? Fix and remove
#mw-teleport-target {
	top: 0;
	left: 0;
}
</style>
