<template>
	<div>
		<!-- Share Quote Feature -->
		<!-- Capture selectedText immediately; clicking clears browser selection -->
		<share-quote-button
			:visible="hasSelection && !isShareDialogOpen"
			@share-request="() => openShareDialog( selectedText )"
		></share-quote-button>

		<share-quote-dialog
			v-model:open="isShareDialogOpen"
			:title="title"
			:quote-text="quoteTextForDialog"
		></share-quote-dialog>
	</div>
</template>

<script>
const { onMounted, onUnmounted, ref, toRef, watch } = require( 'vue' );
const ShareQuoteButton = require( './components/ShareQuoteButton.vue' );
const ShareQuoteDialog = require( './components/ShareQuoteDialog.vue' );
const useTextSelection = require( './composables/useTextSelection.js' );

// @vue/component
module.exports = exports = {
	name: 'App',
	components: {
		ShareQuoteButton,
		ShareQuoteDialog
	},
	props: {
		/**
		 * Reference to the article content container element.
		 * Used for text selection detection.
		 */
		// eslint-disable-next-line vue/no-unused-properties
		contentElement: {
			type: HTMLElement,
			default: null
		}
	},
	setup: function ( props ) {
		// Create a reactive ref that tracks the provided content element
		const contentRef = toRef( props, 'contentElement' );

		// Text selection handling
		const { selectedText, hasSelection, clearSelection } = useTextSelection( contentRef );

		// Share dialog state
		const isShareDialogOpen = ref( false );
		const quoteTextForDialog = ref( '' );

		const title = mw.Title.newFromText( mw.config.get( 'wgPageName' ) );

		/**
		 * Open the share dialog with provided text.
		 * If none provided, dialog will load summary instead.
		 *
		 * @param {string} [text] Quote text to show in the dialog
		 */
		function openShareDialog( text = '' ) {
			isShareDialogOpen.value = true;
			quoteTextForDialog.value = text;
		}

		// Clear selection when dialog closes
		watch( isShareDialogOpen, ( isOpen ) => {
			if ( !isOpen ) {
				quoteTextForDialog.value = '';
				clearSelection();
			}
		} );

		const openShareDialogWithoutText = () => openShareDialog( '' );
		onMounted( () => {
			mw.hook( 'ext.readerExperiments.shareHighlight.toolbarClick' ).add( openShareDialogWithoutText );
		} );
		onUnmounted( () => {
			mw.hook( 'ext.readerExperiments.shareHighlight.toolbarClick' ).remove( openShareDialogWithoutText );
		} );

		return {
			hasSelection,
			selectedText,
			isShareDialogOpen,
			title,
			quoteTextForDialog,
			openShareDialog
		};
	}
};
</script>
