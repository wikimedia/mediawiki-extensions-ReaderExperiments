<template>
	<div
		v-if="hasToc"
		class="readerExperiments-minerva-toc__sticky"
	>
		<sticky-header
			ref="stickyHeadingRef"
			:is-open="isOpen"
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
				<table-of-contents></table-of-contents>
			</div>
		</teleport>
	</div>
</template>

<script>
const { defineComponent, inject, ref, useTemplateRef, nextTick } = require( 'vue' );
const StickyHeader = require( './components/StickyHeader.vue' );
const TableOfContents = require( './components/TableOfContents.vue' );
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

		let isOpen, hasToc;
		try {
			isOpen = useTableOfContentsCoordinator( 'sticky-header' );
			hasToc = true;
		} catch ( e ) {
			isOpen = ref( false );
			hasToc = true;
		}
		const onToggle = () => ( isOpen.value = !isOpen.value );

		let stickyHeadingRect;
		const stickyHeadingRef = useTemplateRef( 'stickyHeadingRef' );
		const headings = Array.from( document.querySelectorAll( '.page-heading, .mw-heading' ) );
		const shortDescription = document.querySelector( '.shortdescription' );
		const intersectingHeadings = new Set();
		const headingHtml = ref( '' );
		const subheadingText = ref( '' );
		const linkUrl = ref( '' );
		const updateStickyHeader = ( entries ) => {
			// We'd rather not traverse & process all headings on every intersection change,
			// so we'll try to use the intersecting entries to reduce the set of headings
			// to work with.
			// We can't rely on those intersecting, because that set might be empty (in 2
			// different ways: heading fell off from the top, or from the bottom of the
			// viewport)
			// We could solely rely on those that come into/fall out of the viewport (i.e.
			// those given to this handler) as a starting point, but (especially in the case
			// of collapsed sections) that could still mean having to process a lot of
			// irrelevant headings between the newly-entered-from-the-bottom heading and
			// the one we actually care about.
			// Instead, we'll use both the set of headings we know to be intersecting, and
			// those that we just lost. The very first one from that combined list should
			// always be pretty damn close to the heading we're interested in, effectively
			// minimizing the work we need to do here.
			const relevantHeadings = new Set( intersectingHeadings );
			entries.forEach( ( entry ) => {
				if ( entry.isIntersecting ) {
					intersectingHeadings.add( entry.target );
					relevantHeadings.add( entry.target );
				} else {
					intersectingHeadings.delete( entry.target );
				}
			} );

			const firstKnownHeadingCloseToViewportIndex = Array.from( relevantHeadings ).reduce(
				( index, heading ) => Math.min( index, headings.indexOf( heading ) ),
				headings.length - 1
			);

			// Find the first heading that is below the top of the viewport
			let firstUpcomingHeadingIndex = headings.length - 1;
			for ( let i = firstKnownHeadingCloseToViewportIndex; i < headings.length; i++ ) {
				const headingRect = headings[ i ].getBoundingClientRect();
				if ( headingRect.top + headingRect.height / 2 > stickyHeadingRect.height ) {
					firstUpcomingHeadingIndex = i;
					break;
				}
			}

			// Find the last non-hidden (e.g. no collapsed subsections) heading before that
			// first upcoming one
			let lastVisibleHeadingIndex = 0;
			for ( let i = firstUpcomingHeadingIndex - 1; i >= 0; i-- ) {
				// innerText will produce an empty string for elements that are not rendered
				if ( headings[ i ].innerText ) {
					lastVisibleHeadingIndex = i;
					break;
				}
			}

			const hX = headings[ lastVisibleHeadingIndex ].querySelector( 'h1, h2, h3, h4, h5, h6' );
			const link = headings[ lastVisibleHeadingIndex ].querySelector( '.mw-editsection a' );
			headingHtml.value = hX ? hX.innerText : '';
			subheadingText.value = lastVisibleHeadingIndex === 0 && shortDescription ? shortDescription.textContent : '';
			linkUrl.value = link ? link.href : '';
		};

		// Do not launch until heading is rendered and its height is known
		nextTick( () => {
			stickyHeadingRect = stickyHeadingRef.value.$el.getBoundingClientRect();
			// eslint-disable-next-line compat/compat
			const intersectionObserver = new IntersectionObserver(
				updateStickyHeader,
				{
					rootMargin: `-${ stickyHeadingRect.height || 0 }px 0px 0px 0px`,
					// 0.5 in order to have a single consistent position at which the element falls
					// in/out of view: at half the height the element; otherwise, we may be
					// triggered from either the top of the bottom of the element entering/leaving
					// the viewport (depending on scroll direction) and can not implement consistent
					// handling logic
					threshold: 0.5
				}
			);
			headings.forEach( ( heading ) => {
				intersectionObserver.observe( heading );
			} );
		} );

		return {
			teleportTarget,
			stickyHeadingRef,
			hasToc,
			isOpen,
			onToggle,
			headingHtml,
			subheadingText,
			linkUrl
		};
	}
} );
</script>

<style lang="less">
.readerExperiments-minerva-toc__sticky__toc {
	background: #fff;
	border: 1px solid #000;
	position: fixed;
	top: 40px;
	left: 10px;
	right: 10px;
	bottom: 10px;
	overflow: auto;
	padding: 10px;
}
</style>
