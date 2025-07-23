<template>
	<h1>Hi I'm the gallery!</h1>
</template>

<script>
const Vue = require( 'vue' );
const { extractThumbInfo } = require( '../thumbExtractor.js' );

// @vue/component
module.exports = exports = Vue.defineComponent( {
	name: 'MediaGallery',
	components: {},
	setup() {
		const content = document.getElementById( 'content' );
		if ( content ) {
			const thumbs = extractThumbInfo( content );
			// eslint-disable-next-line no-console
			console.log( 'thumbs:', ...thumbs );
			// @todo do something with these thumbnails
		}
		return {};
	}
} );
</script>

<style lang="less">
</style>
