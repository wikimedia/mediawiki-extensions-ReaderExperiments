<template>
	<popover-dialog
		v-model:open="wrappedOpen"
		use-close-button
		class="ext-readerExperiments-shareQuoteDialog"
		:title="$i18n( 'readerexperiments-sharehighlight-dialog-title' ).text()"
		@update:open="onOpenChange"
	>
		<!-- Quote Preview -->
		<div v-if="!error" class="ext-readerExperiments-shareQuoteDialog__preview">
			<quote-card
				ref="quoteCardRef"
				:title="title"
				:text="text"
				:image="image"
				:image-author="imageAuthor"
				:image-license="imageLicense"
				:style-variant="selectedStyleRef"
				:show-article-title="!!quoteText"
				:style="{ transform: 'scale(' + scale + ')' }"
				@img-load="onImageLoad"
				@img-error="onImageError"
			></quote-card>
		</div>

		<!-- Error Message -->
		<cdx-message
			v-else
			type="error"
			class="ext-readerExperiments-shareQuoteDialog__error"
		>
			{{ $i18n( 'unknown-error' ).text() }}
		</cdx-message>

		<!-- Custom footer with Copy Link on left, actions on right -->
		<template
			v-if="!error"
			#footer
		>
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
					<!-- Loading State -->
					<div
						v-if="isLoading || isProcessing"
						class="ext-readerExperiments-shareQuoteDialog__loading"
					>
						<cdx-progress-indicator show-label>
							{{ isLoading ? $i18n( 'readerexperiments-sharehighlight-loading' ).text() : '' }}
							{{ isProcessing ? $i18n( 'readerexperiments-sharehighlight-generating' ).text() : '' }}
						</cdx-progress-indicator>
					</div>

					<cdx-button
						v-else
						weight="primary"
						action="progressive"
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
const { CdxButton, CdxIcon, CdxMessage, CdxProgressIndicator, CdxButtonGroup, useModelWrapper } = require( '@wikimedia/codex' );
const { useImageModel, useSummary } = require( 'ext.readerExperiments' );
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
		CdxProgressIndicator,
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
		},
		/**
		 * The raw selection text form to use in fragment links.
		 * This will include things like footnotes that are excluded
		 * from the displayed text but need to be preserved in the
		 * link.
		 */
		quoteFragment: {
			type: String,
			default: ''
		}
	},
	emits: [ 'update:open' ],
	setup: function ( props, { emit } ) {
		// Two-way binding for open state
		const wrappedOpen = useModelWrapper( toRef( props, 'open' ), emit, 'update:open' );

		const quoteCardRef = ref( null );
		const liveRegionRef = ref( null );

		const isDownloadingRef = ref( false );
		const linkCopiedRef = ref( false );

		const hasVisibleLabel = computed( () => linkCopiedRef.value || isDownloadingRef.value );
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

		const error = ref( null );
		function onError( err ) {
			// show warning message
			error.value = err;
			// end up throwing still, so other error handlers (e.g. logging)
			// can pick it up
			throw err;
		}
		watch(
			() => props.title,
			() => ( error.value = null )
		);

		const summaryTitle = computed( () => ( props.open && needsSummary.value ? props.title : null ) );
		const summary = useSummary( summaryTitle, onError );

		// Raw user selection (with footnote markers etc. retained) — used to
		// build the URL fragment so it still matches the rendered DOM text
		// content. Falls back to null when there's no selection, which causes
		// buildShareUrl to omit the text fragment directive entirely.
		const userSelection = computed( () => props.quoteFragment ? props.quoteFragment : null );

		// Text to share becomes the summary extract if there's no user selection.
		const text = computed( () => {
			if ( props.quoteText ) {
				return props.quoteText.trim();
			}

			if ( summary.value && summary.value.extract ) {
				return summary.value.extract.trim();
			}

			return null;
		} );

		const image = computed( () => {
			const getImageSrc = ( thumbnailSrc, originalSrc, originalWidth ) => {
				// Minimum dimension (width and height) required for the original image.
				// Images smaller than this threshold are excluded to avoid poor quality in the
				// share card.
				if ( originalWidth < 264 ) {
					return null;
				}

				const parsedUrl = mw.util.parseImageUrl( thumbnailSrc );
				if ( !parsedUrl || !parsedUrl.resizeUrl ) {
					// If we can't construct a new thumbnail URL, default to the
					// original src instead of throwing on unusual image URL shapes.
					return originalSrc;
				}

				// Thumbnail size to request must be a standard Wikimedia production thumbnail
				// size to ensure the thumbnail is cached and avoid rate limiting.
				// Refer to https://www.mediawiki.org/wiki/Common_thumbnail_sizes
				// The QuoteCard renders at 264px wide which, at a 2× pixel ratio
				// requires at least 528px effective width.
				const width = mw.util.adjustThumbWidthForSteps(
					528,
					originalWidth
				);
				// `width` should not be one of the thumbnail steps, unless the original
				// image width was already to be lower. In that case, we want to use
				// the original src instead, since thumbnail urls at non-step widths
				// no longer work.
				return width === originalWidth ? originalSrc : parsedUrl.resizeUrl( width );
			};

			if ( summary.value === null ) {
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

		const imageName = computed( () => {
			if ( !image.value ) {
				return null;
			}
			const parsedUrl = mw.util.parseImageUrl( image.value );
			if ( !parsedUrl ) {
				return null;
			}
			return parsedUrl.name;
		} );
		const imageModel = useImageModel( imageName, onError );
		const imageAuthor = computed( () => {
			if ( !imageModel.value ) {
				return null;
			}
			if ( !imageModel.value.author ) {
				return '';
			}
			const doc = new DOMParser().parseFromString( imageModel.value.author, 'text/html' );
			return doc.body.textContent.trim();
		} );
		const imageLicense = computed( () => {
			if ( !imageModel.value ) {
				return null;
			}
			if ( !imageModel.value.license ) {
				return '';
			}
			return imageModel.value.license.getShortName();
		} );

		// Most data loads (summary API, license) are handled in code, in
		// this component; but the thumbnail is being loaded by the browser
		// (through a node handled in the child component, which will relay
		// the load event to this component), and we'll listen for it to
		// complete loading.
		// Every time the image changes, we reset & wait for it to complete.
		const imageLoadComplete = ref( false );
		const onImageError = ( src ) => {
			if ( src === image.value ) {
				onError( new Error( `Image load failed for ${ src }` ) );
			}
		};
		const onImageLoad = ( src ) => ( imageLoadComplete.value = src === image.value );
		watch(
			image,
			() => ( imageLoadComplete.value = false )
		);

		// Deduce whether all data has completed loading.
		const isLoading = computed( () => {
			if ( needsSummary.value && summary.value === null ) {
				return true;
			}

			if (
				image.value && (
					!imageLoadComplete.value ||
					imageAuthor.value === null ||
					imageLicense.value === null
				)
			) {
				return true;
			}

			return false;
		} );

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
			error: shareError,
			shareQuote,
			downloadQuoteImage
		} = useShareQuote();

		watch(
			shareError,
			( err ) => ( err && onError( err ) ),
			{ immediate: true }
		);

		const copyLinkLabel = computed( () => {
			const key = linkCopiedRef.value ?
				'readerexperiments-sharehighlight-link-copied' :
				'readerexperiments-sharehighlight-copy-link';

			return mw.msg( key );
		} );

		const primaryActionLabel = computed( () => {
			const key = canShareFiles.value ?
				'readerexperiments-sharehighlight-share' :
				'readerexperiments-sharehighlight-download';

			return mw.msg( key );
		} );

		const downloadButtonLabel = computed( () => {
			const key = isDownloadingRef.value ?
				'readerexperiments-sharehighlight-downloading' :
				'readerexperiments-sharehighlight-download';

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
				disabled: isLoading.value || isDownloadingRef.value,
				label: isDownloadingRef.value ? mw.msg( 'readerexperiments-sharehighlight-downloading' ) : null
			}
		] );

		watch(
			() => props.open,
			( isOpen ) => {
				if ( isOpen ) {
					sendEvent( 'click', 'share_initiated' );
					// Reset when dialog opens
					linkCopiedRef.value = false;
					isDownloadingRef.value = false;
				}
			}
		);

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
					articleTitle: props.title.getMainText(),
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
				downloadQuoteImage( cardElement, props.title.getMainText() )
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
			downloadQuoteImage( cardElement, props.title.getMainText() )
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
			// userSelection is the raw selection (including footnote markers)
			// so the fragment text matches what's in the rendered DOM.
			// It's null when there's no selection, which omits the directive.
			const url = textFragment.buildShareUrl( props.title.getMainText(), userSelection.value );
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

		const scale = computed( () => {
			const cardElement = quoteCardRef.value && quoteCardRef.value.cardRef;
			if ( !cardElement ) {
				return 1;
			}

			// Scale down to whichever axis is more constrained, so the card
			// fits both the dialog's width (capped at ~320px) and its
			// available height (capped via the __preview wrapper on small
			// viewports — see the style block). Never scale up.
			const parent = cardElement.parentElement;
			const widthRatio = parent.clientWidth / cardElement.scrollWidth;
			const heightRatio = parent.clientHeight / cardElement.scrollHeight;
			return Math.min( widthRatio, heightRatio, 1 );
		} );

		return {
			quoteCardRef,
			selectedStyleRef,
			linkCopiedRef,
			liveRegionRef,
			scale,
			isLoading,
			isProcessing,
			image,
			imageAuthor,
			imageLicense,
			text,
			error,
			wrappedOpen,
			copyLinkLabel,
			canShareFiles,
			primaryActionLabel,
			handlePrimaryAction,
			handleCopyLink,
			cdxIconLink: icons.cdxIconLink,
			cdxIconShare: icons.cdxIconShare,
			buttons,
			onClick,
			onOpenChange,
			onImageLoad,
			onImageError,
			hasVisibleLabel
		};
	}
};
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ext-readerExperiments-shareQuoteDialog {
	&__preview {
		// Pin the card's top edge so vertical scaling (see the `scale`
		// computed) shrinks toward the bottom rather than the center.
		> * {
			transform-origin: top center;
		}

		// Cap the preview height on sub-tablet viewports so the dialog
		// (which is bottom-aligned at this breakpoint) cannot push its
		// own header off the top of the screen. The JS `scale` computed
		// reads `clientHeight` here and scales the card to fit.
		// `vh` for legacy Safari (<15.4, e.g. iPhone 5/6, 1st-gen SE on
		// iOS 15.0–15.3); `dvh` where supported so the cap also accounts
		// for the address bar showing/hiding.
		@media ( max-width: @min-width-breakpoint-tablet ) {
			max-height: 70vh;

			@supports ( max-height: 70dvh ) {
				max-height: 70dvh;
			}
		}
	}

	&__error {
		margin-top: @spacing-100;
	}

	&__loading {
		color: @color-subtle;
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
		width: auto;
		// This pretty much only leaves a window between 320px minimum,
		// and 336px max (288px fixed card width plus dialog padding)
		min-width: 320px;
		max-width: 100vw;
	}
}

</style>
