<template>
	<teleport :to="teleportTarget">
		<div v-if="previewTitle" class="ext-readerExperiments-mobile-page-previews-todo">
			<span>Preview for <strong>{{ previewTitle.getPrefixedText() }}</strong></span>
			<a href="#" @click.prevent="onClose">close</a>
		</div>
	</teleport>
</template>

<script>
const { defineComponent, ref, inject } = require( 'vue' );
const { excludedLinksSelector, fromElement } = require( './copiedFromPopups.js' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'PagePreviews',
	setup() {
		const teleportTarget = inject( 'CdxTeleportTarget' );
		const previewTitle = ref( null );
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
			// should we fail to load/display the preview in time
			event.preventDefault();
			const redirect = () => ( window.location = link.href );
			const redirectTimeout = setTimeout( redirect, 1000 );

			// eslint-disable-next-line es-x/no-promise-prototype-finally
			new Promise( ( resolve, reject ) => {
				// Let's pretend that this is the whole "get preview data
				// from API and display the preview" routine. This might
				// all end up looking completely different, but I just
				// wanted to make sure that I had <something> in here
				// to make us reflect on how to handle failures.

				// 1 in 11 will take too long
				setTimeout( resolve, Math.random() * 1100 );
				// 1 in 11 will fail (before they would've succeeded in time)
				setTimeout( reject, Math.random() * 11000 );
			} )
				.then( () => ( previewTitle.value = title ) )
				.catch( redirect )
				.finally( () => ( clearTimeout( redirectTimeout ) ) );
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

		return {
			teleportTarget,
			previewTitle,
			onClose: () => ( previewTitle.value = null )
		};
	}
} );
</script>

<style lang="less">
.ext-readerExperiments-mobile-page-previews-todo {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: white;
	border: 1px solid black;
	display: flex;
	padding: 20px;
	gap: 40px;
}
</style>
