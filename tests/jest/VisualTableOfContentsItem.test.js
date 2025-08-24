const { shallowMount } = require( '@vue/test-utils' );
const VisualTableOfContentsItem = require( '../../resources/ext.readerExperiments.imageBrowsing/components/VisualTableOfContentsItem' );

let mockImage, wrapper;

describe( 'VisualTableOfContentsItem', () => {
	beforeEach( () => {
		mockImage = {
			src: '//url/to/full-image.jpg',
			srcset: '//url/to/full-image.jpg 1x, //url/to/full-image@2x.jpg 2x',
			alt: 'Test image alt text',
			name: 'Test image name'
		};

		// Default wrapper, override in test cases as needed
		wrapper = shallowMount( VisualTableOfContentsItem, {
			props: {
				image: mockImage
			}
		} );
	} );

	it( 'renders the item component', () => {
		expect( wrapper.find( '.ib-vtoc-item' ).exists() ).toBe( true );
	} );

	it( 'displays an article image', () => {
		const img = wrapper.find( 'img' );
		expect( img.exists() ).toBe( true );
		expect( img.attributes( 'src' ) ).toBe( mockImage.src );
		expect( img.attributes( 'srcset' ) ).toBe( mockImage.srcset );
		expect( img.attributes( 'alt' ) ).toBe( mockImage.alt );
	} );

	it( 'includes a "view in article" link button', () => {
		wrapper = shallowMount( VisualTableOfContentsItem, {
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

		const link = wrapper.find( '.ib-vtoc-link' );
		expect( link.exists() ).toBe( true );
		expect( link.text() ).toContain( 'readerexperiments-imagebrowsing-vtoc-link' );
	} );

	it( 'displays figcaption text based on image properties', () => {
		const figcaption = wrapper.find( 'figcaption' );
		expect( figcaption.exists() ).toBe( true );
		// Should display alt text when no caption is provided
		expect( figcaption.text() ).toBe( mockImage.alt );
	} );

	it( 'displays caption text when available', () => {
		const imageWithCaption = {
			...mockImage,
			caption: { innerText: 'This is a caption' }
		};

		wrapper = shallowMount( VisualTableOfContentsItem, {
			props: {
				image: imageWithCaption
			}
		} );

		const figcaption = wrapper.find( 'figcaption' );
		expect( figcaption.text() ).toBe( 'This is a caption' );
	} );

	it( 'emits vtoc-item-click event when image is clicked', async () => {
		const imageLink = wrapper.find( '.ib-vtoc-detail' );
		await imageLink.trigger( 'click' );

		expect( wrapper.emitted( 'vtoc-item-click' ) ).toBeTruthy();
		// Verify the argument value that was emitted
		expect( wrapper.emitted( 'vtoc-item-click' )[ 0 ][ 0 ] ).toStrictEqual( mockImage );
	} );

	it( 'emits vtoc-view-in-article event when view in article link is clicked', async () => {
		const link = wrapper.find( '.ib-vtoc-link' );
		await link.trigger( 'click' );

		expect( wrapper.emitted( 'vtoc-view-in-article' ) ).toBeTruthy();
		// Verify the argument value that was emitted
		expect( wrapper.emitted( 'vtoc-view-in-article' )[ 0 ][ 0 ] ).toStrictEqual( mockImage );
	} );
} );
