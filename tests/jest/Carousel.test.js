const { mount } = require( '@vue/test-utils' );
const Carousel = require( '../../resources/ext.readerExperiments.imageBrowsing/components/Carousel' );

let expected, wrapper;

beforeEach( () => {
	const one = document.createElement( 'img' );
	one.setAttribute( 'src', '//url/to/Elvis.jpg' );

	const two = document.createElement( 'img' );
	two.setAttribute( 'src', '//url/to/The_Pelvis.jpg' );

	const three = document.createElement( 'img' );
	three.setAttribute( 'src', '//url/to/In_the_Memphis.jpg' );

	const images = [
		{ thumb: one, alt: 'Elvis in a tuxedo' },
		{ thumb: two, alt: null },
		{ thumb: three, alt: 'Elvis performing on stage' }
	];

	expected = [];

	for ( const image of images ) {
		const figure = document.createElement( 'figure' );
		figure.setAttribute( 'class', 'ib-carousel-item' );

		const img = document.createElement( 'img' );
		img.setAttribute( 'class', 'ib-carousel-item__image' );
		img.setAttribute( 'src', image.thumb.src );

		const alt = image.alt;
		if ( alt !== null ) {
			img.setAttribute( 'alt', alt );
		}

		figure.append( img );
		expected.push( figure );
	}

	wrapper = mount( Carousel, { props: { images: images } } );
} );

test( 'render a carousel of images', () => {
	const actual = wrapper.findAll( '.ib-carousel-item' ).map( ( item ) => item.wrapperElement );
	expect( actual ).toEqual( expected );
} );
