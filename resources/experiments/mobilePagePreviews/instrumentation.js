'use strict';

const { isExcludedLink, fromElement } = require( './copiedFromPopups.js' );

// the experiment will only launch on touch devices, to let's make sure
// to also capture only interactions on those
const isTouchDevice = 'ontouchstart' in document.documentElement;
if ( !isTouchDevice ) {
	return;
}

// https://test-kitchen.wikimedia.org/experiment/mobile-page-previews
const EXPERIMENT_NAME = 'mobile-page-previews';

const experiment = mw.testKitchen.getExperiment( EXPERIMENT_NAME );

// Track session length, used to compute session length as the primary metric.
if ( mw.wikimediaEvents && mw.wikimediaEvents.SessionLengthInstrumentMixin ) {
	mw.wikimediaEvents.SessionLengthInstrumentMixin.start( experiment );
}

// Track page visits
experiment.send( 'page_visit' );

// Track link clicks
// This mimics the logic in App.vue for which links to actually handle;
// other links (e.g. external) will not be tracked.
const selector = '#mw-content-text a[href][title]';
document.addEventListener( 'click', ( event ) => {
	if ( !event.target.closest ) {
		return;
	}

	const link = event.target.closest( selector );
	if ( !link || isExcludedLink( link ) ) {
		return;
	}

	const title = fromElement( link, mw.config );
	if ( !title ) {
		return;
	}

	experiment.send(
		'click',
		{
			// eslint-disable-next-line camelcase
			action_subtype: 'short_click_link'
		}
	);
} );

// Track browser "link previews": those long-presses on links that
// trigger a small preview window of the linked page.
// We'll attempt to track these by listening to `pointerdown` events
// on relevant links, until the browser emits a `pointercancel` event
// (which it does when opening the context menu)
// There can be both false positives (e.g. screen orientation change
// shortly after the `pointerdown` would also cause `pointercancel`)
// and false negatives (e.g. Firefox doesn't seem to reliably trigger
// `pointerdown` events when a link for which a preview was shown
// is still active), but it'll have to do...
// A slightly "better" way of tracking this would be to listen to
// the `contextmenu` event, but it is lacking broad enough browser
// support (notably no Safari/iOS)
document.addEventListener( 'pointerdown', ( event ) => {
	if ( !event.target.closest ) {
		return;
	}

	const link = event.target.closest( selector );
	if ( !link || isExcludedLink( link ) ) {
		return;
	}

	const title = fromElement( link, mw.config );
	if ( !title ) {
		return;
	}

	// eslint-disable-next-line prefer-const
	let timeoutId, onPointerCancel;
	const cleanup = () => {
		clearTimeout( timeoutId );
		link.removeEventListener( 'pointercancel', onPointerCancel, { once: true } );
		link.removeEventListener( 'pointermove', cleanup, { once: true } );
		link.removeEventListener( 'pointerup', cleanup, { once: true } );
	};

	// If the browser opens the links preview window context menu,
	// it will cancel the pointer event, so wait for that to happen.
	// Note that this can also happen for other cases (e.g. screen
	// rotation changes), so there will be some false positives
	onPointerCancel = () => {
		cleanup();

		experiment.send(
			'click',
			{
				// eslint-disable-next-line camelcase
				action_subtype: 'long_click_link'
			}
		);
	};
	link.addEventListener( 'pointercancel', onPointerCancel, { once: true } );

	// In order to prevent false positives, make sure to abort
	// when we have other reasons to believe the link preview will
	// not show, like too much time having passed or other pointer
	// events
	timeoutId = setTimeout( cleanup, 2000 );
	link.addEventListener( 'pointermove', cleanup, { once: true } );
	link.addEventListener( 'pointerup', cleanup, { once: true } );
} );

// Track page preview sheet loads
mw.hook( 'readerExperiments.mobilePagePreviews.init' ).add( ( hasThumbnail ) => {
	experiment.send(
		'init',
		{
			/* eslint-disable camelcase */
			action_subtype: 'open',
			action_source: 'preview_sheet',
			action_context: hasThumbnail ? 'thumbnail' : ''
			/* eslint-enable camelcase */
		}
	);
} );

// Track page preview closes
mw.hook( 'readerExperiments.mobilePagePreviews.close' ).add( ( hasThumbnail ) => {
	experiment.send(
		'click',
		{
			/* eslint-disable camelcase */
			action_subtype: 'close',
			action_source: 'preview_sheet',
			action_context: hasThumbnail ? 'thumbnail' : ''
			/* eslint-enable camelcase */
		}
	);
} );

// Track page preview click throughs
mw.hook( 'readerExperiments.mobilePagePreviews.read-more' ).add( ( hasThumbnail ) => {
	experiment.send(
		'click',
		{
			/* eslint-disable camelcase */
			action_subtype: 'read_more',
			action_source: 'preview_sheet',
			action_context: hasThumbnail ? 'thumbnail' : ''
			/* eslint-enable camelcase */
		}
	);
} );
