<template>
	<!-- eslint-disable vue/no-v-html -->
	<span v-if="svgSource" v-html="svgSource"></span>
	<!-- eslint-enable vue/no-v-html -->
	<span v-else>alt: {{ alt }}</span>
</template>

<script>

/**
 * A component wrapping loading an SVG image from a same-origin URL
 * and displaying it in an inline <svg>
 */

const { ref, toRef, watch } = require( 'vue' );

// @vue/component
module.exports = exports = {
	name: 'InlineSvg',
	components: {
	},
	props: {
		/**
		 * URL to source image; must be local-origin.
		 *
		 * @todo figure out why the linter can't see the `src` prop
		 *       as used when it's used in a `toRef()` that's locally
		 *       watched. Is there a better way to handle this case?
		 */
		// eslint-disable-next-line vue/no-unused-properties
		src: {
			type: [ String, null ],
			default: null
		},

		alt: {
			type: [ String, null ],
			default: null
		}
	},
	setup: function ( props ) {
		const svgSource = ref( null );
		const srcRef = toRef( props, 'src' );
		watch( srcRef, async () => {
			const src = srcRef.value;
			if ( !src ) {
				return;
			}
			const response = await fetch( src );
			if ( srcRef.value !== src ) {
				return;
			}
			const svg = await response.text();
			if ( srcRef.value !== src ) {
				return;
			}
			svgSource.value = svg;
		}, {
			immediate: true
		} );

		return {
			svgSource
		};
	}
};

</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';
</style>
