/**
 * smartcrop.js
 * A javascript library implementing content aware image cropping
 *
 * Copyright (C) 2018 Jonas Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

( function () {
	'use strict';

	const smartcrop = {};
	// Promise implementation to use
	function NoPromises() {
		throw new Error( 'No native promises and smartcrop.Promise not set.' );
	}

	smartcrop.Promise = typeof Promise !== 'undefined' ? Promise : NoPromises;

	smartcrop.DEFAULTS = {
		width: 0,
		height: 0,
		aspect: 0,
		cropWidth: 0,
		cropHeight: 0,
		detailWeight: 0.2,
		skinColor: [ 0.78, 0.57, 0.44 ],
		skinBias: 0.01,
		skinBrightnessMin: 0.2,
		skinBrightnessMax: 1.0,
		skinThreshold: 0.8,
		skinWeight: 1.8,
		saturationBrightnessMin: 0.05,
		saturationBrightnessMax: 0.9,
		saturationThreshold: 0.4,
		saturationBias: 0.2,
		saturationWeight: 0.1,
		// Step * minscale rounded down to the next power of two should be good
		scoreDownSample: 8,
		step: 8,
		scaleStep: 0.1,
		minScale: 1.0,
		maxScale: 1.0,
		edgeRadius: 0.4,
		edgeWeight: -20.0,
		outsideImportance: -0.5,
		boostWeight: 100.0,
		ruleOfThirds: true,
		prescale: true,
		imageOperations: null,
		canvasFactory: defaultCanvasFactory,
		// Factory: defaultFactories,
		debug: false
	};

	smartcrop.crop = function ( inputImage, options_, callback ) {
		const options = extend( {}, smartcrop.DEFAULTS, options_ );

		if ( options.aspect ) {
			options.width = options.aspect;
			options.height = 1;
		}

		if ( options.imageOperations === null ) {
			options.imageOperations = canvasImageOperations( options.canvasFactory );
		}

		const iop = options.imageOperations;

		let scale = 1;
		let prescale = 1;

		// open the image
		return iop
			.open( inputImage, options.input )
			.then( function ( image ) {
				// calculate desired crop dimensions based on the image size
				if ( options.width && options.height ) {
					scale = min(
						image.width / options.width,
						image.height / options.height
					);
					options.cropWidth = ~~( options.width * scale );
					options.cropHeight = ~~( options.height * scale );
					// Img = 100x100, width = 95x95, scale = 100/95, 1/scale > min
					// don't set minscale smaller than 1/scale
					// -> don't pick crops that need upscaling
					options.minScale = min(
						options.maxScale,
						max( 1 / scale, options.minScale )
					);

					// prescale if possible
					if ( options.prescale !== false ) {
						prescale = min( max( 256 / image.width, 256 / image.height ), 1 );
						if ( prescale < 1 ) {
							image = iop.resample(
								image,
								image.width * prescale,
								image.height * prescale
							);
							options.cropWidth = ~~( options.cropWidth * prescale );
							options.cropHeight = ~~( options.cropHeight * prescale );
							if ( options.boost ) {
								options.boost = options.boost.map( function ( boost ) {
									return {
										x: ~~( boost.x * prescale ),
										y: ~~( boost.y * prescale ),
										width: ~~( boost.width * prescale ),
										height: ~~( boost.height * prescale ),
										weight: boost.weight
									};
								} );
							}
						} else {
							prescale = 1;
						}
					}
				}
				return image;
			} )
			.then( function ( image ) {
				return iop.getData( image ).then( function ( data ) {
					const result = analyse( options, data );

					const crops = result.crops || [ result.topCrop ];
					for ( let i = 0, iLen = crops.length; i < iLen; i++ ) {
						const crop = crops[ i ];
						crop.x = ~~( crop.x / prescale );
						crop.y = ~~( crop.y / prescale );
						crop.width = ~~( crop.width / prescale );
						crop.height = ~~( crop.height / prescale );
					}
					if ( callback ) {
						callback( result );
					}
					return result;
				} );
			} );
	};

	// Check if all the dependencies are there
	// todo:
	smartcrop.isAvailable = function ( options ) {
		if ( !smartcrop.Promise ) {
			return false;
		}

		const canvasFactory = options ? options.canvasFactory : defaultCanvasFactory;

		if ( canvasFactory === defaultCanvasFactory ) {
			const c = document.createElement( 'canvas' );
			if ( !c.getContext( '2d' ) ) {
				return false;
			}
		}

		return true;
	};

	function edgeDetect( i, o ) {
		const id = i.data;
		const od = o.data;
		const w = i.width;
		const h = i.height;

		for ( let y = 0; y < h; y++ ) {
			for ( let x = 0; x < w; x++ ) {
				const p = ( y * w + x ) * 4;
				var lightness;

				if ( x === 0 || x >= w - 1 || y === 0 || y >= h - 1 ) {
					lightness = sample( id, p );
				} else {
					lightness =
            sample( id, p ) * 4 -
            sample( id, p - w * 4 ) -
            sample( id, p - 4 ) -
            sample( id, p + 4 ) -
            sample( id, p + w * 4 );
				}

				od[ p + 1 ] = lightness;
			}
		}
	}

	function skinDetect( options, i, o ) {
		const id = i.data;
		const od = o.data;
		const w = i.width;
		const h = i.height;

		for ( let y = 0; y < h; y++ ) {
			for ( let x = 0; x < w; x++ ) {
				const p = ( y * w + x ) * 4;
				const lightness = cie( id[ p ], id[ p + 1 ], id[ p + 2 ] ) / 255;
				const skin = skinColor( options, id[ p ], id[ p + 1 ], id[ p + 2 ] );
				const isSkinColor = skin > options.skinThreshold;
				const isSkinBrightness =
          lightness >= options.skinBrightnessMin &&
          lightness <= options.skinBrightnessMax;
				if ( isSkinColor && isSkinBrightness ) {
					od[ p ] =
            ( skin - options.skinThreshold ) *
            ( 255 / ( 1 - options.skinThreshold ) );
				} else {
					od[ p ] = 0;
				}
			}
		}
	}

	function saturationDetect( options, i, o ) {
		const id = i.data;
		const od = o.data;
		const w = i.width;
		const h = i.height;
		for ( let y = 0; y < h; y++ ) {
			for ( let x = 0; x < w; x++ ) {
				const p = ( y * w + x ) * 4;

				const lightness = cie( id[ p ], id[ p + 1 ], id[ p + 2 ] ) / 255;
				const sat = saturation( id[ p ], id[ p + 1 ], id[ p + 2 ] );

				const acceptableSaturation = sat > options.saturationThreshold;
				const acceptableLightness =
          lightness >= options.saturationBrightnessMin &&
          lightness <= options.saturationBrightnessMax;
				if ( acceptableLightness && acceptableSaturation ) {
					od[ p + 2 ] =
            ( sat - options.saturationThreshold ) *
            ( 255 / ( 1 - options.saturationThreshold ) );
				} else {
					od[ p + 2 ] = 0;
				}
			}
		}
	}

	function applyBoosts( options, output ) {
		if ( !options.boost ) {
			return;
		}
		const od = output.data;
		for ( var i = 0; i < output.width; i += 4 ) {
			od[ i + 3 ] = 0;
		}
		for ( i = 0; i < options.boost.length; i++ ) {
			applyBoost( options.boost[ i ], options, output );
		}
	}

	function applyBoost( boost, options, output ) {
		const od = output.data;
		const w = output.width;
		const x0 = ~~boost.x;
		const x1 = ~~( boost.x + boost.width );
		const y0 = ~~boost.y;
		const y1 = ~~( boost.y + boost.height );
		const weight = boost.weight * 255;
		for ( let y = y0; y < y1; y++ ) {
			for ( let x = x0; x < x1; x++ ) {
				const i = ( y * w + x ) * 4;
				od[ i + 3 ] += weight;
			}
		}
	}

	function generateCrops( options, width, height ) {
		const results = [];
		const minDimension = min( width, height );
		const cropWidth = options.cropWidth || minDimension;
		const cropHeight = options.cropHeight || minDimension;
		for (
			let scale = options.maxScale;
			scale >= options.minScale;
			scale -= options.scaleStep
		) {
			for ( let y = 0; y + cropHeight * scale <= height; y += options.step ) {
				for ( let x = 0; x + cropWidth * scale <= width; x += options.step ) {
					results.push( {
						x: x,
						y: y,
						width: cropWidth * scale,
						height: cropHeight * scale
					} );
				}
			}
		}
		return results;
	}

	function score( options, output, crop ) {
		const result = {
			detail: 0,
			saturation: 0,
			skin: 0,
			boost: 0,
			total: 0
		};

		const od = output.data;
		const downSample = options.scoreDownSample;
		const invDownSample = 1 / downSample;
		const outputHeightDownSample = output.height * downSample;
		const outputWidthDownSample = output.width * downSample;
		const outputWidth = output.width;

		for ( let y = 0; y < outputHeightDownSample; y += downSample ) {
			for ( let x = 0; x < outputWidthDownSample; x += downSample ) {
				const p =
          ( ~~( y * invDownSample ) * outputWidth + ~~( x * invDownSample ) ) * 4;
				const i = importance( options, crop, x, y );
				const detail = od[ p + 1 ] / 255;

				result.skin += ( od[ p ] / 255 ) * ( detail + options.skinBias ) * i;
				result.detail += detail * i;
				result.saturation +=
          ( od[ p + 2 ] / 255 ) * ( detail + options.saturationBias ) * i;
				result.boost += ( od[ p + 3 ] / 255 ) * i;
			}
		}

		result.total =
      ( result.detail * options.detailWeight +
        result.skin * options.skinWeight +
        result.saturation * options.saturationWeight +
        result.boost * options.boostWeight ) /
      ( crop.width * crop.height );
		return result;
	}

	function importance( options, crop, x, y ) {
		if (
			crop.x > x ||
      x >= crop.x + crop.width ||
      crop.y > y ||
      y >= crop.y + crop.height
		) {
			return options.outsideImportance;
		}
		x = ( x - crop.x ) / crop.width;
		y = ( y - crop.y ) / crop.height;
		const px = abs( 0.5 - x ) * 2;
		const py = abs( 0.5 - y ) * 2;
		// Distance from edge
		const dx = Math.max( px - 1.0 + options.edgeRadius, 0 );
		const dy = Math.max( py - 1.0 + options.edgeRadius, 0 );
		const d = ( dx * dx + dy * dy ) * options.edgeWeight;
		let s = 1.41 - sqrt( px * px + py * py );
		if ( options.ruleOfThirds ) {
			s += Math.max( 0, s + d + 0.5 ) * 1.2 * ( thirds( px ) + thirds( py ) );
		}
		return s + d;
	}
	smartcrop.importance = importance;

	function skinColor( options, r, g, b ) {
		const mag = sqrt( r * r + g * g + b * b );
		const rd = r / mag - options.skinColor[ 0 ];
		const gd = g / mag - options.skinColor[ 1 ];
		const bd = b / mag - options.skinColor[ 2 ];
		const d = sqrt( rd * rd + gd * gd + bd * bd );
		return 1 - d;
	}

	function analyse( options, input ) {
		const result = {};
		const output = new ImgData( input.width, input.height );

		edgeDetect( input, output );
		skinDetect( options, input, output );
		saturationDetect( options, input, output );
		applyBoosts( options, output );

		const scoreOutput = downSample( output, options.scoreDownSample );

		let topScore = -Infinity;
		let topCrop = null;
		const crops = generateCrops( options, input.width, input.height );

		for ( let i = 0, iLen = crops.length; i < iLen; i++ ) {
			const crop = crops[ i ];
			crop.score = score( options, scoreOutput, crop );
			if ( crop.score.total > topScore ) {
				topCrop = crop;
				topScore = crop.score.total;
			}
		}

		result.topCrop = topCrop;

		if ( options.debug && topCrop ) {
			result.crops = crops;
			result.debugOutput = output;
			result.debugOptions = options;
			// Create a copy which will not be adjusted by the post scaling of smartcrop.crop
			result.debugTopCrop = extend( {}, result.topCrop );
		}
		return result;
	}

	function ImgData( width, height, data ) {
		this.width = width;
		this.height = height;
		if ( data ) {
			this.data = new Uint8ClampedArray( data );
		} else {
			this.data = new Uint8ClampedArray( width * height * 4 );
		}
	}
	smartcrop.ImgData = ImgData;

	function downSample( input, factor ) {
		const idata = input.data;
		const iwidth = input.width;
		const width = Math.floor( input.width / factor );
		const height = Math.floor( input.height / factor );
		const output = new ImgData( width, height );
		const data = output.data;
		const ifactor2 = 1 / ( factor * factor );
		for ( let y = 0; y < height; y++ ) {
			for ( let x = 0; x < width; x++ ) {
				const i = ( y * width + x ) * 4;

				let r = 0;
				let g = 0;
				let b = 0;
				let a = 0;

				let mr = 0;
				let mg = 0;

				for ( let v = 0; v < factor; v++ ) {
					for ( let u = 0; u < factor; u++ ) {
						const j = ( ( y * factor + v ) * iwidth + ( x * factor + u ) ) * 4;
						r += idata[ j ];
						g += idata[ j + 1 ];
						b += idata[ j + 2 ];
						a += idata[ j + 3 ];
						mr = Math.max( mr, idata[ j ] );
						mg = Math.max( mg, idata[ j + 1 ] );
						// unused
						// mb = Math.max(mb, idata[j + 2]);
					}
				}
				// this is some funky magic to preserve detail a bit more for
				// skin (r) and detail (g). Saturation (b) does not get this boost.
				data[ i ] = r * ifactor2 * 0.5 + mr * 0.5;
				data[ i + 1 ] = g * ifactor2 * 0.7 + mg * 0.3;
				data[ i + 2 ] = b * ifactor2;
				data[ i + 3 ] = a * ifactor2;
			}
		}
		return output;
	}
	smartcrop._downSample = downSample;

	function defaultCanvasFactory( w, h ) {
		const c = document.createElement( 'canvas' );
		c.width = w;
		c.height = h;
		return c;
	}

	function canvasImageOperations( canvasFactory ) {
		return {
			// Takes imageInput as argument
			// returns an object which has at least
			// {width: n, height: n}
			open: function ( image ) {
				// Work around images scaled in css by drawing them onto a canvas
				const w = image.naturalWidth || image.width;
				const h = image.naturalHeight || image.height;
				const c = canvasFactory( w, h );
				const ctx = c.getContext( '2d' );
				if (
					image.naturalWidth &&
          ( image.naturalWidth != image.width ||
            image.naturalHeight != image.height )
				) {
					c.width = image.naturalWidth;
					c.height = image.naturalHeight;
				} else {
					c.width = image.width;
					c.height = image.height;
				}
				ctx.drawImage( image, 0, 0 );
				return smartcrop.Promise.resolve( c );
			},
			// Takes an image (as returned by open), and changes it's size by resampling
			resample: function ( image, width, height ) {
				return Promise.resolve( image ).then( function ( image ) {
					const c = canvasFactory( ~~width, ~~height );
					const ctx = c.getContext( '2d' );

					ctx.drawImage(
						image,
						0,
						0,
						image.width,
						image.height,
						0,
						0,
						c.width,
						c.height
					);
					return smartcrop.Promise.resolve( c );
				} );
			},
			getData: function ( image ) {
				return Promise.resolve( image ).then( function ( c ) {
					const ctx = c.getContext( '2d' );
					const id = ctx.getImageData( 0, 0, c.width, c.height );
					return new ImgData( c.width, c.height, id.data );
				} );
			}
		};
	}
	smartcrop._canvasImageOperations = canvasImageOperations;

	// Aliases and helpers
	var min = Math.min;
	var max = Math.max;
	var abs = Math.abs;
	var sqrt = Math.sqrt;

	function extend( o ) {
		for ( let i = 1, iLen = arguments.length; i < iLen; i++ ) {
			const arg = arguments[ i ];
			if ( arg ) {
				for ( const name in arg ) {
					o[ name ] = arg[ name ];
				}
			}
		}
		return o;
	}

	// Gets value in the range of [0, 1] where 0 is the center of the pictures
	// returns weight of rule of thirds [0, 1]
	function thirds( x ) {
		x = ( ( ( x - 1 / 3 + 1.0 ) % 2.0 ) * 0.5 - 0.5 ) * 16;
		return Math.max( 1.0 - x * x, 0.0 );
	}

	function cie( r, g, b ) {
		return 0.5126 * b + 0.7152 * g + 0.0722 * r;
	}
	function sample( id, p ) {
		return cie( id[ p ], id[ p + 1 ], id[ p + 2 ] );
	}
	function saturation( r, g, b ) {
		const maximum = max( r / 255, g / 255, b / 255 );
		const minimum = min( r / 255, g / 255, b / 255 );

		if ( maximum === minimum ) {
			return 0;
		}

		const l = ( maximum + minimum ) / 2;
		const d = maximum - minimum;

		return l > 0.5 ? d / ( 2 - maximum - minimum ) : d / ( maximum + minimum );
	}

	// Amd
	if ( typeof define !== 'undefined' && define.amd ) {
		define( function () {
			return smartcrop;
		} );
	}
	// Common js
	if ( typeof exports !== 'undefined' ) {
		exports.smartcrop = smartcrop;
	} else if ( typeof navigator !== 'undefined' )
	// Browser
	{
		window.SmartCrop = window.smartcrop = smartcrop;
	}
	// Nodejs
	if ( typeof module !== 'undefined' ) {
		module.exports = smartcrop;
	}
}() );
