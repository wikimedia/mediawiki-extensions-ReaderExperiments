const { mount } = require( '@vue/test-utils' );

const App = require( '../../resources/ext.readerExperiments.imageBrowsing/App.vue' );
const router = require( 'mediawiki.router' );

// Create mock images
const mockImage1 = {
	thumb: document.createElement( 'img' ),
	alt: 'Test image 1',
	src: '//example.com/image1.jpg',
	width: 100,
	height: 100,
	resizeUrl: ( width ) => `//example.com/image1.jpg?width=${ width }`,
	name: 'Image1.jpg',
	title: {
		getPrefixedDb: () => 'File:Image1.jpg',
		getFileNameTextWithoutExtension: () => 'Image1'
	}
};

const mockImage2 = {
	thumb: document.createElement( 'img' ),
	alt: 'Test image 2',
	src: '//example.com/image2.jpg',
	width: 200,
	height: 200,
	resizeUrl: ( width ) => `//example.com/image2.jpg?width=${ width }`,
	name: 'Image2.jpg',
	title: {
		getPrefixedDb: () => 'File:Image2.jpg',
		getFileNameTextWithoutExtension: () => 'Image2'
	}
};

const mockImage3 = {
	thumb: document.createElement( 'img' ),
	alt: 'Test image 3',
	src: '//example.com/image3.jpg',
	width: 150,
	height: 150,
	resizeUrl: ( width ) => `//example.com/image3.jpg?width=${ width }`,
	name: 'Image3.jpg',
	title: {
		getPrefixedDb: () => 'File:Image3.jpg',
		getFileNameTextWithoutExtension: () => 'Image3'
	}
};

const mockImages = [ mockImage1, mockImage2, mockImage3 ];

// Mock the composables
jest.mock( '../../resources/ext.readerExperiments.imageBrowsing/composables/useContentImages.js', () => jest.fn( () => mockImages ) );
jest.mock( '../../resources/ext.readerExperiments.imageBrowsing/composables/useExternalImages.js', () => jest.fn() );
jest.mock( '../../resources/ext.readerExperiments.imageBrowsing/composables/useEntityId.js', () => jest.fn() );

describe( 'App', () => {
	let wrapper;

	beforeEach( () => {
		// Create a mock content element
		const contentElement = document.createElement( 'div' );
		contentElement.setAttribute( 'id', 'content' );
		document.body.appendChild( contentElement );

		// Clear all mocks before each test
		router.navigate.mockClear();
		router.addRoute.mockClear();
		router.checkRoute.mockClear();

		// Mount the component
		wrapper = mount( App, {
			props: {},
			global: {
				// Instrumentation, router, and i18n are mocked globally
				provide: {
					CdxTeleportTarget: 'body'
				},
				stubs: {
					Carousel: {
						name: 'Carousel',
						template: '<div class="carousel-stub"><slot /></div>',
						props: [ 'images' ],
						emits: [ 'carousel-item-click' ]
					},
					Overlay: {
						name: 'Overlay',
						template: '<div class="overlay-stub"><slot /></div>',
						props: [ 'images', 'activeImage' ],
						emits: [ 'overlay-close', 'vtoc-item-click', 'vtoc-view-in-article' ]
					}
				}
			}
		} );
	} );

	afterEach( () => {
		// Clean up the DOM
		const contentElement = document.getElementById( 'content' );
		if ( contentElement ) {
			contentElement.remove();
		}
	} );

	describe( 'client-side routing behavior', () => {
		it( 'calls router.navigate when onCarouselItemClick is triggered', () => {
			// Call the handler method directly
			wrapper.vm.onCarouselItemClick( mockImage1 );

			// Verify that router.navigate was called with the correct path
			expect( router.navigate ).toHaveBeenCalledTimes( 1 );
			expect( router.navigate ).toHaveBeenCalledWith( '/imagebrowsing/File:Image1.jpg' );
		} );

		it( 'calls router.navigate with empty string when onOverlayClose is triggered', () => {
			// Call the handler method directly
			wrapper.vm.onOverlayClose();

			// Verify that router.navigate was called with empty string
			expect( router.navigate ).toHaveBeenCalledTimes( 1 );
			expect( router.navigate ).toHaveBeenCalledWith( '' );
		} );

		it( 'calls router.navigate when onVTOCItemClick is triggered', () => {
			// Call the handler method directly
			wrapper.vm.onVTOCItemClick( mockImage2 );

			// Verify that router.navigate was called with the correct path
			expect( router.navigate ).toHaveBeenCalledTimes( 1 );
			expect( router.navigate ).toHaveBeenCalledWith( '/imagebrowsing/File:Image2.jpg' );
		} );

		it( 'calls router.navigate with empty string when onVTOCViewInArticle is triggered', () => {
			// Create a mock container for the image
			const mockContainer = document.createElement( 'div' );
			mockContainer.scrollIntoView = jest.fn();
			const imageWithContainer = {
				...mockImage1,
				container: mockContainer
			};

			// Call the handler method directly
			wrapper.vm.onVTOCViewInArticle( imageWithContainer );

			// Verify that router.navigate was called with empty string
			expect( router.navigate ).toHaveBeenCalledTimes( 1 );
			expect( router.navigate ).toHaveBeenCalledWith( '' );

			// Also verify scrollIntoView was called
			expect( mockContainer.scrollIntoView ).toHaveBeenCalledWith( {
				behavior: 'smooth'
			} );
		} );

		it( 'calls router.navigate with correct path when switching between images', () => {
			// Simulate clicking on first image
			wrapper.vm.onCarouselItemClick( mockImage1 );

			expect( router.navigate ).toHaveBeenCalledTimes( 1 );
			expect( router.navigate ).toHaveBeenCalledWith( '/imagebrowsing/File:Image1.jpg' );

			// Clear the mock to start fresh
			router.navigate.mockClear();

			// Simulate clicking on a different image in the VTOC
			wrapper.vm.onVTOCItemClick( mockImage2 );

			expect( router.navigate ).toHaveBeenCalledTimes( 1 );
			expect( router.navigate ).toHaveBeenCalledWith( '/imagebrowsing/File:Image2.jpg' );
		} );
	} );

	describe( 'router setup', () => {
		it( 'calls router.addRoute during setup', () => {
			// The component should have called addRoute during setup
			expect( router.addRoute ).toHaveBeenCalledTimes( 1 );
			expect( router.addRoute.mock.calls[ 0 ][ 0 ] ).toBeInstanceOf( RegExp );
			expect( router.addRoute.mock.calls[ 0 ][ 1 ] ).toBeInstanceOf( Function );
			expect( router.addRoute.mock.calls[ 0 ][ 2 ] ).toBeInstanceOf( Function );
		} );

		it( 'calls router.checkRoute during setup', () => {
			// The component should have called checkRoute during setup
			expect( router.checkRoute ).toHaveBeenCalledTimes( 1 );
		} );
	} );
} );
