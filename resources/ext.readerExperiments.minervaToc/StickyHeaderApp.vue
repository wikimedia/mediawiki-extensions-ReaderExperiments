<template>
	<div
		v-if="hasToc"
		class="ext-readerExperiments-minerva-toc__sticky"
	>
		<sticky-header
			ref="stickyHeadingRef"
			:is-open="isOpen"
			:is-active="activeHeadingId !== null"
			:heading-html="headingHtml"
			:link-url="linkUrl"
			@toggle="onToggle"
		></sticky-header>

		<teleport v-if="buttonContainer" :to="buttonContainer">
			<cdx-toggle-button
				ref="buttonRef"
				:model-value="isOpen"
				class="ext-readerExperiments-minerva-toc__sticky__heading-button"
				quiet
				:aria-label="$i18n( 'readerexperiments-minerva-toc-contents-button-label' ).text()"
				@update:model-value="onToggle"
			>
				<cdx-icon :icon="cdxIconListBullet"></cdx-icon>
			</cdx-toggle-button>
		</teleport>

		<teleport :to="teleportTarget">
			<Transition name="ext-readerExperiments-minerva-toc-fade">
				<div
					v-if="isOpen"
					ref="tocWrapperRef"
					class="ext-readerExperiments-minerva-toc__sticky__toc"
				>
					<table-of-contents
						:active-heading-id="activeHeadingId"
						@close="onTocClose">
					</table-of-contents>
				</div>
			</Transition>
		</teleport>
	</div>
</template>

