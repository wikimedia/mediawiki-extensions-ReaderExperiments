const { extractThumbInfo } = require( '../thumbExtractor.js' );

let cacheContentImages = null;

/**
 * @return {import('./types').ImageData[]}
 */
module.exports = function useContentImages() {
	if ( cacheContentImages !== null ) {
		return cacheContentImages;
	}

	// Extract thumbnail image (as an array of ImageData objects)
	// from the content of the underlying article page.
	const content = document.getElementById( 'content' );
	if ( !content ) {
		return [];
	}

	// Grab all image info, removing those that failed to parse
	cacheContentImages = extractThumbInfo( content ).filter( ( img ) => img.name );
	return cacheContentImages;
};
