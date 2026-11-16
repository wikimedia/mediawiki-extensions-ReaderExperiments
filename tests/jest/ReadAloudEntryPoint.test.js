const Vue = require( 'vue' );

jest.mock( '../../resources/experiments/readAloud/App.vue', () => ( {} ) );

describe( 'Read aloud toolbar integration', () => {
	beforeEach( () => {
		Vue.createMwApp = jest.fn( () => ( { mount: jest.fn() } ) );
	} );

	afterEach( () => {
		document.body.innerHTML = '';
		delete Vue.createMwApp;
	} );

	function init() {
		jest.isolateModules( () => {
			jest.doMock( 'vue', () => Vue );
			require( '../../resources/experiments/readAloud/init.js' );
		} );
	}

	test( 'inserts before watch and mounts only once', () => {
		document.body.innerHTML = '<ul class="page-actions-menu__list">' +
			'<li id="page-actions-watch"></li></ul>';
		init();
		init();
		expect( document.querySelector( 'ul' ).firstElementChild.id )
			.toBe( 'ext-readerExperiments-readAloud' );
		expect( Vue.createMwApp ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'does not mount without the Minerva toolbar', () => {
		init();
		expect( Vue.createMwApp ).not.toHaveBeenCalled();
	} );

	test( 'works when the watch action is absent', () => {
		document.body.innerHTML = '<ul class="page-actions-menu__list"></ul>';
		init();
		expect( Vue.createMwApp ).toHaveBeenCalledTimes( 1 );
	} );
} );
