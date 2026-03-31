<template>
	<teleport :to="teleportTarget">
		<transition
			appear
			name="ext-readerExperiments-mobile-page-preview-sheet__backdrop__transition"
		>
			<div
				v-if="open"
				class="ext-readerExperiments-mobile-page-preview-sheet__backdrop"
				@click="onClose"
			></div>
		</transition>

		<transition
			appear
			name="ext-readerExperiments-mobile-page-preview-sheet__container__transition"
			@enter="onEnter"
			@after-enter="onAfterEnter"
			@leave="onLeave"
			@after-leave="onAfterLeave"
		>
			<div
				v-if="open"
				ref="containerRef"
				class="ext-readerExperiments-mobile-page-preview-sheet__container"
				role="dialog"
				aria-modal="true"
				:aria-label="$slots.header || hideTitle ? title : undefined"
				:aria-labelledby="!$slots.header && !hideTitle ? labelId : undefined"
				@keydown.esc="onClose"
			>
				<focus-trap ref="focusTrapRef">
					<div ref="contentRef">
						<slot name="header">
							<div class="ext-readerExperiments-mobile-page-preview-sheet__header">
								<h2
									v-if="!hideTitle"
									:id="labelId"
									class="ext-readerExperiments-mobile-page-preview-sheet__title"
								>
									{{ title }}
								</h2>
								<cdx-button
									v-if="useCloseButton"
									class="ext-readerExperiments-mobile-page-preview-sheet__close"
									weight="quiet"
									:disabled="isTransitioning"
									:aria-label="$i18n( 'readerexperiments-mobilepagepreviews-close-button-label' )"
									@click.stop="onClose"
								>
									<cdx-icon :icon="cdxIconClose"></cdx-icon>
								</cdx-button>
							</div>
						</slot>

						<div class="ext-readerExperiments-mobile-page-preview-sheet__body">
							<slot></slot>
						</div>
					</div>
				</focus-trap>
			</div>
		</transition>
	</teleport>
</template>

<script>
const { defineComponent, inject, nextTick, ref, useId, useTemplateRef, watch } = require( 'vue' );
const { CdxButton, CdxIcon, useResizeObserver } = require( '@wikimedia/codex' );
const { cdxIconClose } = require( '../icons.json' );
const FocusTrap = require( './FocusTrap.vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'BottomSheet',
	components: {
		FocusTrap,
		CdxButton,
		CdxIcon
	},
	props: {
		open: {
			type: Boolean,
			default: false
		},
		title: {
			type: String,
			required: true
		},
		hideTitle: {
			type: Boolean,
			default: false
		},
		useCloseButton: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		'update:open',
		'close'
	],
	setup( props, { emit } ) {
		const teleportTarget = inject( 'CdxTeleportTarget' );
		const focusTrapRef = useTemplateRef( 'focusTrapRef' );
		const containerRef = useTemplateRef( 'containerRef' );
		const contentRef = useTemplateRef( 'contentRef' );
		const labelId = useId();
		const isTransitioning = ref( false );

		function onClose() {
			if ( !props.open ) {
				// Already closed/closing
				return;
			}

			if ( isTransitioning.value ) {
				// Disallow close during transitions; with the sheet being a moving
				// target, they're likely to be unintentional
				return;
			}

			emit( 'update:open', false );
		}

		// Smooth transitions if the content changes:
		// `height: auto` does not allow for transitions, so we'll let it render in
		// an overflowing child node, monitor changes, and then copy over that height
		// to the main container that then transitions.
		const contentDimensions = useResizeObserver( contentRef );
		watch(
			() => contentDimensions.value.height,
			( height ) => {
				if ( props.open && containerRef.value && height ) {
					containerRef.value.style.height = height + 'px';
				}
			}
		);

		function onEnter() {
			isTransitioning.value = true;
		}
		function onAfterEnter() {
			isTransitioning.value = false;
			nextTick( () => ( focusTrapRef.value.focusFirstFocusableElement() ) );
		}
		function onLeave() {
			isTransitioning.value = true;
		}
		function onAfterLeave() {
			isTransitioning.value = false;
			emit( 'close' );
		}

		return {
			cdxIconClose,
			teleportTarget,
			focusTrapRef,
			containerRef,
			contentRef,
			labelId,
			isTransitioning,
			onClose,
			onEnter,
			onAfterEnter,
			onLeave,
			onAfterLeave
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

body:has( .ext-readerExperiments-mobile-page-preview-sheet__container ) {
	// disable page scroll while preview is open
	overflow: hidden;
}

.ext-readerExperiments-mobile-page-preview-sheet {
	&__backdrop {
		position: fixed;
		top: 0;
		left: 0;
		z-index: @z-index-overlay-backdrop;
		width: @size-viewport-width-full;
		height: @size-viewport-height-full;
		background-color: @background-color-backdrop-light;

		&__transition-enter-active,
		&__transition-leave-active {
			transition: background-color 300ms;
		}

		&__transition-enter-from,
		&__transition-leave-to {
			background-color: transparent;
		}
	}

	&__container {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: @z-index-overlay-backdrop;
		max-width: @size-3200;
		max-height: calc( @size-viewport-height-full - @size-400 );
		justify-self: center;
		background: @background-color-base;
		border-radius: 8px 8px 0 0;
		box-shadow: 0 -2px 8px rgba( 0, 0, 0, 0.15 );
		// regardless of any height set on this node, we need to allow children
		// to render unconstrained, at whatever height fits their content
		overflow-y: hidden;
		// we'll be setting height in JS to be equal to the scroll height of the
		// children (once rendered) to allow for smooth height-based transitions
		// when the content changes (transitions for `height: auto` don't work,
		// hence this workaround)
		box-sizing: content-box;
		// full-screen width, but with `box-sizing: content-box` (which is the
		// more practical one for automatically resizing based on child content),
		// we need to also subtract padding
		width: calc( @size-viewport-width-full - 2 * @spacing-100 );
		transition: height 300ms;

		&__transition-enter-active,
		&__transition-leave-active {
			transition: transform 300ms;
		}

		&__transition-enter-from,
		&__transition-leave-to {
			transform: translateY( 100% );
		}
	}

	&__header {
		display: flex;
		align-items: baseline;
		justify-content: flex-end;
		padding: @spacing-50 @spacing-100 0;
	}

	// increase specificity to override Minerva styles
	// stylelint-disable-next-line selector-class-pattern
	.content &__title {
		flex: 1;
		margin: 0;
		border: 0;
		padding: 0 0 @spacing-50;
		font-family: inherit;
		font-size: @font-size-x-large;
		font-weight: @font-weight-bold;
		line-height: @line-height-x-large;
	}

	&__body {
		overflow: auto;
		padding: @spacing-50 @spacing-100 @spacing-150;
	}
}
</style>
