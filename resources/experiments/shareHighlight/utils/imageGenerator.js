/**
 * Image generation utilities for converting DOM elements to images.
 * Uses html-to-image library for reliable DOM-to-canvas conversion.
 */

const htmlToImage = require( 'ext.readerExperiments/lib/html-to-image' );

/**
 * Generate a PNG image blob from a DOM element.
 *
 * The background color is read from the element's computed style.
 *
 * @param {HTMLElement} element - The DOM element to capture
 * @param {Object} [options] - Generation options
 * @param {number} [options.scale] - Pixel density multiplier (default: 2 for retina)
 * @return {Promise<Blob>} PNG image as Blob
 */
function generateImageBlob( element, options ) {
	const scale = ( options && options.scale ) || 2;
	const backgroundColor = window.getComputedStyle( element ).backgroundColor;
	// Force the captured PNG to the card's natural size, regardless of
	// any preview-scaling the dialog applies to the live element:
	//   - `width` / `height`: pin the SVG dimensions html-to-image
	//     creates to the card's natural clientWidth/clientHeight, in
	//     case the library's own measurement gets thrown off by the
	//     live transform.
	//   - `style.transform: 'none'`: override the cascade-copied
	//     `transform: scale(...)` on the clone so its content renders
	//     at natural size instead of the preview scale.
	//   - `style.transformOrigin: '0 0'`: prevent inlineCss's separate
	//     transformOrigin write from offsetting the clone within the
	//     foreignObject (the dialog's CSS sets origin `top center`,
	//     which would otherwise leave a horizontal gap).
	// The live preview is untouched; only html-to-image's clone is
	// affected by these overrides.
	const toBlobOptions = {
		pixelRatio: scale,
		width: element.clientWidth,
		height: element.clientHeight,
		style: {
			transform: 'none',
			transformOrigin: '0 0'
		},
		// Skip elements that might cause issues
		filter: function ( node ) {
			// Skip script tags
			if ( node.tagName === 'SCRIPT' ) {
				return false;
			}
			return true;
		}
	};

	if ( backgroundColor ) {
		toBlobOptions.backgroundColor = backgroundColor;
	}

	// Use html-to-image's toCanvas (not toBlob) so we can paint the
	// article photo onto the returned canvas before converting to a
	// PNG blob. iOS Safari fails to inline the photo into html-to-
	// image's foreignObject (T426344, see overdrawArticlePhoto for
	// details). The IMG element on the page already has the bitmap
	// loaded; reading it back via drawImage bypasses every fetch and
	// CORS-cache concern in the html-to-image inlining path.
	return htmlToImage.toCanvas( element, toBlobOptions ).then( ( canvas ) => {
		overdrawArticlePhoto( canvas, element, scale );
		return new Promise( ( resolve, reject ) => {
			canvas.toBlob( ( blob ) => {
				if ( !blob ) {
					reject( new Error( 'canvas.toBlob returned null' ) );
					return;
				}
				resolve( blob );
			}, 'image/png' );
		} );
	} );
}

/**
 * Paint the article photo onto the canvas html-to-image returned. The
 * photo is the only piece of the QuoteCard that html-to-image's
 * foreignObject pipeline fails to render reliably on iOS Safari
 * (T426344) — the surrounding text, SVG branding, and layout all come
 * through fine. We let html-to-image do everything it does well, then
 * use the existing IMG element's already-decoded bitmap as the source
 * for a direct canvas drawImage at the photo slot's measured position.
 *
 * Position math note: html-to-image renders the cloned card at the
 * card's *natural* size (we pass `style: { transform: 'none' }` to
 * override the dialog's preview-scaling on the clone). getBoundingClientRect
 * on the live element returns *transformed* coordinates, so to land the
 * overdraw at the right place we read the live transform's scale
 * factors and divide them back out before multiplying by pixelRatio.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} element
 * @param {number} pixelRatio
 */
