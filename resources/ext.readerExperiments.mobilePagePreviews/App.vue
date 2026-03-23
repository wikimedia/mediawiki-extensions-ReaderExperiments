<template>
	<bottom-sheet
		v-model:open="isOpen"
		:use-close-button="true"
		@close="onClose"
	>
		<div v-if="isLoading" class="ext-readerExperiments-mobile-page-preview__loading">
			<cdx-progress-indicator>
				{{ $i18n( 'readerexperiments-mobilepagepreviews-loading' ).text() }}
			</cdx-progress-indicator>
		</div>
		<page-preview-card
			v-else
			:thumbnail="previewData && previewData.thumbnail"
			:extract-html="previewData && previewData.extract_html"
			:href="activeHref"
		></page-preview-card>
	</bottom-sheet>
</template>

<script>
const { defineComponent, ref } = require( 'vue' );
const { CdxProgressIndicator } = require( '@wikimedia/codex' );
const { excludedLinksSelector, fromElement } = require( './copiedFromPopups.js' );
const { apiBaseUri } = require( './config.json' );
const BottomSheet = require( './components/BottomSheet.vue' );
const PagePreviewCard = require( './components/PagePreviewCard.vue' );

function fetchPreview( title ) {
	const encodedTitle = encodeURIComponent( title.getPrefixedDb() );
	const origin = apiBaseUri ? new URL( apiBaseUri ).origin : '';
	const url = `${ origin }/api/rest_v1/page/summary/${ encodedTitle }`;
	return fetch( url ).then( ( response ) => {
		if ( !response.ok ) {
			throw new Error( response.status );
		}
		return response.json();
	} );
}

// @vue/component
module.exports = exports = defineComponent( {
	name: 'PagePreviews',
	components: {
		CdxProgressIndicator,
		BottomSheet,
		PagePreviewCard
	},
	setup() {
		const previewTitle = ref( null );
		const selector = `#mw-content-text a[href][title]:not(${ excludedLinksSelector })`;
		const previewData = ref( null );
		const activeHref = ref( null );
		const isLoading = ref( false );
		const isOpen = ref( false );

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
			// should we fail to load/display the preview in time
			isOpen.value = true;
			isLoading.value = true;
			event.preventDefault();
			const redirect = () => ( window.location = link.href );
			const redirectTimeout = setTimeout( redirect, 3000 );

			fetchPreview( title )
				.then( ( data ) => {
					clearTimeout( redirectTimeout );
					isLoading.value = false;
					previewTitle.value = title;
					previewData.value = data;
					activeHref.value = event.target.href;
				} )
				.catch( () => {
					clearTimeout( redirectTimeout );
					isOpen.value = false;
					isLoading.value = false;
					redirect();
				} );
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
			// Don't update (and effectively remove) the card until the close
			// animation has completed
			isOpen.value = false;
			isLoading.value = false;
			previewTitle.value = null;
			previewData.value = null;
			activeHref.value = null;
		}

		return {
			onClose,
			previewData,
			activeHref,
			isLoading,
			isOpen
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
