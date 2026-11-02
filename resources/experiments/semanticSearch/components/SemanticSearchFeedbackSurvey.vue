<template>
	<div class="ext-readerExperiments-semanticsearch-feedback">
		<p class="ext-readerExperiments-semanticsearch-feedback__prompt">
			{{ $i18n( 'readerexperiments-semanticsearch-feedback-prompt' ).text() }}
		</p>
		<div
			class="ext-readerExperiments-semanticsearch-feedback__actions"
			:class="{
				'ext-readerExperiments-semanticsearch-feedback__actions--submitted': submitted
			}"
		>
			<cdx-toggle-button
				v-for="button in buttons"
				:key="button.value"
				:model-value="selection === button.value"
				:aria-label="button.ariaLabel"
				@update:model-value="onReaction( button.value )"
			>
				{{ button.label }}
			</cdx-toggle-button>
		</div>
		<a
			:href="survey.privacyPolicyUrl"
			class="ext-readerExperiments-semanticsearch-feedback__privacy"
		>{{ privacyPolicyLabel }}</a>

		<cdx-toast
			v-if="showToast"
			type="success"
			standalone
			auto-dismiss
		>
			{{ $i18n( 'readerexperiments-semanticsearch-feedback-thanks' ).text() }}
		</cdx-toast>
	</div>
</template>

<script>
const { defineComponent, ref } = require( 'vue' );
const {
	CdxToggleButton,
	CdxToast
} = require( '@wikimedia/codex' );

/**
 * Qualitative feedback survey for the semantic search results (T441798).
 *
 * The reader picks a reaction, which emits the answer immediately. The parent
 * records it, and renders this component only when QuickSurveys is available
 * to receive the answer.
 */
// @vue/component
module.exports = exports = defineComponent( {
	name: 'SemanticSearchFeedbackSurvey',
	components: {
		CdxToggleButton,
		CdxToast
	},
	props: {
		survey: {
			type: Object,
			required: true
		},
		selectedAnswer: {
			type: String,
			default: null
		}
	},
	emits: [ 'survey-completed' ],
	setup( props, { emit } ) {
		const selection = ref( props.selectedAnswer );
		const showToast = ref( false );

		const submitted = ref( props.selectedAnswer !== null );

		const buttons = [
			{
				value: 'positive',
				label: mw.msg( 'readerexperiments-semanticsearch-feedback-positive' ),
				ariaLabel: mw.msg( 'readerexperiments-semanticsearch-feedback-positive' )
			},
			{
				value: 'negative',
				label: mw.msg( 'readerexperiments-semanticsearch-feedback-negative' ),
				ariaLabel: mw.msg( 'readerexperiments-semanticsearch-feedback-negative' )
			}
		];

		const privacyPolicyLabel = mw.msg( props.survey.privacyPolicy );

		/**
		 * Send the response and thank the reader.
		 */
		function submit() {
			// return early if a reaction has been previously submitted.
			if ( submitted.value ) {
				return;
			}
			submitted.value = true;
			showToast.value = true;
			emit( 'survey-completed', selection.value );
		}

		/**
		 * Record the reaction and send it.
		 *
		 * @param {string} value Answer code of the chosen reaction
		 */
		function onReaction( value ) {
			if ( submitted.value ) {
				return;
			}
			selection.value = value;
			submit();
		}

		return {
			selection,
			submitted,
			showToast,
			buttons,
			privacyPolicyLabel,
			onReaction
		};
	}
} );
</script>
