<template>
	<div>
		<audio ref="audioPlayer"></audio>
	</div>
</template>

<script>
const { defineComponent, ref } = require( 'vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'ReadAloud',
	setup() {
		const audioPlayer = ref( null );
		// TODO: T434890 plug in media events ...
		return {
			audioPlayer
		};
	}
} );
</script>
