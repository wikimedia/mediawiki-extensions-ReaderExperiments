// Instrumentation for ShareHighlight experiment.
//
// Call `getShareHighlightInstrument()` to get the instrument; it will
// be pre-started on load to send an exposure and `page_view` event,
// as well as preparing to handle a navigation to fragment highlight
// or text selection event.
//
// Call `instrument.send( 'action', { ... } )` to send events in response
// to user actions.

const EXPERIMENT_NAME = 'share-highlight';
const DEBOUNCE_TIMEOUT_MS = 1000;
const MINERVA_DOWNLOAD_SELECTOR = '#minerva-download';

// Don't initialize if the browser doesn't support CSS has (T424873).
// https://developer.mozilla.org/en-US/docs/Web/API/CSS/supports_static#examples
if ( !CSS.supports( 'selector(:has(a))' ) ) {
	return;
}

class ShareHighlightInstrument {
	constructor( config ) {
		this.experiment = config.experiment;
		this.selectionChangeListener = null;
		this.downloadClickListener = null;
		this.lastSelectionSubtype = null;
		this.debounceTimeout = null;
	}

	start() {
		this.experiment.sendExposure();
		this.send( 'page_visit' );
		this.checkForHighlightFragment();

		if ( !this.selectionChangeListener ) {
			this.selectionChangeListener = () => this.onSelectionChange();
			document.addEventListener( 'selectionchange', this.selectionChangeListener );
		}

		// Capture "download" clicks only in control group
		const isInTreatmentGroup = this.experiment.getAssignedGroup() === 'treatment';
		if ( !isInTreatmentGroup && !this.downloadClickListener ) {
			this.downloadClickListener = ( event ) => this.onDownloadClick( event );
			document.addEventListener( 'click', this.downloadClickListener );
		}
	}

	checkForHighlightFragment() {
		// Run early in page lifecycle

		// eslint-disable-next-line compat/compat
		const hasFragmentSupport = !!document.fragmentDirective;
		if ( !hasFragmentSupport ) {
			return;
		}

		// Chromium-only: Performance API sometimes retains the full URL
		// including the :~:text= directive. This is an acknowledged browser
		// bug, not a spec feature — could be patched at any time.
		let chromiumFragmentDetected = false;
		try {
			const navEntry = performance.getEntriesByType( 'navigation' )[ 0 ];
			if ( navEntry && navEntry.name.includes( ':~:text=' ) ) {
				chromiumFragmentDetected = true;
			}
		} catch ( e ) {}

		if ( chromiumFragmentDetected ) {
			this.send( 'navigate-to-highlight', {
				// eslint-disable-next-line camelcase
				action_subtype: 'confirmed',
				// eslint-disable-next-line camelcase
				action_context: this.pageSize()
			} );
			return;
		}

		// If we have no way to confirm fragment highlight links, use the heuristic...
		// There can be false positives from early scrollers on slow loads; this may
		// deserve some improvement.
		const scrolledOnLoad = window.scrollY > 0;
		const noHashAnchor = !location.hash;
		const fromSearchEngine = /google\.|bing\.|duckduckgo\.|baidu\.|yandex\.|yahoo\.>/.test( document.referrer );
		if ( scrolledOnLoad && noHashAnchor && fromSearchEngine ) {
			this.send( 'navigate-to-highlight', {
				// eslint-disable-next-line camelcase
				action_subtype: 'heuristic',
				// eslint-disable-next-line camelcase
				action_context: this.pageSize()
			} );
		}
	}

	onSelectionChange() {
		const selection = document.getSelection();
		if ( !selection || selection.rangeCount === 0 ) {
			// No/empty selection
			return;
		}

		let anchor = selection.anchorNode;
		if ( anchor && !( anchor instanceof Element ) ) {
			anchor = anchor.parentElement;
		}
		if ( !( anchor instanceof Element && anchor.closest( '#mw-content-text' ) ) ) {
			// Selection is anchored outside the body content; ignore it.
			return;
		}

		// Save the last selection we saw to work with:
		const range = selection.getRangeAt( 0 );
		const hasImages = !!range.cloneContents().querySelector( 'img' );
		const hasText = !!range.toString();
		if ( hasImages ) {
			if ( hasText ) {
				this.lastSelectionSubtype = 'select_mixed';
			} else {
				this.lastSelectionSubtype = 'select_image';
			}
		} else if ( hasText ) {
			this.lastSelectionSubtype = 'select_text';
		} else {
			// Selection exists but contains nothing to share.
			return;
		}

		if ( this.debounceTimeout ) {
			// We just saw a selection within a couple seconds; cancel its
			// timeout and create a new one, extending our total delay until
			// after the end of a series of selection change events.
			clearTimeout( this.debounceTimeout );
		}

		this.debounceTimeout = setTimeout( () => {
			if ( this.lastSelectionSubtype ) {
				this.send( 'select', {
					// eslint-disable-next-line camelcase
					action_subtype: this.lastSelectionSubtype,
					// eslint-disable-next-line camelcase
					action_context: this.pageSize()
				} );
				this.lastSelectionSubtype = null;
			}
			this.debounceTimeout = null;
		}, DEBOUNCE_TIMEOUT_MS );
	}

	onDownloadClick( event ) {
		if (
			event.target instanceof Element &&
			event.target.closest( MINERVA_DOWNLOAD_SELECTOR )
		) {
			this.send( 'click', {
				// eslint-disable-next-line camelcase
				action_context: 'download'
			} );
		}
	}

	stop() {
		if ( this.selectionChangeListener ) {
			document.removeEventListener( 'selectionchange', this.selectionChangeListener );
			this.selectionChangeListener = null;
		}

		if ( this.downloadClickListener ) {
			document.removeEventListener( 'click', this.downloadClickListener );
			this.downloadClickListener = null;
		}
	}

	send( action, interactionData = {} ) {
		this.experiment.send( action, interactionData );
	}

	pageSize() {
		return mw.config.get( 'wgReaderExperimentsPageSize' ) || '0';
	}
}

const instrument = new ShareHighlightInstrument( {
	experiment: mw.testKitchen.compat.getExperiment( EXPERIMENT_NAME )
} );
instrument.start();

module.exports = {
	getShareHighlightInstrument: () => instrument
};
