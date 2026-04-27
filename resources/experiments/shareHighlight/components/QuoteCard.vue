<template>
	<div
		ref="cardRef"
		class="ext-readerExperiments-quoteCard"
		:class="[
			'ext-readerExperiments-quoteCard--' + aspectRatio,
			'ext-readerExperiments-quoteCard--' + styleVariant,
			'ext-readerExperiments-quoteCard--image-' + dominantColorLightness
		]"
		:style="{
			'--dominant-color-hex': dominantColorHex,
			'--dominant-color-contrasting': dominantColorContrasting,
			'--dominant-color-contrasting--legacy': dominantColorContrastingLegacy
		}"
	>
		<div class="ext-readerExperiments-quoteCard__content">
			<img
				v-if="image"
				ref="imageElementRef"
				class="ext-readerExperiments-quoteCard__image"
				:src="image"
				crossorigin="anonymous"
			>
			<cdx-icon
				class="ext-readerExperiments-quoteCard__quotes"
				:icon="cdxIconQuotes">
			</cdx-icon>
			<blockquote class="ext-readerExperiments-quoteCard__text" :class="fontSizeClass">
				<template v-if="displayPrefix">
					{{ displayPrefix }}
				</template>
				<b v-if="displayTitle">
					{{ displayTitle }}
				</b>
				<template v-if="displaySuffix">
					{{ displaySuffix }}
				</template>
			</blockquote>
		</div>
		<div class="ext-readerExperiments-quoteCard__branding_and_attribution">
			<div class="ext-readerExperiments-quoteCard__branding">
				<div class="ext-readerExperiments-quoteCard__wordmark">
					<inline-svg
						v-if="isTextSelectionShare"
						:src="wikipediaWLogo"
					></inline-svg>
					<inline-svg
						v-else-if="wordmark"
						:src="wordmark.src"
						:alt="wordmark.alt"
						:style="{
							'--wordmark-width': wordmark.width + 'px',
							'--wordmark-height': wordmark.height + 'px'
						}"
					></inline-svg>
					<template v-else>
						{{ $i18n( 'readerexperiments-sharehighlight-branding' ).text() }}
					</template>
				</div>
				<div
					v-if="isTextSelectionShare"
					class="ext-readerExperiments-quoteCard__article-title"
				>
					{{ articleTitle }}
				</div>
				<div class="ext-readerExperiments-quoteCard__attribution">
					<inline-svg :src="creativeCommonsCC"></inline-svg>
					<inline-svg :src="creativeCommonsBY"></inline-svg>
					<inline-svg :src="creativeCommonsSA"></inline-svg>
				</div>
			</div>
			<div
				v-if="imageAttribution"
				class="ext-readerExperiments-quoteCard__image_attribution">
				{{ imageAttribution }}
			</div>
		</div>
	</div>
</template>

<script>
const { computed, ref, toRef, useTemplateRef, watch } = require( 'vue' );
const { CdxIcon } = require( '@wikimedia/codex' );
const { useBackgroundColor, useImageModel } = require( 'ext.readerExperiments' );
const icons = require( '../icons.json' );
const InlineSvg = require( './InlineSvg.vue' );

// Use static URLs to load local SVG files
const staticBaseUrl = mw.config.get( 'wgExtensionAssetsPath' ) + '/ReaderExperiments/resources/experiments/shareHighlight/images/';
const creativeCommonsCC = staticBaseUrl + 'creative-commons-cc.svg';
const creativeCommonsBY = staticBaseUrl + 'creative-commons-by.svg';
const creativeCommonsSA = staticBaseUrl + 'creative-commons-sa.svg';
const wikipediaWLogo = staticBaseUrl + 'wikipedia-w-logo.svg';

