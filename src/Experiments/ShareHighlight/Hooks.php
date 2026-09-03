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

namespace MediaWiki\Extension\ReaderExperiments\Experiments\ShareHighlight;

use MediaWiki\Extension\ReaderExperiments\Common\FeatureFlagExperiment;
use MediaWiki\Extension\TestKitchen\Sdk\ExperimentManager;
use MediaWiki\Output\Hook\BeforePageDisplayHook;
use MediaWiki\Skin\Hook\SkinTemplateNavigation__UniversalHook;
use MediaWiki\Skin\Skin;

class Hooks implements
	BeforePageDisplayHook,
	SkinTemplateNavigation__UniversalHook
{
	public const EXPERIMENT_NAME = 'share-highlight';
	public const GROUP_NAME = 'treatment';

	public const BASELINE_EXPERIMENT_NAME = 'share-highlight-baseline';

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
		$enrollment = $this->getShareHighlightEnrollment( $out->getSkin() );
		if ( $enrollment === null ) {
			return;
		}

		if ( $enrollment === 'treatment' ) {
			$out->addModuleStyles( [
				'mediawiki.pulsatingdot',
				'ext.readerExperiments/shareHighlight.styles'
			] );
			$out->addModules( 'ext.readerExperiments/shareHighlight' );
		}

		$pageSize = 0;
		$context = $out->getContext();

		if ( $context->canUseWikiPage() ) {
			$page = $context->getWikiPage();
			if ( $page ) {
				$rev = $page->getRevisionRecord();
				if ( $rev ) {
					// Note this will fail for remote pages via MobileFrontendContentProvider.
					$pageSize = $this->bucketPageSize( $rev->getSize() );
				}
			}
		}

		$out->addJsConfigVars( 'wgReaderExperimentsPageSize', strval( $pageSize ) );
	}

	/**
	 * Add a share icon to the Minerva page actions toolbar for
	 * ShareHighlight-enrolled users.
	 *
	 * @inheritDoc
	 */
	public function onSkinTemplateNavigation__Universal( $sktemplate, &$links ): void {
		if ( $this->getShareHighlightEnrollment( $sktemplate ) !== 'treatment' ) {
			return;
		}

		// Key must stay short: Minerva's ToolbarBuilder::copyItemToGroup prefixes
		// it with "ca-" to build the DOM id, which our JS binds to.
		// Adding the new link at the start of the array to ensure it appears first.
		$links['views'] = [ 're-share' => [
				'text' => $sktemplate->msg( 'readerexperiments-sharehighlight-toolbar-share' )->text(),
				'href' => '#',
				'icon' => 'share',
				'class' => '',
			] ] + $links['views'];
	}

	/**
	 * Returns the ShareHighlight enrollment state for the current request.
	 *
	 * @return string|null One of:
	 *   - 'treatment': user gets the feature UI and instrumentation.
	 *   - 'baseline': user gets instrumentation only — main-experiment
	 *     non-treatment group, or any group of the separate baseline A/A
	 *     experiment.
	 *   - null: unenrolled / ineligible
	 */
	private function getShareHighlightEnrollment( Skin $skin ): ?string {
		// Bail early for ineligible requests, non-minerva skin, and logged-in users
		$title = $skin->getTitle();
		if (
			!$title ||
			$title->getNamespace() !== NS_MAIN ||
			$skin->getSkinName() !== 'minerva' ||
			$skin->getUser()->isRegistered()
		) {
			return null;
		}

		// Treatment group (gets the UI)
		$request = $skin->getRequest();
		$experiment = new FeatureFlagExperiment(
			$this->experimentManager,
			$request,
			self::EXPERIMENT_NAME
		);
		$group = $experiment->getAssignedGroup();
		if (
			$group === self::GROUP_NAME ||
			$request->getFuzzyBool( 'shareHighlight' )
		) {
			return 'treatment';
		}

		// Control/baseline group
		$baselineExperiment = new FeatureFlagExperiment(
			$this->experimentManager,
			$request,
			self::BASELINE_EXPERIMENT_NAME
		);
		$baseline = $baselineExperiment->getAssignedGroup();
		if ( $group !== null || $baseline !== null ) {
			return 'baseline';
		}

		return null;
	}

	/**
	 * Bucket page sizes by rounding to first decimal digit
	 */
	private function bucketPageSize( int $pageSize ): int {
		$str = strval( $pageSize );
		$first = substr( $str, 0, 1 );
		$rest = str_repeat( '0', strlen( $str ) - 1 );
		return intval( $first . $rest );
	}
}
