<template>
	<div class="ib-app">
		<carousel
			v-if="thumbnailData.length > 2"
			:images="thumbnailData"
		>
		</carousel>
	</div>
</template>

<script>
const { defineComponent, ref } = require( 'vue' );
const { extractThumbInfo } = require( './thumbExtractor.js' );
const Carousel = require( './components/Carousel.vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'ImageBrowsing',
	components: {
		Carousel
	},
	setup() {
		const content = document.getElementById( 'content' );
		const thumbnailData = ref( [] );

		if ( content ) {
			thumbnailData.value = extractThumbInfo( content );
		}

		return {
			thumbnailData
		};
	}
} );
</script>

<style lang="less">
</style>
