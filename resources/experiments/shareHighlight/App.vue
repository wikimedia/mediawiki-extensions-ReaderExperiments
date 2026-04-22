<template>
	<div>
		<!-- Share Quote Feature -->
		<share-quote-button
			:visible="hasSelection && !isShareDialogOpen"
			@share-request="openShareDialog"
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
		 * Open the share dialog with current selection.
		 * Captures the text immediately since clicking clears browser selection.
		 */
		function openShareDialog() {
			isShareDialogOpen.value = true;

			if ( hasSelection.value && selectedText.value ) {
				quoteTextForDialog.value = selectedText.value;
			}
		}

		// Clear selection when dialog closes
		watch( isShareDialogOpen, ( isOpen ) => {
			if ( !isOpen ) {
				quoteTextForDialog.value = '';
				clearSelection();
			}
		} );

		onMounted( () => {
			mw.hook( 'ext.readerExperiments.shareHighlight.toolbarClick' )
				.add( openShareDialog );
		} );

		onUnmounted( () => {
			mw.hook( 'ext.readerExperiments.shareHighlight.toolbarClick' )
				.remove( openShareDialog );
		} );

		return {
			hasSelection,
			isShareDialogOpen,
			title,
			quoteTextForDialog,
			openShareDialog
		};
	}
};
</script>
