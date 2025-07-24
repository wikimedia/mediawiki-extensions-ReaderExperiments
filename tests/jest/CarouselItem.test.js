const { shallowMount } = require( '@vue/test-utils' );
const CarouselItem = require( '../../resources/ext.readerExperiments.imageBrowsing/components/CarouselItem' );

let expected, wrapper;

beforeEach( () => {
	const src = '//url/to/Jailhouse_Rock.jpg';
	const alt = 'Presley posing over a white background';
	const thumb = document.createElement( 'img' );
	thumb.setAttribute( 'src', src );

	const image = {
		thumb: thumb,
		alt: alt
	};

	expected = `<img class="ib-carousel-item__image" src="${ thumb.src }" alt="${ alt }">`;
	wrapper = shallowMount( CarouselItem, { props: { image: image } } );
} );

test( 'render a carousel image', () => {
	const actual = wrapper.get( 'img' ).html();
	expect( actual ).toBe( expected );
} );