function overdrawArticlePhoto( canvas, element, pixelRatio ) {
	const img = element.querySelector( 'img.ext-readerExperiments-quoteCard__image' );
	if ( !img || !img.complete || !img.naturalWidth ) {
		// eslint-disable-next-line no-console
		console.warn(
			'[shareHighlight] overdrawArticlePhoto: img missing or not ready',
			'(found=', !!img, 'complete=', img && img.complete, 'naturalWidth=', img && img.naturalWidth, ')'
		);
		return;
	}

	// Read the live card's transform scale (the dialog's preview
	// shrink) so we can convert its transformed getBoundingClientRect
	// values back into the natural CSS-pixel space the html-to-image
	// clone rendered in.
	let tScaleX = 1;
	let tScaleY = 1;
	const transformStr = window.getComputedStyle( element ).transform;
	if ( transformStr && transformStr !== 'none' ) {
		try {
			const m = new DOMMatrix( transformStr );
			tScaleX = m.a || 1;
			tScaleY = m.d || 1;
		} catch ( e ) {
			// Unparseable transform; fall back to identity.
		}
	}

	const cardRect = element.getBoundingClientRect();
	const imgRect = img.getBoundingClientRect();
	const dx = ( ( imgRect.left - cardRect.left ) / tScaleX ) * pixelRatio;
	const dy = ( ( imgRect.top - cardRect.top ) / tScaleY ) * pixelRatio;
	const dw = ( imgRect.width / tScaleX ) * pixelRatio;
	const dh = ( imgRect.height / tScaleY ) * pixelRatio;

	// Emulate CSS `object-fit: cover` + `object-position` via the
	// 9-arg drawImage source rectangle. The QuoteCard sets
	// `object-fit: cover; object-position: center top` for the photo.
	const imgCs = window.getComputedStyle( img );
	const crop = computeObjectFitCrop( img, dw, dh, imgCs.objectFit, imgCs.objectPosition );

	const ctx = canvas.getContext( '2d' );
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	try {
		ctx.drawImage( img, crop.sx, crop.sy, crop.sw, crop.sh, dx, dy, dw, dh );
	} catch ( e ) {
		// eslint-disable-next-line no-console
		console.warn( '[shareHighlight] overdrawArticlePhoto: drawImage failed', e );
	}
}

/**
 * Compute the source rectangle for drawImage to emulate CSS
 * object-fit + object-position when blitting `img` into a `dstW × dstH`
 * destination.
 *
 * @param {HTMLImageElement} img
 * @param {number} dstW
 * @param {number} dstH
 * @param {string} objectFit
 * @param {string} objectPosition
 * @return {{sx: number, sy: number, sw: number, sh: number}}
 */
function computeObjectFitCrop( img, dstW, dstH, objectFit, objectPosition ) {
	const srcW = img.naturalWidth;
	const srcH = img.naturalHeight;
	if ( objectFit !== 'cover' ) {
		return { sx: 0, sy: 0, sw: srcW, sh: srcH };
	}
	const dstAspect = dstW / dstH;
	const srcAspect = srcW / srcH;
	if ( srcAspect > dstAspect ) {
		// Source is wider than the destination — crop horizontally.
		const sw = srcH * dstAspect;
		const sx = ( srcW - sw ) * parseObjectPositionAxis( objectPosition, 0 );
		return { sx: sx, sy: 0, sw: sw, sh: srcH };
	}
	// Source is taller than the destination — crop vertically.
	const sh = srcW / dstAspect;
	const sy = ( srcH - sh ) * parseObjectPositionAxis( objectPosition, 1 );
	return { sx: 0, sy: sy, sw: srcW, sh: sh };
}

/**
 * Parse one axis (0=X, 1=Y) of a CSS `object-position` value to a
 * fraction in [0, 1].
 *
 * @param {string} str
 * @param {number} axis
 * @return {number}
 */
function parseObjectPositionAxis( str, axis ) {
	if ( !str ) {
		return 0.5;
	}
	const parts = str.trim().split( /\s+/ );
	const val = parts[ axis ] !== undefined ? parts[ axis ] : '50%';
	if ( val === 'top' || val === 'left' ) {
		return 0;
	}
	if ( val === 'bottom' || val === 'right' ) {
		return 1;
	}
	if ( val === 'center' || val === 'middle' ) {
		return 0.5;
	}
	if ( val.charAt( val.length - 1 ) === '%' ) {
		return parseFloat( val ) / 100;
	}
	return 0.5;
}

/**
 * Convert a Blob to a File object for Web Share API.
 *
 * @param {Blob} blob - Image blob
 * @param {string} [filename] - Desired filename
 * @return {File} File object suitable for navigator.share()
 */
function blobToFile( blob, filename ) {
	return new File( [ blob ], filename || 'wikipedia-quote.png', {
		type: blob.type || 'image/png',
		lastModified: Date.now()
	} );
}

/**
 * Trigger a download of a blob as a file.
 *
 * @param {Blob} blob - The blob to download
 * @param {string} [filename] - Desired filename
 */
function downloadBlob( blob, filename ) {
	const url = URL.createObjectURL( blob );
	const link = document.createElement( 'a' );
	link.href = url;
	link.download = filename || 'wikipedia-quote.png';
	document.body.appendChild( link );
	link.click();
	document.body.removeChild( link );
	URL.revokeObjectURL( url );
}

module.exports = {
	generateImageBlob: generateImageBlob,
	blobToFile: blobToFile,
	downloadBlob: downloadBlob
};
