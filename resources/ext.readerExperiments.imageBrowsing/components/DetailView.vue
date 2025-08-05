<template>
	<div class="ib-detail-view">
		<h2>
			Current active image
		</h2>

		<img :src="activeImage.thumb.src" alt="">
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'DetailView',
	components: {
	},
	props: {
		activeImage: {
			type: Object,
			required: true
		}
	},
	setup() {
		return {};
	}
} );
</script>

<style lang="less">
</style>
