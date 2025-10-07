const useMediaSearchResults = require( '../../resources/ext.readerExperiments.imageBrowsing/composables/useMediaSearchResults.js' );

const apiMap = new Map();
for ( const apiHit of require( './files/mediaSearchApi.json' ) ) {
	apiMap.set( apiHit.request, apiHit.response );
}

class MockTitle {
	constructor( prefixed ) {
		this.prefixed = prefixed;
	}

	getMain() {
		const text = this.prefixed.split( ':' );
		return text[ text.length - 1 ].replace( / /g, '_' );
	}

	getPrefixedText() {
		return this.prefixed.replace( /_/g, ' ' );
	}

	static newFromText( text ) {
		return new MockTitle( text );
	}
}

const apiExclude = require( './files/mediaSearchExclude.json' )
	.map( ( str ) => new MockTitle( str ) );

describe( 'useMediaSearchResults', () => {
	const originalConfig = mw.config;
	const originalForeignApi = mw.ForeignApi;
	const originalTitle = mw.Title;

	beforeEach( () => {
		mw.config = new Map( [
			[
				'wgServerName',
				'localhost'
			],
			[
				'ReaderExperimentsApiBaseUri',
				'https://en.wikipedia.org/w/api.php'
			],
			[
				'ReaderExperimentsImageBrowsingExternalWikis',
				{
					'wikipedia.org': '/* i18n-unused */',
					'wikidata.org': 'wikibase-otherprojects-wikidata'
				}
			]
		] );

		mw.ForeignApi = class {
			async get( options ) {
				// Simulate default params
				const params = {
					action: 'query',
					format: 'json',
					origin: '*'
				};
				Object.assign( params, options );

				// Simulate URL-encoded API request payload
				// as test data was copied from real requests.
				const payload = Object.entries( params )
					.filter( ( [ , value ] ) => value || typeof value === 'string' || typeof value === 'number' )
					.map( ( [ key, value ] ) => `${ encodeURIComponent( key ) }=${ encodeURIComponent( value ) }` )
					.join( '&' );

				const result = apiMap.get( payload );
				if ( result ) {
					return result;
				} else {
					throw new Error( `Unexpected API request:\n${ payload }` );
				}
			}
		};
		mw.Title = MockTitle;
	} );

	afterEach( () => {
		if ( originalConfig ) {
			mw.config = originalConfig;
		} else {
			delete mw.config;
		}
		if ( originalForeignApi ) {
			mw.ForeignApi = originalForeignApi;
		} else {
			delete mw.ForeignApi;
		}
		if ( originalTitle ) {
			mw.Title = originalTitle;
		} else {
			delete mw.Title;
		}
	} );

	it( 'generates expected results', async () => {
		const london = 'Q84';
		const english = 'en';
		const json = await useMediaSearchResults(
			london,
			english,
			10,
			apiExclude
		);
		const expected = require( './files/mediaSearchCombined.json' );
		expect( json ).toEqual( expected );
	} );
} );
