const { ref } = require( 'vue' );
const { apiBaseUri } = require( '../config.json' );

/**
 * Thumbnail size to request must be a standard Wikimedia production thumbnail
 * size to ensure the thumbnail is cached and avoid rate limiting.
 * Refer to https://www.mediawiki.org/wiki/Common_thumbnail_sizes
 *
 * 960px is chosen because the QuoteCard renders at 2× pixel ratio on
 * a ~375px-wide mobile card, requiring ~750px effective width. 960px is the
 * smallest standard size that exceeds this threshold. 500px would be too small
 * and result in upscaling.
 *
 * @type {number}
 */
const THUMBNAIL_SIZE = 960;

/**
 * Minimum dimension (width and height) required for the original image.
 * Images smaller than this threshold are excluded to avoid poor quality in the
 * share card.
 *
 * @type {number}
 */
const MIN_ORIGINAL_DIMENSION = 500;

/**
 * Fetch the article's lead image from the PageImages API.
 *
 * Returns a reactive ref that starts as an empty object and is populated
 * once the API call resolves. If the page has no suitable lead image
 * (missing, or original dimensions below the minimum threshold),
 * the ref remains an empty object and the QuoteCard renders without an image.
 *
 * @return {{ import('vue').Ref<Object> }}
 */
module.exports = exports = function useLeadImage() {
	const leadImage = ref( {} );

	const api = apiBaseUri ?
		new mw.ForeignApi( apiBaseUri, { anonymous: true } ) :
		new mw.Api();

	api.get( {
		action: 'query',
		prop: 'pageimages',
		titles: mw.config.get( 'wgPageName' ),
		pithumbsize: THUMBNAIL_SIZE,
		piprop: 'name|original|thumbnail',
		formatversion: 2
	} ).then( ( response ) => {
		const pages = response.query && response.query.pages;
		if ( !pages || !pages.length ) {
			return;
		}

		const page = pages[ 0 ];
		const thumbnail = page.thumbnail;
		const original = page.original;

		if ( !thumbnail || !thumbnail.source ) {
			// No lead image for this article.
			return;
		}

		if ( original && (
			original.width < MIN_ORIGINAL_DIMENSION ||
			original.height < MIN_ORIGINAL_DIMENSION
		) ) {
			// Original image is too small for the share card.
			return;
		}

		leadImage.value = {
			name: page.pageimage || '',
			src: thumbnail.source,
			width: thumbnail.width,
			height: thumbnail.height
		};
	} ).catch( ( error ) => {
		// Lead image remains empty, resulting in a no-image quote card.
		mw.log.warn( 'ReaderExperiments: Failed to fetch lead image from PageImages API', error );
	} );

	return { leadImage };
};
