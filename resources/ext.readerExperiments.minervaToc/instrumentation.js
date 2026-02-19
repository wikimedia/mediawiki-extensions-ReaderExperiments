'use strict';

function init() {

	const EXPERIMENT_NAME = 'mobile-toc-abc';
	const SCHEMA_NAME = '/analytics/product_metrics/web/base/2.0.0';
	const STREAM_NAME = 'mediawiki.product_metrics.reader_experiments';
	const INSTRUMENT_NAME = 'MinervaTocInstrument';

	const TOC_OPEN_HOOK = 'readerExperiments.toc.open';
	const TOC_ICON_CLICK_HOOK = 'readerExperiments.toc.iconClick';
	const TOC_CONTENTS_SELECTOR = '.readerExperiments-minerva-toc__toc__contents';
	const TOC_CONTAINER_SELECTOR = '.readerExperiments-minerva-toc__toc';
	const DEBUG_PARAM = 'tocInstrumentationDebug';

	let experiment = null;
	const pendingEvents = [];
	let sessionLengthStarted = false;
	const debugEnabled = new URLSearchParams( window.location.search ).has( DEBUG_PARAM );

	function logDebug( message, data = null ) {
		if ( !debugEnabled ) {
			return;
		}
		if ( data !== null ) {
			// eslint-disable-next-line no-console
			console.log( `[MinervaToc][QA] ${ message }`, data );
		} else {
			// eslint-disable-next-line no-console
			console.log( `[MinervaToc][QA] ${ message }` );
		}
	}

	function isTocOpen() {
		return !!document.querySelector( TOC_CONTAINER_SELECTOR );
	}

	function submitInteraction( action, interactionData = {} ) {
		const payload = Object.assign( {
			// eslint-disable-next-line camelcase
			instrument_name: INSTRUMENT_NAME
		}, interactionData );

		if ( experiment ) {
			experiment.send( action, payload );
			logDebug( 'sent', { action, payload } );
			return;
		}

		pendingEvents.push( { action, payload } );
		logDebug( 'queued', { action, payload } );
	}

	function flushPendingEvents() {
		if ( !experiment || pendingEvents.length === 0 ) {
			return;
		}

		pendingEvents.forEach( ( event ) => {
			experiment.send( event.action, event.payload );
			logDebug( 'flushed', { action: event.action, payload: event.payload } );
		} );
		pendingEvents.length = 0;
	}

	function startSessionLength() {
		if ( sessionLengthStarted ) {
			return;
		}

		if ( !mw.wikimediaEvents || !mw.wikimediaEvents.SessionLengthInstrumentMixin ) {
			logDebug( 'Session length mixin unavailable; skipping ticks.' );
			return;
		}

		const sessionLengthInstrument = {
			submitInteraction: ( action, data ) => {
				submitInteraction( action, data );
			}
		};

		mw.wikimediaEvents.SessionLengthInstrumentMixin.start( sessionLengthInstrument );
		sessionLengthStarted = true;
		logDebug( 'Session length started.' );
	}

	mw.hook( TOC_OPEN_HOOK ).add( () => {
		if ( isTocOpen() ) {
			submitInteraction( 'init_toc' );
			return;
		}

		requestAnimationFrame( () => {
			if ( isTocOpen() ) {
				submitInteraction( 'init_toc' );
			}
		} );
	} );

	mw.hook( TOC_ICON_CLICK_HOOK ).add( () => {
		if ( !isTocOpen() ) {
			submitInteraction( 'click', {
				// eslint-disable-next-line camelcase
				action_context: 'toc_icon'
			} );
		}
	} );

	document.addEventListener( 'click', ( event ) => {
		const target = event.target;
		const element = target && target.closest ? target : target && target.parentElement;
		if ( !element ) {
			return;
		}

		const link = element.closest( 'a' );
		if ( !link ) {
			return;
		}
		if ( link.closest( TOC_CONTENTS_SELECTOR ) ) {
			submitInteraction( 'click', {
				// eslint-disable-next-line camelcase
				action_context: 'topic_link',
				// eslint-disable-next-line camelcase
				action_source: 'toc'
			} );
		}
	}, true );

	mw.loader.using( 'ext.testKitchen' )
		.then( () => {
			experiment = mw.testKitchen.getExperiment( EXPERIMENT_NAME );
			experiment.setSchema( SCHEMA_NAME );
			experiment.setStream( STREAM_NAME );

			submitInteraction( 'page-visited' );
			flushPendingEvents();

			mw.loader.using( 'ext.wikimediaEvents' )
				.then( () => {
					startSessionLength();
				}, ( error ) => {
					logDebug( `Failed to load session length mixin. ${ error }` );
				} );
		}, ( error ) => {
			// ext.testKitchen isn't available, instrumentation can't work.
			// eslint-disable-next-line no-console
			console.error( `[MinervaToc] Failed to setup instrumentation. ${ error }` );
		} );
}

if ( !window.minervaTocInstrumentationInit ) {
	window.minervaTocInstrumentationInit = true;
	init();
}
