<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests;

use MediaWiki\Extension\ReaderExperiments\Hooks;
use MediaWiki\Extension\ReaderExperiments\MinervaHooks;
use MediaWiki\HookContainer\HookContainer;
use MediaWiki\Minerva\SkinOptions;
use MediaWiki\Minerva\Skins\SkinUserPageHelper;
use MediaWiki\Output\OutputPage;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Skin\Skin;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use MediaWikiUnitTestCase;
use ReflectionMethod;

/**
 * @group ReaderExperiments
 * @covers \MediaWiki\Extension\ReaderExperiments\Hooks
 */
class HooksTest extends MediaWikiUnitTestCase {
	private function requireMinervaSkinOptions(): void {
		if ( !class_exists( SkinOptions::class ) ) {
			$this->markTestSkipped( 'Minerva SkinOptions is not available in this test environment.' );
		}
	}

	private function newSkinOptions(): SkinOptions {
		return new SkinOptions(
			$this->createMock( HookContainer::class ),
			$this->createMock( SkinUserPageHelper::class )
		);
	}

	private function newSkin(
		FauxRequest $request,
		int $namespace = NS_MAIN,
		string $skinName = 'minerva',
		bool $isRegistered = false
	): Skin {
		$title = $this->createMock( Title::class );
		$title->method( 'getNamespace' )->willReturn( $namespace );

		$user = $this->createMock( User::class );
		$user->method( 'isRegistered' )->willReturn( $isRegistered );

		$skin = $this->createMock( Skin::class );
		$skin->method( 'getTitle' )->willReturn( $title );
		$skin->method( 'getSkinName' )->willReturn( $skinName );
		$skin->method( 'getUser' )->willReturn( $user );
		$skin->method( 'getRequest' )->willReturn( $request );

		return $skin;
	}

	private function invokePrivateMethod( Hooks $hooks, string $methodName, mixed ...$args ): mixed {
		$method = new ReflectionMethod( Hooks::class, $methodName );

		return $method->invoke( $hooks, ...$args );
	}

	private function invokeMethod( object $object, string $methodName, mixed ...$args ): mixed {
		$method = new ReflectionMethod( $object::class, $methodName );

		return $method->invoke( $object, ...$args );
	}

	public function testGetsMinimalMinervaToolbarEnrollmentFromEveryoneExperimentsHeader(): void {
		$request = new FauxRequest();
		$request->setHeader(
			'X-Experiment-Enrollments',
			'minimal-minerva-toolbar=treatment;another-experiment=control'
		);

		$enrollment = $this->invokeMethod(
			new MinervaHooks(),
			'getMinimalMinervaToolbarEnrollmentFromSkin',
			$this->newSkin( $request )
		);

		$this->assertSame( 'treatment', $enrollment );
	}

	public function testOverrideEnrollmentTakesPrecedenceOverEveryoneExperimentsHeader(): void {
		$request = new FauxRequest( [
			'mpo' => 'minimal-minerva-toolbar:treatment'
		] );
		$request->setHeader(
			'X-Experiment-Enrollments',
			'minimal-minerva-toolbar=control'
		);

		$enrollment = $this->invokeMethod(
			new MinervaHooks(),
			'getMinimalMinervaToolbarEnrollmentFromSkin',
			$this->newSkin( $request )
		);

		$this->assertSame( 'treatment', $enrollment );
	}

	public function testMinMinToolbarQueryParamForcesTreatment(): void {
		$request = new FauxRequest( [
			'minMinToolbar' => '1'
		] );

		$enrollment = $this->invokeMethod(
			new MinervaHooks(),
			'getMinimalMinervaToolbarEnrollmentFromSkin',
			$this->newSkin( $request )
		);

		$this->assertSame( 'treatment', $enrollment );
	}

	public function testSkinMinervaOptionsInitEnablesMinimalForTreatment(): void {
		$this->requireMinervaSkinOptions();

		$request = new FauxRequest();
		$request->setHeader(
			'X-Experiment-Enrollments',
			'minimal-minerva-toolbar=treatment'
		);

		$skinOptions = $this->newSkinOptions();
		( new MinervaHooks() )->onSkinMinervaOptionsInit(
			$this->newSkin( $request ),
			$skinOptions
		);

		$this->assertTrue( $skinOptions->get( SkinOptions::MINIMAL ) );
	}

	public function testSkinMinervaOptionsInitDoesNotEnableMinimalForControl(): void {
		$this->requireMinervaSkinOptions();

		$request = new FauxRequest();
		$request->setHeader(
			'X-Experiment-Enrollments',
			'minimal-minerva-toolbar=control'
		);

		$skinOptions = $this->newSkinOptions();
		( new MinervaHooks() )->onSkinMinervaOptionsInit(
			$this->newSkin( $request ),
			$skinOptions
		);

		$this->assertFalse( $skinOptions->get( SkinOptions::MINIMAL ) );
	}

	/**
	 * @dataProvider provideIneligibleSkins
	 */
	public function testSkinMinervaOptionsInitDoesNotEnableMinimalWhenIneligible(
		int $namespace,
		string $skinName,
		bool $isRegistered
	): void {
		$this->requireMinervaSkinOptions();

		$request = new FauxRequest();
		$request->setHeader(
			'X-Experiment-Enrollments',
			'minimal-minerva-toolbar=treatment'
		);

		$skinOptions = $this->newSkinOptions();
		( new MinervaHooks() )->onSkinMinervaOptionsInit(
			$this->newSkin( $request, $namespace, $skinName, $isRegistered ),
			$skinOptions
		);

		$this->assertFalse( $skinOptions->get( SkinOptions::MINIMAL ) );
	}

	public static function provideIneligibleSkins(): iterable {
		yield 'talk namespace' => [ NS_TALK, 'minerva', false ];
		yield 'wrong skin' => [ NS_MAIN, 'vector', false ];
		yield 'registered user' => [ NS_MAIN, 'minerva', true ];
	}

	public function testMaybeInitMinimalMinervaToolbarAddsControlJsConfig(): void {
		$request = new FauxRequest();
		$request->setHeader(
			'X-Experiment-Enrollments',
			'minimal-minerva-toolbar=control'
		);

		$outputPage = $this->createMock( OutputPage::class );
		$outputPage->method( 'getSkin' )->willReturn( $this->newSkin( $request ) );
		$outputPage->expects( $this->once() )
			->method( 'addJsConfigVars' )
			->with(
				'wgReaderExperimentsMinimalMinervaToolbar',
				[
					'experimentName' => 'minimal-minerva-toolbar',
					'group' => 'control'
				]
			);
		$outputPage->expects( $this->once() )
			->method( 'addModules' )
			->with( 'ext.readerExperiments/minimalMinervaToolbar' );

		$this->invokePrivateMethod(
			new Hooks(),
			'maybeInitMinimalMinervaToolbar',
			$outputPage
		);
	}
}
