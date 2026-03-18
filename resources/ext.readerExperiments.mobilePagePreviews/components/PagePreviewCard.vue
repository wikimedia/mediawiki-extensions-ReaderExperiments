<template>
	<div class="ext-readerExperiments-mobile-page-preview-card">
		<div
			class="ext-readerExperiments-mobile-page-preview-card__content"
		>
			<cdx-thumbnail
				v-if="thumbnail"
				class="ext-readerExperiments-mobile-page-preview-card__thumbnail"
				:thumbnail="thumbnailData"
			></cdx-thumbnail>
			<!-- eslint-disable vue/no-v-html -->
			<!-- Only use v-html if we have real, sanitized HTML content from
			the parser. Otherwise use regular interpolation. -->
			<div
				v-if="extractHtml"
				ref="summaryRef"
				class="ext-readerExperiments-mobile-page-preview-card__summary"
				v-html="extractHtml"
			>
			</div>
			<!-- eslint-enable vue/no-v-html -->
			<a
				ref="linkRef"
				class="ext-readerExperiments-mobile-page-preview-card__link"
				:href="href"
				target="_blank"
			>
				Read more
				<cdx-icon :icon="cdxIconLinkExternal"></cdx-icon>
			</a>
		</div>
	</div>
</template>

<script>
const { defineComponent, useTemplateRef, onMounted } = require( 'vue' );
const { CdxThumbnail, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconLinkExternal } = require( '../icons.json' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'PagePreviewCard',
	components: { CdxThumbnail, CdxIcon },
	props: {
		thumbnail: {
			type: Object,
			default: null
		},
		extractHtml: {
			type: String,
			default: null
		},
		href: {
			type: String,
			required: true
		}
	},
	setup( props ) {
		const thumbnailData = {
			url: props.thumbnail && props.thumbnail.source
		};

		const summaryRef = useTemplateRef( 'summaryRef' );
		const linkRef = useTemplateRef( 'linkRef' );

		onMounted( () => {
			if ( !summaryRef.value || !linkRef.value ) {
				return;
			}
			const p = summaryRef.value.querySelector( 'p' );
			if ( p ) {
				linkRef.value.style.fontSize = getComputedStyle( p ).fontSize;
			}
		} );

		return {
			cdxIconLinkExternal,
			thumbnailData,
			summaryRef,
			linkRef
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ext-readerExperiments-mobile-page-preview-card {
	&__content {
		display: block;

		// Override Minerva styles for anchor link
		&,
		&:visited,
		&:hover,
		&:visited:hover {
			color: @color-base;
		}

		/* stylelint-disable-next-line no-descending-specificity */
		&:hover {
			text-decoration: none;
		}

		// Override Minerva styles for <p> tags
		p {
			padding-bottom: unset;
			margin: unset;
		}
	}

	&__thumbnail {
		float: left;
		margin-right: @spacing-50;

		// Override Codex thumbnail size
		.cdx-thumbnail__image,
		.cdx-thumbnail__placeholder {
			width: @size-400; // 64px or 4rem
			height: auto;
			aspect-ratio: 1 / 1;

			@media ( min-width: 320px ) {
				width: @size-800; // 128px or 8rem
			}
		}
	}

	&__summary {
		margin-bottom: @spacing-30;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		overflow: hidden;
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		-webkit-line-clamp: 5;
	}

	&__link {
		display: block;
		text-align: end;
		.cdx-mixin-link();

		.cdx-icon {
			color: inherit;
		}
	}
}
</style>
