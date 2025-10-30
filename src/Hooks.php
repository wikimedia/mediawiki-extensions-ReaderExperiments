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

use MediaWiki\Extension\MetricsPlatform\XLab\ExperimentManager;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\Hook\BeforePageDisplayHook;
use MediaWiki\Page\Hook\ArticleViewHeaderHook;
use MediaWiki\Registration\ExtensionRegistry;

class Hooks implements ArticleViewHeaderHook, BeforePageDisplayHook {

	/** @var string */
	private const EXPERIMENT_NAME = 'fy2025-26-we3.1-image-browsing-ab-test';
	/** @var string */
	private const TREATMENT_GROUP = 'image-browsing-test';

	private ?ExperimentManager $experimentManager;

	public function __construct( ?ExperimentManager $experimentManager = null ) {
		$this->experimentManager = $experimentManager;
	}

	private function isInTreatmentGroup(): bool {
		if ( !$this->experimentManager ) {
			return false;
		}

		$experiment = $this->experimentManager->getExperiment( self::EXPERIMENT_NAME );
		$assignedGroup = $experiment->getAssignedGroup();
		return $assignedGroup === self::TREATMENT_GROUP;
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

			// Enable if Minerva skin AND (URL param is set OR user is in treatment group).
			if ( $isMinervaSkin && ( $urlParamEnabled || $this->isInTreatmentGroup() ) ) {
				$out->prependHTML(
					'<div id="ext-readerExperiments-imageBrowsing"></div>'
				);

				$out->addJsConfigVars(
					'ReaderExperimentsApiBaseUri',
					$config->get( 'ReaderExperimentsApiBaseUri' )
				);
				$out->addJsConfigVars(
					'ReaderExperimentsImageBrowsingExternalWikis',
					$config->get( 'ReaderExperimentsImageBrowsingExternalWikis' )
				);

				$thumbLimits = array_unique( array_merge(
					$config->get( 'ThumbLimits' ),
					$config->get( 'ThumbnailSteps' ) ?? [],
					[ 1280, 2560 ]
				) );
				sort( $thumbLimits, SORT_NUMERIC );
				$out->addJsConfigVars(
					'ReaderExperimentsImageBrowsingThumbLimits',
					$thumbLimits
				);

				$out->addModuleStyles( 'ext.readerExperiments.imageBrowsing.styles' );

				// Load heavy module since already gated server-side.
				$out->addModules( 'ext.readerExperiments.imageBrowsing' );
			}
		}
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

			// Enable feature IF Minerva AND feature flag.
			if ( $isMinervaSkin && $hasFeatureFlag ) {
				// This CSS class triggers a pre-existing feature (added for DiscussionTools),
				// which achieves what we want in terms of auto-expanding sections
				// (regardless of whether parsoid or legacy parser is used).
				$out->addBodyClasses( 'collapsible-headings-expanded' );

				// Load the commen styles module
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
	}
}
