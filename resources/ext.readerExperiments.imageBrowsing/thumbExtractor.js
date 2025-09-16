const excludedImageClasses = require( './excludedImageClasses.js' );

// Defaults from MMV's MediaViewerExtensions config map
// This is used in MMV both for limiting which extensions
// get in the photo viewer and which frontend display classes
// get used.
//
// In Wikimedia production, 'stl' is also set, for 3D objects,
// but I think we want that excluded here for now.
//
// Allow-list of file extensions,
// based on https://commons.wikimedia.org/wiki/Special:MediaStatistics.
//
// Remove an item to exclude all images with that file extension from the extraction.
const extensions = {
	bmp: 'default',
	djv: 'default',
	djvu: 'default',
	gif: 'default',
	jpg: 'default',
	jpeg: 'default',
	jpe: 'default',
	jps: 'default',
	png: 'default',
	apng: 'default',
	svg: 'default',
	tif: 'default',
	tiff: 'default',
	webp: 'default',
	xcf: 'default'
};

/**
 * @typedef {import('types-mediawiki')} MediaWikiTypes
 */

/**
 * Extract data from a live or hidden thumbnail in the content area
 * of the wiki page, with a tiny bit of metadata.
 *
 * @todo add specific data extractors as needed
 *
 * @param {Element} thumb
 * @return {import('./types').ImageData|null}
 */
function thumbInfo( thumb ) {
	const item = {};

	/* eslint-disable max-len */
	/*
	<img alt="Tilikum Crossing"
	 src="//upload.wikimedia.org/wikipedia/commons/thumb/2/24/Tilikum_Crossing_with_streetcar_and_MAX_train_in_2016.jpg/250px-Tilikum_Crossing_with_streetcar_and_MAX_train_in_2016.jpg"
	 decoding="async"
	 width="159"
	 height="75"
	 class="mw-file-element"
	 srcset="//upload.wikimedia.org/wikipedia/commons/thumb/2/24/Tilikum_Crossing_with_streetcar_and_MAX_train_in_2016.jpg/330px-Tilikum_Crossing_with_streetcar_and_MAX_train_in_2016.jpg 2x"
	 data-file-width="1224"
	 data-file-height="581">

	<span class="lazy-image-placeholder"
	 style="width: 250px;height: 161px;"
	 data-mw-src="//upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Steam_tug_PORTLAND_-_Portland_Oregon.jpg/250px-Steam_tug_PORTLAND_-_Portland_Oregon.jpg"
	 data-width="250"
	 data-height="161"
	 data-mw-srcset="//upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Steam_tug_PORTLAND_-_Portland_Oregon.jpg/500px-Steam_tug_PORTLAND_-_Portland_Oregon.jpg 1.5x"
	 data-class="mw-file-element">&nbsp;</span>
	*/

	/* eslint-enable max-len */
	// Get the title from one of the thumb URLs...
	const url = thumb.src || thumb.dataset.mwSrc;
	try {
		const parsed = mw.util.parseImageUrl( url );

		if ( !parsed ) {
			return null;
		}

		/**
		 * target name of the file, extracted from thumb URLs
		 */
		item.name = parsed.name;

		/**
		 * A function for producing new thumbnails with a target resolution on demand.
		 * May or may not work with MobileFrontendContentProvider...
		 * Pass the desired width in device pixels as a function to the string.
		 *
		 * resizeUrl may not be available (e.g. when the url is not a thumbnail
		 * because it is already displayed at full size), in which case we'll
		 * opt to fall back to the known URL instead of nothing at all.
		 */
		item.resizeUrl = parsed.resizeUrl || ( () => url );

		/**
		 * MediaWiki title object for the target file's File: page.
		 * For Commons images this will refer to the local shadow page,
		 * not the remote original.
		 */
		item.title = new mw.Title( 'File:' + item.name );

		/**
		 * Lowercase-normalized source file extension. Note that actual
		 * thumbnail images may appear as different file types.
		 */
		const extension = item.title.getExtension();
		item.extension = extension ? extension.toLowerCase() : '';

	} catch ( e ) {
		return null;
	}

	/**
	 * the provided alt text for the thumbnail, if any
	 */
	item.alt = thumb.alt || thumb.dataset.mwAlt || null;

	/**
	 * the original thumbnail; this may change if lazy loading is active, so beware
	 */
	item.thumb = thumb;

	/**
	 * the wrapping 'a' link element, if any
	 */
	item.link = thumb.closest(
		'a.mw-file-description, a.image'
	);

	/**
	 * the thumbnail container, if present, encompassing the image and any caption
	 */
	item.container = thumb.closest(
		'[typeof*="mw:File"], [typeof*="mw:Image"], .thumb'
	);

	/**
	 * @property {?string} paragraph The thumbnail's nearby paragraph text in HTML format
	 */
	item.paragraph = findNearbyParagraph( item.container );

	/**
	 * HTML element of the figcaption if present.
	 */
	item.caption = item.container ? item.container.querySelector( 'figcaption' ) : null;

	/**
	 * src attribute on the original (or hidden) image
	 */
	item.src = thumb.src || thumb.dataset.mwSrc;

	/**
	 * srcset attribute on the original (or hidden) image
	 */
	item.srcset = thumb.srcset || thumb.dataset.mwSrcset;

	/**
	 * Specified width in CSS pixels on the original (or hidden) image
	 */
	item.width = thumb.width || thumb.dataset.width;

	/**
	 * Specified height in CSS pixels on the original (or hidden) image
	 */
	item.height = thumb.height || thumb.dataset.height;

	return item;
}

