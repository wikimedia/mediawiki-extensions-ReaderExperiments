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
			<blockquote class="ext-readerExperiments-quoteCard__text" :class="fontSizeClass">
				{{ displayText }}
			</blockquote>
			<cite class="ext-readerExperiments-quoteCard__source">
				<cdx-icon :icon="cdxIconLogoWikipedia" size="small"></cdx-icon>
				<span>{{ source }}</span>
			</cite>
		</div>
		<div class="ext-readerExperiments-quoteCard__branding">
			{{ $i18n( 'readerexperiments-sharehighlight-branding' ).text() }}
		</div>
	</div>
</template>

<script>
const { ref, computed } = require( 'vue' );
const { CdxIcon } = require( '@wikimedia/codex' );
const icons = require( '../icons.json' );
const truncateText = require( '../utils/truncateText.js' );

/**
 * Maximum characters to display in the quote card.
 * Longer quotes are truncated with ellipsis.
 */
const MAX_QUOTE_LENGTH = 280;

// @vue/component
module.exports = exports = {
	name: 'QuoteCard',
	components: {
		CdxIcon
	},
	props: {
		/**
		 * The quote text to display.
		 */
		text: {
			type: String,
			required: true
		},
		/**
		 * The source/article title.
		 */
		source: {
			type: String,
			required: true
		},
		/**
		 * Aspect ratio for the card.
		 * Values: '1x1', '4x5', '16x9'
		 */
		aspectRatio: {
			type: String,
			default: '1x1',
			validator: function ( value ) {
				return [ '1x1', '4x5', '16x9' ].includes( value );
			}
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

		/**
		 * Truncate text with ellipsis if it exceeds max length.
		 */
		const displayText = computed( () => {
			const truncated = truncateText( props.text.trim(), MAX_QUOTE_LENGTH );
			return mw.msg( 'readerexperiments-sharehighlight-quote-format', truncated );
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

		return {
			cardRef: cardRef,
			displayText: displayText,
			fontSizeClass: fontSizeClass,
			cdxIconLogoWikipedia: icons.cdxIconLogoWikipedia
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
	padding: @spacing-100;
	box-sizing: border-box;
	overflow: hidden;

	// Aspect ratio dimensions (preview size, rendered at 2x for image)
	&--1x1 {
		width: 320px;
		height: 320px;
	}

	&--4x5 {
		width: 288px;
		height: 360px;
	}

	&--16x9 {
		width: 360px;
		height: 203px;
	}

	// Style variants
	&--light {
		background: @background-color-base;
		color: @color-base;

		.ext-readerExperiments-quoteCard__source {
			color: @color-subtle;
		}

		.ext-readerExperiments-quoteCard__branding {
			color: @color-disabled;
		}
	}

	&--dark {
		background: #1a1a1a;
		color: #fff;

		.ext-readerExperiments-quoteCard__source {
			color: rgba( 255, 255, 255, 0.7 );
		}

		.ext-readerExperiments-quoteCard__branding {
			color: rgba( 255, 255, 255, 0.4 );
		}
	}

	&--wikipedia {
		background: linear-gradient( 135deg, #36c 0%, #2a4a8a 100% );
		color: #fff;

		.ext-readerExperiments-quoteCard__source {
			color: rgba( 255, 255, 255, 0.85 );
		}

		.ext-readerExperiments-quoteCard__branding {
			color: rgba( 255, 255, 255, 0.5 );
		}
	}

	&__content {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	&__text {
		// Reset inherited blockquote styles
		all: unset;
		display: block;
		color: inherit;

		font-family: @font-family-serif;
		line-height: @line-height-medium;
		margin: 0 0 @spacing-75;
		word-wrap: break-word;

		// Dynamic font sizing based on quote length
		&--large {
			font-size: 1.5rem;
		}

		&--medium {
			font-size: 1.25rem;
		}

		&--small {
			font-size: 1rem;
		}
	}

	&__source {
		display: flex;
		align-items: center;
		gap: @spacing-25;
		font-size: @font-size-small;
		font-style: normal;
	}

	&__branding {
		position: absolute;
		bottom: @spacing-50;
		right: @spacing-50;
		font-size: @font-size-x-small;
		font-family: @font-family-system-sans;
		letter-spacing: 0.02em;
		opacity: @opacity-medium;
	}
}
</style>
