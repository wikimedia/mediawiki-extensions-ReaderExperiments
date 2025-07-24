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

use Article;
use MediaWiki\Parser\ParserOutput;

class Hooks implements \MediaWiki\Page\Hook\ArticleViewHeaderHook {

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/ArticleViewHeaderHook
	 *
	 * @param Article $article
	 * @param bool|ParserOutput|null &$outputDone
	 * @param bool &$pcache
	 */
	public function onArticleViewHeader( $article, &$outputDone, &$pcache ): void {
		$out = $article->getContext()->getOutput();
		$title = $out->getContext()->getTitle();
		$config = $out->getConfig();

		if ( $title && $title->getNamespace() === NS_MAIN ) {
			if ( $config->get( 'ReaderExperimentsShowImageBrowsing' ) ) {
				$out->addModules( 'ext.readerExperiments.imageBrowsing' );
				$out->addHTML( '<div id="ext-readerExperiments-imageBrowsing"></div>' );
			}
		}
	}

}
