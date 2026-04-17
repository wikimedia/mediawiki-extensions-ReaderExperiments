<template>
	<div
		ref="cardRef"
		class="ext-readerExperiments-quoteCard"
		:class="[
			'ext-readerExperiments-quoteCard--' + aspectRatio,
			'ext-readerExperiments-quoteCard--' + styleVariant
		]"
		:style="{
			'--dominant-color-hex': dominantColorHex,
			'--dominant-color-contrasting': dominantColorContrasting,
			'--dominant-color-contrasting--legacy': dominantColorContrastingLegacy
		}"
	>
		<div class="ext-readerExperiments-quoteCard__content">
			<img
				v-if="imageSrc"
				ref="imageElementRef"
				class="ext-readerExperiments-quoteCard__image"
				:src="imageSrc"
				crossorigin="anonymous"
			>
			<cdx-icon class="ext-readerExperiments-quoteCard__quotes" :icon="cdxIconQuotes"></cdx-icon>
			<blockquote class="ext-readerExperiments-quoteCard__text" :class="fontSizeClass">
				{{ displayText }}
			</blockquote>
		</div>
		<div class="ext-readerExperiments-quoteCard__branding">
			<img
				v-if="wordmark"
				:src="wordmark.src"
				:alt="wordmark.alt"
				:width="wordmark.width"
				:height="wordmark.height">
			<template v-else>
				{{ $i18n( 'readerexperiments-sharehighlight-branding' ).text() }}
			</template>
			<div class="ext-readerExperiments-quoteCard__attribution">
				<img :src="creativeCommonsCC">
				<img :src="creativeCommonsBY">
				<img :src="creativeCommonsSA">
			</div>
			<!-- TODO add image author and license abbreviation, 25% opacity of text color -->
		</div>
	</div>
</template>

<script>
const { computed, ref, toRef } = require( 'vue' );
const { CdxIcon } = require( '@wikimedia/codex' );
const icons = require( '../icons.json' );
const truncateText = require( '../utils/truncateText.js' );
const { useBackgroundColor } = require( 'ext.readerExperiments' );

// Use static URLs to load local SVG files
const staticBaseUrl = mw.config.get( 'wgExtensionAssetsPath' ) + '/ReaderExperiments/resources/experiments/shareHighlight/images/';
const creativeCommonsCC = staticBaseUrl + 'creative-commons-cc.svg';
const creativeCommonsBY = staticBaseUrl + 'creative-commons-by.svg';
const creativeCommonsSA = staticBaseUrl + 'creative-commons-sa.svg';

/**
 * Maximum characters to display in the quote card.
 * Longer quotes are truncated with ellipsis.
 */
const MAX_QUOTE_LENGTH = 280;

/**
 * @typedef {import('../../../common/types').ImageData} ImageData
 */

