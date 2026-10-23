<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch;

use MediaWiki\Config\Config;

/**
 * Registers the Semantic Search qualitative feedback survey with QuickSurveys.
 *
 * QuickSurveys never renders this survey. The UI is SemanticSearchFeedbackSurvey.vue, and it
 * records the response with the logSurveyAnswer() API. Registration here makes
 * the survey discoverable to codesearch and to survey audits.
 *
 * QuickSurveys declares no interface for the QuickSurveysEnabled hook, so this
 * class implements none and references no QuickSurveys code. The hook only runs
 * when QuickSurveys is installed.
 *
 * The hook runs inside the QuickSurveys.EnabledSurveys service, which
 * ResourceLoader also uses. There is no OutputPage, Title or user in that
 * context, so this handler takes config only.
 */
class SurveyHooks {

	/**
	 * Survey name (surveyCodeName).
	 */
	public const SURVEY_NAME = 'semantic-search-feedback';

	/**
	 * Question message key (surveyQuestionLabel).
	 */
	public const SURVEY_QUESTION = 'readerexperiments-semanticsearch-feedback-prompt';

	/** Answer message keys (surveyAnswers). */
	public const SURVEY_ANSWERS = [
		'positive' => 'readerexperiments-semanticsearch-feedback-positive',
		'negative' => 'readerexperiments-semanticsearch-feedback-negative',
	];

	/** Label for the free text box in the follow-up dialog. */
	public const SURVEY_FREETEXT = 'readerexperiments-semanticsearch-survey-freetext-label';

	/** Link text for the privacy statement. */
	public const SURVEY_PRIVACY = 'readerexperiments-semanticsearch-survey-privacy-policy';

	/**
	 * Privacy statement link. Hardcoded to English Wikipedia for experiment.
	 */
	public const SURVEY_PRIVACY_URL =
		'https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Privacy_policy';

	private const QUESTION_NAME = 'usefulness';

	public function __construct(
		private readonly Config $config,
	) {
	}

	/**
	 * QuickSurveysEnabled hook. QuickSurveys declares no interface for it.
	 *
	 * @param array[] &$surveys
	 */
	public function onQuickSurveysEnabled( array &$surveys ): void {
		$surveys[] = [
			'name' => self::SURVEY_NAME,
			'type' => 'internal',
			'enabled' => $this->config->get( 'ReaderExperimentsSemanticSearchEnabled' ) &&
				$this->config->get( 'ReaderExperimentsSemanticSearchFeedbackSurvey' ),
			'coverage' => 0,
			'platforms' => [ 'desktop', 'mobile' ],
			'privacyPolicy' => self::SURVEY_PRIVACY,
			'audience' => [ 'pageIds' => [ -1 ] ],
			'questions' => [
				[
					'name' => self::QUESTION_NAME,
					'layout' => 'single-answer',
					'question' => self::SURVEY_QUESTION,
					'shuffleAnswersDisplay' => false,
					'answers' => array_map(
						static fn ( string $label ): array => [
							'label' => $label,
							'freeformTextLabel' => self::SURVEY_FREETEXT,
						],
						array_values( self::SURVEY_ANSWERS )
					),
				],
			],
		];
	}
}
