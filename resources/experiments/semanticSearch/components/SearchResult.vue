<template>
	<a
		:href="result.targeturl"
		:title="result.title"
		:data-namespace="result.ns"
		class="cdx-card cdx-card--is-link ext-readerExperiments-semanticsearch-result"
		:class="{ 'ext-readerExperiments-semanticsearch-result--semantic': semantic }"
	>
		<div v-if="semantic" class="ext-readerExperiments-semanticsearch-result__quote">
			<span
				class="ext-readerExperiments-semanticsearch-result__quote-mark"
				aria-hidden="true"
			></span>
			<span v-html="result.semanticExcerpt || result.snippet"></span>
		</div>
		<span class="cdx-thumbnail cdx-card__thumbnail">
			<span
				v-if="result.thumbnail"
				:style="[ result.thumbnail ? { 'background-image': `url( ${result.thumbnail.source} )` } : null ]"
				class="cdx-thumbnail__image"
			></span>
			<span v-else class="cdx-thumbnail__placeholder">
				<span class="cdx-thumbnail__placeholder__icon"></span>
			</span>
		</span>
		<span class="cdx-card__text">
			<span class="cdx-card__text__title">
				{{ result.title }}
				<template v-if="result.sectiontitle && !semantic">
					{{ $i18n( 'readerexperiments-semanticsearch-match-section', result.sectiontitle ) }}
				</template>
				<template v-if="result.redirecttitle">
					{{ $i18n( 'readerexperiments-semanticsearch-match-redirect', result.redirecttitle ) }}
				</template>
			</span>

			<div v-if="semantic && result.sectiontitle" class="ext-readerExperiments-semanticsearch-result__section">
				<span
					class="ext-readerExperiments-semanticsearch-result__section-arrow"
					aria-hidden="true"
				>↪</span> {{ result.sectiontitle }}
			</div>
			<div
				v-if="!semantic && result.snippet"
				class="cdx-card__text__description"
			>
				<span v-html="result.snippet"></span>{{ $i18n( 'ellipsis' ).text() }}
			</div>

			<span v-if="contributorsText || referencesText" class="cdx-card__text__supporting-text">
				<span v-if="contributorsText">{{ contributorsText }}</span>
				<span v-if="referencesText">{{ referencesText }}</span>
			</span>
		</span>
	</a>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'SearchResult',
	props: {
		result: {
			type: Object,
			required: true
		},
		semantic: {
			type: Boolean,
			default: false
		}
	},
	setup( props ) {
		const $i18n = inject( 'i18n' );

		const contributorsText = computed( () => {
			if ( !props.result.contributorcount ) {
				return null;
			}
			return $i18n(
				'readerexperiments-semanticsearch-contributorcount',
				mw.language.convertNumber( props.result.contributorcount )
			).text();
		} );

		const referencesText = computed( () => {
			if ( props.result.referencecount === undefined ) {
				return null;
			}
			return $i18n(
				'readerexperiments-semanticsearch-referencecount',
				mw.language.convertNumber( props.result.referencecount )
			).text();
		} );

		return {
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
