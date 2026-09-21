// TODO(image-carousel-retest): Delete this test with the experiment modules after the retest.
const context = {
	isLoggedOut: true, isMobile: true, skin: 'minerva', namespaceId: 0,
	pageEligible: true, imageCount: 3
};

describe( 'Image carousel retest Test Kitchen connection', () => {
	let instrumentation;
	let experiment;
	let actionHook;
	let originalHook;

	beforeEach( () => {
		jest.resetModules();
		originalHook = mw.hook;
		const handlers = [];
		let previousAction;
		actionHook = {
			add: jest.fn( ( handler ) => {
				handlers.push( handler );
				if ( previousAction ) {
					handler( previousAction );
				}
			} ),
			fire: ( name ) => {
				previousAction = name;
				handlers.forEach( ( handler ) => handler( name ) );
			}
		};
		mw.hook = jest.fn().mockReturnValue( actionHook );
		experiment = {
			send: jest.fn(),
			sendExposure: jest.fn(),
			getAssignedGroup: jest.fn().mockReturnValue( 'vanilla-carousel' ),
			use: jest.fn( ( instrument ) => instrument( experiment ) )
		};
		mw.loader = { using: jest.fn().mockResolvedValue( () => ( {
			anyPageVisit: () => ( sender ) => sender.send( 'page_visit', {}, [ 'page_namespace_id' ] )
		} ) ) };
		mw.testKitchen = { getExperiment: jest.fn().mockResolvedValue( experiment ) };
		instrumentation = require( '../../resources/experiments/imageCarouselRetest/instrumentation.js' );
	} );

	afterEach( () => {
		mw.hook = originalHook;
		delete mw.loader;
		delete mw.testKitchen;
	} );

	it( 'records live MMV actions once and ignores the remembered action on registration', async () => {
		experiment.getAssignedGroup.mockReturnValue( 'carousel-captions-jump' );
		actionHook.fire( 'thumbnailOpen' );
		const first = await instrumentation.prepareExperience( context );
		const second = await instrumentation.prepareExperience( context );
		await Promise.all( [ first.experienceReady(), second.experienceReady() ] );
		expect( actionHook.add ).toHaveBeenCalledTimes( 1 );
		expect( experiment.send ).toHaveBeenCalledTimes( 1 );
		experiment.send.mockClear();
		for ( const name of [
			'thumbnailOpen', 'carouselHide', 'carouselShow',
			'viewDetails', 'scrollToImage', 'licenseInfo'
		] ) {
			actionHook.fire( name );
		}
		await new Promise( ( resolve ) => {
			setTimeout( resolve, 0 );
		} );
		expect( experiment.send ).toHaveBeenCalledTimes( 6 );
		expect( experiment.send.mock.calls.every( ( call ) => call[ 0 ] === 'click' ) ).toBe( true );
	} );

	it( 'queues accepted actions while readiness is pending without leaking telemetry failures', async () => {
		const experience = await instrumentation.prepareExperience( context );
		let resolveLoad;
		const requireModule = await mw.loader.using();
		mw.loader.using.mockReturnValue( new Promise( ( resolve ) => {
			resolveLoad = resolve;
		} ) );
		const ready = experience.experienceReady();
		actionHook.fire( 'thumbnailOpen' );
		expect( experiment.send ).not.toHaveBeenCalled();
		resolveLoad( requireModule );
		await ready;
		await new Promise( ( resolve ) => {
			setTimeout( resolve, 0 );
		} );
		expect( experiment.send ).toHaveBeenCalledTimes( 2 );
		experiment.send.mockImplementation( () => {
			throw new Error( 'Telemetry failure' );
		} );
		expect( () => actionHook.fire( 'thumbnailOpen' ) ).not.toThrow();
		await new Promise( ( resolve ) => {
			setTimeout( resolve, 0 );
		} );
		expect( mw.log.warn ).toHaveBeenCalled();
	} );

	it.each( [
		[ 'control', false, false, false, false ],
		[ 'vanilla-carousel', true, false, false, true ],
		[ 'carousel-captions-only', true, true, false, true ],
		[ 'carousel-jump-only', true, false, true, true ],
		[ 'carousel-captions-jump', true, true, true, true ]
	] )( 'exposes the specified UI options for %s without sending events', async (
		group, showCarousel, showCaptions, showJumpLink, showToggle
	) => {
		experiment.getAssignedGroup.mockReturnValue( group );
		const assignment = await instrumentation.getAssignment();
		expect( assignment ).toEqual( {
			group, showCarousel, showCaptions, showJumpLink, showToggle
		} );
		expect( Object.isFrozen( assignment ) ).toBe( true );
		expect( experiment.send ).not.toHaveBeenCalled();
		expect( mw.testKitchen.getExperiment ).toHaveBeenCalledWith( 'image-carousel-retest' );
	} );

	it.each( [ null, undefined, 'unknown-group', 'toString', '__proto__' ] )(
		'does not treat an invalid assignment (%s) as control', async ( group ) => {
			experiment.getAssignedGroup.mockReturnValue( group );
			await expect( instrumentation.getAssignment() ).resolves.toBeNull();
			expect( experiment.send ).not.toHaveBeenCalled();
		}
	);

	it.each( [ 'control', 'vanilla-carousel', 'carousel-captions-only', 'carousel-jump-only', 'carousel-captions-jump' ] )(
		'records readiness once across repeated setup for %s', async ( group ) => {
			experiment.getAssignedGroup.mockReturnValue( group );
			const first = await instrumentation.prepareExperience( context );
			const second = await instrumentation.prepareExperience( context );
			expect( first.eligible ).toBe( true );
			expect( experiment.sendExposure ).not.toHaveBeenCalled();
			expect( experiment.send ).not.toHaveBeenCalled();
			await Promise.all( [ first.experienceReady(), first.experienceReady(), second.experienceReady() ] );
			expect( experiment.sendExposure ).toHaveBeenCalledTimes( 1 );
			expect( experiment.use ).toHaveBeenCalledTimes( 1 );
			expect( experiment.send ).toHaveBeenCalledWith( 'page_visit', {}, [ 'page_namespace_id' ] );
			expect( mw.testKitchen.getExperiment ).toHaveBeenCalledTimes( 1 );
		}
	);

	it.each( [
		{ isLoggedOut: false }, { isMobile: false }, { skin: 'vector' },
		{ namespaceId: 1 }, { pageEligible: false }, { imageCount: 2 },
		{ imageCount: undefined }
	] )( 'rejects ineligible context %j for every arm', async ( overrides ) => {
		for ( const group of [ 'control', 'vanilla-carousel', 'carousel-captions-only', 'carousel-jump-only', 'carousel-captions-jump' ] ) {
			experiment.getAssignedGroup.mockReturnValue( group );
			const experience = await instrumentation.prepareExperience( Object.assign( {}, context, overrides ) );
			expect( experience.eligible ).toBe( false );
			await expect( experience.experienceReady() ).resolves.toBe( false );
		}
		expect( experiment.send ).not.toHaveBeenCalled();
		expect( experiment.sendExposure ).not.toHaveBeenCalled();
	} );

	it( 'supports a reviewed image threshold without changing rendering', async () => {
		const experience = await instrumentation.prepareExperience( context, { minimumImages: 4 } );
		expect( experience.eligible ).toBe( false );
	} );

	it( 'ignores interactions before readiness and prevents control interactions', async () => {
		await instrumentation.recordInteraction( 'thumbnailOpen' );
		experiment.getAssignedGroup.mockReturnValue( 'control' );
		const experience = await instrumentation.prepareExperience( context );
		await experience.experienceReady();
		experiment.send.mockClear();
		await instrumentation.recordInteraction( 'thumbnailOpen' );
		expect( experiment.send ).not.toHaveBeenCalled();
	} );

	it.each( [ 'vanilla-carousel', 'carousel-captions-only', 'carousel-jump-only', 'carousel-captions-jump' ] )(
		'uses spec payloads and restricts jump interactions for %s', async ( group ) => {
			experiment.getAssignedGroup.mockReturnValue( group );
			const experience = await instrumentation.prepareExperience( context );
			await experience.experienceReady();
			experiment.send.mockClear();
			await instrumentation.recordInteraction( 'thumbnailOpen' );
			expect( experiment.send ).toHaveBeenCalledWith( 'click', {
				// eslint-disable-next-line camelcase
				action_subtype: 'open', action_source: 'image_carousel', element_friendly_name: 'image_thumbnail'
			} );
			experiment.send.mockClear();
			await instrumentation.recordInteraction( 'scrollToImage' );
			expect( experiment.send ).toHaveBeenCalledTimes( experience.assignment.showJumpLink ? 1 : 0 );
		}
	);

	it( 'handles a missing page-visit module without throwing or recording', async () => {
		const experience = await instrumentation.prepareExperience( context );
		mw.loader.using.mockRejectedValue( new Error( 'Unavailable' ) );
		await expect( experience.experienceReady() ).resolves.toBe( false );
		await instrumentation.recordInteraction( 'thumbnailOpen' );
		expect( experiment.sendExposure ).not.toHaveBeenCalled();
		expect( experiment.send ).not.toHaveBeenCalled();
	} );

	it( 'does not expose a stale assignment', async () => {
		const experience = await instrumentation.prepareExperience( context );
		experiment.getAssignedGroup.mockReturnValue( 'control' );
		await expect( experience.experienceReady() ).resolves.toBe( false );
		expect( experiment.sendExposure ).not.toHaveBeenCalled();
		expect( experiment.send ).not.toHaveBeenCalled();
	} );

	it( 'does not expose an unenrolled reader on an eligible page', async () => {
		experiment.getAssignedGroup.mockReturnValue( null );
		const experience = await instrumentation.prepareExperience( context );
		await expect( experience.experienceReady() ).resolves.toBe( false );
		expect( experiment.sendExposure ).not.toHaveBeenCalled();
		expect( experiment.send ).not.toHaveBeenCalled();
	} );

	it.each( [ 'load rejection', 'lookup rejection', 'synchronous load failure', 'missing API' ] )(
		'skips recording safely after %s', async ( failure ) => {
			if ( failure === 'load rejection' ) {
				mw.loader.using.mockRejectedValue( new Error( 'Unavailable' ) );
			} else if ( failure === 'lookup rejection' ) {
				mw.testKitchen.getExperiment.mockRejectedValue( new Error( 'Unavailable' ) );
			} else if ( failure === 'synchronous load failure' ) {
				mw.loader.using.mockImplementation( () => {
					throw new Error( 'Unavailable' );
				} );
			} else {
				delete mw.testKitchen;
			}
			await expect( instrumentation.initialize() ).resolves.toBeNull();
			await expect( instrumentation.getAssignment() ).resolves.toBeNull();
			const experience = await instrumentation.prepareExperience( context );
			await expect( experience.experienceReady() ).resolves.toBe( false );
			await expect( instrumentation.recordInteraction( 'click' ) ).resolves.toBeUndefined();
			expect( experiment.send ).not.toHaveBeenCalled();
			expect( mw.log.warn ).toHaveBeenCalled();
		}
	);
} );