// @vue/component
module.exports = exports = {
	name: 'QuoteCard',
	components: {
		CdxIcon,
		InlineSvg
	},
	props: {
		/**
		 * Src of the article image to display.
		 */
		image: {
			type: String,
			default: null
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
		 * Values: 'average', 'light'
		 */
		styleVariant: {
			type: String,
			required: true,
			validator: function ( value ) {
				return [ 'average', 'light' ].includes( value );
			}
		},
		/**
		 * The article title for attribution.
		 */
		articleTitle: {
			type: String,
			required: true
		},
		/**
		 * The selected quote text. Empty string for article-level share.
		 */
		quoteText: {
			type: String,
			default: ''
		}
	},
	setup: function ( props, { expose } ) {
		const cardRef = ref( null );
		const imageSrcRef = toRef( props, 'image' );
		const imageElementRef = useTemplateRef( 'imageElementRef' );

		// If there's no image,
		// then the card is square, otherwise it's 9:16.
		const aspectRatio = computed( () => ( props.image ? '9x16' : '1x1' ) );

		const displayPrefix = ref( null );
		const displayTitle = ref( null );
		const displaySuffix = ref( null );
		watch( toRef( props, 'text' ), ( text ) => {
			text = text.trim();
			const title = mw.config.get( 'wgTitle' ) || '';
			const reString = `^(.*?)(${ mw.util.escapeRegExp( title ) })(.*)$`;
			// eslint-disable-next-line security/detect-non-literal-regexp
			const re = new RegExp( reString, 'i' );
			const matches = text.match( re );
			if ( matches ) {
				displayPrefix.value = matches[ 1 ];
				displayTitle.value = matches[ 2 ];
				displaySuffix.value = matches[ 3 ];
			} else {
				displayPrefix.value = null;
				displayTitle.value = null;
				displaySuffix.value = text;
			}
		}, {
			immediate: true
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
		const color = computed( () => props.image ? useBackgroundColor( imageSrcRef, imageElementRef ).value : null );
		const dominantColorHex = computed( () => {
			return color.value ?
				color.value.hex :
				'var( --background-color-neutral, transparent )';
		} );
		const dominantColorContrasting = computed( () => {
			return color.value ?
				`oklch( from ${ color.value.hex } calc( l * ${ color.value.isDark ? 100 : 0 } ) c h )` :
				null;
		} );
		const dominantColorContrastingLegacy = computed( () => {
			return color.value ?
				( color.value.isDark ? 'white' : 'black' ) :
				null;
		} );
		const dominantColorLightness = computed( () => {
			return color.value ?
				( color.value.isDark ? 'dark' : 'light' ) :
				null;
		} );

		// Expose cardRef for parent to access DOM element for image generation
		expose( { cardRef: cardRef } );

		const isTextSelectionShare = computed( () => !!props.quoteText );

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

		const imageNameRef = computed( () => {
			if ( !imageSrcRef.value ) {
				return null;
			}
			const parsedUrl = mw.util.parseImageUrl( imageSrcRef.value );
			if ( !parsedUrl ) {
				return null;
			}
			return parsedUrl.name;
		} );
		const imageModel = useImageModel( imageNameRef );
		const imageAttribution = computed( () => {
			const model = imageModel.value;
			if ( !model || !model.author || !model.license ) {
				return null;
			}

			const doc = new DOMParser().parseFromString( model.author, 'text/html' );
			const authorText = doc.body.textContent.trim();
			const license = imageModel.value.license.getShortName();

			return mw.message(
				'readerexperiments-sharehighlight-image-author-license',
				authorText,
				license
			).text();
		} );

		return {
			cardRef,
			imageElementRef,
			aspectRatio,
			displayPrefix,
			displayTitle,
			displaySuffix,
			fontSizeClass,
			cdxIconQuotes: icons.cdxIconQuotes,
			isTextSelectionShare,
			wordmark,
			creativeCommonsCC,
			creativeCommonsBY,
			creativeCommonsSA,
			wikipediaWLogo,
			dominantColorHex,
			dominantColorContrasting,
			dominantColorContrastingLegacy,
			dominantColorLightness,
			imageAttribution
		};
	}
};
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';
@color-quotes-light: #797a7a;

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

	&__branding_and_attribution {
		font-size: @font-size-x-small;
		font-family: @font-family-system-sans;
		letter-spacing: 0.02em;
		bottom: @spacing-50;
		right: @spacing-50;
		margin-top: @spacing-125;
		opacity: 0.5;
	}

	&__filter {
		display: none;
	}

	&__branding {
		display: flex;
		justify-content: space-between;
		align-items: center;

		span {
			vertical-align: text-top;
		}
	}

	&__text_attribution,
	&__image_attribution {
		opacity: 0.5;
	}

	// Aspect ratio dimensions (preview size, rendered at 2x for image)
	&--1x1 {
		aspect-ratio: 1/1;
	}

	&--9x16 {
		aspect-ratio: 9/16;
	}

	.ext-readerExperiments-quoteCard__branding {
		svg path[ fill='none' ] {
			fill: none;
		}
	}

	.ext-readerExperiments-quoteCard__wordmark {
		svg {
			width: var( --wordmark-width );
			height: var( --wordmark-height );
		}
	}

	&__article-title {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 0 @spacing-25;
		font-size: @font-size-small;
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

			svg path {
				fill: var( --dominant-color-contrasting );
			}
		}
	}

	&--light {
		background-color: @background-color-base-fixed;
		color: @color-base-fixed;

		.ext-readerExperiments-quoteCard__quotes {
			color: @color-quotes-light;
		}

		.ext-readerExperiments-quoteCard__source {
			color: @color-subtle;
		}

		.ext-readerExperiments-quoteCard__branding {
			color: #000;

			svg path {
				fill: #000;
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
		display: -webkit-box;
		display: box;
		justify-content: center;
		-webkit-box-orient: vertical;
		align-items: flex-start;
		align-self: stretch;
		margin-top: @spacing-30;
		overflow: hidden;
		color: inherit;
		font-family: @font-family-serif;
		line-height: @line-height-medium;
		word-wrap: break-word;
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		-webkit-line-clamp: 7;
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		line-clamp: 7;
		text-overflow: ellipsis;

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
