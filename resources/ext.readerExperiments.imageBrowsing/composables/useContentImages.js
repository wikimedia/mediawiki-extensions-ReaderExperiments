const { extractThumbInfo } = require( '../thumbExtractor.js' );

const cacheContentImages = {};

/**
 * @param {Element} element
 * @return {import('./types').ImageData[]}
 */
module.exports = function useContentImages( element ) {
	if ( cacheContentImages[ element ] ) {
		return cacheContentImages[ element ];
	}

	// Grab all image info, removing those that failed to parse
	cacheContentImages[ element ] = extractThumbInfo( element ).filter( ( img ) => img.name );
	return cacheContentImages[ element ];
};
