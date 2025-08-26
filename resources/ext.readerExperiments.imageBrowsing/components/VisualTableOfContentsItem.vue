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
		<div class="ib-vtoc-link-container">
			<cdx-button
				class="ib-vtoc-link"
				action="progressive"
				@click.prevent="onViewInArticle( image )"
			>{{ $i18n( 'readerexperiments-imagebrowsing-vtoc-link' ) }}</cdx-button>
		</div>
		<hr>
	</div>
</template>

<script>
const { computed, defineComponent } = require( 'vue' );
const { CdxButton } = require( '@wikimedia/codex' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'VisualTableOfContentsItem',
	components: {
		CdxButton
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
@import 'mediawiki.skin.variables.less';

@ib-vtoc-image-height: 12em;

.ib-vtoc-item {
	width: 100%;
	// @todo: add 2-column variant at 640px

	figure {
		margin: @size-100;

		img {
			width: @size-full;
			height: auto;
			max-height: @ib-vtoc-image-height;
			object-fit: contain;
			align: center;
		}
	}

	figcaption {
		margin-top: @size-50;
	}

	.ib-vtoc-link-container {
		margin: @size-100;
		margin-top: 0;
	}

	hr {
		margin: 0;
		margin-top: @size-100;
	}
}
</style>
