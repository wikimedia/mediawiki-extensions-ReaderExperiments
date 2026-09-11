<template>
	<a
		:href="result.canonicalurl"
		:title="result.title"
		class="cdx-card cdx-card--is-link cdx-docs-card-group-with-thumbnails__card"
	>
		<span class="cdx-thumbnail cdx-card__thumbnail">
			<span
				:style="[ result.thumbnail ? { 'background-image': `url( ${result.thumbnail.source} )` } : null ]"
				class="cdx-thumbnail__image"
			></span>
		</span>
		<span class="cdx-card__text">
			<span class="cdx-card__text__title">
				<span
					v-if="namespacePrefix"
					class="ext-readerExperiments-semanticsearch-result__namespace"
				>{{ namespacePrefix }}</span>
				{{ result.title }}
			</span>

			<div
				v-html="result.snippet"
				class="cdx-card__text__description"
			></div>

			<span class="cdx-card__text__supporting-text">
				<!-- 3 members (0 subcategories, 3 files) -->
				<span v-if="categoryInfoText">{{ categoryInfoText }}</span>
				<template v-else>
					<!-- 11 KB (816 words) -->
					<span v-if="formattedPageSizeText">{{ formattedPageSizeText }}</span>
					<span v-if="wordcountText">{{ wordcountText }}</span>
				</template>

				<template v-if="lastEditedText">
					-
					<!-- 7:24, June 8, 2026 -->
					<span>{{ lastEditedText }}</span>
				</template>

				<template v-if="contributorsText">
					-
					<!-- 1573 contributors -->
					<span>{{ contributorsText }}</span>
				</template>

				<template v-if="referencesText">
					-
					<!-- 42 contributors -->
					<span>{{ referencesText }}</span>
				</template>
			</span>
		</span>
	</a>
</template>

<script>
const { formatTimeAndDate } = require( 'mediawiki.DateFormatter' );
const { computed, defineComponent, inject } = require( 'vue' );
const formatSize = require( '../utils/formatSize.js' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'SearchResult',
	props: {
		result: {
			type: Object,
			required: true
		}
	},
	setup( props ) {
		const $i18n = inject( 'i18n' );

		const categoryInfoText = computed( () => {
			if ( !props.result.categoryinfo ) {
				return null;
			}
			const params = [
				mw.language.convertNumber( props.result.categoryinfo.size ),
				mw.language.convertNumber( props.result.categoryinfo.subcats ),
				mw.language.convertNumber( props.result.categoryinfo.files )
			];
			return $i18n( 'readerexperiments-semanticsearch-category-info', ...params ).text();
		} );

		const namespacePrefix = computed( () => {
			if ( props.result.ns === 0 ) {
				return null;
			}
			return mw.config.get( 'wgFormattedNamespaces' )[ props.result.ns ] || null;
		} );

		const lastEditedText = computed( () => {
			return formatTimeAndDate( new Date( props.result.timestamp ) );
		} );

		const formattedPageSizeText = computed( () => {
			if ( props.result.size === undefined ) {
				return null;
			}
			return formatSize( props.result.size );
		} );

		const wordcountText = computed( () => {
			if ( props.result.wordcount === undefined ) {
				return null;
			}
			return $i18n(
				'readerexperiments-semanticsearch-wordcount',
				mw.language.convertNumber( props.result.wordcount )
			).text();
		} );

		const contributorsText = ''; // @todo
		const referencesText = ''; // @todo

		return {
			categoryInfoText,
			namespacePrefix,
			lastEditedText,
			formattedPageSizeText,
			wordcountText,
			contributorsText,
			referencesText
		};
	}
} );
</script>

<style lang="less">
// Styles are in separate less files, since most also apply on the
// server-side-rendered search results page version
</style>
