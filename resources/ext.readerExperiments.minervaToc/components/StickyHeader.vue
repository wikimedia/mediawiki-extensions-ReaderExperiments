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
				<h2 v-html="headingHtml"></h2>
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
const { defineComponent, useTemplateRef } = require( 'vue' );
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

		return {
			contentsButton,
			cdxIconListBullet,
			cdxIconEdit,
			onClickLink,
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
		// Align with Minerva
		width: var( --width-header );
		margin: 0 auto;
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		display: grid;
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		grid-template-columns: auto auto 1fr;
		gap: @spacing-35;
		padding-top: @spacing-75;
		padding-bottom: @spacing-65;
		align-items: baseline;

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
			line-height: @line-height-large;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2; // Truncate after 2 lines
			overflow: hidden;
			word-break: break-word;
			white-space: normal;
		}
	}

	&__edit-button {
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		grid-column: 3;
		justify-self: end;
	}

	&:not( &__active ):not( :focus-within ) {
		// Ensure the sticky, insofar there is one, is not visible without
		// setting it to `display: none` so that it still provides keyboard
		// tab access to the TOC button
		opacity: 0;
		z-index: -1;
	}
}
</style>
