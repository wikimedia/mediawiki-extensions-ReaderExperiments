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

use MediaWiki\Config\Config;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\ParserMigration\Hook\ShouldUseParsoidHook;
use MediaWiki\Hook\BeforeInitializeHook;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\Hook\BeforePageDisplayHook;
use MediaWiki\Output\OutputPage;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Request\WebRequest;
use MediaWiki\ResourceLoader\Context;
use MediaWiki\Skin\Hook\SkinTemplateNavigation__UniversalHook;
use MediaWiki\Skin\Skin;
use MediaWiki\Title\Title;
use MediaWiki\User\User;

class Hooks extends HooksBase implements
	BeforePageDisplayHook,
	BeforeInitializeHook,
	ShouldUseParsoidHook,
	SkinTemplateNavigation__UniversalHook
{
	/**
	 * ResourceLoader callback to generate virtual config.json for common module.
	 * Provides configuration data as a packageFiles virtual module.
	 *
	 * @see https://www.mediawiki.org/wiki/ResourceLoader/Package_files#Generated_content
	 *
	 * @param Context $context
	 * @param Config $config
	 * @return array
	 */
	public static function getCommonConfig( Context $context, Config $config ): array {
		return [
			'apiBaseUri' => $config->get( 'ReaderExperimentsApiBaseUri' )
		];
	}

	/**
	 * ResourceLoader callback to generate virtual config.json for ImageBrowsing module.
	 * Provides configuration data as a packageFiles virtual module.
	 *
	 * @see https://www.mediawiki.org/wiki/ResourceLoader/Package_files#Generated_content
	 *
	 * @param Context $context
	 * @param Config $config
	 * @return array
	 */
	public static function getImageBrowsingConfig( Context $context, Config $config ): array {
		$thumbLimits = array_unique( array_merge(
			$config->get( 'ThumbLimits' ),
			$config->get( 'ThumbnailSteps' ) ?? [],
			[ 1280, 2560 ]
		) );
		sort( $thumbLimits, SORT_NUMERIC );

		return [
			'apiBaseUri' => $config->get( 'ReaderExperimentsApiBaseUri' ),
			'externalWikis' => $config->get( 'ReaderExperimentsImageBrowsingExternalWikis' ),
			'thumbLimits' => $thumbLimits,
		];
	}

	/**
	 * ResourceLoader callback to generate virtual config.json for PagePreviews module.
	 * Provides configuration data as a packageFiles virtual module.
	 *
	 * @see https://www.mediawiki.org/wiki/ResourceLoader/Package_files#Generated_content
	 *
	 * @param Context $context
	 * @param Config $config
	 * @return array
	 */
	public static function getMobilePagePreviewsConfig( Context $context, Config $config ): array {
		return [
			'apiBaseUri' => $config->get( 'ReaderExperimentsApiBaseUri' )
		];
	}

	/**
	 * ResourceLoader callback to generate virtual config.json for ShareHighlight module.
	 * Provides configuration data as a packageFiles virtual module.
	 *
	 * @see https://www.mediawiki.org/wiki/ResourceLoader/Package_files#Generated_content
	 *
	 * @param Context $context
	 * @param Config $config
	 * @return array
	 */
	public static function getShareHighlightConfig( Context $context, Config $config ): array {
		return [
			'apiBaseUri' => $config->get( 'ReaderExperimentsApiBaseUri' )
		];
	}

	/**
	 * StickyHeaders hook handler.
	 * @inheritDoc
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		$this->maybeInitImageBrowsing( $out );
		$this->maybeInitStickyHeaders( $out );
		$this->maybeInitToc( $out );
		$this->maybeInitShareHighlight( $out );
		$this->maybeInitMobilePagePreviews( $out );
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
		// BEGIN MINERVA_TOC_EXPERIMENTS (T415611)
		if (
			$title && $title->getNamespace() === NS_MAIN &&
			$output->getSkin()->getSkinName() === 'minerva'
		) {
			$assignedGroup = $this->getAssignedGroup( $request, self::MINERVA_TOC_EXPERIMENT_NAME );
			if ( $assignedGroup !== null ) {
				if ( in_array(
					$assignedGroup,
					[ self::MINERVA_TOC_GROUP_STICKY, self::MINERVA_TOC_GROUP_BUTTON ],
					true
				) ) {
					// TOC experiments require sections to not be expand-/collapsable.
					global $wgMFNamespacesWithoutCollapsibleSections;
					$wgMFNamespacesWithoutCollapsibleSections[] = NS_MAIN;
				}
			}
		}
		// END MINERVA_TOC_EXPERIMENTS (T415611)
	}

	private function maybeInitImageBrowsing( OutputPage $out ): void {
		$context = $out->getContext();
		$request = $context->getRequest();
		$title = $context->getTitle();

		// Enable if Minerva skin AND (URL param is set OR user is in any experiment's treatment group).
		if (
			$title && $title->getNamespace() === NS_MAIN &&
			$out->getSkin()->getSkinName() === 'minerva' &&
			(
				// phpcs:disable Generic.Files.LineLength.TooLong
				$this->getAssignedGroup( $request, self::IMAGE_BROWSING_EXPERIMENT_NAME ) === self::IMAGE_BROWSING_GROUP_NAME ||
				// phpcs:enable Generic.Files.LineLength.TooLong
				$request->getFuzzyBool( 'imageBrowsing' )
			)
		) {
			$out->prependHTML(
				'<div id="ext-readerExperiments-imageBrowsing"></div>'
			);

			$out->addModuleStyles( 'ext.readerExperiments/imageBrowsing.styles' );

			// Load heavy module since already gated server-side.
			$out->addModules( 'ext.readerExperiments/imageBrowsing' );
		}
	}

	private function maybeInitStickyHeaders( OutputPage $out ): void {
		$context = $out->getContext();
		$request = $context->getRequest();
		$title = $out->getTitle();

		// Enable if Minerva skin AND (URL param is set OR user is in any experiment's treatment group).
		if (
			$title && $title->getNamespace() === NS_MAIN &&
			$out->getSkin()->getSkinName() === 'minerva' &&
			(
				// phpcs:ignore Generic.Files.LineLength.TooLong
				$this->getAssignedGroup( $request, self::STICKY_HEADERS_EXPERIMENT_NAME ) === self::STICKY_HEADERS_GROUP_NAME ||
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
			$this->getAssignedGroup( $request, self::STICKY_HEADERS_EXPERIMENT_NAME ) === self::STICKY_HEADERS_GROUP_NAME
		) {
			$out->addJsConfigVars( 'wgReaderExperimentsStickyHeaders', 'enrolled' );
		}
	}

	private function maybeInitToc( OutputPage $out ): void {
		$context = $out->getContext();
		$request = $context->getRequest();
		$title = $context->getTitle();

		if (
			$title && $title->getNamespace() === NS_MAIN &&
			$out->getSkin()->getSkinName() === 'minerva'
		) {
			// BEGIN MINERVA_TOC_EXPERIMENTS (T415611)
			$assignedGroup = $this->getAssignedGroup( $request, self::MINERVA_TOC_EXPERIMENT_NAME );

			if ( $assignedGroup === self::MINERVA_TOC_GROUP_STICKY ) {
				$out->addModules( 'ext.readerExperiments/minervaToc.sticky' );
			}
			if ( $assignedGroup === self::MINERVA_TOC_GROUP_BUTTON ) {
				$out->addModules( 'ext.readerExperiments/minervaToc.button' );
			}
		}
	}

	private function maybeInitShareHighlight( OutputPage $out ): void {
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
		$group = $this->getAssignedGroup( $request, self::SHARE_HIGHLIGHT_EXPERIMENT_NAME );
		if (
			$group === self::SHARE_HIGHLIGHT_GROUP_NAME ||
			$request->getFuzzyBool( 'shareHighlight' )
		) {
			return 'treatment';
		}

		// Control/baseline group
		$baseline = $this->getAssignedGroup( $request, self::SHARE_HIGHLIGHT_BASELINE_EXPERIMENT_NAME );
		if ( $group !== null || $baseline !== null ) {
			return 'baseline';
		}

		return null;
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
	 * Bucket page sizes by rounding to first decimal digit
	 */
	private function bucketPageSize( int $pageSize ): int {
		$str = strval( $pageSize );
		$first = substr( $str, 0, 1 );
		$rest = str_repeat( '0', strlen( $str ) - 1 );
		return intval( $first . $rest );
	}

	private function maybeInitMobilePagePreviews( OutputPage $out ): void {
		$context = $out->getContext();
		$request = $context->getRequest();
		$title = $context->getTitle();

		if (
			!$title ||
			$title->getNamespace() !== NS_MAIN ||
			$out->getSkin()->getSkinName() !== 'minerva'
		) {
			return;
		}

		$assignedGroup = $this->getAssignedGroup( $request, self::MOBILE_PAGE_PREVIEWS_EXPERIMENT_NAME );

		if ( $assignedGroup === self::MOBILE_PAGE_PREVIEWS_GROUP_NAME ) {
			$out->addModules( 'ext.readerExperiments/mobilePagePreviews' );
		}
	}

	/**
	 * @inheritDoc
	 */
	public function onShouldUseParsoid( User $user, WebRequest $request, Title $title, bool &$enable ): void {
		if (
			$title->getNamespace() === NS_MAIN &&
			RequestContext::getMain()->getSkin()->getSkinName() === 'minerva'
		) {
			// BEGIN MINERVA_TOC_EXPERIMENTS (T415611)
			$assignedGroup = $this->getAssignedGroup( $request, self::MINERVA_TOC_EXPERIMENT_NAME );
			if ( $assignedGroup !== null ) {
				// Force all experiment participants (any group) to use Parsoid.
				// The legacy parser has significant differences in lead section
				// transform behavior and it's not worth fixing when we're about
				// to sunset it for primary page views.
				$enable = true;
			}
			// END MINERVA_TOC_EXPERIMENTS (T415611)
		}
	}
}
