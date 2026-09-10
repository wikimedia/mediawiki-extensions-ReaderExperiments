/* eslint-disable camelcase */
const sessionTracker = require( '../../resources/experiments/minervaCompactLead/sessionTracker.js' );

describe( 'Compact Lead session tick tracking', () => {
	let sender, cleanup, data;
	beforeEach( () => {
		jest.useFakeTimers();
		jest.setSystemTime( 1000000 );
		data = new Map();
		mw.storage = { session: {
			get: jest.fn( ( key ) => data.get( key ) || null ),
			set: jest.fn( ( key, value ) => {
				data.set( key, value );
				return true;
			} )
		} };
		sender = { send: jest.fn() };
	} );
	afterEach( () => {
		cleanup();
		jest.restoreAllMocks();
		jest.useRealTimers();
	} );
	function elapsed() {
		return Number( sender.send.mock.calls.slice( -1 )[ 0 ][ 1 ].action_context ) * 30;
	}
	it( 'sends tick estimates including background time before the idle cutoff, with a strict >60 threshold', () => {
		cleanup = sessionTracker( 'test' )( sender );
		expect( elapsed() ).toBe( 0 );
		jest.spyOn( document, 'visibilityState', 'get' ).mockReturnValue( 'hidden' );
		document.dispatchEvent( new Event( 'visibilitychange' ) );
		jest.advanceTimersByTime( 60000 );
		expect( elapsed() ).toBe( 60 );
		jest.advanceTimersByTime( 30000 );
		expect( elapsed() ).toBe( 90 );
		expect( sender.send ).toHaveBeenLastCalledWith( 'tick', {
			instrument_name: 'SessionLength', action_context: '3'
		} );
	} );
	it( 'preserves timing across page navigation and reloads', () => {
		cleanup = sessionTracker( 'test' )( sender );
		jest.advanceTimersByTime( 25000 );
		cleanup();
		cleanup = sessionTracker( 'test' )( sender );
		jest.advanceTimersByTime( 60000 );
		expect( elapsed() ).toBe( 60 );
	} );
	it( 'pauses in the back/forward cache and resumes from the same session', () => {
		cleanup = sessionTracker( 'test' )( sender );
		window.dispatchEvent( new Event( 'pagehide' ) );
		jest.advanceTimersByTime( 90000 );
		expect( sender.send ).toHaveBeenCalledTimes( 1 );
		window.dispatchEvent( new Event( 'pageshow' ) );
		expect( elapsed() ).toBe( 30 );
	} );
	it( 'pauses after 100 seconds and resumes the counter without counting the idle gap', () => {
		cleanup = sessionTracker( 'test' )( sender );
		jest.advanceTimersByTime( 100000 );
		expect( jest.getTimerCount() ).toBe( 0 );
		expect( elapsed() ).toBe( 90 );
		jest.advanceTimersByTime( 30 * 60000 );
		window.dispatchEvent( new Event( 'click' ) );
		expect( elapsed() ).toBe( 120 );
	} );
	it( 'resets after more than an hour since the last tick', () => {
		cleanup = sessionTracker( 'test' )( sender );
		jest.advanceTimersByTime( 100000 );
		jest.advanceTimersByTime( 60 * 60000 );
		window.dispatchEvent( new Event( 'click' ) );
		expect( elapsed() ).toBe( 0 );
	} );
	it( 'does not share the counter with a separate tab storage area', () => {
		cleanup = sessionTracker( 'test' )( sender );
		jest.advanceTimersByTime( 60000 );
		cleanup();
		data = new Map();
		cleanup = sessionTracker( 'test' )( sender );
		expect( elapsed() ).toBe( 0 );
	} );
	it( 'reports unavailable storage instead of repeatedly emitting zero ticks', () => {
		mw.storage.session.set.mockReturnValue( false );
		cleanup = sessionTracker( 'test' )( sender );
		window.dispatchEvent( new Event( 'click' ) );
		jest.advanceTimersByTime( 90000 );
		expect( sender.send ).toHaveBeenCalledTimes( 1 );
		expect( sender.send ).toHaveBeenCalledWith( 'feature_not_available', {
			instrument_name: 'SessionLength', action_context: 'sessionStorage'
		} );
	} );
} );
