<template>
	<div
		class="ib-cropped-image"
		:class="{
			'ib-cropped-image__loading': loading
		}"
		:style="{
			'--dominant-color-hex': dominantColorHex,
			'--dominant-color-contrasting': dominantColorContrasting,
			'--dominant-color-contrasting--legacy': dominantColorContrastingLegacy
		}"
	>
		<img
			ref="imageElement"
			:src="resizedSrc"
			:alt="altText"
			:style="cropStyle"
			crossorigin="anonymous"
			loading="lazy"
		>
		<div
			v-if="loading"
			class="ib-cropped-image__progress">
			<cdx-icon
				:icon="cdxIconImage"
				:aria-label="$i18n( 'readerexperiments-imagebrowsing-loading' )"
			></cdx-icon>
		</div>

		<slot></slot>
	</div>
</template>

<script>
const { ref, computed, defineComponent, useTemplateRef, watch, toRef } = require( 'vue' );
const { CdxIcon } = require( '@wikimedia/codex' );
const { thumbLimits } = require( '../config.json' );
const { cdxIconImage } = require( '../icons.json' );
const useBackgroundColor = require( '../composables/useBackgroundColor.js' );
const useSmartCrop = require( '../composables/useSmartCrop.js' );
const useAltText = require( '../composables/useAltText.js' );

/**
 * @typedef {import("../types").ImageData} ImageData
 */

