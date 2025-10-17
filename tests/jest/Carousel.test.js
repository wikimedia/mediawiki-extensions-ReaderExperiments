const { mount } = require( '@vue/test-utils' );
const { when } = require( 'jest-when' );
const Carousel = require( '../../resources/ext.readerExperiments.imageBrowsing/components/Carousel' );

let images, wrapper;

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

		images = [
			{
				thumb: one,
				alt: 'Elvis in a tuxedo',
				src: one.src,
				width: 100,
				height: 200,
				resizeUrl: resizeUrl.bind( null, one.src ),
				name: 'Elvis in tuxedo.jpg',
				title: {
					getFileNameTextWithoutExtension: () => 'Elvis in tuxedo'
				},

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
				name: 'Elvis sings to a crowd of people.png',
				title: {
					getFileNameTextWithoutExtension: () => 'Elvis sings to a crowd of people'
				},

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
				name: 'Elvis performs on stage.jpg',
				title: {
					getFileNameTextWithoutExtension: () => 'Elvis performs on stage'
				},

				// not an actual attribute of this object; just one to be used for
				// testing later on, placed here for the sake of conveniently
				// grouping things together...
				expectedWidth: 175,
				expectedUrl: resizeUrl( three.src, 200 )
			}
		];

		wrapper = mount( Carousel, {
			props: {
				images: images,
				activeImage: null
			},
			global: {
				provide: {
					submitInteraction: jest.fn()
				}
			}
		} );
	} );

	it( 'renders a carousel of items', () => {
		const actual = wrapper.findAllComponents( '.ib-carousel-item' ).map( ( component ) => component.props() );
		expect( actual ).toEqual( images.map( ( image ) => ( { image, selected: false } ) ) );
	} );

	it( 'emits carousel-item-click event when an item is clicked', async () => {
		const button = wrapper.find( 'button' );
		const image = wrapper.props().images[ 0 ];

		button.element.click();

		expect( wrapper.emitted( 'carousel-item-click' ) ).toBeTruthy();
		expect( wrapper.emitted( 'carousel-item-click' ).length ).toBe( 1 );
		expect( wrapper.emitted( 'carousel-item-click' )[ 0 ][ 0 ] ).toEqual( image );
	} );
} );
