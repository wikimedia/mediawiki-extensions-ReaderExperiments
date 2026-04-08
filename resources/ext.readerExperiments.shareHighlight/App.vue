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
const { ref, toRef, watch } = require( 'vue' );
const ShareQuoteButton = require( './components/ShareQuoteButton.vue' );
const ShareQuoteDialog = require( './components/ShareQuoteDialog.vue' );
const useTextSelection = require( './composables/useTextSelection.js' );
const { useContentImages } = require( 'ext.readerExperiments.common' );

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
		const leadImageForDialog = ref( null );
		const quoteTextForDialog = ref( '' );

		// Page title from MediaWiki config
		const pageTitle = mw.config.get( 'wgTitle' );

		// Extract the first thumbnail image from the current article's content
		if ( contentRef.value ) {
			const articleImages = useContentImages( props.contentElement );
			if ( articleImages.length > 0 ) {
				leadImageForDialog.value = articleImages[ 0 ];
			}
		}

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
