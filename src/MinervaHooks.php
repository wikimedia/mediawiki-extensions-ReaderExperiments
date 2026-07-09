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

use MediaWiki\Minerva\Hooks\SkinMinervaOptionsInitHook;
use MediaWiki\Minerva\SkinOptions;
use MediaWiki\Skin\Skin;

class MinervaHooks extends HooksBase implements SkinMinervaOptionsInitHook {
	/**
	 * @inheritDoc
	 */
	public function onSkinMinervaOptionsInit( Skin $skin, SkinOptions $skinOptions ) {
		$request = $skin->getRequest();
		$assignedGroup = $this->getAssignedGroup( $request, self::MINIMAL_MINERVA_EXPERIMENT_NAME );
		if (
			$assignedGroup === self::MINIMAL_MINERVA_GROUP_NAME &&
			$skin->getTitle()->getNamespace() === NS_MAIN &&
			$skin->getUser()->isAnon()
		) {
			$skinOptions->setMultiple( [
				SkinOptions::MINIMAL => true,
				SkinOptions::TOOLBAR_SUBMENU => true,
			] );
		}
	}
}
