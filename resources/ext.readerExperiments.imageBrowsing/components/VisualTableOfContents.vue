<template>
	<div class="ib-vtoc">
		<h2>Visual TOC:</h2>

		<visual-table-of-contents-item
			v-for="( image, index ) in images"
			:key="index"
			:image="image"
			@vtoc-item-click="onItemClick( image )"
			@vtoc-view-in-article="onViewInArticle( image )"
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
	emits: [
		'vtoc-item-click',
		'vtoc-view-in-article'
	],
	setup( props, { emit } ) {
		/**
		 * @param {import("../types").ThumbnailImageData} image
		 */
		function onItemClick( image ) {
			emit( 'vtoc-item-click', image );
		}

		/**
		 * @param {import("../types").ThumbnailImageData} image
		 */
		function onViewInArticle( image ) {
			emit( 'vtoc-view-in-article', image );
		}

		return {
			onItemClick,
			onViewInArticle
		};
	}
} );
</script>

<style lang="less">
.ib-vtoc {
	width: 100%;
	max-width: 320em;
	height: 4em;
	padding: 0;
	position: relative;
}
</style>
