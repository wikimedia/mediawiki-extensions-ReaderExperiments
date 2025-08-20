<template>
	<div class="ib-overlay">
		<cdx-button
			class="ib-overlay__close"
			@click="onClose"
		>
			<cdx-icon :icon="cdxIconClose"></cdx-icon>
		</cdx-button>

		<detail-view :active-image="activeImage" :caption="caption"></detail-view>
		<visual-table-of-contents :images="images"></visual-table-of-contents>
	</div>
</template>

<script>
const { defineComponent, ref } = require( 'vue' );
const DetailView = require( './DetailView.vue' );
const VisualTableOfContents = require( './VisualTableOfContents.vue' );
const { CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconClose } = require( '../icons.json' );
const { getCaptionIfAvailable } = require( '../thumbExtractor.js' );

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
		// Active image's caption, if any
		const caption = ref( null );
		caption.value = getCaptionIfAvailable( props.activeImage.container );

		// @todo below is temporary; remove me once this has been implemented properly
		caption.value = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

		function onClose() {
			emit( 'close-overlay' );
		}

		return {
			caption,
			cdxIconClose,
			onClose
		};
	}
} );
</script>

<style lang="less">
.ib-overlay {
	width: 100vw;
	height: 100vh;
	background-color: white;
	overflow-y: auto;
	position: fixed;
	top: 0;
	left: 0;

	&__close {
		position: absolute;
		top: 16px;
		right: 16px;
	}
}
</style>
