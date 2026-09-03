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

namespace MediaWiki\Extension\ReaderExperiments\Common;

use MediaWiki\Extension\TestKitchen\Sdk\ExperimentManager;
use MediaWiki\Request\WebRequest;

/**
 * This is a class that's similar to
 * MediaWiki\Extension\TestKitchen\Sdk\ExperimentInterface
 * (although it doesn't implement all its methods) in the
 * sense that it will check an active experiment in order
 * to determine what group the user is enrolled in, but
 * also mimics TestKitchen's url query param overrides in
 * cases there is no such active experiment (which can be
 * useful during development/testing to split out the code
 * paths that are/will be needed)
 */
class FeatureFlagExperiment {
	public function __construct(
		private ?ExperimentManager $experimentManager,
		private WebRequest $request,
		private string $experimentName
	) {
	}

	/**
	 * @return string|null
	 */
	public function getAssignedGroup(): ?string {
		if ( $this->experimentManager ) {
			$experiment = $this->experimentManager->getExperiment( $this->experimentName );
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
		$mpo = $this->request->getRawVal( 'mpo' );
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

				if ( $overrideParts[0] === $this->experimentName ) {
					return $overrideParts[1];
				}
			}
		}

		return null;
	}

	/**
	 * @param string ...$groups
	 * * @return bool
	 */
	public function isAssignedGroup( string ...$groups ): bool {
		return in_array( $this->getAssignedGroup(), $groups, true );
	}
}
