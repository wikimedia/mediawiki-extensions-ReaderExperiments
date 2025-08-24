const { shallowMount } = require( '@vue/test-utils' );
const CarouselItem = require( '../../resources/ext.readerExperiments.imageBrowsing/components/CarouselItem' );

let expected, wrapper;

describe( 'CarouselItem', () => {
	beforeEach( () => {
		const src = '//url/to/Jailhouse_Rock.jpg';
		const alt = 'Presley posing over a white background';
		const thumb = document.createElement( 'img' );
		thumb.setAttribute( 'src', src );

		const image = {
			thumb,
			alt,
			src
		};

		expected = `<img class="ib-carousel-item__image" src="${ src }" alt="${ alt }">`;
		wrapper = shallowMount( CarouselItem, { props: { image: image } } );
	} );

	it( 'renders an image', () => {
		const actual = wrapper.get( 'img' ).html();
		expect( actual ).toBe( expected );
	} );
} );
