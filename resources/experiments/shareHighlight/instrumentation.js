// Instrumentation for ShareHighlight experiment; in a separate module
// so it can be separately activated for recording a baseline of
// text selection events with the main experiment off.
//
// Since you can't conveniently export from a ResourceLoader module,
// the factory is exposed as `mw.ReaderExperiments.getShareHighlightInstrument`
// for access by the feature UI. This returns a Promise<ShareHighlightInstrument>
// and exposes a `send` method which may be used for interactive elements.

const EXPERIMENT_NAMES = [ 'share-highlight', 'share-highlight-baseline' ];
const SCHEMA_NAME = '/analytics/product_metrics/web/base/2.0.0';
const STREAM_NAME = 'product_metrics.web_base';
const INSTRUMENT_NAME = 'ShareHighlightInstrument';
const DEBOUNCE_TIMEOUT_MS = 1000;

class ShareHighlightInstrument {
	constructor( config ) {
		this.instrument = config.instrumentName;
		this.experiments = config.experiments;
		this.selectionChangeListener = null;
		this.lastSelectionSubtype = null;
		this.debounceTimeout = null;

		// @fixme get the page size approximation in our ResourceLoader module
	}

	start() {
		this.checkForHighlightFragment();

		if ( !this.selectionChangeListener ) {
			this.selectionChangeListener = () => this.onSelectionChange();
			document.addEventListener( 'selectionchange', this.selectionChangeListener );
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
				action_subtype: 'confirmed'
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
				action_subtype: 'heuristic'
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
					action_subtype: this.lastSelectionSubtype
				} );
				this.lastSelectionSubtype = null;
			}
			this.debounceTimeout = null;
		}, DEBOUNCE_TIMEOUT_MS );
	}

	stop() {
		if ( this.selectionChangeListener ) {
			document.removeEventListener( 'selectionchange', this.selectionChangeListener );
			this.selectionChangeListener = null;
		}
	}

	send( action, interactionData = {} ) {
		interactionData = Object.assign( {
			// eslint-disable-next-line camelcase
			action_context: this.pageSize(),

			// eslint-disable-next-line camelcase
			instrument_name: INSTRUMENT_NAME
		}, interactionData );
		for ( const experiment of this.experiments ) {
			if ( experiment.getAssignedGroup() ) {
				// Record data if we're in any group.
				experiment.send( action, interactionData );
			}
		}
	}

	pageSize() {
		return mw.config.get( 'wgReaderExperimentsPageSize' ) || '0';
	}
}

if ( typeof mw.ReaderExperiments !== 'object' ) {
	mw.ReaderExperiments = {};
}

const analyticsConfig = {
	instrumentName: INSTRUMENT_NAME,
	experiments: []
};

for ( const name of EXPERIMENT_NAMES ) {
	const experiment = mw.testKitchen.compat.getExperiment( name );
	experiment.setSchema( SCHEMA_NAME );
	experiment.setStream( STREAM_NAME );
	analyticsConfig.experiments.push( experiment );
}

const instrument = new ShareHighlightInstrument( analyticsConfig );
instrument.start();

mw.ReaderExperiments.getShareHighlightInstrument = () => instrument;
