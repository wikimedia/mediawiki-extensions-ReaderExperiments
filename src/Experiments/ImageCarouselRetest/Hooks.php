<?php

// TODO(image-carousel-retest): Remove this experiment-only file after the retest.
// Remove the hook registrations and modules listed in the experiment README too.

namespace MediaWiki\Extension\ReaderExperiments\Experiments\ImageCarouselRetest;

use MediaWiki\Extension\ReaderExperiments\Common\FeatureFlagExperiment;
use MediaWiki\Extension\TestKitchen\Sdk\ExperimentManager;
use MediaWiki\Output\OutputPage;

class Hooks {
	public const EXPERIMENT_NAME = 'image-carousel-retest';

	public function __construct( private ?ExperimentManager $experimentManager = null ) {
	}

	/**
	 * MMV calls this only after its shared page, opt-out, and image-count checks.
	 * Keep control on that same path: it needs instrumentation but no markup.
	 *
	 * @param OutputPage $out
	 * @param int $imageCount Number of images accepted by MMV's extractor
	 * @param bool &$render Whether MMV should render its carousel
	 * @param array &$attributes Attributes for the carousel root
	 */
	public function onMultimediaViewerBeforeMobileCarousel(
		OutputPage $out, int $imageCount, bool &$render, array &$attributes
	): void {
		if ( $out->getSkin()->getSkinName() !== 'minerva' || !$out->getUser()->isAnon() ) {
			return;
		}
		$experiment = new FeatureFlagExperiment(
			$this->experimentManager, $out->getRequest(), self::EXPERIMENT_NAME
		);
		$group = $experiment->getAssignedGroup();
		// Unenrolled readers have no group; never use null as a group-map key.
		if ( $group === null ) {
			return;
		}
		// Read the same group map used by the client, avoiding a second arm definition.
		$groups = json_decode( file_get_contents(
			__DIR__ . '/../../../resources/experiments/imageCarouselRetest/groups.json'
		), true );
		if ( !isset( $groups[$group] ) ) {
			return;
		}

		$render = $groups[$group]['showCarousel'];
		$out->addJsConfigVars( 'wgReaderExperimentsImageCarouselRetest', [
			'group' => $group,
			'imageCount' => $imageCount,
			'pageEligible' => true
		] );
		$out->addModules( 'ext.readerExperiments.imageCarouselRetest.init' );
		if ( $render ) {
			// Prevent both default MMV initialization and a flash of the wrong arm.
			// The client reveals this root only after confirming the SDK assignment.
			$attributes['data-mmv-defer-init'] = '1';
			$attributes['style'] = 'display: none;';
		}
	}
}
