<template>
	<div
		ref="overlayElement"
		class="ib-overlay"
		tabindex="0"
		@keydown.esc="onClose"
	>
		<cdx-button
			class="ib-overlay__close"
			@click="onClose"
		>
			<cdx-icon :icon="cdxIconClose"></cdx-icon>
		</cdx-button>

		<suspense>
			<detail-view
				:active-image="activeImage"
			></detail-view>
		</suspense>

		<visual-table-of-contents
			:images="images"
			@vtoc-item-click="onItemClick"
			@vtoc-view-in-article="onViewInArticle"
		></visual-table-of-contents>
	</div>
</template>

<script>
const { defineComponent, onMounted, useTemplateRef } = require( 'vue' );
const DetailView = require( './DetailView.vue' );
const VisualTableOfContents = require( './VisualTableOfContents.vue' );
const { CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconClose } = require( '../icons.json' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'Overlay',
	components: {
		DetailView,
		VisualTableOfContents,
		CdxButton,
		CdxIcon
	},
	props: {
		images: {
			type: /** @type {import('vue').PropType<ImageData[]>} */ ( Array ),
			required: true
		},
		activeImage: {
			type: /** @type {import('vue').PropType<ImageData>} */ ( Object ),
			required: true
		}
	},
	emits: [
		'close-overlay',
		'vtoc-item-click',
		'vtoc-view-in-article'
	],
	setup( props, { emit } ) {
		const overlayElement = useTemplateRef( 'overlayElement' );
		onMounted( () => {
			overlayElement.value.focus();
		} );

		function onClose() {
			emit( 'close-overlay' );
		}

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
			overlayElement,
			onClose,
			onItemClick,
			onViewInArticle,
			cdxIconClose
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ib-overlay {
	width: 100vw;
	height: 100vh;
	background-color: @background-color-base;
	overflow-y: auto;
	position: fixed;
	top: 0;
	left: 0;

	&__close {
		position: absolute;
		top: @spacing-100;
		right: @spacing-100;
	}
}
</style>
