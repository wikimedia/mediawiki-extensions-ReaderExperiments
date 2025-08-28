<template>
	<div class="ib-carousel">
		<carousel-item
			v-for="( image, index ) in images"
			:key="index"
			:image="image"
			@click="onItemClick( image )"
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
		 */
		function onItemClick( image ) {
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
