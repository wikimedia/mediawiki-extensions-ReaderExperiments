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

namespace MediaWiki\Extension\ReaderExperiments\Experiments\ImageBrowsing;

use MediaWiki\Extension\ReaderExperiments\Common\FeatureFlagExperiment;
use MediaWiki\Extension\TestKitchen\Sdk\ExperimentManager;
use MediaWiki\Output\Hook\BeforePageDisplayHook;

class Hooks implements BeforePageDisplayHook {
	public const EXPERIMENT_NAME = 'image-browsing-enwiki';
	public const GROUP_NAME = 'treatment';

	public function __construct(
		private ?ExperimentManager $experimentManager = null
	) {
	}

	/**
	 * Conditionally initialize experiments depending on their gating logic.
	 *
	 * @inheritDoc
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		$context = $out->getContext();
		$request = $context->getRequest();
		$title = $context->getTitle();

		$experiment = new FeatureFlagExperiment(
			$this->experimentManager,
			$request,
			self::EXPERIMENT_NAME
		);

		// Enable if Minerva skin AND (URL param is set OR user is in any experiment's treatment group).
		if (
			$title && $title->getNamespace() === NS_MAIN &&
			$out->getSkin()->getSkinName() === 'minerva' &&
			(
				$experiment->isAssignedGroup( self::GROUP_NAME ) ||
				// phpcs:enable Generic.Files.LineLength.TooLong
				$request->getFuzzyBool( 'imageBrowsing' )
			)
		) {
			$out->prependHTML(
				'<div id="ext-readerExperiments-imageBrowsing"></div>'
			);

			$out->addModuleStyles( 'ext.readerExperiments/imageBrowsing.styles' );

			// Load heavy module since already gated server-side.
			$out->addModules( 'ext.readerExperiments/imageBrowsing' );
		}
	}
}
