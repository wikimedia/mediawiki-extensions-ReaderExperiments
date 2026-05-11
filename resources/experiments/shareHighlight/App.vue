<template>
	<div>
		<!-- Share Quote Feature -->
		<!-- Capture selectedText immediately; clicking clears browser selection -->
		<share-quote-button
			:visible="hasSelection && !isShareDialogOpen"
			@share-request="() => openShareDialog( selectedText, fragmentText )"
		></share-quote-button>

		<share-quote-dialog
			v-model:open="isShareDialogOpen"
			:title="title"
			:quote-text="quoteTextForDialog"
			:quote-fragment="quoteFragmentForDialog"
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
		const { selectedText, fragmentText, hasSelection, clearSelection } = useTextSelection( contentRef );

		// Share dialog state
		const isShareDialogOpen = ref( false );
		const quoteTextForDialog = ref( '' );
		const quoteFragmentForDialog = ref( '' );

		const title = mw.Title.newFromText( mw.config.get( 'wgPageName' ) );

		/**
		 * Open the share dialog with provided text.
		 * If none provided, dialog will load summary instead.
		 *
		 * @param {string} [text] Quote text to show in the dialog
		 * @param {string} [fragment] Raw selection text (with footnote markers
		 *   etc. retained) used to generate the share link's text fragment
		 */
		function openShareDialog( text = '', fragment = '' ) {
			isShareDialogOpen.value = true;
			quoteTextForDialog.value = text;
			quoteFragmentForDialog.value = fragment;
		}

		// Clear selection when dialog closes
		watch( isShareDialogOpen, ( isOpen ) => {
			if ( !isOpen ) {
				quoteTextForDialog.value = '';
				quoteFragmentForDialog.value = '';
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
			fragmentText,
			isShareDialogOpen,
			title,
			quoteTextForDialog,
			quoteFragmentForDialog,
			openShareDialog
		};
	}
};
</script>
