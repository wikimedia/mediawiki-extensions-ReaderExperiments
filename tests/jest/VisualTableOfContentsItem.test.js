const { mount, shallowMount } = require( '@vue/test-utils' );
const VisualTableOfContentsItem = require( '../../resources/ext.readerExperiments.imageBrowsing/components/VisualTableOfContentsItem' );

// Mock the thumbExtractor module
jest.mock( '../../resources/ext.readerExperiments.imageBrowsing/thumbExtractor.js', () => ( {
	getCaptionIfAvailable: jest.fn( () => null )
} ) );

// Mock the mw global object
global.mw = {
	html: {
		escape: jest.fn( ( text ) => text )
	}
};

let mockImage, wrapper;

describe( 'VisualTableOfContentsItem', () => {
	beforeEach( () => {
		// Reset mocks
		jest.clearAllMocks();
		mockImage = {
			src: '//url/to/full-image.jpg',
			srcset: '//url/to/full-image.jpg 1x, //url/to/full-image@2x.jpg 2x',
			alt: 'The image alt text',
			name: 'The image file name',
			width: 200,
			height: 200,
			container: {
				querySelector: jest.fn( () => null )
			}
		};

		// Default wrapper, override in test cases as needed
		wrapper = shallowMount( VisualTableOfContentsItem, {
			props: {
				image: mockImage
			}
		} );
	} );

	it( 'renders the component', () => {
		expect( wrapper.find( '.ib-vtoc-item' ).exists() ).toBe( true );
	} );

	it( 'displays an article image', () => {
		const img = wrapper.find( 'img' );
		expect( img.exists() ).toBe( true );
		expect( img.attributes( 'src' ) ).toBe( mockImage.src );
		expect( img.attributes( 'srcset' ) ).toBe( mockImage.srcset );
		expect( img.attributes( 'alt' ) ).toBe( mockImage.alt );
	} );

	it( 'includes a "view in article" button', () => {
		wrapper = mount( VisualTableOfContentsItem, {
			props: {
				image: mockImage
			},
			global: {
				mocks: {
					// Return key directly as string for this test because the component template
					// uses the i18n key without `.text()`. This overrides the global i18n mock that
					// returns an object with .text() and .parse() methods.
					$i18n: ( key ) => key
				}
			}
		} );

		const button = wrapper.find( '.ib-vtoc-item__view-in-article' );
		expect( button.exists() ).toBe( true );
		expect( button.text() ).toContain( 'readerexperiments-imagebrowsing-vtoc-view-button-label' );
	} );

	// TODO: Test other caption fallback options
	it( 'displays caption text', () => {
		wrapper = shallowMount( VisualTableOfContentsItem, {
			props: {
				image: mockImage
			}
		} );

		const figcaption = wrapper.find( 'figcaption' );
		// Since getCaptionIfAvailable is mocked to return null, it falls back to alt text
		// Verify the fallback behavior works correctly
		expect( figcaption.text() ).toBe( mockImage.alt );
	} );

	it( 'emits vtoc-item-click event when image is clicked', async () => {
		const imageButton = wrapper.find( '.ib-vtoc-item__figure button' );
		await imageButton.trigger( 'click' );

		expect( wrapper.emitted( 'vtoc-item-click' ) ).toBeTruthy();
		// Verify the argument value that was emitted
		expect( wrapper.emitted( 'vtoc-item-click' )[ 0 ][ 0 ] ).toStrictEqual( mockImage );
	} );

	it( 'emits vtoc-view-in-article event when view in article link is clicked', async () => {
		const button = wrapper.find( '.ib-vtoc-item__view-in-article' );
		await button.trigger( 'click' );

		expect( wrapper.emitted( 'vtoc-view-in-article' ) ).toBeTruthy();
		// Verify the argument value that was emitted
		expect( wrapper.emitted( 'vtoc-view-in-article' )[ 0 ][ 0 ] ).toStrictEqual( mockImage );
	} );
} );