/**
 * Check the article page view for image thumbnails, using roughly the same
 * heuristics as MultimediaViewer. Returns an array of plain objects
 * referencing the various elements in the context of the HTML page with enough
 * metadata to make a gallery or carousel of available images and view them
 * in more detail later.
 *
 * Beware that thumbnail images below the fold may be lazy-loaded, so the
 * original thumbnail element is not returned, but a container and some
 * metadata.
 *
 * The following images are filtered out via `isIncludedThumbInfo`:
 *
 * - class="metadata" or class="noviewer", which should exclude most navigational icons.
 *   Matches MMV's behavior
 * - SVG images that appear in an infobox, as they're often
 *   flags and small maps we don't want to show in the photo carousel
 *
 * Selectors for fetching parsoid-rendered and legacy-rendered images are
 * based on mmv.bootstrap.js's processThumbs function.
 *
 * @param {Element} content
 * @return {import('./types').ImageData[]}
 */
function extractThumbInfo( content ) {
	const selectors = [
		// Parsoid thumbs
		'[typeof*="mw:File"] a.mw-file-description img',
		'[typeof*="mw:File"] a.mw-file-description .lazy-image-placeholder',

		// Legacy parser thumbs
		'.gallery .image img',
		'.gallery .image .lazy-image-placeholder',
		'a.image img',
		'a.image .lazy-image-placeholder',

		'a.mw-file-description img',
		'#file a img'
	];

	return Array.from( content.querySelectorAll( selectors.join( ', ' ) ) )
		.map( ( thumb ) => thumbInfo( thumb ) )
		.filter( isIncludedThumbInfo );
}

/**
 * Check for exclusions of images in certain non-content areas.
 *
 * Should be kept equivalent to MMV's isAllowedThumb implementation.
 *
 * @param {Element} thumb
 * @return {boolean} true if save to use for gallery purposes
 */
function isAllowedThumb( thumb ) {
	const selectors = [
		// this is inside an informational template like {{refimprove}} on enwiki.
		'.metadata',
		// MediaViewer has been specifically disabled for this image
		'.noviewer',
		// we are on an error page for a non-existing article, the image is part of some template
		'.noarticletext',
		'#siteNotice',
		// thumbnails of a slideshow gallery
		'ul.mw-gallery-slideshow li.gallerybox'
	];
	return !thumb.closest( selectors.join( ', ' ) );
}

/**
 * Check if a given title has a grokkable file extension on it.
 * If not we may exclude it on the assumption it is complex (eg PDF or STL).
 *
 * Based on the code from MMV; refactor both if we move this to production.
 *
 * @param {mw.Title|null} title
 * @return {boolean}
 */
function isValidExtension( title ) {
	return title && title.getExtension() && ( title.getExtension().toLowerCase() in extensions );
}

/**
 * Check if this thumbnail appears in an infobox template.
 *
 * Assumes all infoboxes use the 'infobox' class on their top-level table;
 * this can be expanded if necessary.
 *
 * @param {Element} thumb
 * @return {boolean} true if it's in the infobox, false otherwise
 */
function isInfoboxThumb( thumb ) {
	return !!thumb.closest( '.infobox' );
}

/**
 * Check if the image is excluded by any of the CSS classes
 *
 * @param {Element} thumb The image element
 * @return {boolean} Whether the image should be excluded. If true, then it's excluded.
 */
function isExcludedByClass( thumb ) {
	return excludedImageClasses.some( ( className ) => thumb.closest( `.${ className }` ) );
}

/**
 * Make sure the thumb doesn't match any MMV-derived or Carousel-specific
 * exclusions.
 *
 * @param {Object} info
 * @return {boolean} true if it's ok to use
 */
function isIncludedThumbInfo( info ) {
	// The file extension is in the `extensions` allow-list
	return isValidExtension( info.title ) &&
		// The image element doesn't have exclusion markup
		isAllowedThumb( info.thumb ) &&
		// The image isn't an SVG that appears in an infobox
		!( info.extension === 'svg' && isInfoboxThumb( info.thumb ) ) &&
		// The image isn't excluded by CSS classes
		!isExcludedByClass( info.thumb );
}

/**
 * @param {Element|null} container The DOM element container for the thumbnail
 * @return {string|null} the caption's HTML string, if any
 */
function getCaptionIfAvailable( container ) {
	if ( container && container.querySelector( 'figcaption' ) ) {
		return container.querySelector( 'figcaption' ).innerHTML;
	} else {
		return null;
	}
}

/**
 * Find the first next sibling non-empty paragraph element from the image container.
 *
 * @param {Element|null} container - The image container element
 * @return {?{string}}  The paragraph data or null if none found
 */
function findNearbyParagraph( container ) {
	if ( !container ) {
		return null;
	}

	// Check sibling paragraphs first, excludes table images such as infobox
	let currentElement = container.nextElementSibling;
	while ( currentElement ) {
		if ( currentElement.tagName === 'P' && !currentElement.closest( 'table' ) ) {
			const result = currentElement.innerHTML;
			if ( result ) {
				return result;
			}
		}
		currentElement = currentElement.nextElementSibling;
	}

	return null;
}

module.exports = {
	extractThumbInfo,
	getCaptionIfAvailable
};
