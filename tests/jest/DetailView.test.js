const { shallowMount, config } = require( '@vue/test-utils' );
const DetailView = require( '../../resources/ext.readerExperiments.imageBrowsing/components/DetailView' );

// Suppress warnings
config.global.config.warnHandler = () => {};

let wrapper;

describe( 'DetailView', () => {
	beforeEach( () => {
		const mockActiveImage = {
			thumb: Object.assign( new Image(), {
				width: 800,
				height: 600,
				src: '//url/to/thumb.jpg'
			} ),
			alt: 'Alt text for image',
			title: { getPrefixedDb: jest.fn().mockReturnValue( 'File:Example.jpg' ) },
			resizeUrl: jest.fn().mockImplementation( ( width ) => `//resized/image/${ width }.jpg` )
		};

		wrapper = shallowMount( DetailView, {
			props: {
				activeImage: mockActiveImage,
				caption: 'Caption text'
			}
		} );

	} );

	// TODO: Add more tests that work with DetailView's async setup.
	// Maybe use `await flushPromises()`?
	// For now tests that the component wrapper exists.
	it( 'mounts the component wrapper', () => {
		// Verify that the component can be mounted
		expect( wrapper.exists() ).toBe( true );
	} );
} );
