<template>
	<cropped-image
		id="mw-ext-readerExperiments-imageBrowsing-detail-view"
		class="ib-detail-view"
		:class="{ 'ib-detail-view__cropped': isCropped }"
		:image="activeImage"
	>
		<!-- Caption -->
		<detail-view-caption
			v-if="isCropped"
			:image="activeImage"
		></detail-view-caption>

		<!-- Controls -->
		<detail-view-controls
			:image="activeImage"
			:cropped="isCropped"
			@detail-view-crop-toggle="onCropToggle"
		></detail-view-controls>
	</cropped-image>
</template>

<script>
const { defineComponent, inject, ref, watch } = require( 'vue' );
const CroppedImage = require( './CroppedImage.vue' );
const DetailViewCaption = require( './DetailViewCaption.vue' );
const DetailViewControls = require( './DetailViewControls.vue' );

/**
 * @typedef {import("../types").ImageData} ImageData
 */

// @vue/component
module.exports = exports = defineComponent( {
	name: 'DetailView',
	components: {
		CroppedImage,
		DetailViewCaption,
		DetailViewControls
	},
	props: {
		activeImage: {
			type: /** @type {import('vue').PropType<ImageData>} */ ( Object ),
			required: true
		}
	},
	setup( props ) {
		const initialCropped = true;
		const isCropped = ref( initialCropped );

		watch(
			() => props.activeImage,
			() => ( isCropped.value = initialCropped )
		);

		//
		// Event handlers.
		//

		// The child component `DetailViewControls` emits an untoggled state.
		// See comment in the same event handler there for an explanation.
		const submitInteraction = inject( 'submitInteraction' );
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
			isCropped,
			onCropToggle
		};
	}
} );
</script>

<style lang="less">
.ib-detail-view {
	display: flex;
	// Ensure flex items are aligned at the end of the flex container (`end` value broke in iOS 12)
	align-items: flex-end;
	height: 100vh; // Legacy browser
	flex-shrink: 0;

	@supports ( height: 100dvh ) {
		height: 100dvh; // Override for modern browsers
	}

	&:not( .ib-detail-view__cropped ) img {
		// by default, <cropped-image> will render an `object-fit: cover` (applied
		// as style specific to the element), which we will want to override when
		// we want to see the full, uncropped, image
		object-fit: contain !important;
	}
}
</style>
