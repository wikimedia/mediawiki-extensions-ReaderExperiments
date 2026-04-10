<template>
	<div class="ext-readerExperiments-mobile-page-preview-card">
		<div
			class="ext-readerExperiments-mobile-page-preview-card__content"
		>
			<cdx-thumbnail
				v-if="thumbnail"
				class="ext-readerExperiments-mobile-page-preview-card__thumbnail"
				:thumbnail="{ url: thumbnail.source }"
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
			<div
				v-else-if="displayTitle"
				ref="summaryRef"
				class="ext-readerExperiments-mobile-page-preview-card__summary"
			>
				<p><span v-html="displayTitle"></span></p>
			</div>
			<!-- eslint-enable vue/no-v-html -->
			<a
				class="ext-readerExperiments-mobile-page-preview-card__link"
				:href="href"
				target="_blank"
				:style="{ 'font-size': fontSize }"
			>
				{{ $i18n( 'readerexperiments-mobilepagepreviews-read-more' ).text() }}
				<cdx-icon :icon="cdxIconLinkExternal"></cdx-icon>
			</a>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, ref, useTemplateRef, watch } = require( 'vue' );
const { CdxThumbnail, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconLinkExternal } = require( '../icons.json' );
const { apiBaseUri } = require( '../config.json' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'PagePreviewCard',
	components: { CdxThumbnail, CdxIcon },
	props: {
		title: {
			type: String,
			required: true
		},
		href: {
			type: String,
			required: true
		}
	},
	async setup( props ) {
		const summaryRef = useTemplateRef( 'summaryRef' );

		async function fetchPreview( title ) {
			const encodedTitle = encodeURIComponent( title );
			const origin = apiBaseUri ? new URL( apiBaseUri ).origin : '';
			const url = `${ origin }/api/rest_v1/page/summary/${ encodedTitle }`;
			const response = await fetch( url );
			if ( !response.ok ) {
				throw new Error( response.status );
			}
			return await response.json();
		}

		const data = ref( await fetchPreview( props.title ) );
		watch(
			() => props.title,
			async ( title ) => ( data.value = await fetchPreview( title ) )
		);

		const thumbnail = computed( () => ( data.value && data.value.thumbnail ) );
		const extractHtml = computed( () => ( data.value && data.value.extract_html ) );
		const displayTitle = computed( () => ( data.value && data.value.displaytitle ) );

		const fontSize = ref( null );
		watch(
			summaryRef,
			( element ) => {
				if ( element ) {
					// Ensure the "Read more" link font size matches the summary text.
					// Paragraph elements' font size adapts to font mode preferences.
					const p = element.querySelector( 'p' );
					if ( p ) {
						fontSize.value = getComputedStyle( p ).fontSize;
						return;
					}
				}
				fontSize.value = null;
			},
			{ immediate: true }
		);

		return {
			cdxIconLinkExternal,
			summaryRef,
			thumbnail,
			extractHtml,
			displayTitle,
			fontSize
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

			// Override Minerva client preferences for font sizes
			// Preview card's font size is smaller than article body
			/* stylelint-disable-next-line selector-class-pattern */
			.mf-font-size-clientpref-small .mw-body &,
			.mf-font-size-clientpref-small .content & {
				font-size: @font-size-small;
			}

			/* stylelint-disable-next-line selector-class-pattern */
			.mf-font-size-clientpref-regular .mw-body &,
			.mf-font-size-clientpref-regular .content & {
				font-size: @font-size-medium;
			}

			/* stylelint-disable-next-line selector-class-pattern */
			.mf-font-size-clientpref-large .mw-body &,
			.mf-font-size-clientpref-large .content & {
				font-size: @font-size-large;
			}
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
