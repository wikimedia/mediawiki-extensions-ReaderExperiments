<template>
	<div class="ib-vtoc-item">
		<figure>
			<a
				class="ib-vtoc-detail"
				href="#"
				@click.prevent="onItemClick( image )"><img
					:src="image.src"
					:srcset="image.srcset"
					:alt="image.alt"></a>
			<figcaption>{{ text }}</figcaption>
		</figure>
		<a
			class="ib-vtoc-link"
			href="#"
			@click.prevent="onViewInArticle( image )"
		>{{ $i18n( 'readerexperiments-imagebrowsing-vtoc-link' ) }}</a>
		<hr>
	</div>
</template>

<script>
const { computed, defineComponent } = require( 'vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'VisualTableOfContentsItem',
	components: {
	},
	props: {
		image: {
			type: Object,
			required: true
		}
	},
	emits: [
		'vtoc-item-click',
		'vtoc-view-in-article'
	],
	setup( props, { emit } ) {
		const text = computed( () => {
			return ( props.image.caption && props.image.caption.innerText ) || props.image.alt || props.image.name;
		} );

		function onItemClick( image ) {
			emit( 'vtoc-item-click', image );
		}

		function onViewInArticle( image ) {
			emit( 'vtoc-view-in-article', image );
		}

		return {
			text,
			onItemClick,
			onViewInArticle
		};
	}
} );
</script>

<style lang="less">
.ib-vtoc-item {
	width: 100%;
	max-width: 320px;
	// @fixme this should use a variable
	background: white;
}
.ib-vtoc-item figure {
}
.ib-vtoc-item figure img {
	height: 8em;
	width: 100%;
	max-width: 100%;
	align: center;
	object-fit: contain;
}
.ib-vtoc-item hr {
}
.ib-vtoc-item figure figcaption {
	padding: 1em;
}
.ib-vtoc-item .ib-vtoc-link {
	// @fixme colors should use variables
	background: #ace;
	border: solid 1px #448;
	color: #448;
	padding: 1ex;
}
</style>