<script>
const { computed, defineComponent, inject, nextTick, onMounted, ref, useTemplateRef, watch } = require( 'vue' );
const { CdxToggleButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconListBullet } = require( './icons.json' );
const StickyHeader = require( './components/StickyHeader.vue' );
const TableOfContents = require( './components/TableOfContents.vue' );
const useActiveHeading = require( './composables/useActiveHeading.js' );
const useClickOutsideToClose = require( './composables/useClickOutsideToClose.js' );
const useTableOfContentsCoordinator = require( './composables/useTableOfContentsCoordinator.js' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'StickyHeaderApp',
	components: {
		StickyHeader,
		TableOfContents,
		CdxToggleButton,
		CdxIcon
	},
	props: {
		buttonContainer: {
			type: HTMLElement,
			default: null
		}
	},
	setup() {
		const teleportTarget = inject( 'CdxTeleportTarget' );
		const stickyHeadingRef = useTemplateRef( 'stickyHeadingRef' );
		const buttonRef = useTemplateRef( 'buttonRef' );
		const tocWrapperRef = useTemplateRef( 'tocWrapperRef' );

		let isOpen, hasToc;
		try {
			isOpen = useTableOfContentsCoordinator( 'sticky-header' );
			hasToc = true;
		} catch ( e ) {
			isOpen = ref( false );
			hasToc = false;
		}

		const onToggle = () => {
			mw.hook( 'readerExperiments.toc.iconClick' ).fire( 'sticky-header' );
			isOpen.value = !isOpen.value;
		};

		const activeHeading = ref( null );
		watch(
			// Consider heading active once it passes about half the sticky,
			// which is usually going to be between ~57px (single line heading)
			// to ~91px (multi-line heading) in height, assuming users did not
			// further alter font sizes
			useActiveHeading( 30 ),
			( heading ) => ( activeHeading.value = heading )
		);

		const activeHeadingHx = computed( () => activeHeading.value && activeHeading.value.querySelector( 'h1, h2, h3, h4, h5, h6' ) || null );
		const activeHeadingId = computed( () => activeHeadingHx.value && activeHeadingHx.value.attributes.id && activeHeadingHx.value.attributes.id.value || null );

		// "Active heading" refers to the heading for the content currently at the
		// top of the viewport. I.e. as soon as one of the headings scrolls past the
		// viewport top, we'll have an "active" one. This will inform us about when
		// to start showing the sticky header (based on user scroll interaction).
		// Sticky header will show contextual information WRT the active heading,
		// but it is possible that it displays *before* there even is an active
		// heading (i.e. loading the page with TOC immediately visible - either
		// through keyboard tabbing, or URL #toc - before we even scrolled past the
		// page heading), in which case we'll fall back to showing information about
		// the first (page heading)
		const contextHeading = computed( () => activeHeading.value || document.querySelector( '.page-heading' ) );
		const contextHeadingHx = computed( () => contextHeading.value && contextHeading.value.querySelector( 'h1, h2, h3, h4, h5, h6' ) || null );
		const headingHtml = computed( () => contextHeadingHx.value ? contextHeadingHx.value.innerText : '' );
		const linkUrl = computed( () => {
			const link = contextHeading.value && contextHeading.value.querySelector( '.mw-editsection a' );
			return link ? link.href : '';
		} );

		// We have 2 different buttons to trigger the TOC, both of which have slightly
		// diverging behaviour - this is a convenience method to determine which path
		// to take in those cases by indicating the button relevant for how the TOC is
		// showing
		const getTogglerRef = () => {
			if ( activeHeading.value === null && buttonRef && buttonRef.value ) {
				return buttonRef;
			}

			return stickyHeadingRef;
		};

		const onTocClose = ( { restoreFocus = true } = {} ) => {
			if ( !restoreFocus ) {
				return;
			}

			const toggler = getTogglerRef();
			if ( toggler === buttonRef ) {
				buttonRef.value.$el.focus();
			} else {
				stickyHeadingRef.value.focusOnContentsButton();
			}
		};

		// Close TOC when clicking outside
		useClickOutsideToClose( isOpen, () => [
			tocWrapperRef.value,
			stickyHeadingRef.value && stickyHeadingRef.value.$el,
			buttonRef.value && buttonRef.value.$el
		] );

		// Since the sticky header is variable in height, we'll need to make sure the
		// TOC is correctly positioned right below it if it changes
		const updateTocPosition = () => {
			if ( isOpen.value && tocWrapperRef.value ) {
				let position;
				const toggler = getTogglerRef();
				if ( toggler === buttonRef ) {
					const buttonBottom = buttonRef.value.$el.getBoundingClientRect().bottom;
					if ( buttonBottom < 0 ) {
						// Heading button is off-screen (e.g. page loaded with #toc
						// while scrolled) — fall back to sticky header height
						position = stickyHeadingRef.value.$el.getBoundingClientRect().height - 1;
					} else {
						position = buttonBottom + 4;
					}
				} else {
					// Using `bottom` instead of `height` would be the more ideal way of calculating
					// this position, but those 2 values should always be the same (it's always
					// positioned at the very top, so top + height = bottom) and circumvents
					// potential interference from CSS transitions that slide the header inward
					// from the top of the page if the header was not already visible (e.g. when
					// initiated from outside the sticky header, when it's not yet visible)
					// Subtract 1px to overlap borders for a flush appearance
					position = stickyHeadingRef.value.$el.getBoundingClientRect().height - 1;
				}

				tocWrapperRef.value.style.top = position + 'px';
			}
		};
		onMounted( updateTocPosition );
		watch( isOpen, () => nextTick( updateTocPosition ) );

		return {
			teleportTarget,
			cdxIconListBullet,
			stickyHeadingRef,
			buttonRef,
			hasToc,
			isOpen,
			onToggle,
			onTocClose,
			activeHeadingId,
			headingHtml,
			linkUrl,
			tocWrapperRef
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';
@import './mixins/minerva-toc.less';

// Position the page title button & page title right next to one another
.page-heading:has( .ext-readerExperiments-minerva-toc__page-heading-button-container ) {
	display: flex;
	align-items: baseline;
}

.ext-readerExperiments-minerva-toc__sticky {
	// Align with Minerva's margins
	margin-left: @spacing-100;
	margin-right: @spacing-100;

	@media ( min-width: @min-width-breakpoint-tablet ) {
		margin-left: 3.35em;
		margin-right: 3.35em;
	}

	@media ( min-width: 993.3px ) {
		margin-left: auto;
		margin-right: auto;
		display: flex;
		justify-content: center;
	}

	&__heading-button {
		margin-right: @spacing-35;

		// When the TOC is open (toggled-on state)
		// Specificity needed to override Codex styles
		&.cdx-toggle-button--toggled-on.cdx-toggle-button--quiet {
			.minerva-toc-button();
		}
	}

	&__toc {
		.minerva-toc__toc();
		// Single-line header height is 54px, minus 1px to overlap borders
		// (Note that JS will end up overriding the top value to match the actual header height anyway)
		top: 53px;
		bottom: 25%;

		@media ( min-width: @min-width-breakpoint-tablet ) {
			// Align TOC with the start of the sticky header toggle button
			left: 3.35em;
			right: auto;
		}

		// 993.3px breakpoint from Minerva (`.minerva-header`)
		@media ( min-width: 993.3px ) {
			// Calculate a dynamic left offset
			// Header uses widths: 90% and 993.3px
			// Mirror that positioning: (100vw - headerWidth) / 2
			/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
			left: ~'calc( ( 100vw - min( 90vw, 993.3px ) ) / 2 )';
		}
	}
}
</style>
