<template>
	<div
		class="ib-detail-view"
		:class="{
			'ib-detail-image-loading': loading
		}"
		:style="{
			'--dominant-color-hex': dominantColorHex,
			'--dominant-color-contrasting': dominantColorContrasting
		}">
		<!-- Image -->
		<img
			ref="imageElement"
			:src="resizedSrc"
			:alt="activeImage.alt ?
				activeImage.alt :
				$i18n(
					'readerexperiments-imagebrowsing-image-alt-text',
					activeImage.title.getFileNameTextWithoutExtension()
				).text()"
			:style="isCropped ? cropStyle : {}"
			crossorigin="anonymous"
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

		<!-- controls -->
		<detail-view-controls
			:image="activeImage"
			:initial-cropped="isCropped"
			@toggle-crop="onToggleCrop"
		></detail-view-controls>
	</div>
</template>

<script>
const { ref, computed, defineComponent, useTemplateRef, onMounted, watch, nextTick, toRef } = require( 'vue' );
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
		const cropStyle = ref( {} );
		const loading = ref( true );

		// Background color
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

		// Per-instance guard
		let runId = 0;
		onMounted( () => {
			const imgEl = imageElement.value;
			if ( !imgEl ) {
				return;
			}
			runSmartCrop( imgEl );
		} );

		// Re-run whenever the image changes.
		watch(
			() => props.activeImage && props.activeImage.name,
			async () => {
				loading.value = true;
				const imgEl = imageElement.value;
				if ( !imgEl ) {
					return;
				}
				// Force Firefox to clear the old image by setting src to empty
				imgEl.src = '';
				// Wait for DOM to update with the new src.
				await nextTick();
				runSmartCrop( imgEl );
			}
		);

		// Full-screen image src
		const resizedSrc = computed( () => {
			const fullscreenWidth = Math.max(
				window.innerWidth,
				parseInt(
					( window.innerHeight / props.activeImage.height ) *
					props.activeImage.width
				)
			);
			// Take a list of standardized image rendering widths (eg 1280, 2560)
			// and find one that looks like it'll fit or exceed the window; using
			// a standard size increases the chances of one being ready to serve
			// right away, having been rendered before.
			const thumbLimits = mw.config.get( 'ReaderExperimentsImageBrowsingThumbLimits' ) || [];
			const acceptableWidths = thumbLimits.filter( ( limit ) => limit >= fullscreenWidth );
			const standardizedWidth = acceptableWidths.length ?
				Math.min.apply( null, acceptableWidths ) :
				fullscreenWidth;
			return props.activeImage.resizeUrl( standardizedWidth );
		} );

		const isCropped = ref( true );
		function onToggleCrop( value ) {
			isCropped.value = value;
		}

		async function runSmartCrop( imgEl ) {
			const myRun = ++runId;

			try {
				if ( imgEl.decode ) {
					await imgEl.decode();
				} else {
					// Ancient browser or the test suite; fail gracefully
					loading.value = true;
					return;
				}

				// 9:16 portrait analysis box
				const analysisW = imgEl.clientWidth;
				const analysisH = Math.round( ( analysisW / 9 ) * 16 );

				const { topCrop: crop, sourceWidth, sourceHeight } = await useSmartCrop(
					imgEl,
					analysisW,
					analysisH
				);

				if ( myRun !== runId ) {
					// eslint-disable-next-line no-console
					console.warn( '[SmartCrop] Stale result; ignoring.' );
					return;
				}
				if ( !crop || typeof crop.x !== 'number' || typeof crop.y !== 'number' ) {
					// eslint-disable-next-line no-console
					console.warn( '[SmartCrop] Missing/invalid crop; skipping.' );
					return;
				}

				// Center of crop in the SAME analysis space (9:16)
				const centerX = crop.x + crop.width / 2;
				const centerY = crop.y + crop.height / 2;
				// Convert to object-position percentages relative to the
				// SOURCE image SmartCrop analyzed
				const toPct = ( value, total ) => ( value / total ) * 100;
				const clamp = ( v ) => Math.max( 0, Math.min( 100, v ) );

				// use the returned dimensions from useSmartCrop, NOT analysisW/H or naturalW/H
				const xPercent = toPct( centerX, sourceWidth );
				const yPercent = toPct( centerY, sourceHeight );
				const xClamped = clamp( xPercent );
				const yClamped = clamp( yPercent );

				if ( xClamped !== xPercent || yClamped !== yPercent ) {
					// eslint-disable-next-line no-console
					console.warn( '[SmartCrop] Clamped percentages:', { xPercent, yPercent, xClamped, yClamped } );
				}

				// Sanity check. Apply to reactive style.
				const style = {
					objectFit: 'cover',
					objectPosition: `${ xClamped }% ${ yClamped }%`
				};
				cropStyle.value = style;
				imgEl.style.objectPosition = style.objectPosition;
				// eslint-disable-next-line no-console
				console.log( '[SmartCrop] Applied style:', style );

				loading.value = false;
			} catch ( err ) {
				// eslint-disable-next-line no-console
				console.error( '[SmartCrop] error:', err );
			}
		}

		return {
			resizedSrc,
			dominantColorHex,
			dominantColorContrasting,
			imageElement,
			cropStyle,
			loading,
			cdxIconImage,
			onToggleCrop,
			isCropped
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ib-detail-view {
	display: flex;
	align-items: end;
	position: relative;
	height: 100dvh;
	flex-shrink: 0;

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
			display: none;
		}
		.ib-detail-progress {
			background-color: var( --dominant-color-hex );
		}
	}
}

</style>
