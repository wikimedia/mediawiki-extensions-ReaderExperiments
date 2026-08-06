<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests;

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
 * @covers \MediaWiki\Extension\ReaderExperiments\MinervaHooks
 */
class MinervaHooksTest extends MediaWikiUnitTestCase {
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

		$out = $this->createMock( OutputPage::class );
		$skin->method( 'getOutput' )->willReturn( $out );

		return $skin;
	}

	private function invokeMethod( object $object, string $methodName, mixed ...$args ): mixed {
		$method = new ReflectionMethod( $object::class, $methodName );

		return $method->invoke( $object, ...$args );
	}

	public function testMinMinToolbarQueryParamForcesTreatment(): void {
		$request = new FauxRequest( [
			'minMinToolbar' => '1'
		] );

		$enrollment = $this->invokeMethod(
			new MinervaHooks(),
			'getMinimalMinervaToolbarEnrollment',
			$this->newSkin( $request )
		);

		$this->assertSame( 'treatment', $enrollment );
	}

	public function testSkinMinervaOptionsInitEnablesMinimalForTreatmentFromUrl(): void {
		$this->requireMinervaSkinOptions();

		$request = new FauxRequest();

		$skinOptions = $this->newSkinOptions();
		( new MinervaHooks() )->onSkinMinervaOptionsInit(
			$this->newSkin( $request ),
			$skinOptions
		);

		$this->assertFalse( $skinOptions->get( SkinOptions::MINIMAL ) );
	}

	public function testSkinMinervaOptionsInitEnablesMinimalForTreatmentFromQueryParam(): void {
		$this->requireMinervaSkinOptions();

		$request = new FauxRequest( [
			'minMinToolbar' => '1'
		] );

		$skinOptions = $this->newSkinOptions();
		( new MinervaHooks() )->onSkinMinervaOptionsInit(
			$this->newSkin( $request ),
			$skinOptions
		);

		$this->assertTrue( $skinOptions->get( SkinOptions::MINIMAL ) );
	}

	public function testSkinMinervaOptionsInitDoesNotEnableMinimalForControl(): void {
		$this->requireMinervaSkinOptions();

		$enrollment = $this->invokeMethod(
			new MinervaHooks(),
			'getMinimalMinervaToolbarEnrollment',
			$this->newSkin( new FauxRequest() )
		);

		$this->assertNull( $enrollment );
	}

	/**
	 * @dataProvider provideIneligibleSkins
	 */
	public function testEligibilityFiltersBlockEnrollment(
		int $namespace,
		string $skinName,
		bool $isRegistered
	): void {
		$this->requireMinervaSkinOptions();

		$enrollment = $this->invokeMethod(
			new MinervaHooks(),
			'getMinimalMinervaToolbarEnrollment',
			$this->newSkin( new FauxRequest(), $namespace, $skinName, $isRegistered )
		);

		$this->assertNull( $enrollment );
	}

	public static function provideIneligibleSkins(): iterable {
		yield 'talk namespace' => [ NS_TALK, 'minerva', false ];
		yield 'wrong skin' => [ NS_MAIN, 'vector', false ];
		yield 'registered user' => [ NS_MAIN, 'minerva', true ];
	}

	public function testMaybeInitMinimalMinervaToolbarAddsControlJsConfig(): void {
		$this->requireMinervaSkinOptions();

		$request = new FauxRequest( [
			'minMinToolbar' => '1'
		] );

		$skinOptions = $this->newSkinOptions();
		( new MinervaHooks() )->onSkinMinervaOptionsInit(
			$this->newSkin( $request ),
			$skinOptions
		);

		$this->assertTrue( $skinOptions->get( SkinOptions::MINIMAL ) );
	}
}
