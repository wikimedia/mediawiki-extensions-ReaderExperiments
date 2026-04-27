<template>
	<popover-dialog
		v-model:open="wrappedOpen"
		:title="$i18n( 'readerexperiments-sharehighlight-dialog-title' ).text()"
		class="ext-readerExperiments-shareQuoteDialog"
	>
		<!-- Quote Preview -->
		<div class="ext-readerExperiments-shareQuoteDialog__preview">
			<quote-card
				ref="quoteCardRef"
				:image="image"
				:text="text"
				:style-variant="selectedStyleRef"
				:article-title="articleTitle"
				:quote-text="quoteText"
			></quote-card>
		</div>

		<!-- Error Message -->
		<cdx-message
			v-if="error"
			type="error"
			class="ext-readerExperiments-shareQuoteDialog__error"
		>
			{{ error }}
		</cdx-message>

		<!-- Loading State -->
		<div
			v-if="isProcessing"
			class="ext-readerExperiments-shareQuoteDialog__loading"
		>
			<cdx-progress-bar></cdx-progress-bar>
			<span>{{ $i18n( 'readerexperiments-sharehighlight-generating-image' ).text() }}</span>
		</div>

		<!-- Custom footer with Copy Link on left, actions on right -->
		<template #footer>
			<div class="ext-readerExperiments-shareQuoteDialog__footer">
				<cdx-button
					weight="quiet"
					@click="handleCopyLink"
				>
					<cdx-icon :icon="cdxIconLink"></cdx-icon>
					{{ copyLinkLabel }}
				</cdx-button>

				<div class="ext-readerExperiments-shareQuoteDialog__footer-actions">
					<cdx-button
						:disabled="isProcessing"
						@click="handleClose"
					>
						{{ $i18n( 'readerexperiments-sharehighlight-cancel' ).text() }}
					</cdx-button>
					<cdx-button
						weight="primary"
						action="progressive"
						:disabled="isProcessing"
						@click="handlePrimaryAction"
					>
						{{ primaryActionLabel }}
					</cdx-button>
				</div>
			</div>
		</template>
	</popover-dialog>
</template>

<script>
const { ref, toRef, computed, watch } = require( 'vue' );
const { CdxButton, CdxIcon, CdxMessage, CdxProgressBar, useModelWrapper } = require( '@wikimedia/codex' );
const { useSummary } = require( 'ext.readerExperiments' );
const icons = require( '../icons.json' );
const PopoverDialog = require( './PopoverDialog.vue' );
const QuoteCard = require( './QuoteCard.vue' );
const useShareQuote = require( '../composables/useShareQuote.js' );
const textFragment = require( '../utils/textFragment.js' );

