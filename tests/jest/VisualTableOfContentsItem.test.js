const { mount } = require( '@vue/test-utils' );
const { when } = require( 'jest-when' );
const VisualTableOfContentsItem = require( '../../resources/ext.readerExperiments.imageBrowsing/components/VisualTableOfContentsItem' );

// Mock the thumbExtractor module
jest.mock( '../../resources/ext.readerExperiments.imageBrowsing/thumbExtractor.js', () => ( {
	getCaptionIfAvailable: jest.fn( () => null )
} ) );

let mockImage, wrapper;

describe( 'VisualTableOfContentsItem', () => {
	beforeEach( () => {
		when( global.mw.config.get )
			.calledWith( 'ReaderExperimentsImageBrowsingThumbLimits' )
			.mockReturnValue( [ 50, 100, 200 ] );

		// Reset mocks
		jest.clearAllMocks();
		mockImage = {
			src: '//url/to/full-image.jpg',
			srcset: '//url/to/full-image.jpg 1x, //url/to/full-image@2x.jpg 2x',
			alt: 'The image alt text with a <a href="wiki">link</a>',
			name: 'The image file name',
			width: 200,
			height: 200,
			container: {
				querySelector: jest.fn( () => null )
			},
			resizeUrl: ( width ) => `//url/to/full-image.jpg?width=${ width }`
		};

		// Default wrapper, override in test cases as needed
		wrapper = mount( VisualTableOfContentsItem, {
			props: {
				image: mockImage,
				selected: false
			},
			global: {
				provide: {
					submitInteraction: jest.fn(),
					manageLinkEventListeners: jest.fn()
				}
			}
		} );
	} );

	it( 'renders the component', () => {
		expect( wrapper.find( '.ib-vtoc-item' ).exists() ).toBe( true );
	} );

	it( 'displays an article image', () => {
		const img = wrapper.find( 'img' );
		expect( img.exists() ).toBe( true );
		expect( img.attributes( 'src' ) ).toBe( '//url/to/full-image.jpg' );
		expect( img.attributes( 'alt' ) ).toBe( mockImage.alt );
		expect( img.attributes( 'loading' ) ).toBe( 'lazy' );
	} );

	it( 'includes a "view in article" button', () => {
		const button = wrapper.find( '.ib-vtoc-item__view-in-article' );
		expect( button.exists() ).toBe( true );
		expect( button.text() ).toContain( 'readerexperiments-imagebrowsing-vtoc-view-button-label' );
	} );

	// TODO: Test other caption fallback options
	it( 'displays image alt text as the caption text when figcaption and nearby paragraph is unavailable', () => {
		const figcaption = wrapper.find( 'figcaption' );
		// Since getCaptionIfAvailable is mocked to return null, it falls back to alt text.
		// Verify the fallback behavior works correctly.
		// Note: alt text should be handled as plain text; any markup inside of image alt text is an XSS vector.
		// Therefore the link that is included here *should* be escaped:
		// eslint-disable-next-line quotes
		expect( figcaption.text() ).toBe( "The image alt text with a <a href=\"wiki\">link</a>" );
	} );

	it( 'emits `vtoc-item-click` when an image is clicked', async () => {
		const imageButton = wrapper.find( '.ib-vtoc-item__figure button' );
		await imageButton.trigger( 'click' );

		expect( wrapper.emitted( 'vtoc-item-click' ) ).toBeTruthy();
		// Verify the argument value that was emitted
		expect( wrapper.emitted( 'vtoc-item-click' )[ 0 ][ 0 ] ).toStrictEqual( mockImage );
	} );

	it( 'emits `vtoc-view-in-article` when the `view in article` button is clicked', async () => {
		const button = wrapper.find( '.ib-vtoc-item__view-in-article' );
		await button.trigger( 'click' );

		expect( wrapper.emitted( 'vtoc-view-in-article' ) ).toBeTruthy();
		// Verify the argument value that was emitted
		expect( wrapper.emitted( 'vtoc-view-in-article' )[ 0 ][ 0 ] ).toStrictEqual( mockImage );
	} );

	it( 'escapes HTML markup in alt text to prevent XSS', () => {
		const maliciousAlt = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
		const maliciousImage = { ...mockImage, alt: maliciousAlt };

		const testWrapper = mount( VisualTableOfContentsItem, {
			props: {
				image: maliciousImage,
				selected: false
			}
		} );

		const figcaption = testWrapper.find( 'figcaption' );

		// Ensure potential XSS gets escaped
		expect( figcaption.text() ).toBe( maliciousAlt );
		expect( figcaption.html() ).not.toContain( '<script>' );
		expect( figcaption.html() ).toContain( '&lt;script&gt;' );
	} );
} );
