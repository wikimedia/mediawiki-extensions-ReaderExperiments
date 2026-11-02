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
				:model-value="reaction === button.value"
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

		<cdx-dialog
			v-model:open="showDialog"
			class="ext-readerExperiments-semanticsearch-feedback__dialog"
			:use-close-button="true"
			:title="$i18n( 'readerexperiments-semanticsearch-survey-question' ).text()"
			:primary-action="dialogSubmitButton"
			@primary="submit"
			@update:open="submit"
		>
			<cdx-field>
				<template #description>
					{{ $i18n( 'readerexperiments-semanticsearch-survey-freetext-label' ).text() }}
				</template>
				<cdx-text-area
					v-model="freeTextValue"
					:maxlength="freeTextMaxLength"
					:placeholder="$i18n( 'readerexperiments-semanticsearch-survey-freetext-placeholder' ).text()"
				></cdx-text-area>
			</cdx-field>
		</cdx-dialog>

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
	CdxToast,
	CdxDialog,
	CdxField,
	CdxTextArea
} = require( '@wikimedia/codex' );

// Maximum number of characters for the free text response.
const FREE_TEXT_MAX_LENGTH = 500;

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
		CdxToast,
		CdxDialog,
		CdxField,
		CdxTextArea
	},
	props: {
		survey: {
			type: Object,
			required: true
		},
		selectedAnswer: {
			type: Object,
			default: null,
			validator: ( value ) => value === null ||
				( typeof value.reaction === 'string' && 'freeText' in value )
		}
	},
	emits: [ 'survey-completed' ],
	setup( props, { emit } ) {
		const reaction = ref( props.selectedAnswer ? props.selectedAnswer.reaction : null );
		const showToast = ref( false );
		const showDialog = ref( false );
		const freeTextValue = ref( '' );

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

		const dialogSubmitButton = {
			label: mw.msg( 'readerexperiments-semanticsearch-survey-submit' ),
			ariaLabel: mw.msg( 'readerexperiments-semanticsearch-survey-submit' ),
			actionType: 'progressive'
		};

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
			showDialog.value = false;
			showToast.value = true;
			emit(
				'survey-completed',
				{
					reaction: reaction.value,
					freeText: freeTextValue.value
				}
			);
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
			reaction.value = value;
			showDialog.value = true;
		}

		return {
			reaction,
			submitted,
			showToast,
			showDialog,
			freeTextValue,
			freeTextMaxLength: FREE_TEXT_MAX_LENGTH,
			submit,
			buttons,
			privacyPolicyLabel,
			dialogSubmitButton,
			onReaction
		};
	}
} );
</script>
