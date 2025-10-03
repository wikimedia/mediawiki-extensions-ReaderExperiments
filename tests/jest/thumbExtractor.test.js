const { fullUrls } = require( '../../resources/ext.readerExperiments.imageBrowsing/thumbExtractor.js' );
describe( 'fullUrls', () => {

	it( 'passes through null', () => {
		expect( fullUrls( null ) ).toBe( null );
	} );
	it( 'passes through undefined', () => {
		expect( fullUrls( undefined ) ).toBe( undefined );
	} );
	it( 'passes through empty string', () => {
		expect( fullUrls( '' ) ).toBe( '' );
	} );

	const fake = 'upload.wikimedia.org/foo/bar';
	it( 'passes through non-URLs', () => {
		expect( fullUrls( fake ) ).toBe( fake );
	} );

	const http = 'http://upload.wikimedia.org/foo/bar';
	const httpSet = `${ http } 1x,${ http } 2x`;
	it( 'passes through http: URLs', () => {
		expect( fullUrls( http ) ).toBe( http );
		expect( fullUrls( httpSet ) ).toBe( httpSet );
	} );

	const https = 'https://upload.wikimedia.org/foo/bar';
	const httpsSet = `${ https } 1x,${ https } 2x`;
	it( 'passes through https: URLs', () => {
		expect( fullUrls( https ) ).toBe( https );
		expect( fullUrls( httpsSet ) ).toBe( httpsSet );
	} );

	const relative = '//upload.wikimedia.org/foo/bar';
	const relativeSet = `${ relative } 1x,${ relative } 2x`;
	it( 'converts protocol-relative URLs to https:', () => {
		expect( fullUrls( relative ) ).toBe( https );
		expect( fullUrls( relativeSet ) ).toBe( httpsSet );
	} );

} );
