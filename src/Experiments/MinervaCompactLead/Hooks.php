<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\MinervaCompactLead;

use MediaWiki\Extension\ReaderExperiments\Common\FeatureFlagExperiment;
use MediaWiki\Extension\TestKitchen\Sdk\ExperimentManager;
use MediaWiki\Output\Hook\BeforePageDisplayHook;
use MobileContext;
use MobileFrontend\Transforms\QuickFactsTransform;
use Wikimedia\Parsoid\Core\DOMCompat;
use Wikimedia\Parsoid\Ext\DOMUtils;
use Wikimedia\Parsoid\Wt2Html\XHtmlSerializer;

class Hooks implements BeforePageDisplayHook {
	public const EXPERIMENT_NAME = 'minerva-compact-lead';
	public const GROUP_CONTROL = 'control';
	public const GROUP_LEAD = 'trunc-lead';
	public const GROUP_LEAD_INFOBOX = 'trunc-lead-infobox';

	public function __construct(
		private ?ExperimentManager $experimentManager = null,
		private ?MobileContext $mobileContext = null
	) {
	}

	/**
	 * @inheritDoc
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		$title = $out->getTitle();
		$request = $out->getRequest();
		$user = $skin->getUser();
		$isRegisteredNonTemp = $user->isRegistered() && !$user->isTemp();
		// Restrict all arms to anonymous mobile article views with the required UI support.
		if (
			!$title ||
			$title->getNamespace() !== NS_MAIN ||
			$title->isMainPage() ||
			$skin->getSkinName() !== 'minerva' ||
			$isRegisteredNonTemp ||
			!$out->isArticle() ||
			$out->getContext()->getActionName() !== 'view' ||
			$request->getCheck( 'diff' ) ||
			!$this->mobileContext ||
			!$this->mobileContext->shouldDisplayMobileView() ||
			!class_exists( QuickFactsTransform::class )
		) {
			return;
		}

		// Resolve assignment through Test Kitchen or the local experiment override.
		$experiment = new FeatureFlagExperiment(
			$this->experimentManager,
			$request,
			self::EXPERIMENT_NAME
		);
		$group = $experiment->getAssignedGroup();
		// Unassigned users and unrecognized variations retain the default page.
		if ( !in_array( $group, [
			self::GROUP_CONTROL, self::GROUP_LEAD, self::GROUP_LEAD_INFOBOX
		], true ) ) {
			return;
		}

		// Use the same content eligibility in every arm, for both parser outputs.
		$doc = DOMUtils::parseHTML( $out->getHTML() );
		$body = DOMCompat::getBody( $doc );
		$lead = DOMCompat::querySelector( $body, 'section[data-mw-section-id="0"]' );
		$isParsoidOutput = $lead !== null;
		$lead ??= DOMCompat::querySelector( $body, 'section#mf-section-0' );
		if ( !$lead || trim( $lead->textContent ) === '' ) {
			return;
		}

		$truncateLead = in_array( $group, [ self::GROUP_LEAD, self::GROUP_LEAD_INFOBOX ], true );
		$quickFacts = $group === self::GROUP_LEAD_INFOBOX;
		$existingQuickFacts = DOMCompat::querySelector( $body, 'section.mf-quick-facts' );
		if ( $quickFacts ) {
			if ( !$existingQuickFacts ) {
				// MobileFrontend has finished sectioning the HTML by BeforePageDisplay.
				// Reuse its transform without changing the shared MFQuickFacts setting.
				( new QuickFactsTransform( $out->msg( 'mobile-frontend-quick-facts' )->text(), $isParsoidOutput ) )
					->apply( $body );
				$html = XHtmlSerializer::serialize( $body, [ 'innerXML' => true, 'smartQuote' => false ] )['html'];
				$out->clearHTML();
				$out->addHTML( $html );
			}
			$out->addModuleStyles( 'mobile.quickFacts.styles' );
		}

		// Minerva applies lead truncation in JS; Quick Facts has already changed the HTML.
		$out->addJsConfigVars( 'wgMinervaTruncateLeadSection', $truncateLead );
		// The client checks its SDK assignment against the group rendered by this hook.
		$out->addJsConfigVars( 'wgReaderExperimentsMinervaCompactLead', [
			'experimentName' => self::EXPERIMENT_NAME,
			'group' => $group
		] );
		// All three groups need client-side exposure and interaction instrumentation.
		$out->addModules( 'ext.readerExperiments/minervaCompactLead' );
	}
}
