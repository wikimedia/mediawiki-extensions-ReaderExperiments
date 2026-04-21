<template>
	<div>
		<!-- Share Quote Feature -->
		<share-quote-button
			:visible="hasSelection && !isShareDialogOpen"
			@share-request="openShareDialog"
		></share-quote-button>

		<share-quote-dialog
			v-model:open="isShareDialogOpen"
			:quote-image="leadImageForDialog"
			:quote-text="quoteTextForDialog"
			:article-title="pageTitle"
		></share-quote-dialog>
	</div>
</template>

<script>
const { onMounted, onUnmounted, ref, toRef, watch } = require( 'vue' );
const ShareQuoteButton = require( './components/ShareQuoteButton.vue' );
const ShareQuoteDialog = require( './components/ShareQuoteDialog.vue' );
const useTextSelection = require( './composables/useTextSelection.js' );
const useLeadImage = require( './composables/useLeadImage.js' );
const { imageSelectors } = require( 'ext.readerExperiments' );

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
		 * Used for text selection detection and image detection.
		 */
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
		// Verify that the page has images before calling the PageImages API
		const hasImages = props.contentElement.querySelectorAll( imageSelectors.join( ', ' ) ).length > 0;
		const leadImageForDialog = hasImages ? useLeadImage().leadImage : ref( null );

		// Page title from MediaWiki config
		const pageTitle = mw.config.get( 'wgTitle' );

		/**
		 * Open the share dialog with current selection.
		 * Captures the text immediately since clicking clears browser selection.
		 */
		function openShareDialog() {
			if ( hasSelection.value && selectedText.value ) {
				quoteTextForDialog.value = selectedText.value;
				isShareDialogOpen.value = true;
			}
		}

		// Clear selection when dialog closes
		watch( isShareDialogOpen, ( isOpen ) => {
			if ( !isOpen ) {
				quoteTextForDialog.value = '';
				clearSelection();
			}
		} );

		// T423860 will implement article-level share here. For now, just prove
		// the toolbar-button wiring works end-to-end.
		function handleToolbarClick() {
			// eslint-disable-next-line no-console
			console.log( 'ShareHighlight: toolbar share button clicked' );
		}

		onMounted( () => {
			mw.hook( 'ext.readerExperiments.shareHighlight.toolbarClick' )
				.add( handleToolbarClick );
		} );

		onUnmounted( () => {
			mw.hook( 'ext.readerExperiments.shareHighlight.toolbarClick' )
				.remove( handleToolbarClick );
		} );

		return {
			hasSelection,
			isShareDialogOpen,
			leadImageForDialog,
			quoteTextForDialog,
			pageTitle,
			openShareDialog
		};
	}
};
</script>
