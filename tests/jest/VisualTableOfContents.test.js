const { shallowMount } = require( '@vue/test-utils' );
const VisualTableOfContents = require( '../../resources/ext.readerExperiments.imageBrowsing/components/VisualTableOfContents' );

let mockImages, wrapper;

describe( 'VisualTableOfContents', () => {
	beforeEach( () => {
		mockImages = [
			{
				thumb: new Image(),
				alt: 'Image 1',
				src: '//url/to/image1.jpg'
			},
			{
				thumb: new Image(),
				alt: 'Image 2',
				src: '//url/to/image2.jpg'
			},
			{
				thumb: new Image(),
				alt: 'Image 3',
				src: '//url/to/image3.jpg'
			},
			{
				thumb: new Image(),
				alt: 'Image 4',
				src: '//url/to/image4.jpg'
			},
			{
				thumb: new Image(),
				alt: 'Image 5',
				src: '//url/to/image5.jpg'
			}
		];

		wrapper = shallowMount( VisualTableOfContents, {
			props: {
				images: mockImages
			}
		} );
	} );

	it( 'renders the visual table of contents component', () => {
		expect( wrapper.find( '.ib-vtoc' ).exists() ).toBe( true );
	} );

	it( 'renders all the given images', () => {
		const items = wrapper.findAllComponents( { name: 'VisualTableOfContentsItem' } );
		expect( items ).toHaveLength( 5 );
	} );

	it( 'emits vtoc-item-click event when item is clicked', async () => {
		const firstItem = wrapper.findComponent( { name: 'VisualTableOfContentsItem' } );
		// Simulate clicking the first image item
		await firstItem.vm.$emit( 'vtoc-item-click', mockImages[ 0 ] );

		expect( wrapper.emitted( 'vtoc-item-click' ) ).toBeTruthy();
		// Verify the argument value that was emitted
		expect( wrapper.emitted( 'vtoc-item-click' )[ 0 ][ 0 ] ).toStrictEqual( mockImages[ 0 ] );
	} );

	it( 'emits vtoc-view-in-article event when view in article is clicked', async () => {
		const firstItem = wrapper.findComponent( { name: 'VisualTableOfContentsItem' } );
		// Simulate clicking the first image item's "view in article" link button
		await firstItem.vm.$emit( 'vtoc-view-in-article', mockImages[ 0 ] );

		expect( wrapper.emitted( 'vtoc-view-in-article' ) ).toBeTruthy();
		// Verify the argument value that was emitted
		expect( wrapper.emitted( 'vtoc-view-in-article' )[ 0 ][ 0 ] ).toStrictEqual( mockImages[ 0 ] );
	} );
} );
