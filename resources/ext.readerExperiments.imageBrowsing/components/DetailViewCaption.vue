<template>
	<div
		v-if="caption"
		class="ib-detail-view-caption"
		:style="{
			'--dominant-color-hex': dominantColorHex,
			'--dominant-color-is-dark': dominantColorIsDark ? 1 : 0
		}"
	>
		<!-- eslint-disable vue/no-v-html -->
		<p
			ref="captionTextElement"
			class="ib-detail-view-caption__text"
			:class="{ 'ib-detail-view-caption__collapsed': !isCaptionExpanded }"
			v-html="caption"
		>
		</p>
		<!-- eslint-enable vue/no-v-html -->

		<cdx-button
			v-if="canCaptionExpand && !isCaptionExpanded"
			class="ib-detail-view-caption__expand"
			weight="quiet"
			size="small"
			@click="onCaptionExpand"
		>
			<cdx-icon :icon="cdxIconAdd" size="small"></cdx-icon>
			{{ $i18n( 'readerexperiments-imagebrowsing-detail-caption-expand' ).text() }}
		</cdx-button>

		<cdx-button
			v-if="canCaptionExpand && isCaptionExpanded"
			class="ib-detail-view-caption__collapse"
			weight="quiet"
			size="small"
			@click="onCaptionCollapse"
		>
			<cdx-icon :icon="cdxIconSubtract" size="small"></cdx-icon>
			{{ $i18n( 'readerexperiments-imagebrowsing-detail-caption-collapse' ).text() }}
		</cdx-button>
	</div>
</template>

<script>
const { defineComponent, ref, computed, useTemplateRef, onMounted, toRef } = require( 'vue' );
const { CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconAdd, cdxIconSubtract } = require( '../icons.json' );
const useBackgroundColor = require( '../composables/useBackgroundColor.js' );
const useImageCaption = require( '../composables/useImageCaption.js' );

/**
 * @typedef {import('../types').ImageData} ImageData
 */

// @vue/component
module.exports = exports = defineComponent( {
	name: 'DetailViewCaption',
	components: {
		CdxButton,
		CdxIcon
	},
	props: {
		image: {
			type: /** @type {import('vue').PropType<ImageData>} */ ( Object ),
			required: true
		}
	},
	setup( props ) {
		// Use the composable for caption logic
		const { caption } = useImageCaption( props.image );

		const canCaptionExpand = ref( true );
		const isCaptionExpanded = ref( false );
		const captionTextElement = useTemplateRef( 'captionTextElement' );

		onMounted( () => {
			canCaptionExpand.value = captionTextElement.value &&
				captionTextElement.value.clientHeight !== captionTextElement.value.scrollHeight;
		} );

		// Background color
		const imageRef = toRef( props, 'image' );
		const color = useBackgroundColor( imageRef );

		const dominantColorHex = computed( () => color.value && color.value.hex || '#000' );
		const dominantColorIsDark = computed( () => color.value && color.value.isDark || false );

		function onCaptionExpand() {
			isCaptionExpanded.value = true;
		}

		function onCaptionCollapse() {
			isCaptionExpanded.value = false;
		}

		return {
			dominantColorHex,
			dominantColorIsDark,
			caption,
			captionTextElement,
			canCaptionExpand,
			isCaptionExpanded,
			onCaptionExpand,
			onCaptionCollapse,
			cdxIconAdd,
			cdxIconSubtract
		};
	}
} );
</script>

<style lang="less">
.ib-detail-view-caption {
	--caption-padding: 20px;
	--gradient-height: 60px;

	font-weight: bold;
	width: 100%;
	max-height: calc( 100% - var( --caption-padding ) - var( --gradient-height ) );
	margin: 0;
	padding: var( --caption-padding );

	// preserve space for buttons on the right: 32px (button width) + 2x 20px
	// (button margin on either side)
	padding-right: calc( var( --caption-padding ) + 32px + var( --caption-padding ) );

	// colorize caption text & background (which comes in from a transparent top)
	padding-top: calc( var( --caption-padding ) + var( --gradient-height ) );
	background-image: linear-gradient(
		transparent, var( --dominant-color-hex ) var( --gradient-height )
	);

	&__text,
	&__expand.cdx-button,
	&__collapse.cdx-button {
		color: ~"oklch( from var( --dominant-color-hex ) calc( l * var( --dominant-color-is-dark ) * 100 ) c h )";
	}

	&__expand.cdx-button,
	&__collapse.cdx-button {
		float: right;
	}

	&__text {
		padding: 0;
		max-height: 75vh;
		overflow: hidden;

		&.ib-detail-view-caption__collapsed,
		&:not( .ib-detail-view-caption__collapsed ) {
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-moz-box-orient: vertical;
			-ms-box-orient: vertical;
			box-orient: vertical;
		}

		&.ib-detail-view-caption__collapsed {
			-webkit-line-clamp: 3;
			-moz-line-clamp: 3;
			-ms-line-clamp: 3;
			line-clamp: 3;
		}

		&:not( .ib-detail-view-caption__collapsed ) {
			// Use a static line clamp for simplicity
			-webkit-line-clamp: 8;
			-moz-line-clamp: 8;
			-ms-line-clamp: 8;
			line-clamp: 8;
		}

		a:where( :not( [ role='button' ] ) ) {
			color: inherit;
			text-decoration: underline;
			text-decoration-thickness: 1.5px; // Make the underline slightly more legible
		}
	}
}
</style>
