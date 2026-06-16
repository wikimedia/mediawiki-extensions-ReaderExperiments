<template>
	<span v-if="imgSource">
		<img :src="imgSource" :alt="alt">
	</span>
	<span v-else-if="alt">{{ alt }}</span>
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
		 */
		src: {
			type: [ String, null ],
			default: null
		},

		// eslint-disable-next-line vue/no-unused-properties
		inlineStyles: {
			type: [ Object, null ],
			default: null
		},

		alt: {
			type: [ String, null ],
			default: null
		}
	},
	setup: function ( props ) {
		const imgSource = ref( null );
		const svgSource = ref( null );

		watch(
			toRef( props, 'src' ),
			async ( src ) => {
				if ( !src ) {
					svgSource.value = null;
					return;
				}

				const response = await fetch( src );
				if ( props.src !== src ) {
					// stale result
					return;
				}

				const result = await response.text();
				if ( props.src !== src ) {
					// stale result
					return;
				}

				svgSource.value = result;
			},
			{ immediate: true }
		);

		watch(
			[ svgSource, toRef( props, 'inlineStyles' ) ],
			( [ svg, inlineStyles ] ) => {
				if ( !svg ) {
					imgSource.value = null;
					return;
				}

				// SVGs will be added as <img> element.
				// We're doing this because it is what html-to-image will
				// end up doing anyway: it'll convert the SVG to a pure
				// data src string, which will lose the ability for CSS
				// styles to take effect.
				// To work around that, we'll allow styles to be passed
				// directly to this component and apply them inline,
				// directly on the relevant nodes; after that, we'll
				// convert the SVG to an <img> element to ensure the code
				// is further immune from CSS styles that might not make
				// it in the final output anyway.
				const parser = new DOMParser();
				const doc = parser.parseFromString( svg, 'image/svg+xml' );
				const elements = Array.from( doc.querySelectorAll( '*' ) );
				Object.keys( inlineStyles || {} ).forEach( ( selector ) => {
					const rules = inlineStyles[ selector ];
					elements.forEach( ( element ) => {
						if ( element.matches( selector ) ) {
							Object.keys( rules ).forEach( ( property ) => {
								element.style[ property ] = rules[ property ];
							} );
						}
					} );
				} );

				const styledSvg = new XMLSerializer().serializeToString( doc );
				const base64 = btoa( styledSvg );

				imgSource.value = `data:image/svg+xml;base64,${ base64 }`;
			},
			{ immediate: true }
		);

		return {
			imgSource
		};
	}
};

</script>
