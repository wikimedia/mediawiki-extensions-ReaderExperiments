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
			props: mockProps,
			global: {
				provide: {
					submitInteraction: jest.fn()
				}
			}
		} );
	} );

	it( 'renders the overlay component', () => {
		expect( wrapper.find( '.ib-overlay-backdrop' ).exists() ).toBe( true );
		expect( wrapper.find( '.ib-overlay-container' ).exists() ).toBe( true );
	} );

	it( 'renders the close button', () => {
		const closeButton = wrapper.find( '.ib-overlay__close' );
		expect( closeButton.exists() ).toBe( true );
	} );

	it( 'emits `overlay-close` when the close button is clicked', async () => {
		const closeButton = wrapper.find( '.ib-overlay__close' );
		await closeButton.trigger( 'click' );

		expect( wrapper.emitted( 'overlay-close' ) ).toBeTruthy();
		expect( wrapper.emitted( 'overlay-close' ).length ).toBe( 1 );
	} );

	it( 'emits `overlay-close` when the backdrop is clicked', async () => {
		const backdrop = wrapper.find( '.ib-overlay-backdrop' );
		await backdrop.trigger( 'click' );

		expect( wrapper.emitted( 'overlay-close' ) ).toBeTruthy();
		expect( wrapper.emitted( 'overlay-close' ).length ).toBe( 1 );
	} );
} );
