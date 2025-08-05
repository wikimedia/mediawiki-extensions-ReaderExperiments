<template>
	<div class="ib-vtoc-item">
		<figure>
			<img :src="image.thumb.src" alt="image.alt">
			<figcaption>{{ image.name }}</figcaption>
		</figure>
		<hr>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'VisualTableOfContentsItem',
	components: {
	},
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
</style>
