<template>
	<div
		v-if="!done || images.length"
		ref="containerElement"
		class="ib-vtoc-other-wikis"
	>
		<h3 class="ib-vtoc-other-wikis__heading">
			{{ $i18n( 'readerexperiments-imagebrowsing-vtoc-other-wikis-heading' ).text() }}
		</h3>

		<div v-if="!done" class="ib-vtoc-other-wikis__loading">
			<p>{{ $i18n( 'readerexperiments-imagebrowsing-vtoc-other-wikis-loading' ).text() }}</p>
		</div>

		<div v-else class="ib-vtoc-other-wikis__grid">
			<visual-table-of-contents-other-wikis-item
				v-for="( image, index ) in images"
				:key="index"
				:image="image"
				@vtoc-item-click="onItemClick"
			></visual-table-of-contents-other-wikis-item>
		</div>
	</div>
</template>

<script>
const { defineComponent, watch, ref, useTemplateRef } = require( 'vue' );
const { useIntersectionObserver } = require( '@wikimedia/codex' );
const useEntityId = require( '../composables/useEntityId.js' );
const useExternalImages = require( '../composables/useExternalImages.js' );
const VisualTableOfContentsOtherWikisItem = require( './VisualTableOfContentsOtherWikisItem.vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'VisualTableOfContentsOtherWikis',
	components: {
		VisualTableOfContentsOtherWikisItem
	},
	props: {
		excludeImages: {
			type: Array,
			required: true
		}
	},
	emits: [
		'vtoc-item-click'
	],
	setup( props, { emit } ) {
		const containerElement = useTemplateRef( 'containerElement' );
		const done = ref( false );
		const images = ref( [] );

		const isVisible = useIntersectionObserver( containerElement, {
			// Start loading once element has crossed 50% below the viewport
			// rather than waiting until it is fully in view
			scrollMargin: '0px 0px 50% 0px',
			threshold: 0
		} );

		watch( isVisible, async ( visible ) => {
			// Load immediately if IntersectionObserver not supported in browser
			if ( !visible && !window.IntersectionObserver ) {
				visible = true; // Force load since we can't detect intersection
			}

			if ( !visible || done.value === true || images.value.length > 0 ) {
				// Load only once, when (almost) visible
				return;
			}

			try {
				const entityId = await useEntityId();
				if ( entityId ) {
					images.value = await useExternalImages( entityId, props.excludeImages );
				}
			} catch ( err ) {
				// eslint-disable-next-line no-console
				console.error( 'Failed to load other images:', err );
			} finally {
				done.value = true;
			}
		} );

		function onItemClick( image ) {
			emit( 'vtoc-item-click', image );
		}

		return {
			containerElement,
			done,
			images,
			onItemClick
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ib-vtoc-other-wikis {
	// TODO: Create mixin for shared heading styles between VTOC and other images heading
	// Override Minerva heading styles
	h3&__heading {
		font-size: @font-size-large;
		font-weight: @font-weight-bold;
		padding-top: @spacing-150;
		padding-bottom: @spacing-150;
		padding-left: @spacing-150;
	}

	&__loading {
		text-align: center;
		padding: @spacing-150;
		color: @color-subtle;
	}

	// TODO: Create mixin for shared grid styles with VTOC
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