// @vue/component
module.exports = exports = {
	name: 'ShareQuoteDialog',
	components: {
		CdxButton,
		PopoverDialog,
		CdxIcon,
		CdxMessage,
		CdxProgressBar,
		QuoteCard
	},
	props: {
		/**
		 * Whether the dialog is open.
		 */
		open: {
			type: Boolean,
			default: false
		},
		/**
		 * Title of the page to share.
		 */
		title: {
			type: /** @type {mw.Title} */ ( Object ),
			required: true,
			validator: ( title ) => ( title instanceof mw.Title )
		},
		/**
		 * The quote text to share.
		 */
		quoteText: {
			type: String,
			default: ''
		}
	},
	emits: [ 'update:open' ],
	setup: function ( props, { emit } ) {
		const quoteCardRef = ref( null );

		const titleMatchesActivePage = computed( () => props.title.getPrefixedDb() === mw.config.get( 'wgPageName' ) );
		const ogImage = document.querySelector( 'meta[property="og:image"]' );
		const ogImageWidth = document.querySelector( 'meta[property="og:image:width"]' );

		const needsSummary = computed( () => {
			if ( props.quoteText === '' ) {
				// No quote selected = get extract from summary API
				return true;
			}

			if ( !titleMatchesActivePage.value || mw.config.get( 'wgArticleId' ) === 0 ) {
				// Not the currently active page, or not a known local page = we can't know
				// whether there's a thumbnail & need to get it from summary API
				return true;
			}

			if ( ogImage && ogImage.hasAttribute( 'content' ) ) {
				// We know that the page has a thumbnail = go get data on the original file
				// from summary API
				return true;
			}

			return false;
		} );

		const summaryTitle = computed( () => ( props.open && needsSummary.value ? props.title : null ) );
		const summary = useSummary( summaryTitle );

		const image = computed( () => {
			const getImageSrc = ( thumbnailSrc, originalSrc, originalWidth ) => {
				// Minimum dimension (width and height) required for the original image.
				// Images smaller than this threshold are excluded to avoid poor quality in the
				// share card.
				if ( originalWidth < 500 ) {
					return null;
				}

				const parsedUrl = mw.util.parseImageUrl( thumbnailSrc );
				if ( !parsedUrl ) {
					// If we can't parse the url, default to the original src
					return originalSrc;
				}

				// Thumbnail size to request must be a standard Wikimedia production thumbnail
				// size to ensure the thumbnail is cached and avoid rate limiting.
				// Refer to https://www.mediawiki.org/wiki/Common_thumbnail_sizes
				// 960px is chosen because the QuoteCard renders at 2× pixel ratio on
				// a ~375px-wide mobile card, requiring ~750px effective width. 960px is the
				// smallest standard size that exceeds this threshold. 500px would be too small
				// and result in upscaling.
				const width = mw.util.adjustThumbWidthForSteps(
					960,
					originalWidth
				);
				return parsedUrl.resizeUrl( width );
			};

			if ( !summary.value ) {
				// While we don't (yet) have the summary result, we could read from the
				// opengraph tags to get an early indication of what image we'll get.
				// It's not perfect (width & height are not the source dimensions, for
				// example), but likely good enough to kickstart things.
				if (
					titleMatchesActivePage.value &&
					ogImage && ogImage.hasAttribute( 'content' ) &&
					ogImageWidth && ogImageWidth.hasAttribute( 'content' )
				) {
					return getImageSrc(
						ogImage.getAttribute( 'content' ),
						ogImage.getAttribute( 'content' ),
						parseInt( ogImageWidth.getAttribute( 'content' ) )
					);
				}
			} else if ( summary.value.thumbnail && summary.value.originalimage ) {
				return getImageSrc(
					summary.value.thumbnail.source,
					summary.value.originalimage.source,
					summary.value.originalimage.width
				);
			}

			return null;
		} );

		const text = computed( () => {
			if ( props.quoteText ) {
				return props.quoteText;
			}
			if ( summary.value && summary.value.extract ) {
				return summary.value.extract;
			}
			return '';
		} );

		const linkCopiedRef = ref( false ); // Copy link state
		const articleTitle = computed( () => props.title.getMainText() );

		// If there's no image, fallback to light background. Average color depends on image.
		const selectedStyleRef = ref();
		watch(
			image,
			() => ( selectedStyleRef.value = image.value ? 'average' : 'light' ),
			{ immediate: true }
		);

		// Share functionality
		const {
			canShareFiles,
			isProcessing,
			error,
			shareQuote,
			downloadQuoteImage
		} = useShareQuote();

		// Two-way binding for open state
		const wrappedOpen = useModelWrapper( toRef( props, 'open' ), emit, 'update:open' );

		const copyLinkLabel = computed( () => {
			const key = linkCopiedRef.value ?
				'readerexperiments-sharehighlight-link-copied' :
				'readerexperiments-sharehighlight-copy-link';
			// eslint-disable-next-line mediawiki/msg-doc
			return mw.msg( key );
		} );

		const primaryActionLabel = computed( () => {
			const key = canShareFiles.value ?
				'readerexperiments-sharehighlight-share' :
				'readerexperiments-sharehighlight-download';
			// eslint-disable-next-line mediawiki/msg-doc
			return mw.msg( key );
		} );

		// Reset options when dialog opens
		watch( () => {
			return props.open;
		}, ( isOpen ) => {
			if ( isOpen ) {
				linkCopiedRef.value = false;
			}
		} );

		/**
		 * Handle the primary action (Share or Download).
		 */
		function handlePrimaryAction() {
			const cardElement = quoteCardRef.value && quoteCardRef.value.cardRef;
			if ( !cardElement ) {
				return;
			}

			if ( canShareFiles.value ) {
				// The lead image isn't passed to the Web Share API
				shareQuote( {
					cardElement: cardElement,
					articleTitle: articleTitle.value,
					quoteText: text.value
				} ).then( ( success ) => {
					if ( success ) {
						wrappedOpen.value = false;
					}
				} );
			} else {
				downloadQuoteImage( cardElement, articleTitle.value )
					.then( ( success ) => {
						if ( success ) {
							wrappedOpen.value = false;
						}
					} );
			}
		}

		/**
		 * Handle dialog close.
		 */
		function handleClose() {
			wrappedOpen.value = false;
		}

		/**
		 * Copy the text fragment link to clipboard.
		 */
		function handleCopyLink() {
			const url = textFragment.buildShareUrl( articleTitle.value, text.value );
			// eslint-disable-next-line compat/compat
			navigator.clipboard.writeText( url ).then( () => {
				linkCopiedRef.value = true;
				// Reset after 2 seconds
				setTimeout( () => {
					linkCopiedRef.value = false;
				}, 2000 );
			} ).catch( ( e ) => {
				// eslint-disable-next-line no-console
				console.error( 'Failed to copy link:', e );
			} );
		}

		return {
			quoteCardRef,
			selectedStyleRef,
			isProcessing,
			image,
			text,
			articleTitle,
			error,
			wrappedOpen,
			copyLinkLabel,
			primaryActionLabel,
			handlePrimaryAction,
			handleClose,
			handleCopyLink,
			cdxIconLink: icons.cdxIconLink
		};
	}
};
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ext-readerExperiments-shareQuoteDialog {
	&__preview {
		display: flex;
		justify-content: center;
		padding: @spacing-100 0;
		background: @background-color-interactive-subtle;
		border-radius: @border-radius-base;
		margin-bottom: @spacing-100;
	}

	&__error {
		margin-top: @spacing-100;
	}

	// stylelint-disable-next-line plugin/no-unsupported-browser-features
	&__loading {
		display: flex;
		align-items: center;
		gap: @spacing-75;
		margin-top: @spacing-100;
		color: @color-subtle;
		font-size: @font-size-small;

		.cdx-progress-bar {
			width: 100px;
		}
	}

	&__footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	// stylelint-disable-next-line plugin/no-unsupported-browser-features
	&__footer-actions {
		display: flex;
		gap: @spacing-50;
	}
}

// Override dialog width for better preview
.ext-readerExperiments-shareQuoteDialog .cdx-dialog__body {
	min-width: 320px;
}
</style>
