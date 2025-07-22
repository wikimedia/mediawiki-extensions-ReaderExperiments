const Vue = require( 'vue' );
const Gallery = require( './components/MediaGallery.vue' );

Vue.createMwApp( Gallery )
	.mount( '#ext-readerExperiments-imageBrowsing' );
