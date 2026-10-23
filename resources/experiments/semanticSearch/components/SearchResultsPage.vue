<template>
	<cdx-search-input
		v-model="inputValueRef"
		class="ext-readerExperiments-semanticsearch-form"
		clearable
		use-button
		:placeholder="$i18n( 'readerexperiments-semanticsearch-input-placeholder' ).text()"
		:status="responseLexicalRef.error && inputValueRef === termRef ? 'error' : null /* @todo doublecheck if works */"
		@submit-click="onSubmit"
	></cdx-search-input>

	<search-info
		v-if="!isLoading"
		:term="termRef"
		:namespaces="request.namespaces"
		:limit="request.limit"
		:sort="request.sort"
		:results="responseLexicalRef.results || []"
		:info="responseLexicalRef.info || {}"
		:warnings="responseLexicalRef.warnings || []"
		:error="responseLexicalRef.error || null"
		:generate-search-url="generateSemanticSearchUrl"
		:is-loading="isLoading"
	></search-info>

	<template v-if="semanticEnabled">
		<div
			v-if="isLoading"
			class="ext-readerExperiments-semanticsearch-loading"
			role="status"
			:aria-label="$i18n( 'readerexperiments-semanticsearch-loading' ).text()">
			<div
				v-for="index in 3"
				:key="index"
				class="ext-readerExperiments-semanticsearch-loading__card"
				aria-hidden="true">
				<div class="ext-readerExperiments-semanticsearch-loading__quote">
					<span v-for="line in 5" :key="line"></span>
				</div>
				<div class="ext-readerExperiments-semanticsearch-loading__details">
					<span class="cdx-thumbnail ext-readerExperiments-semanticsearch-loading__thumbnail">
						<span class="cdx-thumbnail__placeholder"><span class="cdx-thumbnail__placeholder__icon"></span></span>
					</span>
					<div class="ext-readerExperiments-semanticsearch-loading__text">
						<span></span><span></span>
					</div>
				</div>
			</div>
		</div>
		<section
			v-if="responseSemanticRef.results && responseSemanticRef.results.length && !isLoading"
			class="ext-readerExperiments-semanticsearch-results ext-readerExperiments-semanticsearch-results--semantic"
			:aria-label="$i18n( 'readerexperiments-semanticsearch-semantic-results-label' ).text()"
		>
			<h1>Semantic</h1>
			<search-result
				v-for="( result, index ) in Object.values( responseSemanticRef.results ).sort( ( a, b ) => a.index - b.index )"
				:key="`result=${index}`"
				:result="result"
				semantic
			></search-result>
		</section>
	</template>

	<section
		v-if="responseLexicalRef.results && responseLexicalRef.results.length && !isLoading"
		class="ext-readerExperiments-semanticsearch-results ext-readerExperiments-semanticsearch-results--lexical"
		:aria-label="$i18n( 'readerexperiments-semanticsearch-lexical-results-label' ).text()"
	>
		<search-result
			v-for="( result, index ) in Object.values( responseLexicalRef.results ).sort( ( a, b ) => a.index - b.index )"
			:key="`result=${index}`"
			:result="result"
		></search-result>
	</section>

	<div class="ext-readerExperiments-semanticsearch-actions">
		<!-- @todo add functionality (or maybe just a link?) to go back to previous results? -->
		<cdx-button
			v-if="nextContinueRef"
			action="progressive"
			weight="primary"
			@click="onLoadMore"
		>
			{{ $i18n( 'readerexperiments-semanticsearch-load-more-results' ).text() }}
		</cdx-button>
	</div>
	<a
		id="readerexperiments-semanticsearch-switch-special-search"
		:href="classicSearchUrl"
		class="ext-readerExperiments-semanticsearch-classic">
		{{ $i18n( 'readerexperiments-semanticsearch-switch-classic-search' ).text() }}
	</a>
</template>

<script>
const { computed, defineComponent, ref } = require( 'vue' );
const { CdxButton, CdxSearchInput } = require( '@wikimedia/codex' );
const SearchInfo = require( './SearchInfo.vue' );
const SearchResult = require( './SearchResult.vue' );

