<template>
	<div
		ref="cardRef"
		class="ext-readerExperiments-quoteCard"
		:class="[
			'ext-readerExperiments-quoteCard--' + styleVariant,
			{
				'ext-readerExperiments-quoteCard--9x16': image,
				'ext-readerExperiments-quoteCard--1x1': !image,
				'ext-readerExperiments-quoteCard--image-light': !color || !color.isDark,
				'ext-readerExperiments-quoteCard--image-dark': color && color.isDark
			}
		]"
		:style="{
			'--dominant-color-hex': color ? color.hex : 'var( --background-color-base-fixed, #fff )',
			'--dominant-color-contrasting': color ? `oklch( from ${ color.hex } calc( l * ${ color.isDark ? 100 : 0 } ) c h )` : 'var( --color-base-fixed, #000 )',
			'--dominant-color-contrasting--legacy': color ? ( color.isDark ? 'white' : 'black' ) : 'var( --color-base-fixed, #000 )'
		}"
	>
		<div class="ext-readerExperiments-quoteCard__content">
			<img
				v-if="image"
				ref="imageElementRef"
				class="ext-readerExperiments-quoteCard__image"
				:src="imageSrc"
				:crossorigin="imageCrossOrigin"
				@load="( event ) => ( event.target.complete && $emit( 'img-load', event.target.src ) )"
				@error="( event ) => ( $emit( 'img-error', event.target.src ) )"
			>
			<cdx-icon
				class="ext-readerExperiments-quoteCard__quotes"
				:icon="cdxIconQuotes">
			</cdx-icon>

			<blockquote
				v-if="displayText"
				class="ext-readerExperiments-quoteCard__text"
				:class="{
					'ext-readerExperiments-quoteCard__text--small': text && text.length > 400,
					'ext-readerExperiments-quoteCard__text--medium': text && text.length > 300 && text.length <= 400,
					'ext-readerExperiments-quoteCard__text--large': text && text.length > 0 && text.length <= 300
				}"
			>
				<template v-if="displayText.prefix">
					{{ displayText.prefix }}
				</template>
				<b v-if="displayText.title">
					{{ displayText.title }}
				</b>
				<template v-if="displayText.suffix">
					{{ displayText.suffix }}
				</template>
			</blockquote>
			<blockquote
				v-else
				class="ext-readerExperiments-quoteCard__text ext-readerExperiments-quoteCard__text--small ext-readerExperiments-quoteCard__text__placeholder"
			>
				<!-- placeholder until text loads -->
				██████ ██ ███ ███████ ██ ████████
				██ ████ ██ ███ ███████ ████ ██ ████
				████ ███ ███████████ ████ ███
				███████ ████████████ ██ ███ ███
				███████ ██████████ ██████ ███
				████ ██████ ██ ███ ████ ██ ███
				████████ ██████ ███ ████ ██ ████
			</blockquote>
		</div>
		<div class="ext-readerExperiments-quoteCard__branding_and_attribution">
			<div class="ext-readerExperiments-quoteCard__branding">
				<div class="ext-readerExperiments-quoteCard__wordmark">
					<inline-svg
						v-if="showArticleTitle"
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
						{{ siteName }}
					</template>
				</div>
				<div
					v-if="showArticleTitle"
					class="ext-readerExperiments-quoteCard__article-title"
				>
					{{ title.getMainText() }}
				</div>
				<div class="ext-readerExperiments-quoteCard__attribution">
					<inline-svg :src="creativeCommonsCC" alt="CC"></inline-svg>
					<inline-svg :src="creativeCommonsBY" alt="BY"></inline-svg>
					<inline-svg :src="creativeCommonsSA" alt="SA"></inline-svg>
				</div>
			</div>
			<!-- eslint-disable vue/no-v-html -->
			<div
				v-if="imageAttribution !== null"
				class="ext-readerExperiments-quoteCard__image_attribution"
				v-html="imageAttribution">
			</div>
			<!-- eslint-enable vue/no-v-html -->
			<div
				v-else-if="image"
				aria-hidden="true"
				class="ext-readerExperiments-quoteCard__image_attribution ext-readerExperiments-quoteCard__image_attribution__placeholder">
				<!-- placeholder until attribution loads -->
				████████████████████
			</div>
		</div>
	</div>
