<?php
/**
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @file
 */

namespace MediaWiki\Extension\ReaderExperiments;

use MediaWiki\Config\Config;
use MediaWiki\Extension\MetricsPlatform\XLab\ExperimentManager;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\Hook\BeforePageDisplayHook;
use MediaWiki\Page\Hook\ArticleViewHeaderHook;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\ResourceLoader\Context;

class Hooks implements ArticleViewHeaderHook, BeforePageDisplayHook {

	//
	// ImageBrowsing experiments.
	//

	// Tier 1: 10% Arabic, Chinese, French, Indonesian, and Vietnamese Wikipedias.
	// https://mpic.wikimedia.org/experiment/fy2025-26-we3.1-image-browsing-ab-test
	/** @var string */
	private const TIER_ONE_EXPERIMENT_NAME = 'fy2025-26-we3.1-image-browsing-ab-test';
	/** @var string */
	private const TIER_ONE_TREATMENT_GROUP = 'image-browsing-test';

	// Tier 2: 0.1% English Wikipedia.
	// https://mpic.wikimedia.org/experiment/image-browsing-enwiki
	/** @var string */
	private const TIER_TWO_EXPERIMENT_NAME = 'image-browsing-enwiki';
	/** @var string */
	private const TIER_TWO_TREATMENT_GROUP = 'treatment';

	// StickyHeaders experiment:
	// https://mpic.wikimedia.org/experiment/sticky-headers
	private const SH_EXPERIMENT_NAME = 'sticky-headers';
	private const SH_TREATMENT_GROUP = 'treatment';

	private ?ExperimentManager $experimentManager;

	public function __construct( ?ExperimentManager $experimentManager = null ) {
		$this->experimentManager = $experimentManager;
	}

	/**
	 * ResourceLoader callback to generate virtual config.json for ImageBrowsing module,
	 * to provides configuration data as a packageFiles virtual module
	 *
	 * @see https://www.mediawiki.org/wiki/ResourceLoader/Package_files#Generated_content
	 *
	 * @param Context $context
	 * @param Config $config
	 * @return array
	 */
	public static function getConfig( Context $context, Config $config ): array {
		$thumbLimits = array_unique( array_merge(
			$config->get( 'ThumbLimits' ),
			$config->get( 'ThumbnailSteps' ) ?? [],
			[ 1280, 2560 ]
		) );
		sort( $thumbLimits, SORT_NUMERIC );

		return [
			'apiBaseUri' => $config->get( 'ReaderExperimentsApiBaseUri' ),
			'externalWikis' => $config->get( 'ReaderExperimentsImageBrowsingExternalWikis' ),
			'thumbLimits' => $thumbLimits,
		];
	}

	private function isInAnyImageBrowsingTreatmentGroup(): bool {
		if ( !$this->experimentManager ) {
			return false;
		}

		$tierOne = $this->experimentManager->getExperiment( self::TIER_ONE_EXPERIMENT_NAME );
		$tierOneAssignedGroup = $tierOne->getAssignedGroup();

		$tierTwo = $this->experimentManager->getExperiment( self::TIER_TWO_EXPERIMENT_NAME );
		$tierTwoAssignedGroup = $tierTwo->getAssignedGroup();

		return ( $tierOneAssignedGroup === self::TIER_ONE_TREATMENT_GROUP ) ||
			( $tierTwoAssignedGroup === self::TIER_TWO_TREATMENT_GROUP );
	}

	/**
	 * ImageBrowsing hook handler.
	 * @inheritDoc
	 */
	public function onArticleViewHeader( $article, &$outputDone, &$pcache ): void {
		$out = $article->getContext()->getOutput();
		$title = $out->getContext()->getTitle();
		$config = $out->getConfig();

		if ( $title && $title->getNamespace() === NS_MAIN ) {
			// Check URL parameter for manual enablement
			$request = $article->getContext()->getRequest();
			$urlParamEnabled = $request->getFuzzyBool( 'imageBrowsing' );

			// Check if we're using Minerva skin
			$isMinervaSkin = $out->getSkin()->getSkinName() === 'minerva';

			// Enable if Minerva skin AND (URL param is set OR user is in any experiment's treatment group).
			if ( $isMinervaSkin && ( $urlParamEnabled || $this->isInAnyImageBrowsingTreatmentGroup() ) ) {
				$out->prependHTML(
					'<div id="ext-readerExperiments-imageBrowsing"></div>'
				);

				$out->addModuleStyles( 'ext.readerExperiments.imageBrowsing.styles' );

				// Load heavy module since already gated server-side.
				$out->addModules( 'ext.readerExperiments.imageBrowsing' );
			}
		}
	}

	private function isInStickyTreatmentGroup(): bool {
		if ( !$this->experimentManager ) {
			return false;
		}

		$stickyHeadersExperiment = $this->experimentManager->getExperiment( self::SH_EXPERIMENT_NAME );
		$isInAnyTreatmentGroup = $stickyHeadersExperiment->getAssignedGroup();

		return ( $isInAnyTreatmentGroup === self::SH_TREATMENT_GROUP );
	}

	/**
	 * StickyHeaders hook handler.
	 * @inheritDoc
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		$context = $out->getContext();
		$request = $context->getRequest();
		$title = $out->getTitle();
		$shouldUseParsoid = false;

		if ( ExtensionRegistry::getInstance()->isLoaded( 'ParserMigration' ) ) {
			$oracle = MediaWikiServices::getInstance()->getService( 'ParserMigration.Oracle' );
			$shouldUseParsoid =
				$oracle->shouldUseParsoid( $context->getUser(), $context->getRequest(), $title );
		}

		if ( $title && $title->getNamespace() === NS_MAIN ) {
			// Check presence of URL query parameter (feature flag).
			$hasFeatureFlag = $request->getFuzzyBool( 'stickyHeaders' );

			// Check usage of Minerva skin.
			$isMinervaSkin = $skin->getSkinName() === 'minerva';

			// Enable if Minerva skin AND (URL param is set OR user is in any experiment's treatment group).
			if ( $isMinervaSkin && ( $hasFeatureFlag || $this->isInStickyTreatmentGroup() ) ) {
				// This CSS class triggers a pre-existing feature (added for DiscussionTools),
				// which achieves what we want in terms of auto-expanding sections
				// (regardless of whether parsoid or legacy parser is used).
				$out->addBodyClasses( 'collapsible-headings-expanded' );

				// Load the common styles module
				$out->addModules( 'ext.readerExperiments.stickyHeaders.styles' );

				// Mobile section headers use different markup and styles depending on whether
				// parsoid or legacy parser is used, so we need to determine how the page was
				// rendered.
				if ( $shouldUseParsoid ) {
					// load the ext.readerExperiments.stickyHeaders module
					$out->addModules( 'ext.readerExperiments.stickyHeaders' );
				} else {
					// load the ext.readerExperiments.stickyHeaders.legacy module
					$out->addModules( 'ext.readerExperiments.stickyHeaders.legacy' );
				}
			}
		}

		// When enrolled in StickyHeaders and Special:MobileOptions
		if (
			$title &&
			$title->getNamespace() === NS_SPECIAL &&
			$title->getBaseText() === 'MobileOptions' &&
			$this->isInStickyTreatmentGroup()
			) {
				$out->addJsConfigVars( 'wgReaderExperimentsStickyHeaders', 'enrolled' );
		}
	}
}