// @vue/component
module.exports = exports = defineComponent( {
	name: 'DetailView',
	components: {
		CdxIcon
	},
	props: {
		image: {
			type: /** @type {import('vue').PropType<ImageData>} */ ( Object ),
			required: true
		}
	},
	setup( props ) {
		const imageElement = useTemplateRef( 'imageElement' );

		// Blank "image" to initialize src with (nit: this makes more sense than
		// an empty string, which is considered an error and can cause issues with
		// some of our code accessing properties of the Image element directly)
		const initSrc = 'data:,';
		const resizedSrc = ref( initSrc );
		const cropStyle = ref( {} );
		const loading = ref( true );

		// Background color
		const imageRef = toRef( props, 'image' );
		const color = useBackgroundColor( imageRef, imageElement );
		const dominantColorHex = computed( () => {
			return color.value ?
				color.value.hex :
				'var( --background-color-neutral, transparent )';
		} );
		const dominantColorContrasting = computed( () => {
			return color.value ?
				`oklch( from ${ color.value.hex } calc( l * ${ color.value.isDark ? 100 : 0 } ) c h )` :
				null;
		} );
		const dominantColorContrastingLegacy = computed( () => {
			return color.value ?
				( color.value.isDark ? 'white' : 'black' ) :
				null;
		} );

		// Orchestration of an image change. Since this is sequential logic
		// (image change -> loading -> change src -> calculate crop -> done loading),
		// we should theoretically be able to stack a bunch of computed properties
		// here, but it doesn't work so clean in practice because some of these steps
		// (change src -> calculate crop) require an additional tick between
		// <src change> and the DOM being updated, before we can calculate the crop.
		// The direct DOM manipulation for Firefox also further complicates things.
		// Aside from being a tricky orchestration through computed properties,
		// explicitly taking control of the flow here also makes the process much
		// more straightforward to follow.
		watch(
			() => imageElement.value !== null && props.image && props.image.name,
			async () => {
				if ( !imageElement.value ) {
					// Overlay was probably closed while we were shuffling updates.
					return;
				}
				if ( imageElement.value.src !== initSrc ) {
					// After we've set a new src, Firefox still seems to hold on to
					// the old image until the new has completed loading. We'd
					// rather not continue showing the old image, as that may cause
					// some confusion WRT the click was registered at all - we just
					// want to image to be blanked out so that the loading indicator
					// is visible. Looks like the trick is to set src to empty, which
					// is an invalid src argument, which seems to prompt Firefox to
					// actually discard the old src.
					// (Note: this is fine, that src will be overwritten with a valid
					// new url on next tick - we're generating it right after this)
					imageElement.value.src = '';
				}
				loading.value = true;

				// Get new image src and wait for DOM to update; i.e. <img> element
				// actually has the new src in there
				resizedSrc.value = getResizedSrc();

				// Bind handler for once the new image has completed loading (which
				// might kick off immediately, or might take a while given that
				// loading=lazy)
				const updateCropStyle = async () => {
					if ( !imageElement.value ) {
						// Overlay was probably closed, killing the live element.
						return;
					}
					imageElement.value.removeEventListener( 'load', updateCropStyle );

					// Calculate crop style for new image
					cropStyle.value = await getImageCropStyle();
					if ( cropStyle.value ) {
						// Only mark complete if we successfully calculated a crop
						// (which might not always be the case for crop calculations
						// that were aborted because e.g. another started loading in
						// the meantime)
						loading.value = false;
					}
				};
				imageElement.value.addEventListener( 'load', updateCropStyle );
			}
		);

		function getResizedSrc() {
			// Known dimensions of the area in which we want to display the image
			const displayWidth = imageElement.value.clientWidth;
			const displayHeight = imageElement.value.clientHeight;

			// Figure out the width needed for the image to cover the display area;
			// - for images with an aspect ratio lower than the display area (i.e.
			//   a height surplus; comparatively higher than they are wide), we can
			//   simply use the display width (as the height will be enough to cover)
			// - for the other (width surplus) kind of images, taking the display
			//   width does not suffice (as that would then not cover the full
			//   height) so we need to calculate the width based off of what height
			//   will cover the display area
			const imageAspectRatio = props.image.width / props.image.height;
			const coverWidth = Math.max(
				displayWidth, // image is taller
				Math.round( displayHeight * imageAspectRatio ) // image is wider
			);

			// For images that are smaller than or within 25% of the width of the
			// content image, use those instead of getting a resized version:
			// those are more likely to already be available (or if not, we'll be
			// preloading them for when they potentially scroll the content later),
			// so we can skip another http request
			if ( coverWidth <= props.image.width * 1.25 ) {
				return props.image.src;
			}

			// Take a list of standardized image rendering widths (e.g. 1280, 2560)
			// and find one that looks like it'll fit or exceed the required width;
			// using a standard size increases the chances of one being ready to
			// serve right away, having been rendered before.
			const acceptableWidths = thumbLimits.filter( ( limit ) => limit >= coverWidth );
			const standardizedWidth = acceptableWidths.length ?
				Math.min.apply( null, acceptableWidths ) :
				coverWidth;

			return props.image.resizeUrl( standardizedWidth );
		}

		async function getImageCropStyle() {
			const image = props.image;

			if ( !imageElement.value ) {
				// Image no longer present
				return;
			}

			if ( !imageElement.value.decode ) {
				// Ancient browser or the test suite; fail gracefully
				return;
			}

			try {
				// Wait for the image load to complete
				await imageElement.value.decode();
			} catch ( err ) {
				// Failure to decode image is very likely caused by the user
				// having clicked another one while this one was still loading,
				// which aborted the load of this one
				if ( image === props.image ) {
					// eslint-disable-next-line no-console
					console.error( '[SmartCrop] Failed to decode image: ', err );
				}
				return;
			}

			// We'll want to figure out the best crop for this image, but because
			// we've requested the image at a standardized size, the image
			// size likely won't match the display size exactly. To prevent
			// generating a crop on an area smaller than either the full width or
			// height of the image, we also need to adjust the crop dimensions.
			// E.g. display dimensions may be 100x100 & standardized image
			// dimensions could be 150x300: we don't want to generate a 100x100
			// crop within that image, but a maximal one, i.e. 150x150
			const imageWidth = imageElement.value.naturalWidth || imageElement.value.width;
			const imageHeight = imageElement.value.naturalHeight || imageElement.value.height;
			const imageAspectRatio = imageWidth / imageHeight;
			const cropAspectRatio = imageElement.value.clientWidth / imageElement.value.clientHeight;
			// image is taller
			let cropWidth = imageWidth;
			let cropHeight = Math.round( imageWidth * cropAspectRatio );
			if ( imageAspectRatio > cropAspectRatio ) {
				// image is wider
				cropWidth = Math.round( imageHeight * cropAspectRatio );
				cropHeight = imageHeight;
			}

			let crop;
			try {
				crop = await useSmartCrop( imageElement.value, cropWidth, cropHeight );
			} catch ( err ) {
				// eslint-disable-next-line no-console
				console.error( '[SmartCrop] Failed to crop:', err );
				return;
			}

			// Before we wrap up and return the generated crop style, let's first
			// make sure that we're still supposed to be showing this image in
			// the first place, and the user has not clicked on another while
			// we were still busy loading this one (in which case a different
			// iteration of this should already been in flight here)
			if ( image !== props.image ) {
				// eslint-disable-next-line no-console
				console.warn( '[SmartCrop] Stale result; ignoring.' );
				return;
			}

			if ( !crop || typeof crop.x !== 'number' || typeof crop.y !== 'number' ) {
				// eslint-disable-next-line no-console
				console.warn( '[SmartCrop] Missing/invalid crop; skipping.' );
				return;
			}

			// Center of crop in the SAME crop space
			const centerX = crop.x + crop.width / 2;
			const centerY = crop.y + crop.height / 2;

			// Convert to object-position percentages relative to the
			// SOURCE image SmartCrop analyzed
			const toPct = ( value, total ) => ( value / total ) * 100;
			const clamp = ( v ) => Math.max( 0, Math.min( 100, v ) );
			const xPercent = toPct( centerX, imageWidth );
			const yPercent = toPct( centerY, imageHeight );
			const xClamped = clamp( xPercent );
			const yClamped = clamp( yPercent );

			if ( xClamped !== xPercent || yClamped !== yPercent ) {
				// eslint-disable-next-line no-console
				console.warn(
					'[SmartCrop] Clamped percentages:',
					{ xPercent, yPercent, xClamped, yClamped }
				);
			}

			// Apply crop style
			return {
				objectFit: 'cover',
				objectPosition: `${ xClamped }% ${ yClamped }%`
			};
		}

		const altText = computed( () => useAltText( props.image ) );

		return {
			resizedSrc,
			dominantColorHex,
			dominantColorContrasting,
			dominantColorContrastingLegacy,
			imageElement,
			cropStyle,
			loading,
			cdxIconImage,
			altText
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ib-cropped-image {
	position: relative;
	width: 100%;
	height: 100%;

	img, .ib-cropped-image__progress {
		position: absolute;
		top: 0;
		left: 0;
		width: @size-full;
		height: @size-full;
		z-index: @z-index-base;
		background-color: @background-color-neutral;
		transition: background-color @transition-duration-medium @transition-timing-function-system;
	}

	.ib-cropped-image__progress {
		display: inline-flex;
		align-items: center;
		justify-content: center;

		.cdx-icon {
			color: var( --dominant-color-contrasting )
		}
	}

	&.ib-cropped-image__loading {
		img {
			// Ensure the image, insofar there is one, is not visible without
			// setting it to display: none so that we can still get the dimensions
			// it is/will be rendered at
			opacity: 0;
		}

		.ib-cropped-image__progress {
			background-color: var( --dominant-color-hex );
		}
	}
}
</style>
