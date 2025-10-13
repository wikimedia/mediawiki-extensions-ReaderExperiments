<template>
	<div
		v-if="caption || image.label || image.alt"
		class="ib-detail-view-caption"
	>
		<!-- eslint-disable vue/no-v-html -->
		<!-- only use v-html for HTML content that has passed through MW's Sanitizer -->
		<p
			v-if="caption"
			ref="captionTextElement"
			class="ib-detail-view-caption__text"
			:class="{ 'ib-detail-view-caption__collapsed': !isCaptionExpanded }"
			v-html="caption"
		>
		</p>

		<!-- eslint-enable vue/no-v-html -->
		<!-- Do not pass plain-text content through v-html; use standard interpolation instead -->
		<p
			v-else
			ref="captionTextElement"
			class="ib-detail-view-caption__text"
			:class="{ 'ib-detail-view-caption__collapsed': !isCaptionExpanded }"
		>
			{{ image.label || image.alt }}
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
const { defineComponent, computed, ref, useTemplateRef, inject, onMounted, onUnmounted, watch, nextTick } = require( 'vue' );
const { CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconAdd, cdxIconSubtract } = require( '../icons.json' );
const { getCaptionIfAvailable } = require( '../thumbExtractor.js' );

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
		const caption = computed( () => {
			if ( !props.image ) {
				return;
			}
			return getCaptionIfAvailable( props.image.container );
		} );
		const canCaptionExpand = ref( true );
		const isCaptionExpanded = ref( false );
		const captionTextElement = useTemplateRef( 'captionTextElement' );

		// Instrumentation plugin.
		const submitInteraction = inject( 'submitInteraction' );
		const manageLinkEventListeners = inject( 'manageLinkEventListeners' );

		function calculateCaptionOverflow() {
			canCaptionExpand.value = captionTextElement.value &&
				captionTextElement.value.clientHeight !== captionTextElement.value.scrollHeight;
		}

		// When the component is mounted:
		// - determine if the "More" button needs to be shown
		// - add click event listeners to wikilinks
		onMounted( () => {
			calculateCaptionOverflow();
			manageLinkEventListeners( captionTextElement, onCaptionLinkClick );
		} );

		// Check this again if the caption text changes (regardless of source)
		watch(
			() => caption.value || props.image.label || props.image.alt,
			() => {
				isCaptionExpanded.value = false;
				nextTick( () => {
					calculateCaptionOverflow();
					manageLinkEventListeners( captionTextElement, onCaptionLinkClick );
				} );
			}
		);

		// When the component is unmounted, remove wikilinks' click event listeners.
		onUnmounted( () => {
			manageLinkEventListeners(
				captionTextElement, onCaptionLinkClick, true
			);
		} );

		// When the caption expands or collapses, update wikilinks' click event listeners.
		watch( isCaptionExpanded, () => {
			nextTick( manageLinkEventListeners( captionTextElement, onCaptionLinkClick ) );
		} );

		//
		// Event handlers.
		//

		/* eslint-disable camelcase */
		function onCaptionLinkClick() {
			// Instrument click on a detail view caption's link.
			submitInteraction(
				'click',
				{
					action_subtype: 'caption_link',
					action_source: 'detail_view'
				}
			);
		}

		function onCaptionExpand() {
			isCaptionExpanded.value = true;

			// Instrument click on the 'More' button.
			submitInteraction(
				'click',
				{
					action_subtype: 'more',
					action_source: 'detail_view'
				}
			);
		}
		/* eslint-enable camelcase */

		function onCaptionCollapse() {
			isCaptionExpanded.value = false;
		}

		return {
			caption,
			canCaptionExpand,
			isCaptionExpanded,
			captionTextElement,
			onCaptionExpand,
			onCaptionCollapse,
			cdxIconAdd,
			cdxIconSubtract
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ib-detail-view-caption {
	--caption-padding: 20px;
	--gradient-height: 60px;

	font-weight: bold;
	width: 100%;
	max-height: calc( 100% - var( --caption-padding ) - var( --gradient-height ) );
	margin: 0;
	padding-bottom: var( --caption-padding );
	padding-left: var( --caption-padding );
	z-index: @z-index-overlay;

	// preserve space for buttons on the right: 32px (button width) + 2x 20px
	// (button margin on either side)
	padding-right: calc( var( --caption-padding ) + 32px + var( --caption-padding ) );

	// colorize caption text & background (which comes in from a transparent top)
	padding-top: var( --gradient-height );
	background-image: linear-gradient(
		transparent, var( --dominant-color-hex ) var( --gradient-height )
	);

	// Override Minerva skin paragraph styles
	p {
		padding-bottom: 0;
		margin-top: 0;
	}

	&__text,
	&__expand.cdx-button,
	&__collapse.cdx-button {
		@supports (color: oklch(from white l c h)) {
			color: var( --dominant-color-contrasting );
		}

		// Fallback for browsers that don't support relative color syntax with `from`
		@supports not (color: oklch(from white l c h)) {
			color: var( --dominant-color-contrasting--legacy );
		}
	}

	&__expand.cdx-button,
	&__collapse.cdx-button {
		float: right;

		// Override CdxButton hover styles to ensure button is visible T405992
		&:enabled.cdx-button--weight-quiet:hover {
			background-color: transparent;
			mix-blend-mode: unset;
		}
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

		a:not( [ role='button' ] ) {
			color: inherit;
			text-decoration: underline;
			text-decoration-thickness: 1.5px; // Make the underline slightly more legible
		}
	}
}
</style>
