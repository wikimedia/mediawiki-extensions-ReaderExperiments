<template>
	<div class="ib-vtoc">
		<div class="ib-vtoc__heading">
			<span>
				{{ $i18n( 'readerexperiments-imagebrowsing-vtoc-heading' ).text() }}
			</span>
		</div>

		<div class="ib-vtoc__grid">
			<visual-table-of-contents-item
				v-for="( image, index ) in images"
				:key="index"
				:image="image"
				@vtoc-item-click="onItemClick( image )"
				@vtoc-view-in-article="onViewInArticle( image )"
			></visual-table-of-contents-item>
		</div>
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
		 * @param {import('../types').ImageData} image
		 */
		function onItemClick( image ) {
			emit( 'vtoc-item-click', image );
		}

		/**
		 * @param {import('../types').ImageData} image
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
@import 'mediawiki.skin.variables.less';

.ib-vtoc {
	flex-shrink: 0;

	&__heading {
		font-size: @font-size-large;
		font-weight: @font-weight-bold;
		padding: @spacing-150;
		border-bottom: @border-subtle;
	}

	&__grid {
		@media screen and ( min-width: @min-width-breakpoint-tablet ) {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			grid-auto-rows: 10px;
			border-bottom: @border-subtle;
		}
	}
}
</style>
