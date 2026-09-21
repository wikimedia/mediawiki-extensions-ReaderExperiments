// TODO(image-carousel-retest): Delete this test with the experiment modules after the retest.
jest.mock( 'ext.readerExperiments.imageCarouselRetest', () => ( {
	prepareExperience: jest.fn()
} ), { virtual: true } );

const groups = require( '../../resources/experiments/imageCarouselRetest/groups.json' );

describe( 'Image carousel retest entry point', () => {
	let start, helper, experience, initialize, config;
	beforeEach( () => {
		jest.resetModules();
		helper = require( 'ext.readerExperiments.imageCarouselRetest' );
		config = { group: 'vanilla-carousel', imageCount: 3, pageEligible: true };
		mw.config.get.mockImplementation( ( key ) => ( {
			wgReaderExperimentsImageCarouselRetest: config,
			wgMFMode: 'stable', skin: 'minerva', wgNamespaceNumber: 0
		} )[ key ] );
		mw.user.isAnon.mockReturnValue( true );
		experience = {
			eligible: true,
			assignment: Object.assign( { group: config.group }, groups[ config.group ] ),
			experienceReady: jest.fn().mockResolvedValue( true )
		};
		helper.prepareExperience.mockResolvedValue( experience );
		initialize = jest.fn().mockResolvedValue( true );
		mw.loader = { using: jest.fn().mockResolvedValue( () => ( { initialize } ) ) };
		global.$ = jest.fn();
	} );
	afterEach( () => {
		delete mw.loader;
		delete global.$;
		document.body.innerHTML = '';
	} );

	it.each( Object.keys( groups ) )( 'applies %s before readiness', async ( group ) => {
		config.group = group;
		experience.assignment = Object.assign( { group }, groups[ group ] );
		document.body.innerHTML = '<div id="mmv-carousel-root"></div>';
		start = require( '../../resources/experiments/imageCarouselRetest/init.js' );
		await expect( start() ).resolves.toBe( true );
		expect( helper.prepareExperience ).toHaveBeenCalledWith( {
			isLoggedOut: true, isMobile: true, skin: 'minerva', namespaceId: 0,
			pageEligible: true, imageCount: 3
		} );
		if ( group === 'control' ) {
			expect( initialize ).not.toHaveBeenCalled();
			expect( document.getElementById( 'mmv-carousel-root' ) ).toBeNull();
		} else {
			expect( initialize ).toHaveBeenCalledWith( experience.assignment );
			expect( initialize.mock.invocationCallOrder[ 0 ] )
				.toBeLessThan( experience.experienceReady.mock.invocationCallOrder[ 0 ] );
		}
		expect( experience.experienceReady ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'waits for mounting and shares repeated initialization', async () => {
		let mounted;
		initialize.mockReturnValue( new Promise( ( resolve ) => {
			mounted = resolve;
		} ) );
		start = require( '../../resources/experiments/imageCarouselRetest/init.js' );
		const first = start();
		expect( start() ).toBe( first );
		await Promise.resolve();
		await Promise.resolve();
		expect( experience.experienceReady ).not.toHaveBeenCalled();
		mounted( true );
		await first;
		expect( experience.experienceReady ).toHaveBeenCalledTimes( 1 );
	} );

	it.each( [ 'no config', 'ineligible', 'assignment mismatch', 'mount failed', 'loader failed' ] )(
		'sends no readiness for %s', async ( failure ) => {
			if ( failure === 'no config' ) {
				config = null;
			} else if ( failure === 'ineligible' ) {
				experience.eligible = false;
			} else if ( failure === 'assignment mismatch' ) {
				config.group = 'control';
			} else if ( failure === 'mount failed' ) {
				initialize.mockResolvedValue( false );
			} else {
				mw.loader.using.mockRejectedValue( new Error( 'Unavailable' ) );
			}
			start = require( '../../resources/experiments/imageCarouselRetest/init.js' );
			await expect( start() ).resolves.toBe( false );
			expect( experience.experienceReady ).not.toHaveBeenCalled();
		}
	);
} );
