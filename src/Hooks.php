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
use MediaWiki\Extension\TestKitchen\Sdk\ExperimentManager;
use MediaWiki\Hook\BeforeInitializeHook;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\Hook\BeforePageDisplayHook;
use MediaWiki\Output\OutputPage;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Request\WebRequest;
use MediaWiki\ResourceLoader\Context;
use MediaWiki\Title\Title;
use MediaWiki\User\User;

class Hooks implements BeforePageDisplayHook, BeforeInitializeHook, ShouldUseParsoidHook {
	// Tier 1: 10% Arabic, Chinese, French, Indonesian, and Vietnamese Wikipedias.
	// https://test-kitchen.wikimedia.org/experiment/fy2025-26-we3.1-image-browsing-ab-test
	private const IMAGE_BROWSING_EXPERIMENT_1_NAME = 'fy2025-26-we3.1-image-browsing-ab-test';
	private const IMAGE_BROWSING_GROUP_1_NAME = 'image-browsing-test';
	// Tier 2: 0.1% English Wikipedia.
	// https://test-kitchen.wikimedia.org/experiment/image-browsing-enwiki
	private const IMAGE_BROWSING_EXPERIMENT_2_NAME = 'fy2025-26-we3.1-image-browsing-ab-test';
	private const IMAGE_BROWSING_GROUP_2_NAME = 'treatment';

	// Tier 1: 10% Arabic, Chinese, French, Indonesian, and Vietnamese Wikipedias.
	// https://test-kitchen.wikimedia.org/experiment/sticky-headers
	private const STICKY_HEADERS_EXPERIMENT_NAME = 'sticky-headers';
	private const STICKY_HEADERS_GROUP_NAME = 'treatment';

	// TODO: Replace with actual TestKitchen experiment name & treatment group once defined
	private const SHARE_HIGHLIGHT_EXPERIMENT_NAME = 'share-highlight';
	private const SHARE_HIGHLIGHT_GROUP_NAME = 'treatment';

	// BEGIN MINERVA_TOC_EXPERIMENTS (T415611)
	// https://test-kitchen.wikimedia.org/experiment/mobile-toc-abc
	private const MINERVA_TOC_EXPERIMENT_NAME = 'mobile-toc-abc';
	private const MINERVA_TOC_GROUP_STICKY = 'treatment1';
	private const MINERVA_TOC_GROUP_BUTTON = 'treatment2';
	// END MINERVA_TOC_EXPERIMENTS (T415611)

	private ?ExperimentManager $experimentManager;

	// BEGIN MINERVA_TOC_EXPERIMENTS (T415611)
	private function getAssignedGroup( WebRequest $request, string $experimentName ): ?string {
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
			// entirely, where only the last occurence would remain
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

	// END MINERVA_TOC_EXPERIMENTS (T415611)

	public function __construct( ?ExperimentManager $experimentManager = null ) {
		$this->experimentManager = $experimentManager;
	}

	/**
	 * ResourceLoader callback to generate virtual config.json for ImageBrowsing module,
	 * to provides configuration data as a packageFiles virtual module
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
	 * StickyHeaders hook handler.
	 * @inheritDoc
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		$this->maybeInitImageBrowsing( $out );
		$this->maybeInitStickyHeaders( $out );
		$this->maybeInitToc( $out );
		$this->maybeInitShareHighlight( $out );
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
				$this->getAssignedGroup( $request, self::IMAGE_BROWSING_EXPERIMENT_1_NAME ) === self::IMAGE_BROWSING_GROUP_1_NAME ||
				$this->getAssignedGroup( $request, self::IMAGE_BROWSING_EXPERIMENT_2_NAME ) === self::IMAGE_BROWSING_GROUP_2_NAME ||
				// phpcs:enable Generic.Files.LineLength.TooLong
				$request->getFuzzyBool( 'imageBrowsing' )
			)
		) {
			$out->prependHTML(
				'<div id="ext-readerExperiments-imageBrowsing"></div>'
			);

			$out->addModuleStyles( 'ext.readerExperiments.imageBrowsing.styles' );

			// Load heavy module since already gated server-side.
			$out->addModules( 'ext.readerExperiments.imageBrowsing' );
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
			$out->addModules( 'ext.readerExperiments.stickyHeaders.styles' );

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
				// load the ext.readerExperiments.stickyHeaders module
				$out->addModules( 'ext.readerExperiments.stickyHeaders' );
			} else {
				// load the ext.readerExperiments.stickyHeaders.legacy module
				$out->addModules( 'ext.readerExperiments.stickyHeaders.legacy' );
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

			if ( $assignedGroup !== null ) {
				$out->addModules( 'ext.readerExperiments.minervaToc.instrumentation' );
			}

			if ( $assignedGroup === self::MINERVA_TOC_GROUP_STICKY ) {
				$out->addModules( 'ext.readerExperiments.minervaToc/sticky' );
			}
			if ( $assignedGroup === self::MINERVA_TOC_GROUP_BUTTON ) {
				$out->addModules( 'ext.readerExperiments.minervaToc/button' );
			}
		}
	}

	private function maybeInitShareHighlight( OutputPage $out ): void {
		if ( !$out->getConfig()->get( 'ReaderExperimentsShareHighlightEnabled' ) ) {
			return;
		}

		$context = $out->getContext();
		$request = $context->getRequest();
		$title = $context->getTitle();

		if (
			$title && $title->getNamespace() === NS_MAIN &&
			$out->getSkin()->getSkinName() === 'minerva' &&
			(
				// phpcs:ignore Generic.Files.LineLength.TooLong
				$this->getAssignedGroup( $request, self::SHARE_HIGHLIGHT_EXPERIMENT_NAME ) === self::SHARE_HIGHLIGHT_GROUP_NAME ||
				$request->getFuzzyBool( 'shareHighlight' )
			)
		) {
			$out->prependHTML(
				'<div id="ext-readerExperiments-shareHighlight"></div>'
			);

			$out->addModuleStyles( 'ext.readerExperiments.shareHighlight.styles' );
			$out->addModules( 'ext.readerExperiments.shareHighlight' );
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
