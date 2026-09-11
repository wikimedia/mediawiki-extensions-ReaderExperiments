<template>
	<cdx-search-input
		v-model="inputValueRef"
		clearable
		use-button
		:placeholder="$i18n( 'readerexperiments-semanticsearch-input-placeholder' ).text()"
		:status="responseLexicalRef.error && inputValueRef === termRef ? 'error' : null /* @todo doublecheck if works */"
		@submit-click="onSubmit"
	></cdx-search-input>

	<search-info
		:term="termRef"
		:namespaces="request.namespaces"
		:limit="request.limit"
		:sort="request.sort"
		:results="responseLexicalRef.results || []"
		:info="responseLexicalRef.info || {}"
		:warnings="responseLexicalRef.warning || []"
		:error="responseLexicalRef.error || null"
		:generate-search-url="generateSearchUrl"
	></search-info>

	<h1>Semantic</h1>
	<div
		v-if="responseSemanticRef.results"
		class="cdx-docs-card-group-with-thumbnails"
	>
		<search-result
			v-for="( result, index ) in Object.values( responseSemanticRef.results ).sort( ( a, b ) => a.index - b.index )"
			:key="`result=${index}`"
			:result="result"
		></search-result>
	</div>

	<h1>Lexical</h1>
	<div
		v-if="responseLexicalRef.results"
		class="cdx-docs-card-group-with-thumbnails"
	>
		<search-result
			v-for="( result, index ) in Object.values( responseLexicalRef.results ).sort( ( a, b ) => a.index - b.index )"
			:key="`result=${index}`"
			:result="result"
		></search-result>
	</div>

	<div>
		<!-- @todo add functionality (or maybe just a link?) to go back to previous results? -->
		<cdx-button
			v-if="nextContinueRef"
			action="progressive"
			@click="onLoadMore"
		>
			{{ $i18n( 'readerexperiments-semanticsearch-load-more-results' ).text() }}
		</cdx-button>
	</div>
</template>

<script>
const { defineComponent, ref } = require( 'vue' );
const { CdxButton, CdxSearchInput } = require( '@wikimedia/codex' );
const SearchInfo = require( './SearchInfo.vue' );
const SearchResult = require( './SearchResult.vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'SearchResultsPage',
	components: {
		CdxButton,
		CdxSearchInput,
		SearchInfo,
		SearchResult
	},
	props: {
		request: {
			type: Object,
			required: true
		},
		response: {
			type: Object,
			required: true
		}
	},
	setup( props ) {
		const restApi = new mw.Rest();

		const inputValueRef = ref( props.request.term );
		const termRef = ref( props.request.term );
		const currentContinueRef = ref( props.request.continue );
		const nextContinueRef = ref( props.response.lexical.continue );
		const responseLexicalRef = ref( props.response.lexical );
		const responseSemanticRef = ref( props.response.semantic );

		const useLang = mw.config.get( 'wgUserLanguage' );

		function generateSearchUrl( term, namespaces, limit, sort ) {
			return mw.util.getUrl( null, {
				search: term,
				...namespaces.reduce(
					( params, namespace ) => ( { ...params, [ `ns${ namespace }` ]: 1 } ),
					{}
				),
				limit: limit,
				sort: sort,
				noredirect: ''
			} );
		}

		async function search( term, params ) {
			// Abort any in-flight requests
			restApi.abort();

			if ( !term ) {
				return {
					results: [],
					info: [],
					continue: null,
					warnings: []
				};
			}

			return restApi.get(
				'/semanticsearch/v0/' + encodeURIComponent( term ),
				params
			).catch(
				( code, data ) => {
					const response = data.xhr.responseJSON || {};
					throw new Error(
						( response.messageTranslations && response.messageTranslations[ useLang ] ) ||
						response.message ||
						response.httpReason ||
						'Unknown error'
					);
				}
			);
		}

		async function onSubmit( term ) {
			if ( term === termRef.value ) {
				// No change
				return;
			}

			const url = generateSearchUrl( term, props.request.namespaces, props.request.limit, props.request.sort );
			window.history.pushState( {}, '', url );

			termRef.value = term;
			responseLexicalRef.value = [];
			responseSemanticRef.value = [];
			currentContinueRef.value = 0;
			nextContinueRef.value = null;

			try {
				const response = await search(
					term,
					{
						type: 'lexical',
						namespace: props.request.namespaces,
						limit: props.request.limit,
						continue: 0,
						sort: props.request.sort,
						uselang: useLang
					}
				);
				response.results = Object.values( response.results );
				responseLexicalRef.value = response;
				nextContinueRef.value = response.continue;
			} catch ( e ) {
				responseLexicalRef.value = { error: e.message };
			}

			try {
				const response = await search(
					term,
					{
						type: 'semantic',
						namespace: props.request.namespaces,
						limit: 3,
						continue: 0,
						sort: props.request.sort,
						uselang: useLang
					}
				);
				response.results = Object.values( response.results );
				responseSemanticRef.value = response;
			} catch ( e ) {
				responseSemanticRef.value = { error: e.message };
			}
		}

		async function onLoadMore() {
			if ( currentContinueRef.value === nextContinueRef.value ) {
				// No change
				return;
			}

			currentContinueRef.value = nextContinueRef.value;

			try {
				const response = await search(
					termRef.value,
					{
						type: 'lexical',
						namespace: props.request.namespaces,
						limit: props.request.limit,
						continue: currentContinueRef.value,
						sort: props.request.sort,
						uselang: useLang
					}
				);
				// Every new batch will start from a 0-based index, but since we'll be merging them
				// together with old result I want to make sure their sort index in the array
				// accurately reflects the real result order
				response.results = Object.values( response.results )
					.map( ( result ) => ( { ...result, index: result.index + currentContinueRef.value } ) )
					.sort( ( a, b ) => a.index - b.index );
				// Now add in the results we already had...
				response.results = responseLexicalRef.value.results.concat( response.results );
				responseLexicalRef.value = response;
				nextContinueRef.value = response.continue;
			} catch ( e ) {
				responseLexicalRef.value = { error: e.message };
			}
		}

		return {
			inputValueRef,
			termRef,
			nextContinueRef,
			responseLexicalRef,
			responseSemanticRef,
			onSubmit,
			onLoadMore,
			generateSearchUrl
		};
	}
} );
</script>

<style lang="less">
// Styles are in separate less files, since most also apply on the
// server-side-rendered search results page version
</style>
