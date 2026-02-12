<!-- eslint-disable vue/no-v-html -->
<template>
	<div
		class="ext-readerExperiments-minerva-toc__sticky-header"
		:class="{ 'ext-readerExperiments-minerva-toc__sticky-header__active': isActive || isOpen }"
		@click="$emit( 'toggle' )"
	>
		<div class="ext-readerExperiments-minerva-toc__sticky-header__content">
			<cdx-toggle-button
				ref="contentsButton"
				:model-value="isOpen"
				class="ext-readerExperiments-minerva-toc__sticky-header__toc-button"
				:aria-label="$i18n( 'readerexperiments-minerva-toc-contents-button-label' ).text()"
				@click.stop="() => { /* no-op, simply prevent click from bubbling up */ }"
				@update:model-value="$emit( 'toggle' )"
			>
				<cdx-icon :icon="cdxIconListBullet"></cdx-icon>
			</cdx-toggle-button>
			<div class="ext-readerExperiments-minerva-toc__sticky-header__title">
				<h2
					ref="titleRef"
					v-html="headingHtml"
				></h2>
			</div>
			<cdx-button
				v-if="linkUrl"
				class="ext-readerExperiments-minerva-toc__sticky-header__edit-button"
				:aria-label="$i18n( 'readerexperiments-minerva-toc-edit-button-label' ).text()"
				weight="quiet"
				@click.stop="onClickLink"
			>
				<cdx-icon :icon="cdxIconEdit"></cdx-icon>
			</cdx-button>
		</div>
	</div>
</template>

<script>
const { defineComponent, useTemplateRef, ref, onMounted, onUnmounted, watch, nextTick, toRef } = require( 'vue' );
const { CdxToggleButton, CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconListBullet, cdxIconEdit } = require( '../icons.json' );

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

		const setHeadingFontSize = () => {
			if ( !titleRef.value ) {
				return;
			}

			const fontSizes = [ 'xx-large', 'x-large', 'large', 'medium' ];
			for ( const size of fontSizes ) {
				titleRef.value.dataset.size = size;
				if ( titleRef.value.scrollHeight <= titleRef.value.clientHeight ) {
					return;
				}
			}
		};

		onMounted( () => {
			setHeadingFontSize();
			window.addEventListener( 'resize', setHeadingFontSize );
		} );

		// Recheck when heading changes (e.g. scrolling to new section)
		watch( toRef( props, 'headingHtml' ), () => {
			nextTick( setHeadingFontSize );
		} );

		onUnmounted( () => {
			window.removeEventListener( 'resize', setHeadingFontSize );
		} );

		return {

			cdxIconListBullet,
			cdxIconEdit,
			onClickLink,
			titleRef,
			contentsButton,
			// eslint-disable-next-line vue/no-unused-properties
			focusOnContentsButton // The parent (StickyHeaderApp) calls this function
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';
@import '../mixins/minerva-toc.less';

:root {
	// Calculate sticky header's width considering the parent container's margin
	--height-header: 57px;
	--width-header: calc( 100% - 32px );

	@media ( min-width: @min-width-breakpoint-tablet ) {
		--width-header: calc( 100% - ( 2 * 3.35em ) );
	}

	@media ( min-width: 993.3px ) {
		--width-header: 90%;
	}
}

.ext-readerExperiments-minerva-toc__sticky-header {
	z-index: @z-index-above-content;
	background: @background-color-base;
	border-bottom: 1px solid @border-color-muted;
	box-shadow: @box-shadow-large;
	cursor: pointer;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	transition: opacity 0.3s;

	&__content {
		height: var( --height-header );
		// Align with Minerva
		width: var( --width-header );
		margin: 0 auto;
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		display: grid;
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		grid-template-columns: auto auto 1fr;
		gap: @spacing-35;
		align-items: center;

		@media ( min-width: 993.3px ) {
			// Align with Minerva
			max-width: 993.3px;
		}
	}

	&__toc-button {
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		grid-column: 1;
		justify-self: start;

		&.cdx-toggle-button--toggled-on.cdx-toggle-button--framed {
			// Override Codex styles
			.minerva-toc-button();

		}
	}

	&__title {
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		grid-column: 2;
		color: @color-emphasized;

		h2 {
			font-family: @font-family-serif;
			font-size: @font-size-xx-large;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2; // Truncate after 2 lines
			overflow: hidden;
			word-break: break-word;
			white-space: normal;
			max-height: var( --height-header );

			&[data-size="xx-large"] {
				// single-line only; 2+ lines immediately overflow
				font-size: @font-size-xx-large;
				line-height: @line-height-xx-large;
			}

			&[data-size="x-large"] {
				// single-line only; 2+ lines immediately overflow
				font-size: @font-size-x-large;
				line-height: @line-height-x-large;
			}

			&[data-size="large"] {
				font-size: @font-size-large;
				// The smaller line height will not have an effect on single-line headers,
				// but will ensure that those that do wrap to multiple lines can fit within the
				// header's height constraint
				line-height: @line-height-x-small;
			}

			&[data-size="medium"] {
				font-size: @font-size-medium;
				// The smaller line height will not have an effect on single-line headers,
				// but will ensure that those that do wrap to multiple lines can fit within the
				// header's height constraint
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
		z-index: -1;
	}
}
</style>
