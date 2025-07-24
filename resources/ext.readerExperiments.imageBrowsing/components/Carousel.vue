<template>
	<div class="ib-carousel">
		<carousel-item
			v-for="( image, index ) in images"
			:key="index"
			:image="image"
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
	setup() {
		return {};
	}
} );
</script>

<style lang="less">
.ib-carousel {
	display: flex;
	height: 180px;
	overflow-x: auto;
	margin-bottom: 10px;
}
</style>
