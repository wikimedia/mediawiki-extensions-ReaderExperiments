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

use Article;
use MediaWiki\Extension\MetricsPlatform\XLab\ExperimentManager;
use MediaWiki\Parser\ParserOutput;

class Hooks implements \MediaWiki\Page\Hook\ArticleViewHeaderHook {

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
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/ArticleViewHeaderHook
	 *
	 * @param Article $article
	 * @param bool|ParserOutput|null &$outputDone
	 * @param bool &$pcache
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
				$out->addHTML( '<div id="ext-readerExperiments-imageBrowsing"></div>' );

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

}
