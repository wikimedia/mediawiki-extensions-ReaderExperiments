<template>
	<div
		ref="cardRef"
		class="ext-readerExperiments-quoteCard"
		:class="[
			'ext-readerExperiments-quoteCard--' + aspectRatio,
			'ext-readerExperiments-quoteCard--' + styleVariant
		]"
	>
		<div class="ext-readerExperiments-quoteCard__content">
			<img
				v-if="imageSrc"
				class="ext-readerExperiments-quoteCard__image"
				:src="imageSrc"
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
		</div>
	</div>
</template>

<script>
const { ref, computed } = require( 'vue' );
const { CdxIcon } = require( '@wikimedia/codex' );
const icons = require( '../icons.json' );
const truncateText = require( '../utils/truncateText.js' );

// Use static URLs to load local SVG files
const staticBaseUrl = mw.config.get( 'wgExtensionAssetsPath' ) + '/ReaderExperiments/resources/ext.readerExperiments.shareHighlight/images/';
const creativeCommonsCC = staticBaseUrl + 'creative-commons-cc.svg';
const creativeCommonsBY = staticBaseUrl + 'creative-commons-by.svg';
const creativeCommonsSA = staticBaseUrl + 'creative-commons-sa.svg';

/**
 * Maximum characters to display in the quote card.
 * Longer quotes are truncated with ellipsis.
 */
const MAX_QUOTE_LENGTH = 280;

/**
 * @typedef {import('../../ext.readerExperiments.common/types').ImageData} ImageData
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
		 */
		image: {
			type: /** @type {import('vue').PropType<ImageData>} */ ( Object ),
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
		 * Values: 'light', 'dark', 'wikipedia'
		 */
		styleVariant: {
			type: String,
			default: 'light',
			validator: function ( value ) {
				return [ 'light', 'dark', 'wikipedia' ].includes( value );
			}
		}
	},
	setup: function ( props, { expose } ) {
		const cardRef = ref( null );

		const imageSrc = computed( () => {
			return props.image && props.image.src ? props.image.src : null;
		} );

		/**
		 * If there's no image, then the card is square,
		 * otherwise it's 9:16.
		 */
		const aspectRatio = computed( () => {
			if ( imageSrc.value ) {
				return '9x16';
			} else {
				return '1x1';
			}
		} );

		/**
		 * Truncate text with ellipsis if it exceeds max length.
		 */
		const displayText = computed( () => {
			return truncateText( props.text.trim(), MAX_QUOTE_LENGTH );
		} );

		/**
		 * Determine font size class based on text length.
		 * Shorter quotes get larger text, longer quotes get smaller text.
		 */
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
			aspectRatio,
			imageSrc,
			displayText,
			fontSizeClass,
			cdxIconQuotes: icons.cdxIconQuotes,
			wordmark,
			creativeCommonsCC,
			creativeCommonsBY,
			creativeCommonsSA
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
	}

	// Aspect ratio dimensions (preview size, rendered at 2x for image)
	&--1x1 {
		aspect-ratio: 1/1;
	}

	&--9x16 {
		aspect-ratio: 9/16;
	}

	// Style variants
	&--light {
		background: @background-color-base;
		color: @color-base;

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
		background: #1a1a1a;
		color: #fff;

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

	&--wikipedia {
		background: linear-gradient( 135deg, #36c 0%, #2a4a8a 100% );
		color: #fff;

		.ext-readerExperiments-quoteCard__branding {
			color: rgba( 255, 255, 255, 0.5 );

			img {
				filter: invert( 1 ) saturate( 0 );
				opacity: 0.5;
			}
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

	&__attribution {
		opacity: 0.5;
	}
}

</style>
