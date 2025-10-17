<template>
	<button
		ref="buttonElement"
		class="ib-carousel-item"
		aria-controls="mw-ext-readerExperiments-imageBrowsing-detail-view"
		:aria-disabled="selected"
		:aria-selected="selected"
		:aria-label="imageLabel"
		:style="thumbnailHeight !== null ? buttonDimensionsStyle : { height: '100%' }"
		@keydown.enter.prevent="void 0"
		@keyup.enter.prevent="onClick( image, $event )"
		@click="onClick( image, $event )"
	>
		<cropped-image
			v-if="thumbnailHeight !== null"
			class="ib-carousel-item__image"
			:image="image"
		></cropped-image>
	</button>
</template>

<script>
const { computed, defineComponent, useTemplateRef } = require( 'vue' );
const CroppedImage = require( './CroppedImage.vue' );
const useImageLabel = require( '../composables/useImageLabel.js' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'CarouselItem',
	components: {
		CroppedImage
	},
	props: {
		image: {
			type: Object,
			required: true
		},
		selected: {
			type: Boolean,
			required: true
		}
	},
	emits: [
		'carousel-item-click'
	],
	setup( props, { emit } ) {
		const buttonElement = useTemplateRef( 'buttonElement' );

		// Image dimensions get a bit convoluted...
		// The height of the images is not always the same. We've set a fixed
		// height on the app's container to ensure the space is preserved ahead
		// of time to prevent a FOUC, but we can't rely on actually having that
		// height available for thumbnails: depending on the amount of images
		// and their dimensions (which are also fluid: somewhere between 100px
		// and 1/3rd of the container width), we may have a scrollbar eating up
		// some of the available height. And if the height is impacted, so is
		// the width at which the image should display.
		// So, we'll first let the button render at 100% height (see template);
		// once that's been rendered, we'll know the actual height (in numbers)
		// from which we can calculate the desired width.
		const thumbnailHeight = computed( () => buttonElement.value && buttonElement.value.clientHeight );
		const buttonDimensionsStyle = computed( () => ( {
			width: 'min( 33.33%, max( 100px, ' + props.image.width / props.image.height * thumbnailHeight.value + 'px ) )',
			height: '100%'
		} ) );

		const imageLabel = computed( () => useImageLabel( props.image ) );

		const onClick = ( image ) => {
			// By now, this is either a mouse-induced click, a <Space> keyup,
			// an <Enter> keyup, or a synthetic event from accessibility tools.
			emit( 'carousel-item-click', image );
		};

		return {
			buttonElement,
			thumbnailHeight,
			buttonDimensionsStyle,
			onClick,
			imageLabel
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ib-carousel-item {
	max-width: 33.33%;
	cursor: pointer;
	box-sizing: content-box;
	border: 1px solid transparent;
	padding: 0;

	&:not( :last-child ) {
		margin-right: 10px;
	}

	&:hover {
		border: 1px solid @border-color-interactive--hover;
	}
}
</style>
