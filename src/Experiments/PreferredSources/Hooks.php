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

namespace MediaWiki\Extension\ReaderExperiments\Experiments\PreferredSources;

use MediaWiki\Output\Hook\BeforePageDisplayHook;

class Hooks implements BeforePageDisplayHook {
	/**
	 * @inheritDoc
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		$context = $out->getContext();
		$title = $context->getTitle();
		$user = $context->getUser();

		// Logged-out Minerva article views only
		if (
			!$title ||
			$title->getNamespace() !== NS_MAIN ||
			$out->getSkin()->getSkinName() !== 'minerva' ||
			$user->isRegistered()
		) {
			return;
		}

		// Non-cache-splitting experiment: PHP does not determine inclusion.
		// The bootstrap module is served to every eligible pageview, and
		// experiment inclusion is determined client-side.
		$out->addModules( 'ext.readerExperiments/preferredSources' );
	}
}
