<template>
	<div class="ib-vtoc">
		<h2>Visual TOC:</h2>

		<visual-table-of-contents-item
			v-for="( image, index ) in images"
			:key="index"
			:image="image"
			@click="onItemClick( image )"
		></visual-table-of-contents-item>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const VisualTableOfContentsItem = require( './VisualTableOfContentsItem.vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'VisualTableOfContents',
	components: {
		VisualTableOfContentsItem
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
</style>
