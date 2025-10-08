<template>
	<div
		class="ib-vtoc-other-wikis-item"
		:style="gridRowSpan ? { 'grid-row-end': gridRowSpan } : {}"
	>
		<figure
			ref="figure"
			class="ib-vtoc-other-wikis-item__figure"
		>
			<button @click.prevent="onItemClick( image )">
				<img
					class="ib-vtoc-other-wikis-item__figure__image"
					:src="image.src"
					:alt="image.label ?
						image.label :
						$i18n(
							'readerexperiments-imagebrowsing-image-alt-text',
							image.title.getFileNameTextWithoutExtension()
						).text()"
				>
			</button>
			<figcaption>
				{{ image.label }}
			</figcaption>
			<p class="ib-vtoc-other-wikis-item__project">
				{{ getImageSources( image ) }}
			</p>
		</figure>
	</div>
</template>

<script>
const { defineComponent, computed, inject, useTemplateRef } = require( 'vue' );
const { useResizeObserver } = require( '@wikimedia/codex' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'VisualTableOfContentsOtherWikisItem',
	props: {
		image: {
			type: Object,
			required: true
		}
	},
	emits: [
		'vtoc-item-click'
	],
	setup( props, { emit } ) {
		const $i18n = inject( 'i18n' );
		const supportsResizeObserver = 'ResizeObserver' in window;
		const figure = useTemplateRef( 'figure' );
		const figureDimensions = supportsResizeObserver ?
			useResizeObserver( figure ) :
			{ value: { height: 0 } };

		// TODO: Duplicate code to get masonry layout is shared with VTOC item
		/**
		 * For desktop display, get the "masonry" block height
		 * of the current VTOC item by calculating the current
		 * height of the figure element and rounding it to the
		 * nearest 10px (to match the grid-auto-rows used in
		 * the VisualTableOfContents parent component).
		 */
		const computedHeight = computed( () => {
			const height = figureDimensions.value.height + 48;
			const roundedHeight = Math.ceil( height / 10 ) * 10;
			return roundedHeight;
		} );

		/**
		 * Translate the computedHeight property into a string
		 * suitable for use in CSS. The string is conditionally applied to
		 * grid-row-end style only when ResizeObserver is supported to avoid
		 * 'span NaN' in legacy browsers.
		 */
		const gridRowSpan = computed( () => {
			return supportsResizeObserver ?
				`span ${ computedHeight.value / 10 }` :
				undefined;
		} );

		/**
		 * Get external sources the image is used on
		 *
		 * @param {Object} image
		 * @return {string}
		 */
		function getImageSources( image ) {
			const externalWikis = mw.config.get( 'ReaderExperimentsImageBrowsingExternalWikis' );
			const projectsMap = ( image.externalSources || [] ).reduce(
				( map, hostname ) => {
					const domain = Object.keys( externalWikis )
						.find( ( wiki ) => hostname.endsWith( wiki ) );
					if ( domain ) {
						map[ domain ] = ( map[ domain ] || [] ).concat( [ hostname ] );
					}
					return map;
				},
				{}
			);

			if ( !projectsMap[ 'wikipedia.org' ] ) {
				// Turn "wikidata.org" and "wikivoyage.org" into "Wikidata" and "Wikivoyage"
				// using the i18n messages in WikimediaMessages and relying on the assumption
				// that the domain name (minus tld) matches the project name - an assumption
				// that is *not* always true for all projects, but it is for the ones we care
				// to show, and since there are no convenient domain-name-to-project-dbname
				// mappings available to JS, it'll have to do.
				// Matches where this fail will simply be omitted.
				const projectNames = Object.keys( projectsMap )
					.map( ( domain ) => $i18n( externalWikis[ domain ] ) )
					.filter( ( msg ) => msg.exists() )
					.map( ( msg ) => msg.text() );

				if ( projectNames.length === 0 ) {
					return '';
				}

				return $i18n(
					'readerexperiments-imagebrowsing-vtoc-external-wikis-others',
					mw.language.listToText( projectNames )
				).text();
			}

			if ( projectsMap[ 'wikipedia.org' ].length === 1 ) {
				return $i18n(
					'readerexperiments-imagebrowsing-vtoc-external-wikis-wikipedia',
					projectsMap[ 'wikipedia.org' ][ 0 ]
				).text();
			}

			// We'll want to show exactly 1 Wikipedia match explicitly, but it doesn't
			// matter which it is. We could simply pick the first one, but that would
			// always prefer the same wikis (the ones with a language code early on
			// in the alphabet) and make our results/projects seem less varied than
			// they are. We could pick at random, but then it'd be a different pick
			// each time this renders, which feels a bit odd - I like consistent,
			// deterministic output. Since it doesn't matter which we pick, I'll just
			// hash the data, pick a character from the hash, and use that to pick a
			// deterministic "random" result; this way, the same data will always
			// produce the same result, without preferential treatment of any particular
			const wikipedias = projectsMap[ 'wikipedia.org' ];
			const highlightIndex = btoa( wikipedias )
				.charCodeAt( wikipedias.length ) % wikipedias.length;

			return $i18n(
				'readerexperiments-imagebrowsing-vtoc-external-wikis-wikipedia-multiple',
				wikipedias[ highlightIndex ],
				wikipedias.length - 1
			);
		}

		function onItemClick( image ) {
			emit( 'vtoc-item-click', image );
		}

		return {
			figure,
			gridRowSpan,
			getImageSources,
			onItemClick
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

@ib-vtoc-image-height: 300px;

// TODO: Create less mixin to reuse existing VTOC item styles
.ib-vtoc-other-wikis-item {
	border-style: @border-style-base;
	border-color: @border-color-subtle;
	border-width: 0.5px; // Use a fractional width so overlapping borders appear normal
	padding: @spacing-150;

	// Override Minerva skin paragraph styles eg. wiki project text
	p {
		padding-bottom: 0;
		margin-top: 0;

		&.ib-vtoc-other-wikis-item__project {
			font-weight: @font-weight-light;
			color: @color-subtle;
			text-align: start;
			margin-top: @spacing-75;
		}
	}

	&__figure {
		text-align: center;

		&__image {
			max-height: @ib-vtoc-image-height;
			max-width: @size-full;
		}

		button:not( .cdx-button ) {
			border: none;
			cursor: pointer;
			padding: 0;
		}

		figcaption {
			margin-top: @spacing-75;
			text-align: left;
		}
	}
}

</style>
