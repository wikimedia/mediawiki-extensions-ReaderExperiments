/**
 * Composable for detecting and managing text selection within a container.
 */

const { ref, onMounted, onUnmounted } = require( 'vue' );

/**
 * Manage text selection detection within a specific container element.
 *
 * @param {import('vue').Ref<HTMLElement>} containerRef - Reference to the container element
 * @return {Object} Selection state and helpers
 */
module.exports = function useTextSelection( containerRef ) {
	const minLength = 3;

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
			const text = selection.toString().trim();

			// Check if selection is within our container
			if ( !isWithinContainer( range.commonAncestorContainer ) ) {
				hasSelection.value = false;
				selectedText.value = '';
				return;
			}

			// Check minimum length
			if ( text.length < minLength ) {
				hasSelection.value = false;
				selectedText.value = '';
				return;
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
