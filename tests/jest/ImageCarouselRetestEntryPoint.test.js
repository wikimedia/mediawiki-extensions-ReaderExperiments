// TODO(image-carousel-retest-v2): Delete this test with the experiment modules after the retest.
jest.mock( 'ext.readerExperiments.imageCarouselRetest', () => ( {
	prepareExperience: jest.fn()
} ), { virtual: true } );

const groups = require( '../../resources/experiments/imageCarouselRetest/groups.json' );

describe( 'Image carousel retest entry point', () => {
	let start, helper, experience, initialize, config, originalErrorLogger;
	beforeEach( () => {
		jest.resetModules();
		originalErrorLogger = mw.errorLogger;
		mw.errorLogger = { logError: jest.fn() };
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
			experienceReady: jest.fn().mockResolvedValue( true ),
			carouselInitialized: jest.fn().mockResolvedValue()
		};
		helper.prepareExperience.mockResolvedValue( experience );
		initialize = jest.fn().mockResolvedValue( true );
		mw.loader = { using: jest.fn().mockResolvedValue( () => ( { initialize } ) ) };
		global.$ = jest.fn();
	} );
	afterEach( () => {
		mw.errorLogger = originalErrorLogger;
		delete mw.loader;
		delete global.$;
		document.body.innerHTML = '';
	} );

	it.each( Object.keys( groups ) )( 'records exposure before initializing %s', async ( group ) => {
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
			expect( experience.carouselInitialized ).not.toHaveBeenCalled();
			expect( document.getElementById( 'mmv-carousel-root' ) ).toBeNull();
		} else {
			expect( initialize ).toHaveBeenCalledWith( experience.assignment );
			expect( experience.carouselInitialized ).toHaveBeenCalledTimes( 1 );
			expect( experience.experienceReady.mock.invocationCallOrder[ 0 ] )
				.toBeLessThan( mw.loader.using.mock.invocationCallOrder[ 0 ] );
		}
		expect( experience.experienceReady ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'records exposure while mounting is pending and shares repeated initialization', async () => {
		let mounted;
		initialize.mockReturnValue( new Promise( ( resolve ) => {
			mounted = resolve;
		} ) );
		start = require( '../../resources/experiments/imageCarouselRetest/init.js' );
		const first = start();
		expect( start() ).toBe( first );
		await new Promise( ( resolve ) => {
			setTimeout( resolve, 0 );
		} );
		expect( initialize ).toHaveBeenCalledTimes( 1 );
		expect( experience.experienceReady ).toHaveBeenCalledTimes( 1 );
		expect( experience.carouselInitialized ).not.toHaveBeenCalled();
		mounted( true );
		await first;
		await start();
		expect( experience.carouselInitialized ).toHaveBeenCalledTimes( 1 );
		expect( experience.experienceReady ).toHaveBeenCalledTimes( 1 );
	} );

	it.each( [ 'no config', 'ineligible', 'assignment mismatch' ] )(
		'sends no readiness for %s', async ( failure ) => {
			if ( failure === 'no config' ) {
				config = null;
			} else if ( failure === 'ineligible' ) {
				experience.eligible = false;
				experience.assignment = null;
			} else {
				config.group = 'control';
			}
			start = require( '../../resources/experiments/imageCarouselRetest/init.js' );
			await expect( start() ).resolves.toBe( false );
			expect( experience.carouselInitialized ).not.toHaveBeenCalled();
			expect( experience.experienceReady ).not.toHaveBeenCalled();
			expect( initialize ).not.toHaveBeenCalled();
			if ( failure === 'assignment mismatch' ) {
				expect( mw.errorLogger.logError ).toHaveBeenCalledTimes( 1 );
				expect( mw.errorLogger.logError ).toHaveBeenCalledWith(
					new Error( '[Image Carousel Retest] Assignment mismatch: server=control, client=vanilla-carousel.' ),
					'error.ReaderExperiments'
				);
			} else {
				expect( mw.errorLogger.logError ).not.toHaveBeenCalled();
			}
		}
	);

	it.each( [ 'mount failed', 'mount rejected', 'loader failed' ] )(
		'records exposure even when %s', async ( failure ) => {
			if ( failure === 'mount failed' ) {
				initialize.mockResolvedValue( false );
			} else if ( failure === 'mount rejected' ) {
				initialize.mockRejectedValue( new Error( 'Mount failed' ) );
			} else {
				mw.loader.using.mockRejectedValue( new Error( 'Unavailable' ) );
			}
			start = require( '../../resources/experiments/imageCarouselRetest/init.js' );
			await expect( start() ).resolves.toBe( false );
			expect( experience.carouselInitialized ).not.toHaveBeenCalled();
			expect( experience.experienceReady ).toHaveBeenCalledTimes( 1 );
		}
	);

	it( 'initializes the carousel even when telemetry fails', async () => {
		experience.experienceReady.mockResolvedValue( false );
		start = require( '../../resources/experiments/imageCarouselRetest/init.js' );
		await expect( start() ).resolves.toBe( false );
		expect( initialize ).toHaveBeenCalledWith( experience.assignment );
	} );

} );
