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

namespace MediaWiki\Extension\ReaderExperiments\Experiments\MinimalMinervaToolbar;

use MediaWiki\Extension\ReaderExperiments\Common\FeatureFlagExperiment;
use MediaWiki\Extension\TestKitchen\Sdk\ExperimentManager;
use MediaWiki\Minerva\Hooks\SkinMinervaOptionsInitHook;
use MediaWiki\Minerva\SkinOptions;
use MediaWiki\Skin\Skin;

class MinervaHooks implements SkinMinervaOptionsInitHook {
	public const EXPERIMENT_NAME = 'minimal-minerva-toolbar';
	public const GROUP_NAME = 'treatment';

	public function __construct(
		private ?ExperimentManager $experimentManager = null
	) {
	}

	/**
	 * @inheritDoc
	 */
	public function onSkinMinervaOptionsInit( Skin $skin, SkinOptions $skinOptions ): void {
		$enrollment = $this->getMinimalMinervaToolbarEnrollment( $skin );
		if ( $enrollment === null ) {
			return;
		}

		// Add instrumentation module
		$out = $skin->getOutput();
		$out->addJsConfigVars( 'wgReaderExperimentsMinimalMinervaToolbar', [
			'experimentName' => self::EXPERIMENT_NAME,
			'group' => $enrollment
		] );
		$out->addModules( 'ext.readerExperiments/minimalMinervaToolbar' );

		// Treatment gets minimal mode
		if ( $enrollment === self::GROUP_NAME ) {
			$skinOptions->setMultiple( [ SkinOptions::MINIMAL => true ] );
		}
	}

	private function getMinimalMinervaToolbarEnrollment( Skin $skin ): ?string {
		// Bail early for ineligible requests, non-minerva skin, and logged-in users
		// Note: temporary accounts are eligible
		$title = $skin->getTitle();
		$user = $skin->getUser();

		if (
			!$title ||
			$title->getNamespace() !== NS_MAIN ||
			$skin->getSkinName() !== 'minerva' ||
			( $user->isRegistered() && !$user->isTemp() )
		) {
			return null;
		}

		// Enroll via URL parameter
		$request = $skin->getRequest();
		if ( $request->getFuzzyBool( 'minMinToolbar' ) ) {
			return self::GROUP_NAME;
		}

		// Enroll via TestKitchen
		$experiment = new FeatureFlagExperiment(
			$this->experimentManager,
			$request,
			self::EXPERIMENT_NAME
		);
		return $experiment->getAssignedGroup();
	}
}
