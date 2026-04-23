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
				:image="quoteImage"
				:text="quoteText"
				:style-variant="selectedStyleRef"
			></quote-card>
		</div>

		<!-- Customization Options -->
		<div class="ext-readerExperiments-shareQuoteDialog__options">
			<!-- Background Style -->
			<fieldset class="ext-readerExperiments-shareQuoteDialog__fieldset">
				<legend>
					{{ $i18n( 'readerexperiments-sharehighlight-background-legend' ).text() }}
				</legend>
				<div class="ext-readerExperiments-shareQuoteDialog__radio-group">
					<cdx-radio
						v-for="style in styleOptions"
						:key="style.value"
						v-model="selectedStyleRef"
						:input-value="style.value"
						name="style"
						inline
					>
						{{ style.label }}
					</cdx-radio>
				</div>
			</fieldset>
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
const { CdxButton, CdxIcon, CdxRadio, CdxMessage, CdxProgressBar, useModelWrapper } = require( '@wikimedia/codex' );
const icons = require( '../icons.json' );
const PopoverDialog = require( './PopoverDialog.vue' );
const QuoteCard = require( './QuoteCard.vue' );
const useShareQuote = require( '../composables/useShareQuote.js' );
const textFragment = require( '../utils/textFragment.js' );

/**
 * @typedef {import('../../../common/types').ImageData} ImageData
 */

// @vue/component
module.exports = exports = {
	name: 'ShareQuoteDialog',
	components: {
		CdxButton,
		PopoverDialog,
		CdxIcon,
		CdxRadio,
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
		 * The article lead image to share.
		 */
		quoteImage: {
			type: /** @type {import('vue').PropType<ImageData>} */ ( [ Object, null ] ),
			default: null
		},
		/**
		 * The quote text to share.
		 */
		quoteText: {
			type: String,
			default: ''
		},
		/**
		 * The article title for attribution.
		 */
		articleTitle: {
			type: String,
			default: ''
		}
	},
	emits: [ 'update:open' ],
	setup: function ( props, { emit } ) {
		const quoteCardRef = ref( null );
		const quoteImageRef = toRef( props, 'quoteImage' );
		const linkCopiedRef = ref( false ); // Copy link state
		const selectedStyleRef = quoteImageRef.value ? ref( 'average' ) : ref( 'light' );

		const allStyles = [
			{
				// Average image color background
				value: 'average',
				label: mw.msg( 'readerexperiments-sharehighlight-background-average' )
			},
			{
				value: 'light',
				label: mw.msg( 'readerexperiments-sharehighlight-background-light' )
			},
			{
				value: 'dark',
				label: mw.msg( 'readerexperiments-sharehighlight-background-dark' )
			}
		];
		// If there's no image,
		// there can't be an average image color background.
		const styleOptions = computed( () => {
			return quoteImageRef.value ? allStyles : allStyles.slice( 1 );
		} );

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
				selectedStyleRef.value = quoteImageRef.value ? 'average' : 'light';
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
					articleTitle: props.articleTitle,
					quoteText: props.quoteText
				} ).then( ( success ) => {
					if ( success ) {
						wrappedOpen.value = false;
					}
				} );
			} else {
				downloadQuoteImage( cardElement, props.articleTitle )
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
			const url = textFragment.buildShareUrl( props.articleTitle, props.quoteText );
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
			styleOptions,
			isProcessing,
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

	// stylelint-disable-next-line plugin/no-unsupported-browser-features
	&__options {
		display: flex;
		flex-direction: column;
		gap: @spacing-75;
	}

	&__fieldset {
		border: 0;
		padding: 0;
		margin: 0;

		legend {
			font-size: @font-size-small;
			font-weight: @font-weight-bold;
			color: @color-subtle;
			margin-bottom: @spacing-50;
		}
	}

	// stylelint-disable-next-line plugin/no-unsupported-browser-features
	&__radio-group {
		display: flex;
		gap: @spacing-100;

		.cdx-radio {
			color: @color-base;
		}
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
