<template>
	<figure class="ib-carousel-item">
		<img
			class="ib-carousel-item__image"
			:src="image.thumb.src"
			:alt="image.alt"
		>
	</figure>
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
	setup() {
		return {};
	}
} );
</script>

<style lang="less">
.ib-carousel-item {
	display: flex;
	padding: 10px;
}
</style>
