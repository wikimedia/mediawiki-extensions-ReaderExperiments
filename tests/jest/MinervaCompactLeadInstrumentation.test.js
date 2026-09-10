/* eslint-disable camelcase */

describe( 'Minerva Compact Lead instrumentation', () => {
	let module;
	let experiment;
	let cleanup;
	let visibility;

	function setVisibility( value ) {
		visibility = value;
		document.dispatchEvent( new Event( 'visibilitychange' ) );
	}

	function renderControls( legacy = false ) {
		document.body.innerHTML = `
			<div id="mw-content-text"><section data-mw-section-id="0"><p>Lead text</p></section></div>
			<button class="minerva--lead-section__button"><span>Read more</span></button>
			<div class="mw-heading" ${ legacy ? 'aria-expanded="false"' : '' }>
				<h2 id="mf-quick-facts">Quick facts</h2>
				${ legacy ? '' : '<button aria-expanded="false"><span>Toggle</span></button>' }
				<a href="#edit">Edit</a>
			</div>`;
		const heading = document.querySelector( '.mw-heading' );
		heading.addEventListener( 'click', ( event ) => {
			if ( !event.target.closest( 'a' ) ) {
				const toggle = document.querySelector( '[aria-expanded]' );
				toggle.setAttribute( 'aria-expanded', toggle.getAttribute( 'aria-expanded' ) === 'true' ? 'false' : 'true' );
			}
		} );
		const readMore = document.querySelector( '.minerva--lead-section__button' );
		readMore.addEventListener( 'click', () => readMore.remove() );
	}

	beforeEach( () => {
		jest.resetModules();
		jest.useFakeTimers();
		visibility = 'visible';
		jest.spyOn( document, 'visibilityState', 'get' ).mockImplementation( () => visibility );
		mw.config.get.mockReturnValue( undefined );
		experiment = {
			getAssignedGroup: jest.fn().mockReturnValue( 'control' ),
			sendExposure: jest.fn(), send: jest.fn(), use: jest.fn()
		};
		mw.loader = { using: jest.fn().mockResolvedValue() };
		mw.testKitchen = { getExperiment: jest.fn().mockResolvedValue( experiment ) };
		module = require( '../../resources/experiments/minervaCompactLead/instrumentation.js' );
		renderControls();
	} );

	afterEach( () => {
		if ( cleanup ) {
			cleanup();
			cleanup = null;
		}
		jest.restoreAllMocks();
		jest.useRealTimers();
		delete global.$;
	} );

	it.each( [ 'control', 'trunc-lead', 'trunc-lead-infobox' ] )(
		'logs exposure, a page visit, and starts shared session tracking for %s', async ( group ) => {
			cleanup = module.trackPageview( experiment, group );
			await Promise.resolve();
			expect( experiment.sendExposure ).toHaveBeenCalledTimes( 1 );
			expect( experiment.send ).toHaveBeenCalledWith( 'page_visit' );
			expect( experiment.use ).toHaveBeenCalledWith( expect.any( Function ) );
			// Session timing belongs to the mixin, not this instrument.
			expect( jest.getTimerCount() ).toBe( 0 );
			jest.advanceTimersByTime( 120000 );
			expect( experiment.send ).toHaveBeenCalledTimes( 1 );
		}
	);

	it( 'waits for first visibility before exposure or session tracking', async () => {
		setVisibility( 'hidden' );
		cleanup = module.trackPageview( experiment, 'control' );
		await Promise.resolve();
		expect( experiment.sendExposure ).not.toHaveBeenCalled();
		expect( experiment.use ).not.toHaveBeenCalled();
		setVisibility( 'visible' );
		await Promise.resolve();
		expect( experiment.sendExposure ).toHaveBeenCalledTimes( 1 );
		expect( experiment.use ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'does not restart session tracking or repeat exposure on return', async () => {
		cleanup = module.trackPageview( experiment, 'control' );
		setVisibility( 'hidden' );
		window.dispatchEvent( new Event( 'pagehide' ) );
		window.dispatchEvent( new Event( 'pageshow' ) );
		setVisibility( 'visible' );
		await Promise.resolve();
		expect( experiment.send ).toHaveBeenCalledTimes( 1 );
		expect( experiment.sendExposure ).toHaveBeenCalledTimes( 1 );
		expect( experiment.use ).toHaveBeenCalledTimes( 1 );
	} );

	it.each( [
		[ 'control', false, false ], [ 'trunc-lead', true, false ],
		[ 'trunc-lead-infobox', true, true ]
	] )( 'only sends the interaction metrics appropriate to %s', ( group, lead, infobox ) => {
		cleanup = module.trackPageview( experiment, group );
		document.querySelector( '.minerva--lead-section__button span' ).click();
		document.querySelector( '#mf-quick-facts' ).click();
		document.querySelector( '#mf-quick-facts' ).click();
		expect( experiment.send ).toHaveBeenCalledTimes( 1 + Number( lead ) + 2 * Number( infobox ) );
		if ( lead ) {
			expect( experiment.send ).toHaveBeenCalledWith( 'click', {
				action_subtype: 'expand', action_source: 'lead_section',
				element_friendly_name: 'read_more_button'
			} );
		}
		if ( infobox ) {
			for ( const subtype of [ 'expand', 'collapse' ] ) {
				expect( experiment.send ).toHaveBeenCalledWith( 'click', {
					action_subtype: subtype, action_source: 'quick_facts',
					element_friendly_name: 'quick_facts_toggle'
				} );
			}
		}
	} );

	it( 'supports legacy toggles and ignores edit links and automatic expansion', () => {
		renderControls( true );
		cleanup = module.trackPageview( experiment, 'trunc-lead-infobox' );
		document.querySelector( '#mf-quick-facts' ).click();
		document.querySelector( '.mw-heading a' ).click();
		document.querySelector( '[aria-expanded]' ).setAttribute( 'aria-expanded', 'false' );
		expect( experiment.send ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'reuses editAttemptStep after exposure and preserves its context', () => {
		mw.trackSubscribe.mockImplementationOnce( ( topic, callback ) => callback( topic, { action: 'init' } ) );
		cleanup = module.trackPageview( experiment, 'control' );
		const handler = mw.trackSubscribe.mock.calls[ 0 ][ 1 ];
		handler( 'editAttemptStep', { action: 'saveAttempt' } );
		expect( experiment.send ).toHaveBeenCalledTimes( 1 );
		handler( 'editAttemptStep', { action: 'init', action_source: 'editor', action_context: 'existing' } );
		expect( experiment.send ).toHaveBeenLastCalledWith( 'edit_attempt_init', {
			action_source: 'editor', action_context: 'existing'
		} );
	} );

	it( 'uses the asynchronous SDK and initializes only once', async () => {
		mw.config.get.mockReturnValue( { experimentName: 'minerva-compact-lead', group: 'control' } );
		// Leave document-ready callbacks queued; trackPageview is tested above.
		global.$ = jest.fn();
		module.initInstrumentation();
		module.initInstrumentation();
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		expect( mw.loader.using ).toHaveBeenCalledWith( 'ext.testKitchen' );
		expect( mw.testKitchen.getExperiment ).toHaveBeenCalledTimes( 1 );
		expect( mw.testKitchen.getExperiment ).toHaveBeenCalledWith( 'minerva-compact-lead' );
		expect( global.$ ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'does not instrument a different SDK assignment from the rendered group', async () => {
		mw.config.get.mockReturnValue( { experimentName: 'minerva-compact-lead', group: 'trunc-lead' } );
		global.$ = jest.fn();
		module.initInstrumentation();
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		expect( global.$ ).not.toHaveBeenCalled();
	} );
} );
