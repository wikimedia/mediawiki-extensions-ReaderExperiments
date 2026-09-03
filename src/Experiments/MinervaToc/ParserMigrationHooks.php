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

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\ParserMigration\Hook\ShouldUseParsoidHook;
use MediaWiki\Extension\ReaderExperiments\Common\FeatureFlagExperiment;
use MediaWiki\Extension\TestKitchen\Sdk\ExperimentManager;
use MediaWiki\Request\WebRequest;
use MediaWiki\Title\Title;
use MediaWiki\User\User;

class ParserMigrationHooks implements ShouldUseParsoidHook {
	public function __construct(
		private ?ExperimentManager $experimentManager = null
	) {
	}

	/**
	 * @inheritDoc
	 */
	public function onShouldUseParsoid( User $user, WebRequest $request, Title $title, bool &$enable ): void {
		$experiment = new FeatureFlagExperiment(
			$this->experimentManager,
			$request,
			Hooks::EXPERIMENT_NAME
		);

		if (
			$title->getNamespace() === NS_MAIN &&
			RequestContext::getMain()->getSkin()->getSkinName() === 'minerva'
		) {
			$assignedGroup = $experiment->getAssignedGroup();
			if ( $assignedGroup !== null ) {
				// Force all experiment participants (any group) to use Parsoid.
				// The legacy parser has significant differences in lead section
				// transform behavior and it's not worth fixing when we're about
				// to sunset it for primary page views.
				$enable = true;
			}
		}
	}
}
