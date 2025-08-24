const { shallowMount } = require( '@vue/test-utils' );
const Overlay = require( '../../resources/ext.readerExperiments.imageBrowsing/components/Overlay' );

let wrapper;

describe( 'Overlay', () => {
	beforeEach( () => {
		const mockProps = {
			images: [
				{
					thumb: new Image(),
					alt: 'Image 1',
					src: '//url/to/image1.jpg'
				},
				{
					thumb: new Image(),
					alt: 'Image 2',
					src: '//url/to/image2.jpg'
				}
			],
			activeImage: {
				thumb: new Image(),
				alt: 'Active image',
				src: '//url/to/active-image.jpg',
				container: document.createElement( 'div' )
			}
		};

		wrapper = shallowMount( Overlay, {
			props: mockProps
		} );
	} );

	it( 'renders the overlay component', () => {
		expect( wrapper.find( '.ib-overlay' ).exists() ).toBe( true );
	} );

	it( 'renders the close button', () => {
		const closeButton = wrapper.find( '.ib-overlay__close' );
		expect( closeButton.exists() ).toBe( true );
	} );

	it( 'emits close-overlay event when close button is clicked', async () => {
		const closeButton = wrapper.find( '.ib-overlay__close' );
		await closeButton.trigger( 'click' );

		expect( wrapper.emitted( 'close-overlay' ) ).toBeTruthy();
		expect( wrapper.emitted( 'close-overlay' ).length ).toBe( 1 );
	} );
} );
