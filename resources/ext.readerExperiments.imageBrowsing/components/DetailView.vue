<template>
	<div class="ib-detail-view">
		<!-- Image -->
		<img
			ref="imageElement"
			:src="resizedSrc"
			:alt="activeImage.alt"
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
const { defineComponent, useTemplateRef, onMounted, watch, nextTick } = require( 'vue' );
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
			type: /** @type {import('vue').PropType<ImageData> */ ( Object ),
			required: true
		}
	},
	async setup( props ) {
		const imageElement = useTemplateRef( 'imageElement' );
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

		const fullscreenWidth = Math.max(
			window.innerWidth,
			parseInt(
				( window.innerHeight / props.activeImage.height ) *
				props.activeImage.width
			)
		);
		// Standardize image widths to the nearest standard limit to increase the
		// chances of one being ready to serve right away, having been rendered before
		const acceptableWidths = mw.config.get( 'ReaderExperimentsImageBrowsingThumbLimits' ).filter( ( limit ) => limit >= fullscreenWidth );
		const standardizedWidth = Math.min.apply( null, acceptableWidths.length ? acceptableWidths : [ fullscreenWidth ] );
		const resizedSrc = props.activeImage.resizeUrl( standardizedWidth );

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
			// Mark latest.
			const myRun = ++runId;
			try {
				const width = imgEl.clientWidth;
				const height = Math.round( ( width / 9 ) * 16 );
				const fileTitle = `File:${ props.activeImage.name }`;
				const cropResult = await useSmartCrop( 'https://en.wikipedia.org/w/api.php', fileTitle, width, height );
				// If stale, bail.
				if ( myRun !== runId ) {
					return;
				}
				const crop = cropResult.topCrop;
				// eslint-disable-next-line no-console
				console.log( '[SmartCrop] Crop result:', crop );
			} catch ( err ) {
				// eslint-disable-next-line no-console
				console.error( '[SmartCrop] Error during crop:', err );
			}
		}

		return {
			resizedSrc,
			imageElement,
			onFullScreen
		};
	}
} );
</script>

<style lang="less">
.ib-detail-view {
	width: 100%;
	height: 100vh;
	display: flex;
	align-items: end;

	img {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: -1;
	}
}

</style>
