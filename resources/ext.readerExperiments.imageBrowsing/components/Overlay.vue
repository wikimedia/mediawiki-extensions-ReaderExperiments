<template>
	<div class="ib-overlay">
		<cdx-button
			class="ib-overlay__close"
			@click="onClose"
		>
			Close
		</cdx-button>

		<detail-view :active-image="activeImage"></detail-view>
		<visual-table-of-contents :images="images"></visual-table-of-contents>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const DetailView = require( './DetailView.vue' );
const VisualTableOfContents = require( './VisualTableOfContents.vue' );
const { CdxButton } = require( '@wikimedia/codex' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'Overlay',
	components: {
		DetailView,
		VisualTableOfContents,
		CdxButton
	},
	props: {
		images: {
			type: Array,
			required: true
		},
		activeImage: {
			type: Object,
			required: true
		}
	},
	emits: [
		'close-overlay'
	],
	setup( props, { emit } ) {
		function onClose() {
			emit( 'close-overlay' );
		}

		return {
			onClose
		};
	}
} );
</script>

<style lang="less">
.ib-overlay {
	width: calc( 100vw - 40px );
	height: 100vh;
	background-color: white;
	overflow-y: auto;
	position: fixed;
	padding: 20px;

	&__close {
		position: absolute;
		top: 20px;
		right: 20px;
	}
}
</style>
