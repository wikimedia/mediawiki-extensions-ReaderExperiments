'use strict';

const Vue = require( 'vue' );
const SearchResultsPage = require( './components/SearchResultsPage.vue' );
const data = mw.config.get( 'semanticSearch' );

// PHP arrays will often end up formatted into JS object literals,
// as is the case here. We want them to be proper arrays instead.
data.response.lexical.results = Object.values( data.response.lexical.results );
data.response.semantic.results = Object.values( data.response.semantic.results );

let executeSearch = () => {};

const container = document.getElementById( 'ext-readerExperiments-semanticsearch' );
container.innerHTML = '';
Vue.createMwApp(
	SearchResultsPage,
	{
		request: data.request,
		response: data.response,
		onSearchRegister: ( searchFn ) => {
			executeSearch = searchFn;
		}
	}
).mount( container );

// Matches MediaWiki and Codex @max-width-breakpoint-mobile (639px)
const MAX_WIDTH_BREAKPOINT_MOBILE = 639;
const MOBILE_MEDIA_QUERY = `(max-width: ${ MAX_WIDTH_BREAKPOINT_MOBILE }px)`;
const INACTIVE_TYPEAHEAD_CLASS = 'ext-semanticsearch--typeahead-inactive';
const SEARCH_INPUTS_SELECTOR = '#searchInput, .minerva-header input[name="search"], #searchform input[name="search"], .skin-dialog-search input[name="search"], .cdx-typeahead-search input';
const SEARCH_FORM_CONTAINER_SELECTOR = 'header, .minerva-header, .vector-header, .skin-dialog-search, .cdx-typeahead-search';
const SEARCH_FORM_SELECTOR = '.minerva-search-form, #searchform, .cdx-typeahead-search form, .cdx-typeahead-search__form';

let term = data.request.term || '';
let isDormant = true;
const skin = mw.config.get( 'skin' );
const isMinerva = skin === 'minerva';
const isVector = skin === 'vector' || skin === 'vector-2022';

