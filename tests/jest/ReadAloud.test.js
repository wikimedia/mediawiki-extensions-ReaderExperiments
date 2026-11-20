const { mount } = require( '@vue/test-utils' );
const { nextTick } = require( 'vue' );
const { CdxPopover } = require( '@wikimedia/codex' );

const App = require( '../../resources/experiments/readAloud/App.vue' );
const SEEN_KEY = 'mw.readerExperiments.readAloud.coachMarkSeen';

describe( 'Read aloud entry point', () => {
	let wrapper;
	let teleportTarget;
	let frames;
	beforeEach( () => {
		frames = new Map();
		let frameId = 0;
		jest.spyOn( window, 'requestAnimationFrame' ).mockImplementation( ( callback ) => {
			frames.set( ++frameId, callback );
			return frameId;
		} );
		jest.spyOn( window, 'cancelAnimationFrame' ).mockImplementation( ( id ) => frames.delete( id ) );
		const storage = new Map();
		// Core's createMwApp provides the teleport target, which the toolbar renders into.
		teleportTarget = document.createElement( 'div' );
		document.body.appendChild( teleportTarget );
		mw.storage = {
			get: jest.fn( ( key ) => storage.get( key ) || null ),
			set: jest.fn( ( key, value ) => storage.set( key, value ) )
		};
	} );
	afterEach( () => {
		wrapper.unmount();
		teleportTarget.remove();
		jest.restoreAllMocks();
	} );

	async function paint() {
		const callbacks = [ ...frames.values() ];
		frames.clear();
		callbacks.forEach( ( callback ) => callback() );
		await nextTick();
	}

	async function render( settle = true ) {
		wrapper = mount( App, {
			attachTo: document.body,
			global: { provide: { CdxTeleportTarget: teleportTarget } }
		} );
		await nextTick();
		if ( settle ) {
			await paint();
			await paint();
		}
	}

	test( 'waits for the toolbar styles to paint before opening or recording a view', async () => {
		await render( false );
		expect( wrapper.findComponent( CdxPopover ).props( 'open' ) ).toBe( false );
		await paint();
		expect( wrapper.findComponent( CdxPopover ).props( 'open' ) ).toBe( false );
		expect( mw.storage.set ).not.toHaveBeenCalled();
		await paint();
		expect( wrapper.findComponent( CdxPopover ).props( 'open' ) ).toBe( true );
	} );

	test( 'starting before onboarding opens cancels the pending coach mark', async () => {
		await render( false );
		await wrapper.get( 'button' ).trigger( 'click' );
		await paint();
		await paint();
		expect( wrapper.findComponent( CdxPopover ).props( 'open' ) ).toBe( false );
		expect( mw.storage.set ).toHaveBeenCalledWith( SEEN_KEY, '1' );
	} );

	test( 'shows once and persists viewing without a dismissal', async () => {
		await render();
		expect( wrapper.findComponent( CdxPopover ).props( 'open' ) ).toBe( true );
		expect( mw.storage.set ).toHaveBeenCalledWith( SEEN_KEY, '1' );
		wrapper.unmount();
		await render();
		expect( wrapper.findComponent( CdxPopover ).props( 'open' ) ).toBe( false );
	} );

	test( 'dismissal closes the coach mark and prevents it on later visits', async () => {
		await render();
		document.querySelector( '[aria-label="readerexperiments-readaloud-dismiss"]' ).click();
		await nextTick();
		expect( wrapper.findComponent( CdxPopover ).props( 'open' ) ).toBe( false );
		wrapper.unmount();
		await render();
		expect( wrapper.findComponent( CdxPopover ).props( 'open' ) ).toBe( false );
	} );

	test.each( [ 'speaker', 'primary' ] )( '%s starts reading and closes onboarding', async ( entry ) => {
		await render();
		if ( entry === 'speaker' ) {
			await wrapper.get( 'button' ).trigger( 'click' );
		} else {
			document.querySelector( '.cdx-popover__footer__primary-action' ).click();
			await nextTick();
		}
		expect( mw.hook ).toHaveBeenCalledWith( 'ext.readerExperiments.readAloud.start' );
		expect( mw.hook().fire ).toHaveBeenCalledWith( wrapper.get( 'audio' ).element );
		expect( wrapper.findComponent( CdxPopover ).props( 'open' ) ).toBe( false );
	} );

	test( 'disables seeking and shows a spinner while the audio is loading', async () => {
		await render();
		const seekButtons = () => [
			...document.querySelectorAll( '[aria-label^="readerexperiments-readaloud-seek"]' )
		];
		const spinner = () => document.querySelector( '.cdx-progress-indicator' );

		expect( seekButtons() ).toHaveLength( 2 );
		expect( seekButtons().every( ( button ) => button.disabled ) ).toBe( true );
		expect( spinner() ).not.toBeNull();

		await wrapper.get( 'audio' ).trigger( 'canplay' );
		expect( seekButtons().every( ( button ) => !button.disabled ) ).toBe( true );
		expect( spinner() ).toBeNull();

		await wrapper.get( 'audio' ).trigger( 'waiting' );
		expect( seekButtons().every( ( button ) => button.disabled ) ).toBe( true );
		expect( spinner() ).not.toBeNull();

		await wrapper.get( 'audio' ).trigger( 'playing' );
		expect( spinner() ).toBeNull();
	} );
} );
