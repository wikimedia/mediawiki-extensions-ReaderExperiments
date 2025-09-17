const { mount } = require( '@vue/test-utils' );
const DetailViewCaption = require( '../../resources/ext.readerExperiments.imageBrowsing/components/DetailViewCaption' );

// The caption's element `clientHeight` and `scrollHeight` properties
// are used to tell if the caption overflows,
// thus enabling the `more` and `less` buttons.
// Force `clientHeight !== scrollHeight` to make that happen.
Object.defineProperty( HTMLElement.prototype, 'clientHeight', {
	value: 42
} );
Object.defineProperty( HTMLElement.prototype, 'scrollHeight', {
	value: 84
} );

let mockImage, wrapper;

describe( 'DetailViewCaption', () => {
	beforeEach( () => {
		mockImage = {
			name: 'Example.jpg',
			thumb: Object.assign( new Image(), {
				width: 800,
				height: 600,
				src: '//url/to/thumb.jpg'
			} ),
			alt: `
				The longest word in German is
				"Donaudampfschifffahrtselektrizitätenhauptbetriebswerkbauunterbeamtengesellschaft",
				Here is a <a href="wiki">link</a>, too!
			`,
			src: '//url/to/thumb.jpg',
			srcset: '//url/to/thumb.jpg',
			width: 800,
			height: 600,
			title: {
				getPrefixedDb: jest.fn().mockReturnValue( 'File:Example.jpg' ),
				getFileNameTextWithoutExtension: jest.fn().mockReturnValue( 'Example' )
			},
			resizeUrl: jest.fn().mockImplementation( ( width ) => `//resized/image/${ width }.jpg` )
		};

		wrapper = mount( DetailViewCaption, {
			props: {
				image: mockImage
			},
			global: {
				provide: {
					submitInteraction: jest.fn(),
					manageLinkEventListeners: jest.fn()
				}
			}
		} );
	} );

	it( 'mounts the component wrapper', () => {
		expect( wrapper.exists() ).toBe( true );
		expect( wrapper.find( '.ib-detail-view-caption' ).exists() ).toBe( true );
	} );

	it( 'renders the caption', () => {
		const caption = wrapper.find( '.ib-detail-view-caption__text' );

		expect( caption.exists() ).toBe( true );
		expect( caption.html() ).toContain(
			'Donaudampfschifffahrtselektrizitätenhauptbetriebswerkbauunterbeamtengesellschaft'
		);
	} );

	it( 'checks that the caption is expanded when the `more` button is clicked', async () => {
		const button = wrapper.find( '.ib-detail-view-caption__expand' );
		await button.trigger( 'click' );

		expect( wrapper.vm.isCaptionExpanded ).toBe( true );
	} );
} );
