<template>
	<teleport :to="teleportTarget">
		<div
			v-if="isLoading || previewTitle"
			ref="previewRef"
			class="ext-readerExperiments-mobile-page-preview__sheet"
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
		</div>
	</teleport>
</template>

<script>
const { defineComponent, ref, inject, watch, onUnmounted, useTemplateRef } = require( 'vue' );
const { excludedLinksSelector, fromElement } = require( './copiedFromPopups.js' );
const { apiBaseUri } = require( './config.json' );
const { CdxProgressIndicator } = require( '@wikimedia/codex' );
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
	components: { CdxProgressIndicator, PagePreviewCard },
	setup() {
		const teleportTarget = inject( 'CdxTeleportTarget' );
		const previewTitle = ref( null );
		const selector = `#mw-content-text a[href][title]:not(${ excludedLinksSelector })`;
		const previewData = ref( null );
		const activeHref = ref( null );
		const previewRef = useTemplateRef( 'previewRef' );
		const isLoading = ref( false );

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
			isLoading.value = true;
			event.preventDefault();
			const redirect = () => ( window.location = link.href );
			const redirectTimeout = setTimeout( redirect, 3000 );

			fetchPreview( title )
				.then( ( data ) => {
					clearTimeout( redirectTimeout );
					activeHref.value = event.target.href;
					previewData.value = data;
					previewTitle.value = title;
					isLoading.value = false;
				} )
				.catch( () => {
					clearTimeout( redirectTimeout );
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
			isLoading.value = false;
			previewTitle.value = null;
			previewData.value = null;
			activeHref.value = null;
		}

		function onClickOutside( event ) {
			if ( previewRef.value && !previewRef.value.contains( event.target ) ) {
				onClose();
			}
		}

		// Add listener as soon as the bottom sheet becomes visible (loading state)
		watch( () => isLoading.value || !!previewTitle.value, ( newValue ) => {
			if ( newValue ) {
				document.addEventListener( 'click', onClickOutside );
			} else {
				document.removeEventListener( 'click', onClickOutside );
			}
		}, { immediate: true } );

		onUnmounted( () => {
			document.removeEventListener( 'click', onClickOutside );
		} );

		return {
			teleportTarget,
			previewTitle,
			previewData,
			activeHref,
			previewRef,
			isLoading
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ext-readerExperiments-mobile-page-preview {
	&__sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: @background-color-base;
		border-radius: 8px 8px 0 0;
		box-shadow: 0 -2px 8px rgba( 0, 0, 0, 0.15 );
		padding: @spacing-50 @spacing-100 @spacing-150; // top 8px, right/left 16px, bottom 24px
	}

	&__loading {
		display: flex;
		justify-content: center;
		// Set min height because the preview card is taller than loading state.
		// This doesn't prevent layout shifts. When the preview data loads, the
		// sheet grows taller.
		min-height: @size-400;
	}
}
</style>
