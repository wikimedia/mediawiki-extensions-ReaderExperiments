<template>
	<div
		class="ib-detail-view"
		:class="{
			'ib-detail-image-loading': loading
		}"
		:style="{
			'--dominant-color-hex': dominantColorHex,
			'--dominant-color-contrasting': dominantColorContrasting,
			'--dominant-color-contrasting--legacy': dominantColorContrastingLegacy
		}">
		<!-- Image -->
		<img
			ref="imageElement"
			crossorigin="anonymous"
			:src="resizedSrc"
			:alt="activeImage.alt ?
				activeImage.alt :
				$i18n(
					'readerexperiments-imagebrowsing-image-alt-text',
					activeImage.title.getFileNameTextWithoutExtension()
				).text()"
			:style="isCropped ? cropStyle : {}"
		>
		<div
			v-if="loading"
			class="ib-detail-progress">
			<cdx-icon
				:icon="cdxIconImage"
				:aria-label="$i18n( 'readerexperiments-imagebrowsing-loading' )"
			></cdx-icon>
		</div>

		<!-- Caption -->
		<detail-view-caption
			v-if="isCropped"
			:image="activeImage"
		></detail-view-caption>

		<!-- Controls -->
		<detail-view-controls
			:image="activeImage"
			:initial-cropped="isCropped"
			@detail-view-crop-toggle="onCropToggle"
		></detail-view-controls>
	</div>
</template>

<script>
const { ref, computed, defineComponent, useTemplateRef, watch, nextTick, toRef, inject } = require( 'vue' );
const DetailViewCaption = require( './DetailViewCaption.vue' );
const DetailViewControls = require( './DetailViewControls.vue' );
const { CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconImage } = require( '../icons.json' );

const useBackgroundColor = require( '../composables/useBackgroundColor.js' );
const useSmartCrop = require( '../composables/useSmartCrop.js' );

/**
 * @typedef {import("../types").ImageData} ImageData
 */

// @vue/component
module.exports = exports = defineComponent( {
	name: 'DetailView',
	components: {
		DetailViewCaption,
		DetailViewControls,
		CdxIcon
	},
	props: {
		activeImage: {
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
		const isCropped = ref( true );

		// Background color.
		const imageRef = toRef( props, 'activeImage' );
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

		const submitInteraction = inject( 'submitInteraction' ); // Instrumentation plugin

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
			() => imageElement.value !== null && props.activeImage && props.activeImage.name,
			async () => {
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
				await nextTick();

				// Calculate crop style for new image
				cropStyle.value = await getImageCropStyle();
				if ( cropStyle.value ) {
					// Only mark complete if we successfully calculated a crop
					// (which might not always be the case for crop calculations
					// that were aborted because e.g. another started loading in
					// the meantime)
					loading.value = false;
				}
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
			const imageAspectRatio = props.activeImage.width / props.activeImage.height;
			const coverWidth = Math.max(
				displayWidth, // image is taller
				Math.round( displayHeight * imageAspectRatio ) // image is wider
			);

			// Take a list of standardized image rendering widths (e.g. 1280, 2560)
			// and find one that looks like it'll fit or exceed the required width;
			// using a standard size increases the chances of one being ready to
			// serve right away, having been rendered before.
			const thumbLimits = mw.config.get( 'ReaderExperimentsImageBrowsingThumbLimits' ) || [];
			const acceptableWidths = thumbLimits.filter( ( limit ) => limit >= coverWidth );
			const standardizedWidth = acceptableWidths.length ?
				Math.min.apply( null, acceptableWidths ) :
				coverWidth;

			return props.activeImage.resizeUrl( standardizedWidth );
		}

		async function getImageCropStyle() {
			const activeImage = props.activeImage;

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
				if ( activeImage === props.activeImage ) {
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
			if ( activeImage !== props.activeImage ) {
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

		//
		// Event handlers.
		//

		// The child component `DetailViewControls` emits an untoggled state.
		// See comment in the same event handler there for an explanation.
		function onCropToggle( untoggled ) {
			isCropped.value = untoggled;

			// Instrument click on the crop button.
			// Not implemented in the child component,
			// since the state check doesn't work there.
			if ( !untoggled ) {
				submitInteraction(
					'click',
					{
						/* eslint-disable camelcase */
						action_subtype: 'full_image',
						action_source: 'detail_view'
						/* eslint-enable camelcase */
					}
				);
			}
		}

		return {
			resizedSrc,
			dominantColorHex,
			dominantColorContrasting,
			dominantColorContrastingLegacy,
			imageElement,
			cropStyle,
			loading,
			cdxIconImage,
			isCropped,
			onCropToggle
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ib-detail-view {
	display: flex;
	// Ensure flex items are aligned at the end of the flex container (`end` value broke in iOS 12)
	align-items: flex-end;
	position: relative;
	height: 100vh; // Legacy browser
	flex-shrink: 0;

	@supports ( height: 100dvh ) {
		height: 100dvh; // Override for modern browsers
	}

	img, .ib-detail-progress {
		position: absolute;
		top: 0;
		left: 0;
		width: @size-full;
		height: @size-full;
		z-index: @z-index-bottom;
		background-color: @background-color-neutral;
		transition: background-color @transition-duration-medium @transition-timing-function-system;
	}

	img {
		// below is "fullscreen" style, which will be overridden by a more specific
		// crop (calculated in JS) by default
		object-fit: contain;
	}

	.ib-detail-progress {
		display: inline-flex;
		align-items: center;
		justify-content: center;

		.cdx-icon {
			color: var( --dominant-color-contrasting )
		}
	}

	&.ib-detail-image-loading {
		img {
			// Ensure the image, insofar there is one, is not visible without
			// setting it to display: none so that we can still get the dimensions
			// it is/will be rendered at
			opacity: 0;
		}

		.ib-detail-progress {
			background-color: var( --dominant-color-hex );
		}
	}
}

</style>
