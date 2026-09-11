<template>
	<span v-if="formattedTotalhits">
		{{ $i18n( 'readerexperiments-semanticsearch-results-count', formattedTotalhits ).text() }}
	</span>

	<div
		v-if="didYouMeanText"
		class="cdx-message cdx-message--block cdx-message--notice"
		aria-live="polite"
	>
		<span class="cdx-message__icon"></span>
		<div
			v-html="didYouMeanText"
			class="cdx-message__content"
		></div>
	</div>

	<div
		v-if="term && !results && !error"
		class="cdx-message cdx-message--block cdx-message--notice"
		aria-live="polite"
	>
		<span class="cdx-message__icon"></span>
		<div class="cdx-message__content">{{ $i18n( 'readerexperiments-semanticsearch-no-results' ).text() }}</div>
	</div>

	<div
		v-for="( warning, index ) in warnings"
		:key="`warning-${index}`"
		class="cdx-message cdx-message--block cdx-message--warning"
		aria-live="polite"
	>
		<span class="cdx-message__icon"></span>
		<div class="cdx-message__content">{{ warning }}</div>
	</div>

	<div
		v-if="error"
		class="cdx-message cdx-message--block cdx-message--error"
		role="alert"
	>
		<span class="cdx-message__icon"></span>
		<div class="cdx-message__content">
			<p><strong>{{ $i18n( 'readerexperiments-semanticsearch-error-message' ).text() }}</strong></p>
			<p v-html="error"></p>
			<p>{{ $i18n( 'readerexperiments-semanticsearch-error-text' ).text() }}</p>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent } = require( 'vue' );
const { rawParamsMessage } = require( 'ext.readerExperiments' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'SearchInfo',
	props: {
		term: {
			type: String,
			required: true
		},
		namespaces: {
			type: Array,
			validator: ( namespaces ) => !namespaces.some( ( namespace ) => isNaN( namespace ) ),
			required: true
		},
		limit: {
			type: Number,
			required: true
		},
		sort: {
			type: String,
			required: true
		},
		results: {
			type: Array,
			default: () => []
		},
		info: {
			type: Object,
			default: () => ( {} )
		},
		warnings: {
			type: Array,
			default: () => []
		},
		error: {
			type: String,
			default: null
		},
		generateSearchUrl: {
			type: Function,
			default: null
		}
	},
	setup( props ) {
		const formattedTotalhits = computed( () => {
			if ( !props.info || isNaN( props.info.totalhits ) ) {
				return null;
			}
			return mw.language.convertNumber( props.info.totalhits );
		} );

		const didYouMeanText = computed( () => {
			if ( !props.info || !props.info.suggestion || !props.generateSearchUrl ) {
				return null;
			}

			// @todo below link is fine, but perhaps we can just intercept a click and kick off an XHR search request straight away instead?
			const didYouMeanUrl = props.generateSearchUrl(
				props.info.suggestion,
				props.namespaces,
				props.limit,
				props.sort
			);

			const msg = rawParamsMessage( 'readerexperiments-semanticsearch-did-you-mean' );
			msg.rawParams( [ `<a href="${ mw.html.escape( didYouMeanUrl ) }">${ mw.html.escape( props.info.suggestion ) }</a>` ] );
			return msg.parse();
		} );

		return {
			formattedTotalhits,
			didYouMeanText
		};
	}
} );
</script>

<style lang="less">
// Styles are in separate less files, since most also apply on the
// server-side-rendered search results page version
</style>
