const { shallowMount } = require( '@vue/test-utils' );
const { when } = require( 'jest-when' );
const CarouselItem = require( '../../resources/ext.readerExperiments.imageBrowsing/components/CarouselItem' );

let expected, wrapper;

describe( 'CarouselItem', () => {
	beforeEach( () => {
		when( global.mw.config.get )
			.calledWith( 'ReaderExperimentsImageBrowsingThumbLimits' )
			.mockReturnValue( [ 50, 100, 200 ] );

		const src = '//url/to/Jailhouse_Rock.jpg';
		const alt = 'Presley posing over a white background';
		const thumb = document.createElement( 'img' );
		const width = 100;
		const height = 175;
		const resizeUrl = ( s, w ) => s + '?width=' + w;

		thumb.setAttribute( 'src', src );

		const image = {
			thumb,
			alt,
			src,
			width,
			height,
			resizeUrl: resizeUrl.bind( null, src )
		};

		expected = `<img class="ib-carousel-item__image" crossorigin="anonymous" src="${ resizeUrl( src, 100 ) }" width="${ width }" height="${ height }" alt="${ alt }" loading="lazy">`;
		wrapper = shallowMount( CarouselItem, { props: { image: image } } );
	} );

	it( 'renders an image', () => {
		const actual = wrapper.get( 'img' ).html();
		expect( actual ).toBe( expected );
	} );
} );
