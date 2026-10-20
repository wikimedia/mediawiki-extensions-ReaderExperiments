<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests;

use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Hooks;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest\GetSemanticSearch;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\SpecialSemanticSearch;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\SemanticSearchRequestInspector;
use MediaWiki\MediaWikiServices;
use MediaWikiIntegrationTestCase;
use Wikimedia\ObjectFactory\ObjectFactory;

/**
 * Smoke test that resolves Hooks and GetSemanticSearch as the runtime does.
 *
 * Detects a broken extension.json service list.
 *
 * @group ReaderExperiments
 */
class SemanticSearchWiringSmokeTest extends MediaWikiIntegrationTestCase {
	/**
	 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Hooks::__construct
	 */
	public function testHookHandlerResolves(): void {
		$services = MediaWikiServices::getInstance();
		// Same spec as extension.json HookHandlers.SemanticSearchHooks
		$hooks = ( new ObjectFactory( $services ) )->createObject(
			[
				'class' => Hooks::class,
				'optional_services' => [
					'MainConfig',
					'UserOptionsManager',
					'ReaderExperiments.SemanticSearch.RequestInspector',
					'TestKitchen.ExperimentManager',
				],
			]
		);
		$this->assertInstanceOf( Hooks::class, $hooks );
	}

	/**
	 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\SpecialSemanticSearch::__construct
	 */
	public function testSpecialPageResolves(): void {
		// Mirror SpecialPages.SemanticSearch in extension.json
		$specialPage = ( new ObjectFactory( MediaWikiServices::getInstance() ) )->createObject(
			[
				'class' => SpecialSemanticSearch::class,
				'services' => [
					'ReaderExperiments.SemanticSearch.Api.InternalRestApi',
					'MainConfig',
					'TitleMatcher',
					'UserOptionsManager',
					'TestKitchen.ExperimentManager',
				],
			]
		);
		$this->assertInstanceOf( SpecialSemanticSearch::class, $specialPage );
	}

	/**
	 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\SemanticSearchRequestInspector::__construct
	 */
	public function testInspectorServiceResolves(): void {
		$inspector = MediaWikiServices::getInstance()->getService(
			'ReaderExperiments.SemanticSearch.RequestInspector'
		);
		$this->assertInstanceOf( SemanticSearchRequestInspector::class, $inspector );
	}

	/**
	 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Rest\GetSemanticSearch::__construct
	 */
	public function testRestHandlerResolvesThroughObjectFactory(): void {
		$container = MediaWikiServices::getInstance();
		// Mirror the RestRoutes entry in extension.json
		$handler = ( new ObjectFactory( $container ) )->createObject(
			[
				'class' => GetSemanticSearch::class,
				'services' => [
					'ReaderExperiments.SemanticSearch.Api.ActionApi',
					'ReaderExperiments.SemanticSearch.Api.RestApi',
					'MainConfig',
					'ContentLanguage',
					'ReaderExperiments.SemanticSearch.RequestInspector',
				],
			]
		);
		$this->assertInstanceOf( GetSemanticSearch::class, $handler );
	}
}
