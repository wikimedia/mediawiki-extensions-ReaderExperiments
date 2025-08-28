const { mount } = require( '@vue/test-utils' );
const { when } = require( 'jest-when' );
const Carousel = require( '../../resources/ext.readerExperiments.imageBrowsing/components/Carousel' );

let expected, wrapper;

describe( 'Carousel', () => {
	beforeEach( () => {
		when( global.mw.config.get )
			.calledWith( 'ReaderExperimentsImageBrowsingThumbLimits' )
			.mockReturnValue( [ 50, 100, 200 ] );

		const one = document.createElement( 'img' );
		one.setAttribute( 'src', '//url/to/Elvis.jpg' );

		const two = document.createElement( 'img' );
		two.setAttribute( 'src', '//url/to/The_Pelvis.jpg' );

		const three = document.createElement( 'img' );
		three.setAttribute( 'src', '//url/to/In_the_Memphis.jpg' );

		const resizeUrl = ( src, width ) => src + '?width=' + width;

		const images = [
			{
				thumb: one,
				alt: 'Elvis in a tuxedo',
				src: one.src,
				width: 100,
				height: 200,
				resizeUrl: resizeUrl.bind( null, one.src ),

				// not an actual attribute of this object; just one to be used for
				// testing later on, placed here for the sake of conveniently
				// grouping things together...
				expectedWidth: 100,
				expectedUrl: resizeUrl( one.src, 100 )
			},
			{
				thumb: two,
				alt: null,
				src: two.src,
				width: 200,
				height: 100,
				resizeUrl: resizeUrl.bind( null, two.src ),

				// not an actual attribute of this object; just one to be used for
				// testing later on, placed here for the sake of conveniently
				// grouping things together...
				expectedWidth: 350,
				expectedUrl: resizeUrl( two.src, 350 )
			},
			{
				thumb: three,
				alt: 'Elvis performing on stage',
				src: three.src,
				width: 175,
				height: 175,
				resizeUrl: resizeUrl.bind( null, three.src ),

				// not an actual attribute of this object; just one to be used for
				// testing later on, placed here for the sake of conveniently
				// grouping things together...
				expectedWidth: 175,
				expectedUrl: resizeUrl( three.src, 200 )
			}
		];

		expected = [];

		for ( const image of images ) {
			const figure = document.createElement( 'button' );
			figure.setAttribute( 'class', 'ib-carousel-item' );

			const img = document.createElement( 'img' );
			img.setAttribute( 'class', 'ib-carousel-item__image' );
			img.setAttribute( 'src', image.expectedUrl );
			img.setAttribute( 'width', image.expectedWidth );
			img.setAttribute( 'height', 175 );

			const alt = image.alt;
			if ( alt !== null ) {
				img.setAttribute( 'alt', alt );
			}

			figure.append( img );
			expected.push( figure );
		}

		wrapper = mount( Carousel, { props: { images: images } } );
	} );

	it( 'renders a carousel of images', () => {
		const actual = wrapper.findAll( '.ib-carousel-item' ).map( ( item ) => item.wrapperElement );
		expect( actual ).toEqual( expected );
	} );
} );
