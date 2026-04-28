/**
 * Composable for detecting and managing text selection within a container.
 */

const { ref, onMounted, onUnmounted } = require( 'vue' );
const { CHARS_THRESHOLD } = require( '../utils/textFragment.js' );

/**
 * Manage text selection detection within a specific container element.
 *
 * @param {import('vue').Ref<HTMLElement>} containerRef - Reference to the container element
 * @return {Object} Selection state and helpers
 */
module.exports = function useTextSelection( containerRef ) {
	const minWords = 2;

	const selectedText = ref( '' );
	const hasSelection = ref( false );

	let debounceTimer = null;

	/**
	 * Check if a node is within the container element.
	 *
	 * @param {Node} node - DOM node to check
	 * @return {boolean} True if node is within container
	 */
	function isWithinContainer( node ) {
		if ( !containerRef.value || !node ) {
			return false;
		}
		return containerRef.value.contains( node );
	}

	/**
	 * Handle selection change events.
	 */
	function handleSelectionChange() {
		// Clear any pending debounce
		if ( debounceTimer ) {
			clearTimeout( debounceTimer );
		}

		debounceTimer = setTimeout( () => {
			const selection = window.getSelection();

			// Check if there's a valid selection
			if ( !selection || selection.rangeCount === 0 || selection.isCollapsed ) {
				hasSelection.value = false;
				selectedText.value = '';
				return;
			}

			const range = selection.getRangeAt( 0 );

			// Check if selection is within our container
			if ( !isWithinContainer( range.commonAncestorContainer ) ) {
				hasSelection.value = false;
				selectedText.value = '';
				return;
			}

			let text = selection.toString();
			const tokens = tokenize( text );

			// If Intl.Segmenter is not available or tokenization failed,
			// fall back to a split on ASCII non-word characters.
			// Filter out non-word-like tokens.
			let wordTokens;
			if ( tokens !== null ) {
				wordTokens = tokens.filter( ( t ) => t.isWordLike );
			} else {
				wordTokens = text.split( /\W+/ );
			}

			// Check minimum length.
			// Mid-word selections would still count as a word.
			if ( wordTokens.length < minWords ) {
				hasSelection.value = false;
				selectedText.value = '';
				return;
			}

			// Snap selection to entire words
			// if its start and/or end is in the middle of a word.
			const snappedRange = snapToWords( range, tokens );

			// Clip selection to its starting block element
			// if it's short enough and spans multiple blocks.
			text = clipToStartBlock( snappedRange, containerRef.value );
			if ( text === null ) {
				text = snappedRange.toString().trim();
			}

			// Update state
			selectedText.value = text;
			hasSelection.value = true;
		}, 150 );
	}

	/**
	 * Clear the current selection state.
	 */
	function clearSelection() {
		hasSelection.value = false;
		selectedText.value = '';
		const selection = window.getSelection();
		if ( selection ) {
			selection.removeAllRanges();
		}
	}

	/**
	 * Tokenize a string with Intl.Segmenter.
	 * If Intl.Segmenter is not available or errors, returns null.
	 *
	 * @param {string} text - Text to tokenize
	 * @return {*[]|null} Array of tokens,
	 * or null if Intl.Segmenter is not available or tokenization fails
	 */
	function tokenize( text ) {
		// Intl.Segmenter is available
		if ( typeof Intl === 'object' && typeof Intl.Segmenter === 'function' ) {
			try {
				const segmenter = new Intl.Segmenter(
					undefined,
					{ granularity: 'word' }
				);
				return [ ...segmenter.segment( text ) ];
			} catch ( e ) {
				// Segmentation failed, silently fall back to null below
			}
		}

		return null;
	}

	/**
	 * Find the start of the last word in an array of tokens.
	 *
	 * @param {*[]} tokens - Tokens to search backwards from the end. Must not be null
	 * @return {number} Index of the last word start, or string length if no word is found
	 */
	function findLastWordStart( tokens ) {
		// Walk backwards from the last token
		for ( let i = tokens.length - 1; i >= 0; i-- ) {
			if ( tokens[ i ].isWordLike ) {
				return tokens[ i ].index;
			}
		}

		return tokens.length;
	}

	/**
	 * Find the end of the first word in an array of tokens.
	 *
	 * @param {*[]} tokens - Tokens to search forwards from the start. Must not be null
	 * @return {number} Index of the first word end, or 0 if no word is found
	 */
	function findFirstWordEnd( tokens ) {
		// Walk forwards from the first token
		for ( const token of tokens ) {
			if ( token.isWordLike ) {
				return token.index + token.segment.length;
			}
		}

		return 0;
	}

	/**
	 * Update a selection range's start to include a full word
	 * if that's not already the case.
	 *
	 * @param {Range} originalRange - Original range, left intact
	 * @param {Range} adjustedRange - Range to update
	 * @param {*[]|null} tokens - Array of selection tokens,
	 * or null if Intl.Segmenter is not available
	 */
	function adjustStart( originalRange, adjustedRange, tokens ) {
		const startNode = originalRange.startContainer;

		// Adjust only if we're in a text node
		if ( startNode.nodeType === Node.TEXT_NODE ) {
			const text = startNode.textContent;
			const offset = originalRange.startOffset;

			if ( offset > 0 ) {
				const before = text.slice( 0, offset );
				const beforeTokens = tokenize( before );

				// Adjust only if we're in the middle of a word:
				// the first selected token and the previous one are word-like.
				if (
					tokens !== null &&
					beforeTokens !== null &&
					tokens[ 0 ].isWordLike &&
					beforeTokens[ beforeTokens.length - 1 ].isWordLike
				) {
					const snappedStart = findLastWordStart( beforeTokens );
					adjustedRange.setStart( startNode, snappedStart );
				}
			}
		}
	}

	/**
	 * Update a selection range's end to include a full word
	 * if that's not already the case.
	 *
	 * @param {Range} originalRange - Original range, left intact
	 * @param {Range} adjustedRange - Range to update
	 * @param {*[]|null} tokens - Array of selection tokens,
	 * or null if Intl.Segmenter is not available
	 */
	function adjustEnd( originalRange, adjustedRange, tokens ) {
		const endNode = originalRange.endContainer;

		// Adjust only if we're in a text node
		if ( endNode.nodeType === Node.TEXT_NODE ) {
			const text = endNode.textContent;
			const offset = originalRange.endOffset;

			if ( offset < text.length ) {
				const after = text.slice( offset );
				const afterTokens = tokenize( after );

				// Adjust only if we're in the middle of a word:
				// the last selected token and the following one are word-like.
				if (
					tokens !== null &&
					afterTokens !== null &&
					tokens[ tokens.length - 1 ].isWordLike &&
					afterTokens[ 0 ].isWordLike
				) {
					const snappedEnd = offset + findFirstWordEnd( afterTokens );
					adjustedRange.setEnd( endNode, snappedEnd );
				}
			}
		}
	}

	/**
	 * Snap a selection range to include full words at the start and/or end,
	 * if start and/or end are in the middle of a word.
	 *
	 * Complies with the URL Fragment Text Directives:
	 * https://wicg.github.io/scroll-to-text-fragment/#word-boundaries
	 *
	 * @param {Range} range - Selection range to adjust
	 * @param {*[]} tokens - Array of selection tokens. Must not be null
	 * @return {Range} A new range snapped to word boundaries
	 */
	function snapToWords( range, tokens ) {
		const adjusted = range.cloneRange();

		adjustStart( range, adjusted, tokens );
		adjustEnd( range, adjusted, tokens );

		return adjusted;
	}

	/**
	 * Return the block-level ancestor of a node, searching up to a boundary.
	 * Uses the set of block tags emitted by Parsoid.
	 *
	 * @param {Node} node - DOM node to search
	 * @param {HTMLElement} boundary - Boundary element to stop searching at
	 * @return {Element|null} Block ancestor, or null if not found
	 */
	function getBlockAncestor( node, boundary ) {
		const BLOCK_TAGS = new Set( [
			// Headings
			'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
			// Paragraphs and text blocks
			'P', 'BLOCKQUOTE', 'PRE',
			// Lists
			'UL', 'OL', 'LI', 'DL', 'DT', 'DD',
			// Tables
			'TABLE', 'CAPTION', 'TR', 'TH', 'TD',
			// Figures
			'FIGURE', 'FIGCAPTION',
			// Structure
			'DIV', 'SECTION'
		] );

		let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
		while ( element && element !== boundary ) {
			if ( BLOCK_TAGS.has( element.tagName ) ) {
				return element;
			}
			element = element.parentElement;
		}

		return null;
	}

	/**
	 * Clip a selection that spans multiple block-level elements
	 * to the starting block only, or return null if there's no need.
	 * If a selection is long enough, text highlighting is likely to work,
	 * since there's a high chance for substrings in start,end format
	 * to live in standalone blocks.
	 *
	 * @param {Range} range - Selection range to clip
	 * @param {HTMLElement} container - Range container element
	 * @return {string|null} Starting block text, or null if no clipping is necessary
	 */
	function clipToStartBlock( range, container ) {
		// Selection is long enough: clipping shouldn't be necessary
		if ( range.toString().trim().length > CHARS_THRESHOLD ) {
			return null;
		}

		const startBlock = getBlockAncestor( range.startContainer, container );
		const endBlock = getBlockAncestor( range.endContainer, container );

		// Selection is within a single block: don't clip
		if ( !startBlock || !endBlock || startBlock === endBlock ) {
			return null;
		}

		// Clip the range to the end of startBlock and return its text
		const clipped = document.createRange();
		clipped.setStart( range.startContainer, range.startOffset );
		clipped.setEnd( startBlock, startBlock.childNodes.length );

		return clipped.toString().trim();
	}

	onMounted( () => {
		document.addEventListener( 'selectionchange', handleSelectionChange );
	} );

	onUnmounted( () => {
		document.removeEventListener( 'selectionchange', handleSelectionChange );
		if ( debounceTimer ) {
			clearTimeout( debounceTimer );
		}
	} );

	return {
		selectedText: selectedText,
		hasSelection: hasSelection,
		clearSelection: clearSelection
	};
};
