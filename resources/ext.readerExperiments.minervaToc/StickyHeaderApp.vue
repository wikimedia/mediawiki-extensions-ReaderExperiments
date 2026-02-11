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
			:subheading-text="subheadingText"
			:link-url="linkUrl"
			@toggle="onToggle"
		></sticky-header>

		<teleport
			v-if="isOpen"
			:to="teleportTarget"
		>
			<div class="ext-readerExperiments-minerva-toc__sticky__toc">
				<table-of-contents
					:active-heading-id="activeHeadingId"
					@close="onTocClose">
				</table-of-contents>
			</div>
		</teleport>
	</div>
</template>

<script>
const { computed, defineComponent, inject, ref, useTemplateRef, nextTick, watch } = require( 'vue' );
const StickyHeader = require( './components/StickyHeader.vue' );
const TableOfContents = require( './components/TableOfContents.vue' );
const useActiveHeading = require( './composables/useActiveHeading.js' );
const useTableOfContentsCoordinator = require( './composables/useTableOfContentsCoordinator.js' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'StickyHeaderApp',
	components: {
		StickyHeader,
		TableOfContents
	},
	setup() {
		const teleportTarget = inject( 'CdxTeleportTarget' );
		const stickyHeadingRef = useTemplateRef( 'stickyHeadingRef' );

		let isOpen, hasToc;
		try {
			isOpen = useTableOfContentsCoordinator( 'sticky-header' );
			hasToc = true;
		} catch ( e ) {
			isOpen = ref( false );
			hasToc = false;
		}

		const onToggle = () => ( isOpen.value = !isOpen.value );

		const onTocClose = ( { restoreFocus = true } = {} ) => {
			if ( restoreFocus && stickyHeadingRef.value ) {
				stickyHeadingRef.value.focusOnContentsButton();
			}
		};

		const shortDescription = document.querySelector( '.shortdescription' );

		const activeHeading = ref( null );
		// Do not launch until heading is rendered and its height is known
		nextTick( () => {
			if ( !stickyHeadingRef.value ) {
				return;
			}

			const stickyHeadingRect = stickyHeadingRef.value.$el.getBoundingClientRect();
			watch(
				// Consider heading active once it passes half the sticky
				useActiveHeading( stickyHeadingRect.height / 2 ),
				( heading ) => ( activeHeading.value = heading )
			);
		} );

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
		const subheadingText = computed( () => contextHeadingHx.value && contextHeadingHx.value.tagName === 'H1' && shortDescription ? shortDescription.textContent : '' );
		const linkUrl = computed( () => {
			const link = contextHeading.value && contextHeading.value.querySelector( '.mw-editsection a' );
			return link ? link.href : '';
		} );

		return {
			teleportTarget,
			stickyHeadingRef,
			hasToc,
			isOpen,
			onToggle,
			onTocClose,
			activeHeadingId,
			headingHtml,
			subheadingText,
			linkUrl
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';
@import './mixins/minerva-toc.less';

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

	&__toc {
		.minerva-toc__toc();
		top: 58px;
		bottom: 10px;

		@media ( min-width: 740px ) {
			// Align TOC with the start of the sticky header toggle button
			left: 3.35em;
			right: auto;
		}

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
