<template>
	<bottom-sheet
		v-model:open="isOpen"
		:use-close-button="true"
		:title="$i18n( 'readerexperiments-mobilepagepreviews-title' ).text()"
		:hide-title="true"
		@close="onClose"
	>
		<suspense
			:key="
				// we don't really need this (page-preview-card is reactive), but
				// it forces an entirely new suspend cycle to load the new card when
				// the title changes, prompting the progress indicator again
				previewTitle
			"
			@resolve="clearRedirectTimeout"
		>
			<template #default>
				<page-preview-card
					ref="previewRef"
					:title="previewTitle"
					:href="previewHref"
					@click-link="onReadMore"
				></page-preview-card>
			</template>

			<template #fallback>
				<div class="ext-readerExperiments-mobile-page-preview__loading">
					<cdx-progress-indicator>
						{{ $i18n( 'readerexperiments-mobilepagepreviews-loading' ).text() }}
					</cdx-progress-indicator>
				</div>
			</template>
		</suspense>
	</bottom-sheet>
</template>

<script>
const { defineComponent, onErrorCaptured, ref, useTemplateRef, watch } = require( 'vue' );
const { CdxProgressIndicator } = require( '@wikimedia/codex' );
const { isExcludedLink, fromElement } = require( './copiedFromPopups.js' );
const BottomSheet = require( './components/BottomSheet.vue' );
const PagePreviewCard = require( './components/PagePreviewCard.vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'PagePreviews',
	components: {
		CdxProgressIndicator,
		BottomSheet,
		PagePreviewCard
	},
	setup() {
		const previewRef = useTemplateRef( 'previewRef' );
		const isOpen = ref( false );
		const hasThumbnail = ref( false );
		const previewTitle = ref( null );
		const previewHref = ref( null );
		const redirectTimeout = ref( null );
		const clearRedirectTimeout = () => clearTimeout( redirectTimeout.value );
		const selector = '#mw-content-text a[href][title]';

		document.addEventListener( 'click', ( event ) => {
			if ( !event.target.closest ) {
				return;
			}

			const link = event.target.closest( selector );
			if ( !link || isExcludedLink( link ) ) {
				return;
			}

			const title = fromElement( link, mw.config );
			if ( !title ) {
				return;
			}

			link.classList.add( 'ext-readerExperiments-mobile-page-preview-link' );

			// Do not let the browser follow the link, but start a timer
			// to fall back to navigating to the intended link after all,
			// should we fail to load/display the preview in time.
			// Clear existing timeout before kicking off a new one.
			event.preventDefault();
			const redirect = () => ( window.location = link.href );
			clearRedirectTimeout();
			redirectTimeout.value = setTimeout( redirect, 3000 );

			isOpen.value = true;
			previewTitle.value = title.getPrefixedDb();
			previewHref.value = link.href;
		} );

		onErrorCaptured( () => {
			// Any error that is encountered (which would most likely be
			// a failure to fetch the required data from the API) should
			// fall back to pointing the user to the link they intended
			// to navigate to.
			if ( previewHref.value ) {
				clearRedirectTimeout();
				isOpen.value = false;
				window.location = previewHref.value;
			}
			return false;
		} );

		watch(
			previewRef,
			() => {
				if ( previewRef.value ) {
					hasThumbnail.value = previewRef.value.$el.querySelector( '.ext-readerExperiments-mobile-page-preview-card__thumbnail' ) !== null;
					mw.hook( 'readerExperiments.mobilePagePreviews.init' ).fire( hasThumbnail.value );
				} else {
					mw.hook( 'readerExperiments.mobilePagePreviews.close' ).fire( hasThumbnail.value );
					hasThumbnail.value = false;
				}
			}
		);

		function onReadMore() {
			mw.hook( 'readerExperiments.mobilePagePreviews.read-more' ).fire( hasThumbnail.value );
		}

		function onClose() {
			isOpen.value = false;
			previewTitle.value = null;
			previewHref.value = null;

			Array.from( document.querySelectorAll( '.ext-readerExperiments-mobile-page-preview-link' ) )
				.forEach( ( link ) => ( link.classList.remove( 'ext-readerExperiments-mobile-page-preview-link' ) ) );
		}

		return {
			previewRef,
			onReadMore,
			onClose,
			clearRedirectTimeout,
			isOpen,
			previewTitle,
			previewHref
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ext-readerExperiments-mobile-page-preview__loading {
	display: flex;
	justify-content: center;
	// Set min height because the preview card is taller than loading state.
	// This doesn't prevent layout shifts. When the preview data loads, the
	// sheet grows taller.
	min-height: @size-400;
}

// Mock regular `:active` state despite not _actually_ being :active
// (as focus has moved to within the sheet)
// High specificity needed to override other styles.
// Based on limited testing of Firefox, Chrome, and Safari.
// Note that iOS Safari requires :where :visited :hover selector
.ext-readerExperiments-mobile-page-preview-link {
	&:where( :not( [ role='button' ] ):not( .cdx-menu-item__content ) ),
	&:where( :not( [ role='button' ] ):not( .cdx-menu-item__content ) ):visited,
	&:where( :not( [ role='button' ] ):not( .cdx-menu-item__content ) ):visited:hover {
		color: @color-link--active;
		text-decoration: @text-decoration-underline;
	}
}
</style>
