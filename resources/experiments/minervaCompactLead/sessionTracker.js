/* eslint-disable camelcase */

// Adapted from the SessionLengthInstrumentMixin used by Mobile Page Previews
// and Minerva TOC. Keep its tab-scoped tick count, idle cutoff and reset window.
// Deliberate difference: hiding a tab does not pause ticks; the idle cutoff still applies.
const RESET_MS = 60 * 60 * 1000;
const IDLE_MS = 100 * 1000;
const TICK_MS = 30 * 1000;

/**
 * @param {string} storageKey Experiment-specific key, isolated from legacy ticks
 * @return {Function} Test Kitchen use() callback
 */
function sessionTracker( storageKey ) {
	return ( sender ) => {
		let interval;
		let idleTimeout;
		let stopped = false;

		function readState() {
			try {
				const state = JSON.parse( mw.storage.session.get( storageKey ) );
				return state && Number.isFinite( state.lastTick ) &&
					Number.isInteger( state.count ) && state.count >= 0 ? state : null;
			} catch ( e ) {
				return null;
			}
		}

		function pause() {
			clearInterval( interval );
			clearTimeout( idleTimeout );
			interval = undefined;
		}

		function tick() {
			let state = readState();
			const now = Date.now();
			if ( !state || now < state.lastTick || now - state.lastTick > RESET_MS ) {
				state = { lastTick: now, count: 0 };
			} else if ( now - state.lastTick < TICK_MS ) {
				return;
			}
			const count = state.count;
			state = { lastTick: now, count: count + 1 };
			if ( !mw.storage.session.set( storageKey, JSON.stringify( state ) ) ) {
				stopped = true;
				pause();
				sender.send( 'feature_not_available', {
					instrument_name: 'SessionLength', action_context: 'sessionStorage'
				} );
				return;
			}
			sender.send( 'tick', {
				instrument_name: 'SessionLength', action_context: String( count )
			} );
		}

		function activity() {
			if ( stopped ) {
				return;
			}
			if ( interval === undefined ) {
				tick();
				if ( stopped ) {
					return;
				}
				interval = setInterval( tick, TICK_MS );
			}
			clearTimeout( idleTimeout );
			idleTimeout = setTimeout( pause, IDLE_MS );
		}

		// Limit storage writes during scrolling, as in the original tracker.
		let lastActivityWrite = 0;
		const onActivity = () => {
			if ( Date.now() - lastActivityWrite >= 5000 ) {
				lastActivityWrite = Date.now();
				activity();
			}
		};
		for ( const event of [ 'click', 'keyup', 'scroll' ] ) {
			window.addEventListener( event, onActivity, { passive: true } );
		}
		window.addEventListener( 'pagehide', pause );
		window.addEventListener( 'pageshow', activity );
		activity();
		return () => {
			stopped = true;
			pause();
			for ( const event of [ 'click', 'keyup', 'scroll' ] ) {
				window.removeEventListener( event, onActivity );
			}
			window.removeEventListener( 'pagehide', pause );
			window.removeEventListener( 'pageshow', activity );
		};
	};
}

module.exports = sessionTracker;
