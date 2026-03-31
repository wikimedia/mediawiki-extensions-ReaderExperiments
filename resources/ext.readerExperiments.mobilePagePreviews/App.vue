<template>
	<bottom-sheet
		v-model:open="isOpen"
		:use-close-button="true"
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
					:title="previewTitle"
					:href="previewHref"
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
const { defineComponent, onErrorCaptured, ref } = require( 'vue' );
const { CdxProgressIndicator } = require( '@wikimedia/codex' );
const { excludedLinksSelector, fromElement } = require( './copiedFromPopups.js' );
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
		const isOpen = ref( false );
		const previewTitle = ref( null );
		const previewHref = ref( null );
		const redirectTimeout = ref( null );
		const clearRedirectTimeout = () => clearTimeout( redirectTimeout.value );
		const selector = `#mw-content-text a[href][title]:not(${ excludedLinksSelector })`;

		document.addEventListener( 'click', ( event ) => {
			if ( !event.target.closest ) {
				return;
			}

			const link = event.target.closest( selector );
			if ( !link ) {
				return;
			}

			const title = fromElement( link, mw.config );
			if ( !title ) {
				return;
			}

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

		// this is just a temporary thing to visually help identify the relevant
		// links we will be targeting, which might help us spot weird/unexpected
		// cases during development
		// @todo remove before launch
		Array.from( document.querySelectorAll( selector ) ).forEach( ( link ) => {
			const title = fromElement( link, mw.config );
			if ( !title ) {
				return;
			}

			link.style.color = 'green';
			link.style.background = 'orange';
			link.style.border = '1px solid green';
		} );

		function onClose() {
			isOpen.value = false;
			previewTitle.value = null;
			previewHref.value = null;
		}

		return {
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
</style>
