const { mount } = require( '@vue/test-utils' );
const { ref } = require( 'vue' );

const mockUseSummary = jest.fn();
const mockUseImageModel = jest.fn();

jest.mock( 'ext.readerExperiments', () => ( {
	useSummary: ( ...args ) => mockUseSummary( ...args ),
	useImageModel: ( ...args ) => mockUseImageModel( ...args )
} ) );

jest.mock(
	'../../resources/experiments/shareHighlight/composables/useShareQuote.js',
	() => jest.fn( () => ( {
		canShareFiles: ref( false ),
		isProcessing: ref( false ),
		error: ref( null ),
		shareQuote: jest.fn(),
		downloadQuoteImage: jest.fn().mockResolvedValue( true )
	} ) )
);

jest.mock( 'ext.readerExperiments/shareHighlight.instrumentation', () => ( {
	getShareHighlightInstrument: () => ( {
		send: jest.fn()
	} )
} ), { virtual: true } );

const ShareQuoteDialog = require( '../../resources/experiments/shareHighlight/components/ShareQuoteDialog.vue' );

describe( 'ShareQuoteDialog', () => {
	beforeEach( () => {
		mw.config.get.mockImplementation( ( key ) => ( {
			wgPageName: 'Franz_Marc',
			wgArticleId: 0
		}[ key ] ?? null ) );

		mw.util.adjustThumbWidthForSteps = jest.fn( () => 528 );
		mw.util.parseImageUrl.mockImplementation( () => ( {
			name: 'Example.jpg'
		} ) );

		mockUseSummary.mockReturnValue(
			ref( {
				thumbnail: {
					source: 'https://upload.wikimedia.org/example-thumb.jpg'
				},
				originalimage: {
					source: 'https://upload.wikimedia.org/example-original.jpg',
					width: 1000
				},
				extract: 'Example summary'
			} )
		);
		mockUseImageModel.mockReturnValue(
			ref( {
				author: '<span>Example author</span>',
				license: {
					getShortName: () => 'CC BY-SA 4.0'
				}
			} )
		);
	} );

	afterEach( () => {
		jest.clearAllMocks();
		delete mw.util.adjustThumbWidthForSteps;
	} );

	it( 'falls back to the original image when resizeUrl is unavailable', async () => {
		const title = Object.assign( new mw.Title(), {
			getPrefixedDb: jest.fn( () => 'Franz_Marc' ),
			getMainText: jest.fn( () => 'Franz Marc' )
		} );

		const wrapper = mount( ShareQuoteDialog, {
			props: {
				open: true,
				title,
				quoteText: 'Example selected text'
			},
			global: {
				stubs: {
					PopoverDialog: {
						name: 'PopoverDialog',
						template: '<div><slot></slot><slot name="footer"></slot></div>'
					},
					QuoteCard: {
						name: 'QuoteCard',
						template: '<div class="quote-card-stub"></div>',
						props: [ 'image' ]
					},
					CdxButton: true,
					CdxIcon: true,
					CdxMessage: true,
					CdxProgressIndicator: true,
					CdxButtonGroup: true
				}
			}
		} );

		await wrapper.vm.$nextTick();

		expect( wrapper.findComponent( { name: 'QuoteCard' } ).props( 'image' ) )
			.toBe( 'https://upload.wikimedia.org/example-original.jpg' );
		expect( mw.util.parseImageUrl ).toHaveBeenCalledWith(
			'https://upload.wikimedia.org/example-thumb.jpg'
		);
		expect( mw.util.adjustThumbWidthForSteps ).not.toHaveBeenCalled();
	} );
} );
