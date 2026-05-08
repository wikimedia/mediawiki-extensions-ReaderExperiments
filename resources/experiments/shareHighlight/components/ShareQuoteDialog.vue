<template>
	<popover-dialog
		v-model:open="wrappedOpen"
		class="ext-readerExperiments-shareQuoteDialog"
		:title="$i18n( 'readerexperiments-sharehighlight-dialog-title' ).text()"
		@update:open="onOpenChange"
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
			<span>{{ $i18n( 'readerexperiments-sharehighlight-loading' ).text() }}</span>
		</div>

		<!-- Custom footer with Copy Link on left, actions on right -->
		<template #footer>
			<!-- Live region announces button state changes to screen readers -->
			<div
				ref="liveRegionRef"
				aria-live="polite"
				class="ext-readerExperiments-shareQuoteDialog__sr-announcement"
			></div>
			<div class="ext-readerExperiments-shareQuoteDialog__footer">
				<div
					class="ext-readerExperiments-shareQuoteDialog__footer-action-secondary"
				>
					<cdx-button-group
						v-if="canShareFiles"
						:class="{ 'ext-readerExperiments-shareQuoteDialog__button-group--label-visible': hasVisibleLabel }"
						:buttons="buttons"
						@click="onClick"
					></cdx-button-group>
					<cdx-button
						v-else
						:aria-label="copyLinkLabel"
						@click="handleCopyLink"
					>
						<cdx-icon :icon="cdxIconLink"></cdx-icon>
						<span v-if="linkCopiedRef" aria-hidden="true">
							{{ $i18n( 'readerexperiments-sharehighlight-link-copied' ).text() }}
						</span>
					</cdx-button>
				</div>

				<div class="ext-readerExperiments-shareQuoteDialog__footer-action-primary">
					<cdx-button
						weight="primary"
						action="progressive"
						:disabled="isProcessing"
						@click="handlePrimaryAction"
					>
						<cdx-icon v-if="canShareFiles" :icon="cdxIconShare"></cdx-icon>
						{{ primaryActionLabel }}
					</cdx-button>
				</div>
			</div>
		</template>
	</popover-dialog>
</template>

<script>
const { ref, toRef, computed, watch } = require( 'vue' );
const { CdxButton, CdxIcon, CdxMessage, CdxProgressBar, CdxButtonGroup, useModelWrapper } = require( '@wikimedia/codex' );
const { useSummary } = require( 'ext.readerExperiments' );
const icons = require( '../icons.json' );
const PopoverDialog = require( './PopoverDialog.vue' );
const QuoteCard = require( './QuoteCard.vue' );
const useShareQuote = require( '../composables/useShareQuote.js' );
const textFragment = require( '../utils/textFragment.js' );
const { getShareHighlightInstrument } = require( 'ext.readerExperiments/shareHighlight.instrumentation' );
const instrument = getShareHighlightInstrument();

