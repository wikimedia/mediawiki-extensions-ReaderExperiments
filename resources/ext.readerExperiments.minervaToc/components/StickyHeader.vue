<!-- eslint-disable vue/no-v-html -->
<template>
	<div
		class="ext-readerExperiments-minerva-toc__sticky-header"
		:class="{ 'ext-readerExperiments-minerva-toc__sticky-header__active': isActive || isOpen }"
	>
		<div class="ext-readerExperiments-minerva-toc__sticky-header__content">
			<cdx-toggle-button
				ref="contentsButton"
				:model-value="isOpen"
				class="ext-readerExperiments-minerva-toc__sticky-header__toc-button"
				quiet
				:aria-label="$i18n( 'readerexperiments-minerva-toc-button-label' ).text()"
				@update:model-value="$emit( 'toggle' )"
			>
				<cdx-icon :icon="isOpen ? cdxIconClose : cdxIconListBullet"></cdx-icon>
			</cdx-toggle-button>
			<div
				class="ext-readerExperiments-minerva-toc__sticky-header__title"
				:class="{
					'ext-readerExperiments-minerva-toc__sticky-header__title--multiline': isMultiline
				}"
			>
				<h2
					ref="titleRef"
					v-html="headingHtml"
				></h2>
				<span v-if="subheadingText">{{ subheadingText }}</span>
			</div>
			<cdx-button
				v-if="linkUrl"
				class="ext-readerExperiments-minerva-toc__sticky-header__edit-button"
				:aria-label="$i18n( 'edit' ).text()"
				weight="quiet"
				@click="onClickLink"
			>
				<cdx-icon :icon="cdxIconEdit"></cdx-icon>
			</cdx-button>
		</div>
	</div>
</template>

<script>
const { defineComponent, useTemplateRef, ref, onMounted, onUnmounted, watch, nextTick, toRef } = require( 'vue' );
const { CdxToggleButton, CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconClose, cdxIconListBullet, cdxIconEdit } = require( '../icons.json' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'StickyHeader',
	components: {
		CdxButton,
		CdxIcon,
		CdxToggleButton
	},
	props: {
		isOpen: {
			type: Boolean,
			required: true
		},
		isActive: {
			type: Boolean,
			required: true
		},
		headingHtml: {
			type: String,
			required: true
		},
		subheadingText: {
			type: String,
			default: ''
		},
		linkUrl: {
			type: String,
			default: ''
		}
	},
	emits: [
		'toggle'
	],
	setup( props ) {
		const contentsButton = useTemplateRef( 'contentsButton' );

		const focusOnContentsButton = () => {
			if ( contentsButton.value ) {
				// eslint-disable-next-line no-jquery/no-event-shorthand
				contentsButton.value.$el.focus();
			}
		};

		const onClickLink = () => window.open( props.linkUrl, '_blank' );

		const titleRef = ref( null );
		const isMultiline = ref( false );

		const checkMultiline = () => {
			if ( titleRef.value ) {
				const lineHeight = parseFloat( getComputedStyle( titleRef.value ).lineHeight );
				isMultiline.value = titleRef.value.scrollHeight > lineHeight * 1.5;
			}
		};

		onMounted( () => {
			checkMultiline();
			window.addEventListener( 'resize', checkMultiline );
		} );

		// Recheck when heading changes (eg. scrolling to new section)
		watch( toRef( props, 'headingHtml' ), () => {
			nextTick( checkMultiline );
		} );

		onUnmounted( () => {
			window.removeEventListener( 'resize', checkMultiline );
		} );

		return {
			cdxIconClose,
			cdxIconListBullet,
			cdxIconEdit,
			onClickLink,
			titleRef,
			isMultiline,
			contentsButton,
			// eslint-disable-next-line vue/no-unused-properties
			focusOnContentsButton // The parent (StickyHeaderApp) calls this function
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

:root {
	// Calculate sticky header's width considering the parent container's margin
	--width-header: calc( 100% - 32px );

	@media ( min-width: @min-width-breakpoint-tablet ) {
		--width-header: calc( 100% - ( 2 * 3.35em ) );
	}

	@media ( min-width: 993.3px ) {
		--width-header: 90%;
	}
}

// rather than overflowing up to the root element (which messes
// up sticky/fixed positioned elements elsewhere in the DOM),
// set the overflow window on the content element itself
body:has( .readerExperiments-minerva-toc__sticky-header ) {
	.collapsible-block, .mf-collapsible-content {
		overflow-x: auto;
	}
}

.ext-readerExperiments-minerva-toc__sticky-header {
	z-index: @z-index-above-content;
	background: @background-color-base;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	transition: opacity 0.3s;

	&__content {
		height: 35px;
		padding-top: @spacing-75;
		padding-bottom: @spacing-65;
		border-bottom: 1px solid @border-color-subtle;
		// Align with Minerva
		width: var( --width-header );
		margin: 0 auto;
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		display: grid;
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		grid-template-columns: auto auto 1fr;
		gap: @spacing-35;
		align-items: start;

		@media ( min-width: 993.3px ) {
			// Align with Minerva
			max-width: 993.3px;
		}
	}

	&__toc-button {
		color: inherit;
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		grid-column: 1;
		justify-self: start;

		&.cdx-toggle-button--toggled-on.cdx-toggle-button--quiet {
			// Override Codex styles
			background-color: @background-color-progressive--active;
			color: @color-inverted-fixed;
		}
	}

	&__title {
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		grid-column: 2;
		color: @color-emphasized;
		align-self: center;

		h2 {
			font-family: @font-family-serif;
			font-size: @font-size-xx-large;
			line-height: @line-height-xx-large;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2; // Truncate after 2 lines
			overflow: hidden;
			word-break: break-word;
			white-space: normal;
		}

		&--multiline {
			h2 {
				font-size: @font-size-medium;
				// Use smaller line height to fit content in header
				line-height: @line-height-x-small;
			}
		}
	}

	&__edit-button {
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		grid-column: 3;
		justify-self: end;
	}

	&:not( &__active ):not( :focus-within ) {
		// Ensure the sticky, insofar there is one, is not visible without
		// setting it to display: none so that we can still get the dimensions
		// it is/will be rendered at
		opacity: 0;
	}
}
</style>