</template>

<script>
const { computed, nextTick, ref, toRef, useTemplateRef, watch } = require( 'vue' );
const { CdxIcon } = require( '@wikimedia/codex' );
const { useAverageColor } = require( 'ext.readerExperiments' );
const icons = require( '../icons.json' );
const InlineSvg = require( './InlineSvg.vue' );
const rawParamsMessage = require( '../utils/rawParamsMessage.js' );

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
		 * The article title for attribution.
		 */
		title: {
			type: /** @type {mw.Title} */ ( Object ),
			required: true,
			validator: ( title ) => ( title instanceof mw.Title )
		},
		/**
		 * The text to display.
		 */
		text: {
			type: String,
			default: null
		},
		/**
		 * Src of the article image to display.
		 */
		image: {
			type: String,
			default: null
		},
		/**
		 * Author of the article image.
		 */
		imageAuthor: {
			type: String,
			default: null
		},
		/**
		 * License of the article image.
		 */
		imageLicense: {
			type: String,
			default: null
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
		 * Whether to show the article title or not.
		 */
		showArticleTitle: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		'img-error',
		'img-load'
	],
	setup: function ( props, { expose } ) {
		const cardRef = ref( null );
		const imageElementRef = useTemplateRef( 'imageElementRef' );

		const imageSrc = ref();
		const imageCrossOrigin = ref( 'anonymous' );
		watch(
			toRef( props, 'image' ),
			( image ) => {
				if ( !image ) {
					// Blank "image" - this should not be needed as `imageSrc` will
					// only be used when `image` exists, but might as well make sure
					// we continue to deal with valid data
					// (nit: this makes more sense than an empty string,  which is
					// considered an error and can cause issues when accessing
					// properties of the Image element directly)
					imageSrc.value = 'data:,';
					return;
				}

				const parsedUrl = mw.util.parseImageUrl( image );
				if ( !parsedUrl || !parsedUrl.name ) {
					imageSrc.value = image;
					imageCrossOrigin.value = 'anonymous';
					return;
				}
				const encodedSrcSuffix = encodeURI( parsedUrl.name.replace( / /g, '_' ) )
					// uriencode some more special chars that encodeURI doesn't cover,
					// but we would expect to be encoded for our thumbnail URIs
					// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI#description
					// Note: I have not doublechecked all characters, so this list may
					// not be exhaustive
					.replace( /[\\()',]/g, ( c ) => `%${ c.charCodeAt( 0 ).toString( 16 ).toUpperCase() }` );
				const existingImage = document.querySelector( `img[src$="${ CSS.escape( encodedSrcSuffix ) }"]` );

				if ( !existingImage || !existingImage.complete || !existingImage.currentSrc ) {
					// Could not find an existing other version of this image already
					// loaded on the page - just start loading the intended version
					imageSrc.value = image;
					imageCrossOrigin.value = 'anonymous';
					return;
				}

				// Since we already have a version of this image loaded on page,
				// set that as the initial image (even if it is of lower resolution)
				// to start off with; we'll start loading the intended version after
				imageSrc.value = existingImage.currentSrc;
				// Make sure crossorigin matches the existing image, or the browser
				// can't get the existing resource from its cache
				imageCrossOrigin.value = existingImage.crossOrigin;

				nextTick( () => {
					imageSrc.value = image;
					imageCrossOrigin.value = 'anonymous';
				} );
			},
			{ immediate: true }
		);

		// Bold the article title in the snippet if we otherwise don't explicitly show it
		const displayText = computed( () => {
			if ( props.text === null ) {
				return null;
			}

			let prefix = null;
			let title = null;
			let suffix = props.text;

			if ( !props.showArticleTitle ) {
				const reString = `^(.*?)(${ mw.util.escapeRegExp( props.title.getMainText() ) })(.*)$`;
				// eslint-disable-next-line security/detect-non-literal-regexp
				const re = new RegExp( reString, 'i' );
				const matches = props.text.match( re );
				if ( matches ) {
					prefix = matches[ 1 ];
					title = matches[ 2 ];
					suffix = matches[ 3 ];
				}
			}

			return { prefix, title, suffix };
		} );

		// Handle average image color background
		const color = useAverageColor( imageElementRef );

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

		const imageAttribution = computed( () => {
			if ( props.imageAuthor === null && props.imageLicense === null ) {
				return null;
			}

			if ( !props.imageAuthor && !props.imageLicense ) {
				return '';
			}

			const msg = rawParamsMessage( 'readerexperiments-sharehighlight-image-author-license' );
			msg.rawParams( [
				'<span class="ext-readerExperiments-quoteCard__image_attribution__author">' + mw.html.escape( props.imageAuthor ) + '</span>',
				'<span class="ext-readerExperiments-quoteCard__image_attribution__license">' + mw.html.escape( props.imageLicense ) + '</span>'
			] );
			return msg.text();
		} );

		// Expose cardRef for parent to access DOM element for image generation
		expose( { cardRef: cardRef } );

		return {
			siteName: mw.config.get( 'wgSiteName' ),
			cardRef,
			imageElementRef,
			imageSrc,
			imageCrossOrigin,
			color,
			displayText,
			cdxIconQuotes: icons.cdxIconQuotes,
			wordmark,
			creativeCommonsCC,
			creativeCommonsBY,
			creativeCommonsSA,
			wikipediaWLogo,
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
	border-radius: 0.125rem;
	color-scheme: only light;
	forced-color-adjust: none;

	// Consistent fixed card width to ensure a max height of 512px in 9x16 portrait mode
	width: calc( 512px * 9 / 16 );
	box-sizing: border-box;

	// Aspect ratio dimensions (preview size, rendered at 2x for image)
	&--1x1 {
		aspect-ratio: 1/1;
		border: @border-base;
	}

	&--9x16 {
		aspect-ratio: 9/16;

		.ext-readerExperiments-quoteCard__quotes {
			margin-top: @spacing-125;
		}
	}

	// stylelint-disable-next-line plugin/no-unsupported-browser-features
	&__source {
		display: flex;
		align-items: center;
		gap: @spacing-25;
		font-size: @font-size-small;
		font-style: normal;
	}

	/* stylelint-disable-next-line no-descending-specificity */
	&__quotes {
		display: flex;
		align-items: center;
		align-self: stretch;
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

	&__image_attribution {
		opacity: 0.5;
		display: flex;
		white-space: pre;

		&__placeholder {
			opacity: 0.25;
		}

		&__author,
		&__license {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		&__author {
			flex: 1;
		}
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
		color: var( --dominant-color-contrasting--legacy );

		@supports ( color: oklch( from white l c h ) ) {
			color: var( --dominant-color-contrasting );
		}

		.ext-readerExperiments-quoteCard__quotes {
			color: var( --dominant-color-contrasting--legacy );
			opacity: 0.5;

			@supports ( color: oklch( from white l c h ) ) {
				color: var( --dominant-color-contrasting );
			}
		}

		.ext-readerExperiments-quoteCard__branding {
			color: var( --dominant-color-contrasting--legacy );

			@supports ( color: oklch( from white l c h ) ) {
				color: var( --dominant-color-contrasting );
			}

			svg path {
				fill: var( --dominant-color-contrasting--legacy );

				@supports ( color: oklch( from white l c h ) ) {
					fill: var( --dominant-color-contrasting );
				}
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

		&__placeholder {
			opacity: 0.5;
		}
	}
}

</style>
