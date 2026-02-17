<template>
	<div
		v-if="hasToc"
		class="ext-readerExperiments-minerva-toc__button"
	>
		<cdx-toggle-button
			ref="toggleButtonRef"
			v-model="isOpen"
			class="ext-readerExperiments-minerva-toc__button__action"
			@click="onIconClick"
		>
			<cdx-icon :icon="cdxIconListBullet"></cdx-icon>
			{{ $i18n( 'readerexperiments-minerva-toc-contents-button-label' ).text() }}
		</cdx-toggle-button>

		<teleport
			v-if="isOpen"
			:to="teleportTarget"
		>
			<div class="ext-readerExperiments-minerva-toc__button__toc">
				<table-of-contents
					:active-heading-id="activeHeadingId"
					@close="onTocClose">
				</table-of-contents>
			</div>
		</teleport>
	</div>
</template>

<script>

const { computed, defineComponent, inject, ref, useTemplateRef } = require( 'vue' );
const { CdxIcon, CdxToggleButton } = require( '@wikimedia/codex' );
const { cdxIconListBullet } = require( './icons.json' );
const TableOfContents = require( './components/TableOfContents.vue' );
const useActiveHeading = require( './composables/useActiveHeading.js' );
const useTableOfContentsCoordinator = require( './composables/useTableOfContentsCoordinator.js' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'FloatingButtonApp',
	components: {
		CdxToggleButton,
		CdxIcon,
		TableOfContents
	},
	setup() {
		const teleportTarget = inject( 'CdxTeleportTarget' );
		const toggleButtonRef = useTemplateRef( 'toggleButtonRef' );
		let isOpen, hasToc;

		try {
			isOpen = useTableOfContentsCoordinator( 'floating-button' );
			hasToc = true;
		} catch ( e ) {
			isOpen = ref( false );
			hasToc = false;
		}

		const activeHeading = useActiveHeading( 0 );
		const activeHeadingHx = computed( () => activeHeading.value && activeHeading.value.querySelector( 'h1, h2, h3, h4, h5, h6' ) || null );
		const activeHeadingId = computed( () => activeHeadingHx.value && activeHeadingHx.value.attributes.id && activeHeadingHx.value.attributes.id.value || null );

		const onTocClose = ( { restoreFocus = true } = {} ) => {
			if ( restoreFocus ) {
				// eslint-disable-next-line no-jquery/no-event-shorthand
				toggleButtonRef.value.$el.focus();
			}
		};

		const onIconClick = () => {
			mw.hook( 'readerExperiments.toc.iconClick' ).fire( 'floating-button' );
		};

		return {
			teleportTarget,
			toggleButtonRef,
			cdxIconListBullet,
			hasToc,
			isOpen,
			activeHeadingId,
			onTocClose,
			onIconClick
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';
@import './mixins/minerva-toc.less';

:root {
	--min-height-button: @min-size-interactive-touch; // 44px default

	@media ( min-width: @min-width-breakpoint-desktop ) {
		--min-height-button: @min-size-interactive-pointer; // 32px on desktop
	}
}

.ext-readerExperiments-minerva-toc__button {
	@position-bottom-button: 20px;
	position: fixed;
	bottom: @position-bottom-button;
	left: 50%;
	transform: translate( -50% );

	// Specificity needed to override Codex styles
	& &__action.cdx-toggle-button {
		border-radius: @border-radius-pill;
		box-shadow: @box-shadow-large;
		min-height: var( --min-height-button );

		&:focus {
			outline: 2px solid @outline-color-progressive--focus;
		}

		// When the TOC is open (toggled-on state)
		&--toggled-on:enabled {
			// Override Codex styles
			.minerva-toc-button();
		}
	}

	&__toc {
		.minerva-toc__toc();
		.minerva-toc__fade-in();
		top: 25%;
		// Calculate the space from the viewport bottom and
		// create a 24px gap between the button and TOC
		bottom: calc( @position-bottom-button + @spacing-150 + var( --min-height-button ) );

		@media ( min-width: @min-width-breakpoint-tablet ) {
			margin: auto;
		}
	}
}

body {
	// Hide the button when the editor overlay is visible aka edit mode
	/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
	&:has( > .mw-overlays-container > .editor-overlay.visible ) {
		.ext-readerExperiments-minerva-toc__button {
			display: none;
		}
	}
	// Reposition the button and toc when the toast message is visible
	/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
	&:has( > .mw-notification-area > .mw-notification-visible ) {
		.ext-readerExperiments-minerva-toc__button {
			bottom: 80px;

			&__toc {
				bottom: 140px;
			}
		}
	}
}
</style>