// @vue/component
module.exports = exports = {
	name: 'QuoteCard',
	components: {
		CdxIcon
	},
	props: {
		/**
		 * The article lead image to display.
		 * It's wrapped in a ref, but not directly used.
		 */
		// eslint-disable-next-line vue/no-unused-properties
		image: {
			type: /** @type {import('vue').PropType<ImageData>} */ ( [ Object, null ] ),
			required: true
		},
		/**
		 * The quote text to display.
		 */
		text: {
			type: String,
			required: true
		},
		/**
		 * Visual style variant.
		 * Values: 'average', 'light', 'dark', 'transparent'
		 */
		styleVariant: {
			type: String,
			required: true,
			validator: function ( value ) {
				return [ 'average', 'light', 'dark', 'transparent' ].includes( value );
			}
		}
	},
	setup: function ( props, { expose } ) {
		const cardRef = ref( null );
		const imageRef = toRef( props, 'image' );
		const imageElementRef = ref( null );

		const imageSrc = computed( () => {
			return imageRef.value && imageRef.value.src ? imageRef.value.src : null;
		} );

		// If there's no image,
		// then the card is square, otherwise it's 9:16.
		const aspectRatio = computed( () => {
			return imageRef.value && imageRef.value.src ? '9x16' : '1x1';
		} );

		// Truncate text with ellipsis if it exceeds max length
		const displayText = computed( () => {
			return truncateText( props.text.trim(), MAX_QUOTE_LENGTH );
		} );

		// Determine font size class based on text length.
		// Shorter quotes get larger text, longer quotes get smaller text.
		const fontSizeClass = computed( () => {
			const length = props.text.trim().length;
			if ( length <= 80 ) {
				return 'ext-readerExperiments-quoteCard__text--large';
			}
			if ( length <= 160 ) {
				return 'ext-readerExperiments-quoteCard__text--medium';
			}
			return 'ext-readerExperiments-quoteCard__text--small';
		} );

		// Handle average image color background
		let dominantColorHex, dominantColorContrasting, dominantColorContrastingLegacy;
		if ( props.styleVariant === 'average' ) {
			const color = useBackgroundColor( imageRef, imageElementRef );
			dominantColorHex = computed( () => {
				return color.value ?
					color.value.hex :
					'var( --background-color-neutral, transparent )';
			} );
			dominantColorContrasting = computed( () => {
				return color.value ?
					`oklch( from ${ color.value.hex } calc( l * ${ color.value.isDark ? 100 : 0 } ) c h )` :
					null;
			} );
			dominantColorContrastingLegacy = computed( () => {
				return color.value ?
					( color.value.isDark ? 'white' : 'black' ) :
					null;
			} );
		}

		// Expose cardRef for parent to access DOM element for image generation
		expose( { cardRef: cardRef } );

		const wordmark = ref( null );
		const wordmarkImg = document.querySelector( '#mw-mf-page-center .branding-box img' );
		if ( wordmarkImg instanceof HTMLImageElement ) {
			// Reuse the mobile site branding wordmark for the share dialog's branding.
			wordmark.value = {
				src: wordmarkImg.src,
				alt: wordmarkImg.alt,
				width: wordmarkImg.width,
				height: wordmarkImg.height
			};
		}

		return {
			cardRef,
			imageElementRef,
			imageSrc,
			aspectRatio,
			displayText,
			fontSizeClass,
			cdxIconQuotes: icons.cdxIconQuotes,
			wordmark,
			creativeCommonsCC,
			creativeCommonsBY,
			creativeCommonsSA,
			dominantColorHex,
			dominantColorContrasting,
			dominantColorContrastingLegacy
		};
	}
};
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ext-readerExperiments-quoteCard {
	position: relative;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: @spacing-75;
	overflow: hidden;
	border-radius: 0.125rem;

	// stylelint-disable-next-line plugin/no-unsupported-browser-features
	&__source {
		display: flex;
		align-items: center;
		gap: @spacing-25;
		font-size: @font-size-small;
		font-style: normal;
	}

	&__quotes {
		display: flex;
		align-items: center;
		align-self: stretch;
		margin-top: @spacing-125;
	}

	&__branding {
		display: flex;
		justify-content: space-between;
		align-items: center;
		bottom: @spacing-50;
		right: @spacing-50;
		margin-top: @spacing-125;
		font-size: @font-size-x-small;
		font-family: @font-family-system-sans;
		letter-spacing: 0.02em;
		opacity: 0.5;
	}

	// Aspect ratio dimensions (preview size, rendered at 2x for image)
	&--1x1 {
		aspect-ratio: 1/1;
	}

	&--9x16 {
		aspect-ratio: 9/16;
	}

	// Style variants
	&--average {
		background-color: var( --dominant-color-hex );
		color: var( --dominant-color-contrasting );

		.ext-readerExperiments-quoteCard__quotes {
			color: var( --dominant-color-contrasting );
			opacity: 0.5;
		}

		.ext-readerExperiments-quoteCard__branding {
			color: var( --dominant-color-contrasting );
		}
	}

	&--light {
		background-color: @background-color-base-fixed;
		color: @color-base-fixed;

		.ext-readerExperiments-quoteCard__quotes {
			color: #797a7a;
		}

		.ext-readerExperiments-quoteCard__source {
			color: @color-subtle;
		}

		.ext-readerExperiments-quoteCard__branding {
			color: @color-disabled;

			img {
				filter: saturate( 0 );
				opacity: 0.5;
			}
		}
	}

	&--dark {
		background-color: #1a1a1a;
		color: @color-inverted-fixed;

		.ext-readerExperiments-quoteCard__quotes {
			color: #a2a9b1;
		}

		.ext-readerExperiments-quoteCard__source {
			color: rgba( 255, 255, 255, 0.7 );
		}

		.ext-readerExperiments-quoteCard__branding {
			color: rgba( 255, 255, 255, 0.4 );

			img {
				filter: invert( 1 ) saturate( 0 );
				opacity: 0.4;
			}
		}
	}

	&--transparent {
		background-color: @background-color-transparent;
		color: @color-base;

		.ext-readerExperiments-quoteCard__quotes {
			color: @color-subtle;
		}
	}

	&__content {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	&__image {
		flex: 1 1 0;
		min-height: 14.77rem;
		width: 100%;
		display: block;
		object-fit: cover;
		object-position: center top;
	}

	&__text {
		// Reset inherited blockquote styles
		all: unset;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		align-self: stretch;
		margin-top: @spacing-30;
		overflow: hidden;
		color: inherit;
		font-family: @font-family-serif;
		line-height: @line-height-medium;
		word-wrap: break-word;

		// Dynamic font sizing based on quote length
		&--large {
			font-size: @font-size-x-large;
			line-height: @line-height-x-large;
		}

		&--medium {
			font-size: @font-size-medium;
			line-height: @line-height-medium;
		}

		&--small {
			font-size: @font-size-small;
			line-height: @line-height-small;
		}
	}
}

</style>
