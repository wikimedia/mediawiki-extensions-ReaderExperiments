// Defaults from MMV's MediaViewerExtensions config map
// This is used in MMV both for limiting which extensions
// get in the photo viewer and which frontend display classes
// get used.
//
// In Wikimedia production, 'stl' is also set, for 3D objects,
// but I think we want that excluded here for now.
//
// We may want to exclude SVG as well, this can be done here
// if we decide on that.
const extensions = {
	djvu: 'default',
	jpg: 'default',
	jpeg: 'default',
	gif: 'default',
	svg: 'default',
	png: 'default',
	tiff: 'default',
	tif: 'default',
	webp: 'default'
};

/**
 * Extract data from a live or hidden thumbnail in the content area
 * of the wiki page, with a tiny bit of metadata.
 *
 * @todo add specific data extractors as needed
 *
 * @param {Element} thumb
 * @return {import("./types").ThumbnailImageData}
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

		/**
		 * @property {string} name target name of the file, extracted from thumb URLs
		 */
		item.name = parsed.name;

		/**
		 * A function for producing new thumbnails with a target resolution on demand.
		 * May or may not work with MobileFrontendContentProvider...
		 * Pass the desired width in device pixels as a function to the string.
		 *
		 * @type {function(number): string}
		 */
		item.resizeUrl = parsed.resizeUrl;

		/**
		 * MediaWiki title object for the target file's File: page.
		 * For Commons images this will refer to the local shadow page,
		 * not the remote original.
		 *
		 * @property {mw.Title} title
		 */
		item.title = new mw.Title( 'File' + item.name );

		/**
		 * Lowercase-normalized source file extension. Note that actual
		 * thumbnail images may appear as different file types.
		 *
		 * @property {string} extension
		 */
		item.extension = item.title.getExtension().toLowerCase();

	} catch ( e ) {
		return null;
	}

	/**
	 * @property {string} alt the provided alt text for the thumbnail, if any
	 */
	item.alt = thumb.alt || thumb.dataset.mwAlt || null;

	/**
	 * @property {Element} thumb the original thumbnail; this may change if
	 * lazy loading is active, so beware
	 */
	item.thumb = thumb;

	/**
	 * @property {?Element} link the wrapping 'a' link element, if any
	 */
	item.link = thumb.closest(
		'a.mw-file-description, a.image'
	);

	/**
	 * @property {?Element} container the thumbnail container, if present,
	 *                           encompassing the image and any caption
	 */
	item.container = thumb.closest(
		'[typeof*="mw:File"], [typeof*="mw:Image"], .thumb'
	);

	/**
	 * @property {Object} urls mapped by width.
	 * This will include the 1x src and any 1.5x and 2x sources in the srcset
	 * but will not automatically include any new renderings with resizeUrl.
	 */
	item.urls = mapThumbUrls( thumb );

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
 * Images in a class="metadata" or class="noviewer" will be excluded from the
 * list, matching MMV's behavior, and this should prevent most navigational
 * icons from showing up in results.
 *
 * Images that appear in an infobox will be excluded as we don't want to
 * repeat them immediately right above themselves, and these often include
 * flags and small maps we don't want to include in the photo carousel.
 *
 * Selectors for fetching parsoid-rendered and legacy-rendered images are
 * based on mmv.bootstrap.js's processThumbs function.
 *
 * @todo MMV also has an allow-list of extensions in config. may need to replicate this.
 *
 * @param {Element} content
 * @return {import("./types").ThumbnailImageData[]}
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
 * Make sure the thumb doesn't match any MMV-derived or Carousel-specific
 * exclusions.
 *
 * @param {Object} info
 * @return {boolean} true if it's ok to use
 */
function isIncludedThumbInfo( info ) {
	return isValidExtension( info.title ) &&
		isAllowedThumb( info.thumb ) &&
		!( info.extension === 'svg' && isInfoboxThumb( info.thumb ) );
}

/**
 * Extract the known thumbnail URLs from a given live thumb or placeholder
 * for lazy-loader as a map of widths to URLs.
 *
 * @param {HTMLImageElement|HTMLSpanElement} thumb
 * @return {Object}
 */
function mapThumbUrls( thumb ) {
	const src = thumb.src || thumb.dataset.mwSrc;
	const srcset = thumb.srcset || thumb.dataset.mwSrcset;
	const width = thumb.width || thumb.dataset.width;
	const height = thumb.height || thumb.dataset.height;

	const thumbs = {};
	if ( !width || !height ) {
		return thumbs;
	}

	if ( src ) {
		try {
			const parsed = mw.util.parseImageUrl( src );
			const thumbWidth = parsed.width;
			const thumbHeight = Math.round( parsed.width * height / width );
			thumbs[ thumbWidth ] = {
				width: thumbWidth,
				height: thumbHeight,
				src: src
			};
		} catch ( e ) {
			// Skip non-parseable thumb URLs
		}
	}
	if ( srcset ) {
		/* eslint-disable max-len */
		// "//upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Portland_Oregon_Aerial%2C_June_2025.jpg/500px-Portland_Oregon_Aerial%2C_June_2025.jpg 1.5x,
		// //upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Portland_Oregon_Aerial%2C_June_2025.jpg/960px-Portland_Oregon_Aerial%2C_June_2025.jpg 2x"
		/* eslint-enable max-len */

		const regex = /\s*([^,\s][^\s]+[^,\s])\s+(\d+(?:\.\d+)?)(w|x)\w*(,|$)/y;

		let matches = regex.exec( srcset );
		while ( matches ) {
			const thumbSrc = matches[ 1 ];
			// we're not going to need the density factor here
			// const scale = parseFloat( matches[ 2 ] );
			const type = matches[ 3 ];

			if ( type === 'x' ) {
				try {
					// The rendered thumbnails may be bucketed to specific actual
					// sizes, so don't rely on the stated sizes on the <img>!
					// Use the ones from the URLs do we know what sizes we actually
					// have to work with.
					// Heights will be approximated of necessity.

					const parsed = mw.util.parseImageUrl( thumbSrc );
					const thumbWidth = parsed.width;
					const thumbHeight = Math.round( parsed.width * width / height );

					thumbs[ thumbWidth ] = {
						width: thumbWidth,
						height: thumbHeight,
						src: thumbSrc
					};
				} catch ( e ) {
					// Skip non-parseable thumb URLs
				}
			}
			matches = regex.exec( srcset );
		}
	}
	return thumbs;
}

/**
 * @param {Element} container The DOM element container for the thumbnail
 * @return {string|null}
 */
function getCaptionTextIfAvailable( container ) {
	if ( container.querySelector( 'figcaption' ) ) {
		return container.querySelector( 'figcaption' ).innerHTML;
	} else {
		return null;
	}
}

module.exports = {
	extractThumbInfo,
	getCaptionTextIfAvailable
};
