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

namespace MediaWiki\Extension\ReaderExperiments\Experiments\MinervaToc;

use MediaWiki\Extension\ReaderExperiments\Common\FeatureFlagExperiment;
use MediaWiki\Extension\TestKitchen\Sdk\ExperimentManager;
use MediaWiki\Hook\BeforeInitializeHook;
use MediaWiki\Output\Hook\BeforePageDisplayHook;

class Hooks implements
	BeforeInitializeHook,
	BeforePageDisplayHook
{
	public const EXPERIMENT_NAME = 'mobile-toc-abc2';
	public const GROUP_STICKY = 'treatment1';
	public const GROUP_BUTTON = 'treatment2';

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

		if (
			$title && $title->getNamespace() === NS_MAIN &&
			$out->getSkin()->getSkinName() === 'minerva'
		) {
			if ( $experiment->isAssignedGroup( self::GROUP_STICKY ) ) {
				$out->addModules( 'ext.readerExperiments/minervaToc.sticky' );
			}
			if ( $experiment->isAssignedGroup( self::GROUP_BUTTON ) ) {
				$out->addModules( 'ext.readerExperiments/minervaToc.button' );
			}
		}
	}

	/**
	 * @inheritDoc
	 */
	public function onBeforeInitialize(
		$title,
		$unused,
		$output,
		$user,
		$request,
		$mediaWikiEntryPoint
	): void {
		if (
			$title && $title->getNamespace() === NS_MAIN &&
			$output->getSkin()->getSkinName() === 'minerva'
		) {
			$experiment = new FeatureFlagExperiment(
				$this->experimentManager,
				$request,
				self::EXPERIMENT_NAME
			);

			if ( $experiment->isAssignedGroup( self::GROUP_STICKY, self::GROUP_BUTTON ) ) {
				// TOC experiments require sections to not be expand-/collapsable.
				global $wgMFNamespacesWithoutCollapsibleSections;
				$wgMFNamespacesWithoutCollapsibleSections[] = NS_MAIN;
			}
		}
	}
}
