const { extractThumbInfo } = require( '../thumbExtractor.js' );

const cacheContentImages = new WeakMap();

/**
 * @param {Element} element
 * @return {import('./types').ImageData[]}
 */
module.exports = function useContentImages( element ) {
	if ( cacheContentImages.has( element ) ) {
		return cacheContentImages.get( element );
	}

	// Grab all image info, removing those that failed to parse
	const images = extractThumbInfo( element ).filter( ( img ) => img.name );
	const uniqueImages = images.filter( ( image, i ) => {
		const firstIndex = images.findIndex( ( img ) => img.title.getPrefixedDb() === image.title.getPrefixedDb() );
		return i === firstIndex;
	} );

	cacheContentImages.set( element, uniqueImages );
	return uniqueImages;
};