if ( isMinerva || isVector ) {
	const makeDormant = () => {
		isDormant = true;
		const input = document.querySelector( '.skin-dialog-search input' );
		if ( input && !input.value.trim() ) {
			term = '';
		}
		document.body.classList.add( INACTIVE_TYPEAHEAD_CLASS );
		document.body.classList.remove( 'cdx-dialog-open' );
		document.body.style.removeProperty( 'position' );
		document.body.style.removeProperty( 'top' );
		document.body.style.removeProperty( 'overflow' );
		document.body.style.removeProperty( 'width' );
		Array.from( document.querySelectorAll( '[inert]' ) ).forEach( ( el ) => {
			el.removeAttribute( 'inert' );
		} );
		Array.from( document.querySelectorAll( '[aria-hidden="true"]' ) ).forEach( ( el ) => {
			el.removeAttribute( 'aria-hidden' );
		} );
	};

	const prefillSearchInput = () => {
		Array.from( document.querySelectorAll( SEARCH_INPUTS_SELECTOR ) ).forEach( ( input ) => {
			if ( input.value !== term ) {
				input.value = term;
				input.dispatchEvent( new Event( 'input' ) );
			}
		} );
	};

	prefillSearchInput();

	window.addEventListener( 'popstate', () => {
		// Defer until history traversal finishes restoring form values. Read the
		// URL at that point so rapid navigation always uses the latest term.
		setTimeout( () => {
			term = new URLSearchParams( window.location.search ).get( 'search' ) || '';
			prefillSearchInput();
		}, 0 );
	} );

	if ( isMinerva ) {
		const mobileQuery = window.matchMedia ? window.matchMedia( MOBILE_MEDIA_QUERY ) : null;
		let minervaSearchInitialized = false;

		const setupNarrowMinerva = () => {
			if ( !mobileQuery || !mobileQuery.matches || minervaSearchInitialized ) {
				return;
			}
			minervaSearchInitialized = true;
			document.body.classList.add( INACTIVE_TYPEAHEAD_CLASS );

			mw.loader.using( 'skins.minerva.search' ).then( () => {
				const { init } = require( 'skins.minerva.search' );
				if ( init ) {
					init();
				}
				prefillSearchInput();
				setTimeout( makeDormant, 0 );
				setTimeout( makeDormant, 100 );
			} );
		};

		setupNarrowMinerva();
		if ( mobileQuery && mobileQuery.addEventListener ) {
			mobileQuery.addEventListener( 'change', ( e ) => {
				if ( e.matches ) {
					setupNarrowMinerva();
				}
			} );
		}

		const searchIcon = document.getElementById( 'searchIcon' );
		if ( searchIcon ) {
			searchIcon.addEventListener( 'click', () => {
				document.body.classList.remove( INACTIVE_TYPEAHEAD_CLASS );
				prefillSearchInput();
			} );
		}

		window.addEventListener( 'hashchange', () => {
			if ( window.location.hash.match( /\/search/ ) ) {
				document.body.classList.remove( INACTIVE_TYPEAHEAD_CLASS );
				prefillSearchInput();
			} else {
				makeDormant();
			}
		} );

		document.addEventListener( 'focusin', ( e ) => {
			if ( e.target && e.target.closest && e.target.closest( '.skin-dialog-search, .minerva-header .search-box' ) ) {
				document.body.classList.remove( INACTIVE_TYPEAHEAD_CLASS );
				if ( isDormant ) {
					isDormant = false;
					prefillSearchInput();
				}
			}
		} );

		document.addEventListener( 'click', ( e ) => {
			if ( e.target && e.target.closest && e.target.closest( '.skin-dialog-search .cdx-dialog__header > div > .cdx-button' ) ) {
				makeDormant();
				const input = document.querySelector( '.skin-dialog-search input' );
				if ( input ) {
					input.blur();
				}
			}
		}, true );

		document.addEventListener( 'pointerdown', ( e ) => {
			if ( e.target && e.target.closest && e.target.closest( '.cdx-text-input__clear-icon' ) ) {
				term = '';
			}
		}, true );
	}

	const handleSearchSubmission = ( submittedTerm ) => {
		term = submittedTerm;
		if ( isMinerva ) {
			makeDormant();
			const activeInput = document.activeElement;
			if ( activeInput && activeInput.blur ) {
				activeInput.blur();
			}
		}
		prefillSearchInput();
		executeSearch( submittedTerm );
	};

	document.addEventListener( 'submit', ( e ) => {
		const form = e.target;
		if (
			form &&
			form.closest &&
			( form.closest( SEARCH_FORM_CONTAINER_SELECTOR ) ||
				form.matches( SEARCH_FORM_SELECTOR ) )
		) {
			e.preventDefault();
			e.stopPropagation();
			const input = form.querySelector( 'input[name="search"], input[type="search"], .cdx-text-input__input' );
			const submittedTerm = input ? input.value.trim() : '';
			handleSearchSubmission( submittedTerm );
		}
	}, true );

	document.addEventListener( 'keydown', ( e ) => {
		if ( e.key === 'Enter' ) {
			const activeEl = document.activeElement;
			if ( activeEl && activeEl.matches && activeEl.matches( 'input[name="search"], input[type="search"], .cdx-text-input__input' ) ) {
				const form = activeEl.closest( 'form' );
				if (
					form &&
					( form.closest( SEARCH_FORM_CONTAINER_SELECTOR ) ||
						form.matches( SEARCH_FORM_SELECTOR ) )
				) {
					const highlighted = document.querySelector( '.cdx-menu-item--highlighted:not(.cdx-typeahead-search__search-footer)' );
					if ( !highlighted ) {
						e.preventDefault();
						e.stopPropagation();
						handleSearchSubmission( activeEl.value.trim() );
					}
				}
			}
		}
	}, true );

	document.addEventListener( 'click', ( e ) => {
		const footer = e.target && e.target.closest && e.target.closest( '.cdx-typeahead-search__search-footer' );
		if ( footer ) {
			e.preventDefault();
			e.stopPropagation();
			const searchInput = document.querySelector( '#searchInput, .cdx-typeahead-search input' );
			const submittedTerm = searchInput ? searchInput.value.trim() : '';
			handleSearchSubmission( submittedTerm );
		}
	}, true );
}
