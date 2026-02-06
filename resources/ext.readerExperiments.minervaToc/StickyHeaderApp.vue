<template>
	<div
		v-if="hasToc"
		class="readerExperiments-minerva-toc__sticky"
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
			<div class="readerExperiments-minerva-toc__sticky__toc">
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
				useActiveHeading( stickyHeadingRect.height || 0 ),
				( heading ) => ( activeHeading.value = heading )
			);
		} );

		const activeHeadingHx = computed( () => activeHeading.value && activeHeading.value.querySelector( 'h1, h2, h3, h4, h5, h6' ) || null );
		const activeHeadingId = computed( () => activeHeadingHx.value && activeHeadingHx.value.attributes.id && activeHeadingHx.value.attributes.id.value || null );
		const headingHtml = computed( () => activeHeadingHx.value ? activeHeadingHx.value.innerText : '' );
		const subheadingText = computed( () => activeHeadingHx.value && activeHeadingHx.value.tagName === 'H1' && shortDescription ? shortDescription.textContent : '' );
		const linkUrl = computed( () => {
			const link = activeHeading.value && activeHeading.value.querySelector( '.mw-editsection a' );
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

.readerExperiments-minerva-toc__sticky__toc {
	.minerva-toc__toc();
	top: 40px;
	bottom: 10px;
}
</style>