// Semantic results supplement the lexical ones, so the page should not wait
// long on them: give up after this long rather than the mw.Rest default of
// 30 seconds (T441802). Lexical search keeps the default.
const SEMANTIC_SEARCH_TIMEOUT_MS = 5000;

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
		},
		onSearchRegister: {
			type: Function,
			default: null
		}
	},
	setup( props ) {
		// Unique mw.Rest instances are needed to allow Lexical and
		// Semantic search to be run in parallel. Otherwise, any simultaneous,
		// in-flight requests are aborted when search() is called.
		const restApiLexical = new mw.Rest();
		const restApiSemantic = new mw.Rest( { ajax: { timeout: SEMANTIC_SEARCH_TIMEOUT_MS } } );

		const inputValueRef = ref( props.request.term );
		const termRef = ref( props.request.term );
		const currentContinueRef = ref( props.request.continue );
		const nextContinueRef = ref( props.response.lexical.continue );
		const responseLexicalRef = ref( props.response.lexical );
		const responseSemanticRef = ref( props.response.semantic );

		const semanticEnabled = computed( () => !!( props.request && props.request.semanticEnabled ) );

		const loadingLexicalRef = ref( false );
		const loadingSemanticRef = ref( false );
		// Loading state resolves only once semantic AND lexical search
		// API calls have completed (T440348).
		const isLoading = computed( () => loadingLexicalRef.value || loadingSemanticRef.value );

		const useLang = mw.config.get( 'wgUserLanguage' );

		function generateSemanticSearchUrl( term, namespaces, limit, sort ) {
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

		/**
		 * Link back to Special:Search, prepopulated with the current search
		 * term and any explicitly requested namespaces.
		 *
		 * `limit` and `sort` are deliberately not carried over: Special:Search
		 * prefers those params over the reader's own `searchlimit` preference
		 * and its default of 20 results, so forwarding ours would silently
		 * override both. The typeahead `wprov` param is omitted, so that the
		 * routing mechanism (T438878), once merged, will treat following the
		 * link as manual navigation rather than a typeahead arrival.
		 *
		 * Mirrors generateClassicSearchUrl() in SpecialSemanticSearch.php,
		 * which renders the same link server-side.
		 *
		 * @param {string} term
		 * @return {string}
		 */
		function generateClassicSearchUrl( term ) {
			return mw.util.getUrl( props.request.classicSearchPage, {
				search: term,
				...( props.request.requestedNamespaces || [] ).reduce(
					( params, namespace ) => ( { ...params, [ `ns${ namespace }` ]: 1 } ),
					{}
				),
				// Without this, Special:Search redirects straight to an exact
				// title match instead of rendering its results page
				fulltext: 1
			} );
		}

		// Recomputed whenever the term changes, so the link always reflects the
		// search term the reader last submitted, which is also what the URL and
		// the input show
		const classicSearchUrl = computed( () => generateClassicSearchUrl( termRef.value ) );

		async function search( restApi, term, params ) {
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
					// Aborted because a newer request superseded this one (see the
					// restApi.abort() call); not a real failure, so callers
					// should treat this distinctly from an actual error (T441802)
					if ( data.textStatus === 'abort' ) {
						const abortError = new Error( 'Request superseded' );
						abortError.name = 'AbortError';
						throw abortError;
					}

					const response = data.xhr.responseJSON || {};
					// A timed out request has no response body to read a message from,
					// so name the cause rather than falling back to 'Unknown error'
					const fallback = data.textStatus === 'timeout' ?
						'Request timed out' :
						'Unknown error';
					throw new Error(
						( response.messageTranslations && response.messageTranslations[ useLang ] ) ||
						response.message ||
						response.httpReason ||
						fallback
					);
				}
			);
		}

		async function onSubmit( term ) {
			if ( term === termRef.value ) {
				// No change
				return;
			}

			const url = generateSemanticSearchUrl( term, props.request.namespaces, props.request.limit, props.request.sort );
			window.history.pushState( {}, '', url );

			termRef.value = term;
			inputValueRef.value = term;
			responseLexicalRef.value = [];
			responseSemanticRef.value = [];
			currentContinueRef.value = 0;
			nextContinueRef.value = null;
			loadingLexicalRef.value = true;
			loadingSemanticRef.value = semanticEnabled.value;

			async function searchLexical() {
				try {
					const response = await search( restApiLexical, term, {
						type: 'lexical',
						data: [ 'thumbnail', 'suggestion' ],
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
					// This request was aborted because a newer search already
					// started; skip writing to responseLexicalRef here, since the
					// newer search will set it from its own response
					if ( e.name === 'AbortError' ) {
						return;
					}
					responseLexicalRef.value = { error: e.message };
				} finally {
					loadingLexicalRef.value = false;
				}
			}

			async function searchSemantic() {
				if ( !semanticEnabled.value ) {
					loadingSemanticRef.value = false;
					return;
				}

				try {
					const response = await search( restApiSemantic, term, {
						type: 'semantic',
						namespace: props.request.namespaces,
						limit: 3,
						continue: 0,
						sort: props.request.sort,
						data: [ 'thumbnail', 'referencecount', 'contributorcount' ],
						uselang: useLang
					}
					);
					response.results = Object.values( response.results );
					responseSemanticRef.value = response;
				} catch ( e ) {
					// This request was aborted because a newer search already
					// started; skip writing to responseSemanticRef here, since the
					// newer search will set it from its own response
					if ( e.name === 'AbortError' ) {
						return;
					}
					// Surface semantic search failure in the console; without
					// this the section renders empty with no explanation
					mw.log.error( 'Semantic search request failed:', e.message );
					responseSemanticRef.value = { error: e.message };
				} finally {
					loadingSemanticRef.value = false;
				}
			}

			await Promise.all( [ searchLexical(), searchSemantic() ] );
		}

		if ( props.onSearchRegister ) {
			props.onSearchRegister( onSubmit );
		}

		async function onLoadMore() {
			if ( currentContinueRef.value === nextContinueRef.value ) {
				// No change
				return;
			}

			currentContinueRef.value = nextContinueRef.value;

			try {
				const response = await search(
					restApiLexical,
					termRef.value,
					{
						type: 'lexical',
						data: [ 'thumbnail', 'suggestion' ],
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
				// This request was aborted because a newer request already
				// started (a new search, or another "load more" click); skip
				// writing to responseLexicalRef here, since the newer request
				// will set it from its own response
				if ( e.name === 'AbortError' ) {
					return;
				}
				responseLexicalRef.value = { error: e.message };
			}
		}

		return {
			inputValueRef,
			termRef,
			nextContinueRef,
			responseLexicalRef,
			responseSemanticRef,
			semanticEnabled,
			classicSearchUrl,
			onSubmit,
			onLoadMore,
			generateSemanticSearchUrl,
			isLoading
		};
	}
} );
</script>

<style lang="less">
// Styles are in separate less files, since most also apply on the
// server-side-rendered search results page version
</style>
