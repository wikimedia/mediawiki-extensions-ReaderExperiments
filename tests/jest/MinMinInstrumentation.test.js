describe( 'minimalMinervaToolbar instrumentation', () => {
	let module;

	function flushAsync() {
		return new Promise( ( resolve ) => {
			setTimeout( resolve, 0 );
		} );
	}

	function loadModule() {
		jest.isolateModules( () => {
			module = require( '../../resources/experiments/minimalMinervaToolbar/instrumentation.js' );
		} );
	}

	beforeEach( () => {
		document.body.innerHTML = '';
		mw.config.get.mockImplementation( ( key ) => {
			if ( key === 'wgReaderExperimentsMinimalMinervaToolbar' ) {
				return {
					experimentName: 'minimal-minerva-toolbar',
					group: 'control'
				};
			}

			return undefined;
		} );
		mw.loader = {
			using: jest.fn().mockResolvedValue()
		};
		mw.testKitchen = {
			getExperiment: jest.fn().mockResolvedValue( {
				sendExposure: jest.fn(),
				send: jest.fn()
			} )
		};
	} );

	afterEach( () => {
		jest.resetModules();
	} );

	it( 'maps control language and comments surfaces', () => {
		document.body.innerHTML = `
			<nav class="page-actions-menu">
				<ul id="p-views">
					<li id="page-actions-language-selector">
						<a class="language-selector cdx-button"><span>Language</span></a>
					</li>
				</ul>
			</nav>
			<ul class="minerva__tab-container">
				<li class="minerva__tab selected"><a href="/wiki/Foo">Article</a></li>
				<li class="minerva__tab"><a href="/wiki/Talk:Foo">20 comments</a></li>
			</ul>
		`;
		loadModule();

		const language = document.querySelector( '#page-actions-language-selector a' );
		const comments = document.querySelector( '.minerva__tab:not(.selected) a' );

		expect( module.getActionData( language, false ) ).toEqual( {
			subtype: 'language',
			source: 'toolbar'
		} );
		expect( module.getActionData( comments, false ) ).toEqual( {
			subtype: 'comments',
			source: 'page_tab'
		} );
	} );

	it( 'maps treatment page tags', () => {
		mw.config.get.mockImplementation( ( key ) => {
			if ( key === 'wgReaderExperimentsMinimalMinervaToolbar' ) {
				return {
					experimentName: 'minimal-minerva-toolbar',
					group: 'treatment'
				};
			}

			return undefined;
		} );
		document.body.classList.add( 'minerva--minimal' );
		document.body.innerHTML += `
			<nav class="minerva__page-tags-container">
				<a href="#p-lang">86 languages</a>
				<a href="/wiki/Talk:Foo">20 comments</a>
			</nav>
		`;
		loadModule();

		const language = document.querySelector( '.minerva__page-tags-container a[href="#p-lang"]' );
		const comments = document.querySelector( '.minerva__page-tags-container a[href="/wiki/Talk:Foo"]' );

		expect( module.isTreatmentActive() ).toBe( true );
		expect( module.getActionData( language, true ) ).toEqual( {
			subtype: 'language',
			source: 'minmin_toolbar'
		} );
		expect( module.getActionData( comments, true ) ).toEqual( {
			subtype: 'comments',
			source: 'minmin_toolbar'
		} );
	} );

	it( 'maps visible edit buttons', () => {
		document.body.innerHTML = `
			<nav class="page-actions-menu">
				<ul id="p-views">
					<li id="page-actions-watch">
						<a id="ca-watch" class="cdx-button"><span>Watch</span></a>
					</li>
					<li id="page-actions-edit">
						<a id="ca-edit" class="cdx-button"><span>Edit</span></a>
					</li>
				</ul>
			</nav>
		`;
		loadModule();

		const watch = document.getElementById( 'ca-watch' );
		const edit = document.getElementById( 'ca-edit' );

		expect( module.getActionData( watch, false ) ).toEqual( {
			subtype: 'watch',
			source: 'toolbar'
		} );
		expect( module.getActionData( edit, false ) ).toEqual( {
			subtype: 'edit',
			source: 'toolbar'
		} );
	} );

	it( 'initializes experiment tracking when loaded', async () => {
		const experiment = {
			sendExposure: jest.fn(),
			send: jest.fn()
		};
		mw.testKitchen.getExperiment.mockResolvedValue( experiment );
		document.body.innerHTML = `
			<nav class="page-actions-menu">
				<ul id="p-views">
					<li id="page-actions-edit">
						<a id="ca-edit" class="cdx-button"><span>Edit</span></a>
					</li>
				</ul>
			</nav>
		`;

		jest.resetModules();
		loadModule();

		document.getElementById( 'ca-edit' ).click();
		await flushAsync();
		await flushAsync();

		const actionSourceKey = 'action_source';
		const actionSubtypeKey = 'action_subtype';
		const expectedClickData = {};
		expectedClickData[ actionSourceKey ] = 'toolbar';
		expectedClickData[ actionSubtypeKey ] = 'edit';

		expect( mw.loader.using ).toHaveBeenCalledWith( 'ext.testKitchen' );
		expect( mw.testKitchen.getExperiment ).toHaveBeenCalledWith( 'minimal-minerva-toolbar' );
		expect( experiment.sendExposure ).toHaveBeenCalledTimes( 1 );
		expect( experiment.send ).toHaveBeenNthCalledWith( 1, 'page_visit' );
		expect( experiment.send ).toHaveBeenNthCalledWith( 2, 'click', expectedClickData );
	} );
} );
