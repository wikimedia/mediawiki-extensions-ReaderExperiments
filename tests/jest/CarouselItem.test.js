const { shallowMount } = require( '@vue/test-utils' );
const CarouselItem = require( '../../resources/ext.readerExperiments.imageBrowsing/components/CarouselItem' );

let image, wrapper;

describe( 'CarouselItem', () => {
	beforeEach( () => {
		const src = '//url/to/Jailhouse_Rock.jpg';
		const alt = 'Presley posing over a white background';
		const thumb = document.createElement( 'img' );
		const width = 100;
		const height = 175;
		const resizeUrl = ( s, w ) => s + '?width=' + w;

		thumb.setAttribute( 'src', src );

		image = {
			thumb,
			alt,
			src,
			width,
			height,
			resizeUrl: resizeUrl.bind( null, src )
		};

		wrapper = shallowMount( CarouselItem, {
			props: {
				image: image,
				selected: false
			}
		} );
	} );

	it( 'renders a cropped image', async () => {
		const croppedImage = wrapper.findComponent( '.ib-carousel-item__image' );
		expect( croppedImage.props() ).toEqual( { image } );
	} );
} );