// @vue/component
module.exports = exports = {
	name: 'ShareQuoteDialog',
	components: {
		CdxButton,
		PopoverDialog,
		CdxIcon,
		CdxMessage,
		CdxProgressBar,
		QuoteCard,
		CdxButtonGroup
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

		const summaryTitle = computed( () => needsSummary.value ? props.title : null );
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

		// User selection is only used to generate the share link.
		const userSelection = computed( () => {
			return props.quoteText ? props.quoteText : null;
		} );
		// Text to share becomes the summary extract if there's no user selection.
		const text = computed( () => {
			if ( props.quoteText ) {
				return props.quoteText;
			}
			if ( summary.value && summary.value.extract ) {
				return summary.value.extract;
			}
			return '';
		} );

		const liveRegionRef = ref( null );
		const isDownloadingRef = ref( false );
		const linkCopiedRef = ref( false ); // Copy link state
		const articleTitle = computed( () => props.title.getMainText() );

		// If there's no image, fallback to light background. Average color depends on image.
		const selectedStyleRef = ref();
		watch(
			image,
			() => ( selectedStyleRef.value = image.value ? 'average' : 'light' ),
			{ immediate: true }
		);

		// eslint-disable-next-line camelcase
		const sendEvent = ( action, action_context = undefined ) => {
			const data = {};
			// eslint-disable-next-line camelcase
			if ( action_context !== undefined ) {
				// eslint-disable-next-line camelcase
				data.action_context = action_context;
			}
			if ( props.quoteText ) {
				// eslint-disable-next-line camelcase
				data.action_source = 'selection_share';
			} else {
				// eslint-disable-next-line camelcase
				data.action_source = 'page_share';
			}
			instrument.send( action, data );
		};

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

		const downloadButtonLabel = computed( () => {
			const key = isDownloadingRef.value ?
				'readerexperiments-sharehighlight-downloading' :
				'readerexperiments-sharehighlight-download';
			// eslint-disable-next-line mediawiki/msg-doc
			return mw.msg( key );
		} );

		const buttons = computed( () => [
			{
				value: 'copy',
				icon: icons.cdxIconLink,
				ariaLabel: copyLinkLabel.value,
				label: linkCopiedRef.value ? mw.msg( 'readerexperiments-sharehighlight-link-copied' ) : null
			},
			{
				value: 'download',
				icon: icons.cdxIconDownload,
				ariaLabel: downloadButtonLabel.value,
				disabled: isDownloadingRef.value,
				label: isDownloadingRef.value ? mw.msg( 'readerexperiments-sharehighlight-downloading' ) : null
			}
		] );

		const hasVisibleLabel = computed( () => linkCopiedRef.value || isDownloadingRef.value );

		// Reset options when dialog opens
		watch( () => {
			return props.open;
		}, ( isOpen ) => {
			if ( isOpen ) {
				sendEvent( 'click', 'share_initiated' );
				linkCopiedRef.value = false;
				isDownloadingRef.value = false;
			}
		} );

		// Only tracking share_abandoned through changes triggered
		// in popover-dialog, not props.open/wrappedOpen changes,
		// which would also be triggered when we auto-close the
		// dialog after download/share
		function onOpenChange( isOpen ) {
			if ( !isOpen ) {
				sendEvent( 'share_abandoned' );
			}
		}

		/**
		 * Handle the primary action (Share or Download).
		 */
		function handlePrimaryAction() {
			const cardElement = quoteCardRef.value && quoteCardRef.value.cardRef;
			if ( !cardElement ) {
				return;
			}

			if ( canShareFiles.value ) {
				sendEvent( 'click', 'share' );

				// The lead image isn't passed to the Web Share API
				shareQuote( {
					cardElement: cardElement,
					articleTitle: articleTitle.value,
					text: text.value,
					userSelection: userSelection.value
				} ).then( ( success ) => {
					if ( success ) {
						sendEvent( 'share_completed' );
						wrappedOpen.value = false;
					}
				} );
			} else {
				sendEvent( 'click', 'download_share_card' );
				downloadQuoteImage( cardElement, articleTitle.value )
					.then( ( success ) => {
						if ( success ) {
							wrappedOpen.value = false;
						}
					} );
			}
		}

		/**
		 * Handle the secondary download action (shown alongside Share button).
		 */
		function handleDownload() {
			const cardElement = quoteCardRef.value && quoteCardRef.value.cardRef;
			if ( !cardElement ) {
				return;
			}
			isDownloadingRef.value = true;
			liveRegionRef.value.textContent = mw.msg( 'readerexperiments-sharehighlight-downloading' );
			sendEvent( 'click', 'download_share_card' );
			downloadQuoteImage( cardElement, articleTitle.value )
				.then( ( success ) => {
					isDownloadingRef.value = false;
					liveRegionRef.value.textContent = '';
					if ( success ) {
						wrappedOpen.value = false; // Close dialog
					}
				} );
		}

		/**
		 * Copy the text fragment link to clipboard.
		 */
		function handleCopyLink() {
			// Don't append the text fragment to the URL if there's no user selection
			const url = textFragment.buildShareUrl( articleTitle.value, userSelection.value );
			// eslint-disable-next-line compat/compat
			navigator.clipboard.writeText( url ).then( () => {
				linkCopiedRef.value = true;
				liveRegionRef.value.textContent = mw.msg( 'readerexperiments-sharehighlight-link-copied' );
				// Reset after 2 seconds
				setTimeout( () => {
					linkCopiedRef.value = false;
					liveRegionRef.value.textContent = '';
				}, 2000 );
				sendEvent( 'click', 'copy_share_link' );
			} ).catch( ( e ) => {
				// eslint-disable-next-line no-console
				console.error( 'Failed to copy link:', e );
			} );
		}

		function onClick( value ) {
			if ( value === 'copy' ) {
				handleCopyLink();
			} else if ( value === 'download' ) {
				handleDownload();
			}
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
			linkCopiedRef,
			copyLinkLabel,
			canShareFiles,
			primaryActionLabel,
			handlePrimaryAction,
			handleCopyLink,
			cdxIconLink: icons.cdxIconLink,
			cdxIconShare: icons.cdxIconShare,
			liveRegionRef,
			buttons,
			onClick,
			onOpenChange,
			hasVisibleLabel
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

	// Visually hide screen reader text. Copied code from Codex's screen-reader-text() mixin
	&__sr-announcement {
		display: block;
		clip: rect( @size-absolute-1, @size-absolute-1, @size-absolute-1, @size-absolute-1 );
		/* stylelint-disable-next-line declaration-no-important */
		position: absolute !important;
		width: @size-absolute-1;
		height: @size-absolute-1;
		// Use negative `@size-absolute-1` token here as they are inherently connected.
		margin: calc( -1 * @size-absolute-1 );
		border: 0;
		padding: 0;
		overflow: hidden;
	}

	&__footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	&__button-group--label-visible .cdx-button {
		// Padding needed when label is visible
		padding-right: @spacing-25;
		padding-left: @spacing-25;
	}

	// Override dialog width for better preview
	&.cdx-dialog {
		min-width: 320px;
	}
}

</style>
