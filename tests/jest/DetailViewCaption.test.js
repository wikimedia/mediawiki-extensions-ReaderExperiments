const { mount } = require( '@vue/test-utils' );
const DetailViewCaption = require( '../../resources/ext.readerExperiments.imageBrowsing/components/DetailViewCaption' );

let mockImage, wrapper;

describe( 'DetailViewCaption', () => {
	beforeEach( () => {
		mockImage = {
			thumb: Object.assign( new Image(), {
				width: 800,
				height: 600,
				src: '//url/to/thumb.jpg'
			} ),
			alt: 'Alt text for image',
			title: { getPrefixedDb: jest.fn().mockReturnValue( 'File:Example.jpg' ) },
			resizeUrl: jest.fn().mockImplementation( ( width ) => `//resized/image/${ width }.jpg` )
		};

		wrapper = mount( DetailViewCaption, {
			props: {
				image: mockImage
			}
		} );
	} );

	// TODO: Add more tests that work with async setup.
	// Maybe use `await flushPromises()`?
	// For now tests that the component wrapper exists.
	it( 'mounts the component wrapper', () => {
		// Verify that the component can be mounted
		expect( wrapper.exists() ).toBe( true );
	} );
} );
