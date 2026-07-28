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

use MediaWiki\Extension\TestKitchen\Sdk\ExperimentManager;
use MediaWiki\Request\WebRequest;
use MediaWiki\Skin\Skin;

abstract class HooksBase {
	protected const IMAGE_BROWSING_EXPERIMENT_NAME = 'image-browsing-enwiki';
	protected const IMAGE_BROWSING_GROUP_NAME = 'treatment';

	protected const STICKY_HEADERS_EXPERIMENT_NAME = 'sticky-headers';
	protected const STICKY_HEADERS_GROUP_NAME = 'treatment';

	protected const SHARE_HIGHLIGHT_EXPERIMENT_NAME = 'share-highlight';
	protected const SHARE_HIGHLIGHT_GROUP_NAME = 'treatment';

	protected const SHARE_HIGHLIGHT_BASELINE_EXPERIMENT_NAME = 'share-highlight-baseline';

	protected const MINERVA_TOC_EXPERIMENT_NAME = 'mobile-toc-abc2';
	protected const MINERVA_TOC_GROUP_STICKY = 'treatment1';
	protected const MINERVA_TOC_GROUP_BUTTON = 'treatment2';

	protected const MOBILE_PAGE_PREVIEWS_EXPERIMENT_NAME = 'mobile-page-previews';
	protected const MOBILE_PAGE_PREVIEWS_GROUP_NAME = 'treatment';

	protected const MINIMAL_MINERVA_EXPERIMENT_NAME = 'minimal-minerva-toolbar';
	protected const MINIMAL_MINERVA_GROUP_CONTROL = 'control';
	protected const MINIMAL_MINERVA_GROUP_TREATMENT = 'treatment';
	protected const MINIMAL_MINERVA_GROUP_NAME = 'treatment';
	protected const EVERYONE_EXPERIMENTS_ENROLLMENTS_HEADER_NAME = 'X-Experiment-Enrollments';

	protected ?ExperimentManager $experimentManager;

	public function __construct( ?ExperimentManager $experimentManager = null ) {
		$this->experimentManager = $experimentManager;
	}

	protected function getAssignedGroup( WebRequest $request, string $experimentName ): ?string {
		if ( $this->experimentManager ) {
			$experiment = $this->experimentManager->getExperiment( $experimentName );
			$assignedGroup = $experiment->getAssignedGroup();
			if ( $assignedGroup !== null ) {
				return $assignedGroup;
			}
		}

		// For dev convenience, when the experiment is not active, we'll mimic
		// test kitchen's enrollment override URL param so that we can start
		// development before having set up experiments (or test in
		// environments where setting it up is inconvenient)
		// This looks something like: ?mpo=minerva-toc-abc:treatment1
		$mpo = $request->getRawVal( 'mpo' );
		if ( $mpo !== null ) {
			$overrides = explode( ';', $mpo );
			// Iterate in reverse to mimic test kitchen's behavior of iterating
			// entirely, where only the last occurrence would remain
			foreach ( array_reverse( $overrides ) as $override ) {
				$overrideParts = explode( ':', $override, 2 );
				if ( count( $overrideParts ) !== 2 ) {
					// Improperly formatted mpo param, ignore altogether,
					// like test kitchen does
					return null;
				}

				if ( $overrideParts[0] === $experimentName ) {
					return $overrideParts[1];
				}
			}
		}

		return null;
	}

	protected function getAssignedGroupFromEveryoneExperimentsHeader(
		WebRequest $request,
		string $experimentName
	): ?string {
		$headerValue = $request->getHeader( self::EVERYONE_EXPERIMENTS_ENROLLMENTS_HEADER_NAME ) ?? '';
		if ( $headerValue === '' ) {
			return null;
		}

		$assignedGroup = null;
		$rawEnrollments = explode( ';', rtrim( $headerValue, ';' ) );
		foreach ( $rawEnrollments as $rawEnrollment ) {
			$enrollment = array_filter( explode( '=', $rawEnrollment ) );
			if ( count( $enrollment ) !== 2 ) {
				return null;
			}

			if ( $enrollment[0] === $experimentName ) {
				$assignedGroup = $enrollment[1];
			}
		}

		return $assignedGroup;
	}

	protected function getAssignedGroupFromRequest( WebRequest $request, string $experimentName ): ?string {
		$assignedGroup = $this->getAssignedGroupFromEveryoneExperimentsHeader( $request, $experimentName );

		// Keep this header fallback for tools like Inssman that simulate
		// enrollment by setting X-Experiment-Enrollments on the request,
		// even when ExperimentManager does not surface that assignment here.
		// URL overrides should still win, matching Test Kitchen's precedence.
		return $this->getAssignedGroup( $request, $experimentName ) ?? $assignedGroup;
	}

	protected function getMinimalMinervaToolbarEnrollmentFromSkin( Skin $skin ): ?string {
		$title = $skin->getTitle();

		if (
			!$title ||
			$title->getNamespace() !== NS_MAIN ||
			$skin->getSkinName() !== 'minerva' ||
			$skin->getUser()->isRegistered()
		) {
			return null;
		}

		$request = $skin->getRequest();
		$assignedGroup = $this->getAssignedGroupFromRequest(
			$request,
			self::MINIMAL_MINERVA_EXPERIMENT_NAME
		);

		if ( in_array(
			$assignedGroup,
			[
				self::MINIMAL_MINERVA_GROUP_CONTROL,
				self::MINIMAL_MINERVA_GROUP_TREATMENT
			],
			true
		) ) {
			return $assignedGroup;
		}

		if ( $request->getFuzzyBool( 'minMinToolbar' ) ) {
			return self::MINIMAL_MINERVA_GROUP_TREATMENT;
		}

		return null;
	}
}
