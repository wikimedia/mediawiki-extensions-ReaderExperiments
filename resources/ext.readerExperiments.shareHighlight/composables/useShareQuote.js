/**
 * Composable for sharing quote card images.
 *
 * Orchestrates three browser APIs:
 * - html-to-image (via imageGenerator) to render the QuoteCard DOM element to a PNG blob
 * - Web Share API (navigator.share/canShare) for native sharing on supported platforms
 * - Blob download fallback for desktop browsers without Web Share support
 *
 * The share flow attaches the generated image as a File, along with a text body
 * containing a truncated quote and a text fragment URL linking back to the passage.
 */

const { ref, computed } = require( 'vue' );
const imageGenerator = require( '../utils/imageGenerator.js' );
const textFragment = require( '../utils/textFragment.js' );
const truncateText = require( '../utils/truncateText.js' );

/** Maximum characters for the quote snippet in the share text body. */
const MAX_SHARE_TEXT_LENGTH = 200;

/**
 * Manage quote sharing functionality.
 *
 * @return {Object} Share functionality and state
 */
module.exports = function useShareQuote() {
	const isProcessing = ref( false );
	const error = ref( null );

	/**
	 * Check if Web Share API with file sharing is supported.
	 */
	const canShareFiles = computed( () => {
		if ( typeof navigator === 'undefined' ) {
			return false;
		}
		if ( !navigator.share || !navigator.canShare ) {
			return false;
		}

		// Test if file sharing is supported
		try {
			const testFile = new File( [ '' ], 'test.png', { type: 'image/png' } );
			return navigator.canShare( { files: [ testFile ] } );
		} catch ( e ) {
			return false;
		}
	} );

	/**
	 * Share a quote as an image with a link.
	 *
	 * @param {Object} options - Share options
	 * @param {HTMLElement} options.cardElement - The QuoteCard DOM element
	 * @param {string} options.articleTitle - Article title for attribution
	 * @param {string} options.quoteText - The full selected quote text
	 * @return {Promise<boolean>} True if share was successful
	 */
	const shareQuote = function ( options ) {
		const cardElement = options.cardElement;
		const articleTitle = options.articleTitle;
		const quoteText = options.quoteText;

		isProcessing.value = true;
		error.value = null;

		return imageGenerator.generateImageBlob( cardElement )
			.then( ( imageBlob ) => {
				const timestamp = Date.now();
				const imageFile = imageGenerator.blobToFile(
					imageBlob,
					'wikipedia-quote-' + timestamp + '.png'
				);

				// Build text fragment URL
				const shareUrl = textFragment.buildShareUrl( articleTitle, quoteText );

				// Prepare share data
				const shareTitle = mw.msg(
					'readerexperiments-sharehighlight-share-title',
					articleTitle
				);
				const shareText = mw.msg(
					'readerexperiments-sharehighlight-share-text',
					truncateText( quoteText, MAX_SHARE_TEXT_LENGTH ),
					shareUrl
				);
				const shareData = {
					files: [ imageFile ],
					title: shareTitle,
					text: shareText
				};

				// Verify sharing is possible
				if ( !navigator.canShare( shareData ) ) {
					throw new Error( 'Sharing not supported for this content' );
				}

				// Invoke native share sheet
				return navigator.share( shareData );
			} )
			.then( () => {
				isProcessing.value = false;
				return true;
			} )
			.catch( ( e ) => {
				isProcessing.value = false;
				// User cancelled share is not an error
				if ( e.name === 'AbortError' ) {
					return false;
				}

				error.value = e.message;
				// eslint-disable-next-line no-console
				console.error( 'Share failed:', e );
				return false;
			} );
	};

	/**
	 * Download the quote as an image (fallback for browsers without Web Share).
	 *
	 * @param {HTMLElement} cardElement - The QuoteCard DOM element
	 * @param {string} articleTitle - Article title for filename
	 * @return {Promise<boolean>} True if download was successful
	 */
	const downloadQuoteImage = function ( cardElement, articleTitle ) {
		isProcessing.value = true;
		error.value = null;

		return imageGenerator.generateImageBlob( cardElement )
			.then( ( imageBlob ) => {
				const safeTitle = articleTitle.replace( /[^a-zA-Z0-9]/g, '-' ).toLowerCase();
				const filename = 'wikipedia-quote-' + safeTitle + '.png';

				imageGenerator.downloadBlob( imageBlob, filename );
				isProcessing.value = false;
				return true;
			} )
			.catch( ( e ) => {
				isProcessing.value = false;
				error.value = e.message;
				// eslint-disable-next-line no-console
				console.error( 'Download failed:', e );
				return false;
			} );
	};

	return {
		canShareFiles: canShareFiles,
		isProcessing: isProcessing,
		error: error,
		shareQuote: shareQuote,
		downloadQuoteImage: downloadQuoteImage
	};
};
