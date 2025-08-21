<template>
	<div
		class="ib-detail-view-caption"
		:style="{
			'--dominant-color-hex': dominantColorHex,
			'--dominant-color-is-dark': dominantColorIsDark ? 1 : 0
		}"
	>
		<p
			ref="captionTextElement"
			class="ib-detail-view-caption__text"
			:class="{ 'ib-detail-view-caption__collapsed': !isCaptionExpanded }"
		>
			{{ caption }}
		</p>

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
const { defineComponent, ref, useTemplateRef, onMounted } = require( 'vue' );
const { CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconAdd, cdxIconSubtract } = require( '../icons.json' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'DetailViewCaption',
	components: {
		CdxButton,
		CdxIcon
	},
	props: {
		caption: {
			type: [ String, null ],
			required: true
		},
		dominantColorHex: {
			type: String,
			required: true
		},
		dominantColorIsDark: {
			type: Boolean,
			required: true
		}
	},
	setup() {
		const captionTextElement = useTemplateRef( 'captionTextElement' );
		const canCaptionExpand = ref( true );
		const isCaptionExpanded = ref( false );

		function onCaptionExpand() {
			isCaptionExpanded.value = true;
		}

		function onCaptionCollapse() {
			isCaptionExpanded.value = false;
		}

		onMounted( () => {
			canCaptionExpand.value = captionTextElement.value.clientHeight !==
				captionTextElement.value.scrollHeight;
		} );

		return {
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

		&.ib-detail-view-caption__collapsed {
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-moz-box-orient: vertical;
			-ms-box-orient: vertical;
			box-orient: vertical;
			-webkit-line-clamp: 3;
			-moz-line-clamp: 3;
			-ms-line-clamp: 3;
			line-clamp: 3;
		}
	}
}
</style>
