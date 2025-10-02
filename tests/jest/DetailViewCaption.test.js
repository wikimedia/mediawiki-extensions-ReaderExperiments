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

	it( 'escapes HTML markup in alt text to prevent XSS', () => {
		const maliciousAlt = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
		const maliciousImage = {
			...mockImage,
			alt: maliciousAlt,
			label: null,
			container: null
		};

		const testWrapper = mount( DetailViewCaption, {
			props: {
				image: maliciousImage
			}
		} );

		const captionText = testWrapper.find( '.ib-detail-view-caption__text' );
		// The text should be rendered as plain text, not HTML
		expect( captionText.text() ).toBe( maliciousAlt );
		// The HTML should not contain unescaped script tags
		expect( captionText.html() ).not.toContain( '<script>' );
		expect( captionText.html() ).toContain( '&lt;script&gt;' );
	} );

	it( 'escapes HTML markup in label text to prevent XSS', () => {
		const maliciousLabel = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
		const maliciousImage = {
			...mockImage,
			alt: null,
			label: maliciousLabel,
			container: null
		};

		const testWrapper = mount( DetailViewCaption, {
			props: {
				image: maliciousImage
			}
		} );

		const captionText = testWrapper.find( '.ib-detail-view-caption__text' );
		// The text should be rendered as plain text, not HTML
		expect( captionText.text() ).toBe( maliciousLabel );
		// The HTML should not contain unescaped script tags
		expect( captionText.html() ).not.toContain( '<script>' );
		expect( captionText.html() ).toContain( '&lt;script&gt;' );
	} );
} );
