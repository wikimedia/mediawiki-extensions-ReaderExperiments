<template>
	<!-- eslint-disable vue/no-v-html -->
	<div
		class="readerExperiments-minerva-toc__content"
		v-html="toc"
	></div>
</template>

<script>
const { defineComponent } = require( 'vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'TableOfContents',
	setup() {
		// @todo implement focus trap

		const original = document.querySelector( '#toc > ul' );
		if ( !original ) {
			throw new Error( 'TOC not found' );
		}

		const toc = original.outerHTML;
		// @todo add "(top)" link, which, when clicked, invokes `closeToc()` and scrolls to top

		return {
			toc
		};
	}
} );
</script>

<style lang="less">
// Prevent body scroll when TOC is open
body:has( .readerExperiments-minerva-toc__content ) {
	overflow: hidden;
}
</style>
