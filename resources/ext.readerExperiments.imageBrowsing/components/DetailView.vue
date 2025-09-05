<template>
	<div class="ib-detail-view">
		<!-- Image -->
		<img
			ref="imageElement"
			:src="resizedSrc"
			:alt="activeImage.alt"
			:style="cropStyle"
		>

		<!-- Caption -->
		<detail-view-caption
			:image="activeImage"
		></detail-view-caption>

		<!-- controls -->
		<detail-view-controls
			:image="activeImage"
			@toggle-fullscreen="onFullScreen"
		></detail-view-controls>
	</div>
</template>

<script>
const { ref, computed, defineComponent, useTemplateRef, onMounted, watch, nextTick } = require( 'vue' );
const DetailViewCaption = require( './DetailViewCaption.vue' );
const DetailViewControls = require( './DetailViewControls.vue' );
const useSmartCrop = require( '../composables/useSmartCrop.js' );

/**
 * @typedef {import("../types").ImageData} ImageData
 */

// @vue/component
module.exports = exports = defineComponent( {
	name: 'DetailView',
	components: {
		DetailViewCaption,
		DetailViewControls
	},
	props: {
		activeImage: {
			type: /** @type {import('vue').PropType<ImageData>} */ ( Object ),
			required: true
		}
	},
	async setup( props ) {
		const imageElement = useTemplateRef( 'imageElement' );
		const cropStyle = ref( {} );

		// Per-instance guard
		let runId = 0;
		onMounted( () => {
			const imgEl = imageElement.value;
			if ( !imgEl ) {
				return;
			}
			if ( !imgEl.complete ) {
				imgEl.addEventListener( 'load', () => runSmartCrop( imgEl ), { once: true } );
			} else {
				runSmartCrop( imgEl );
			}
		} );

		// Re-run whenever the image changes.
		watch(
			() => props.activeImage && props.activeImage.name,
			async () => {
				// Wait for DOM to update with the new src.
				await nextTick();
				const imgEl = imageElement.value;
				if ( !imgEl ) {
					return;
				}
				if ( !imgEl.complete ) {
					imgEl.addEventListener( 'load', () => runSmartCrop( imgEl ), { once: true } );
				} else {
					runSmartCrop( imgEl );
				}
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
			const thumbLimits = mw.config.get( 'ReaderExperimentsImageBrowsingThumbLimits' );
			const acceptableWidths = thumbLimits.filter( ( limit ) => limit >= fullscreenWidth );
			const standardizedWidth = acceptableWidths.length ?
				Math.min.apply( null, acceptableWidths ) :
				fullscreenWidth;
			return props.activeImage.resizeUrl( standardizedWidth );
		} );

		function onFullScreen() {
			if ( !document.fullscreenElement ) {
				if ( imageElement.value ) {
					imageElement.value.requestFullscreen();
				}
			} else {
				document.exitFullscreen();
			}
		}

		async function runSmartCrop( imgEl ) {
			const myRun = ++runId;

			try {
				// 9:16 portrait analysis box
				const analysisW = imgEl.clientWidth;
				const analysisH = Math.round( ( analysisW / 9 ) * 16 );

				const fileTitle = `File:${ props.activeImage.name }`;

				const { topCrop: crop, sourceWidth, sourceHeight } = await useSmartCrop(
					'https://en.wikipedia.org/w/api.php',
					fileTitle,
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
				// Convert to object-position percentages relative to the SOURCE image SmartCrop analyzed
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
			} catch ( err ) {
				// eslint-disable-next-line no-console
				console.error( '[SmartCrop] error:', err );
			}
		}

		return {
			resizedSrc,
			imageElement,
			onFullScreen,
			cropStyle
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

	img {
		position: absolute;
		top: 0;
		left: 0;
		width: @size-full;
		height: @size-full;
		object-fit: cover;
		z-index: @z-index-bottom;
	}
}

</style>
