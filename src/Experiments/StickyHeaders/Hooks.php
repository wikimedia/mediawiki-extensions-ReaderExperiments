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

namespace MediaWiki\Extension\ReaderExperiments\Experiments\StickyHeaders;

use MediaWiki\Extension\ReaderExperiments\Common\FeatureFlagExperiment;
use MediaWiki\Extension\TestKitchen\Sdk\ExperimentManager;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\Hook\BeforePageDisplayHook;
use MediaWiki\Registration\ExtensionRegistry;

class Hooks implements BeforePageDisplayHook {
	public const EXPERIMENT_NAME = 'sticky-headers';
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
		$title = $out->getTitle();

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
				// phpcs:ignore Generic.Files.LineLength.TooLong
				$experiment->isAssignedGroup( self::GROUP_NAME ) ||
				$request->getFuzzyBool( 'stickyHeaders' )
			)
		) {
			// This CSS class triggers a pre-existing feature (added for DiscussionTools),
			// which achieves what we want in terms of auto-expanding sections
			// (regardless of whether Parsoid or legacy parser is used).
			$out->addBodyClasses( 'collapsible-headings-expanded' );

			// Load the common styles module
			$out->addModules( 'ext.readerExperiments/stickyHeaders.styles' );

			// Mobile section headers use different markup and styles depending on whether
			// Parsoid or legacy parser is used, so we need to determine how the page was
			// rendered.
			$shouldUseParsoid = false;
			if ( ExtensionRegistry::getInstance()->isLoaded( 'ParserMigration' ) ) {
				$oracle = MediaWikiServices::getInstance()->getService( 'ParserMigration.Oracle' );
				$shouldUseParsoid = $oracle->shouldUseParsoid(
					$context->getUser(),
					$context->getRequest(),
					$title
				);
			}
			if ( $shouldUseParsoid ) {
				// load the ext.readerExperiments/stickyHeaders.parsoid module
				$out->addModules( 'ext.readerExperiments/stickyHeaders.parsoid' );
			} else {
				// load the ext.readerExperiments/stickyHeaders.legacy module
				$out->addModules( 'ext.readerExperiments/stickyHeaders.legacy' );
			}
		}

		// When enrolled in StickyHeaders and Special:MobileOptions
		if (
			$title &&
			$title->getNamespace() === NS_SPECIAL &&
			$title->getBaseText() === 'MobileOptions' &&
			// phpcs:ignore Generic.Files.LineLength.TooLong
			$experiment->isAssignedGroup( self::GROUP_NAME )
		) {
			$out->addJsConfigVars( 'wgReaderExperimentsStickyHeaders', 'enrolled' );
		}
	}
}
