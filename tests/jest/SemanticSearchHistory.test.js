'use strict';

jest.mock( 'vue', () => ( {
	...jest.requireActual( 'vue' ),
	createMwApp: jest.fn( () => ( { mount: jest.fn() } ) )
} ) );

describe( 'skin input after history restoration', () => {
	let windowListeners, documentListeners;
	beforeEach( () => {
		jest.resetModules();
		jest.useFakeTimers();
		windowListeners = jest.spyOn( window, 'addEventListener' );
		documentListeners = jest.spyOn( document, 'addEventListener' );
		document.body.innerHTML = '<form id="searchform"><input id="searchInput" name="search"></form><div id="ext-readerExperiments-semanticsearch"></div>';
	} );
	afterEach( () => {
		for ( const [ event, listener, options ] of windowListeners.mock.calls ) {
			window.removeEventListener( event, listener, options );
		}
		for ( const [ event, listener, options ] of documentListeners.mock.calls ) {
			document.removeEventListener( event, listener, options );
		}
		windowListeners.mockRestore();
		documentListeners.mockRestore();
		jest.useRealTimers();
		document.body.innerHTML = '';
		window.history.replaceState( {}, '', '/' );
	} );
	it.each( [ 'vector', 'vector-2022', 'minerva' ] )( 'updates %s after the browser restores the old value', ( skin ) => {
		mw.config.get.mockImplementation( ( key ) => ( {
			skin,
			semanticSearch: {
				request: { term: 'philodendron' },
				response: { lexical: { results: [] }, semantic: { results: [] } }
			}
		} )[ key ] );
		require( '../../resources/experiments/semanticSearch/init.js' );
		const input = document.getElementById( 'searchInput' );
		const onInput = jest.fn();
		input.addEventListener( 'input', onInput );
		window.history.replaceState( {}, '', '/wiki/Special:SemanticSearch?search=cats+%26+dogs' );
		window.dispatchEvent( new PopStateEvent( 'popstate' ) );
		// Simulate form restoration happening after popstate listeners run.
		input.value = 'philodendron';
		jest.runOnlyPendingTimers();
		expect( input.value ).toBe( 'cats & dogs' );
		expect( onInput ).toHaveBeenCalledTimes( 1 );
		window.history.replaceState( {}, '', '/wiki/Special:SemanticSearch' );
		window.dispatchEvent( new PopStateEvent( 'popstate' ) );
		input.value = 'cats & dogs';
		jest.runOnlyPendingTimers();
		expect( input.value ).toBe( '' );
	} );
} );
