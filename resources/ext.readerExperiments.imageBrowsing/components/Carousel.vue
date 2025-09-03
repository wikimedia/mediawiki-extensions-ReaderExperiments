<template>
	<div class="ib-carousel">
		<carousel-item
			v-for="( image, index ) in images"
			:key="index"
			:image="image"
			@click="onItemClick( image, $event )"
			@keyup.enter="onItemClick( image, $event )"
			@keyup.space="onItemClick( image, $event )"
		></carousel-item>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const CarouselItem = require( './CarouselItem.vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'Carousel',
	components: {
		CarouselItem
	},
	props: {
		images: {
			type: Array,
			required: true
		}
	},
	emits: [
		'carousel-item-click'
	],
	setup( props, { emit } ) {
		/**
		 * @param {import("../types").ImageData} image
		 * @param {Event} e
		 */
		function onItemClick( image, e ) {
			if ( e.type === 'click' && e.detail === 0 ) {
				// Clicking the image is supposed to open the overlay.
				// <Space> and <Enter> key presses are also considered clicks
				// (and should thus also open the overlay)
				// <Space> and <Enter> are inconsistent, though: the former
				// causes a "click" event on "keyup", the latter on "keydown".
				// Because of this difference, there's this weird bug where
				// an <Enter>-key based "click" will cause the overlay to open,
				// which will in turn move the focus to the close button,
				// and they <Enter>-based "click" will once again fire on that
				// new button that now has focus, effectively immediately
				// closing the overlay again.
				// The "click" event provides no way to differentiate between
				// these 2 keys (<Space> and <Enter>), so we can't meaningfully
				// change how they behave. Instead, we're just going to ignore
				// any keyboard-induced "click", and  explicitly bind separate
				// event handlers for <Space> and <Enter> "keyup" events instead.
				return;
			}

			// By now, this is either a mouse-induced click, a <Space> keyup,
			// or an <Enter> keyup.
			emit( 'carousel-item-click', image );
		}

		return {
			onItemClick
		};
	}
} );
</script>

<style lang="less">
.ib-carousel {
	display: block;
	white-space: nowrap;
	overflow-x: auto;
	margin-bottom: 10px;
}
</style>
