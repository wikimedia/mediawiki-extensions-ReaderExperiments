<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests;

use MediaWiki\Config\Config;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Hooks;
use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\SemanticSearchRequestInspector;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\OutputPage;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use MediaWikiIntegrationTestCase;

/**
 * @group ReaderExperiments
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Hooks::onBeforeInitialize
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Hooks::meetsQualification
 */
class SemanticSearchHooksTest extends MediaWikiIntegrationTestCase {
	private const QUALIFYING_QUERY = 'how do I bake a chocolate cake at home';

	private const OPT_SEARCH_SPECIAL_PAGE = 'search-special-page';

	private function anonUser(): User {
		return User::newFromId( 0 );
	}

	private function registeredUser(): User {
		$user = $this->createMock( User::class );
		$user->method( 'isRegistered' )->willReturn( true );
		$user->method( 'isTemp' )->willReturn( false );
		return $user;
	}

	private function title( ?string $page ): Title {
		if ( in_array( $page, [ 'Search', 'SemanticSearch' ], true ) ) {
			return Title::newFromText( 'Special:' . $page );
		}
		return Title::newFromText( $page === null ? 'Article' : $page );
	}

	private function runHook( array $query, ?string $page ): array {
		$user = $this->anonUser();
		[ $redirected, $url ] = $this->invoke( $user, $query, $page );
		return [ $redirected, $url, $user ];
	}

	private function invoke( User $user, array $query, ?string $page ): array {
		$config = $this->createMock( Config::class );
		$inspector = new SemanticSearchRequestInspector(
			MediaWikiServices::getInstance()->getConfigFactory()->makeConfig( 'CirrusSearch' )
		);
		$hooks = new Hooks(
			$config,
			MediaWikiServices::getInstance()->getUserOptionsManager(),
			$inspector,
			null
		);

		$redirected = false;
		$url = null;
		$out = $this->createMock( OutputPage::class );
		$out->method( 'getRequest' )->willReturn( $this->newRequest( $query ) );
		$out->method( 'getTitle' )->willReturn( $this->title( $page ) );
		$out->method( 'redirect' )->willReturnCallback(
			static function ( $u ) use ( &$redirected, &$url ) {
				$redirected = true;
				$url = (string)$u;
			}
		);

		$hooks->onBeforeInitialize(
			$this->title( $page ),
			[],
			$out,
			$user,
			$this->newRequest( $query ),
			null
		);

		return [ $redirected, $url ];
	}

	private function newRequest( array $query ): FauxRequest {
		return new FauxRequest( $query );
	}

	private function optionValue( User $user ): ?string {
		return MediaWikiServices::getInstance()
			->getUserOptionsManager()
			->getOption( $user, self::OPT_SEARCH_SPECIAL_PAGE );
	}

	private function assertOption( User $user, ?string $expected ): void {
		$this->assertSame(
			$expected,
			$this->optionValue( $user )
		);
	}

	public function testNotEnrolledIsExcluded(): void {
		[ $redirected, , $user ] = $this->runHook(
			[ 'search' => self::QUALIFYING_QUERY, 'uselang' => 'en' ],
			'Article'
		);
		$this->assertFalse( $redirected );
		// Not enrolled: the hook never anchors the semantic target
		$this->assertNotSame( 'SemanticSearch', $this->optionValue( $user ) );
	}

	public function testControlGroupIsEnrolled(): void {
		[ $redirected ] = $this->runHook(
			[ 'search' => self::QUALIFYING_QUERY, 'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_CONTROL ],
			'Article'
		);
		$this->assertTrue( $redirected );
	}

	public function testRegisteredNonTempUserIsExcluded(): void {
		$user = $this->registeredUser();
		[ $redirected ] = $this->invoke(
			$user,
			[ 'search' => self::QUALIFYING_QUERY, 'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT ],
			'Article'
		);
		$this->assertFalse( $redirected );
	}

	public function testEmptyTermIsExcluded(): void {
		[ $redirected ] = $this->runHook(
			[ 'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT ],
			'Article'
		);
		$this->assertFalse( $redirected );
	}

	public function testQuestionWordAloneQualifies(): void {
		// Below Hooks::MIN_QUERY_WORDS words, but contains a question word: qualifies
		[ $redirected ] = $this->runHook(
			[ 'search' => 'how to bake a', 'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT ],
			'Article'
		);
		$this->assertTrue( $redirected );
	}

	public function testBoundaryWordCountQualifies(): void {
		// Exactly MIN_QUERY_WORDS words, no question word: qualifies
		[ $redirected ] = $this->runHook(
			[ 'search' => 'is there life on mars', 'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT ],
			'Article'
		);
		$this->assertTrue( $redirected );
	}

	public function testWordCountAloneQualifies(): void {
		// Above Hooks::MIN_QUERY_WORDS words, no question word: qualifies
		[ $redirected ] = $this->runHook(
			[
				'search' => 'the best chocolate cake recipe to ever find',
				'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT,
			],
			'Article'
		);
		$this->assertTrue( $redirected );
	}

	public function testShortAndNoQuestionWordIsExcluded(): void {
		// Below Hooks::MIN_QUERY_WORDS, no question word: doesn't qualify
		[ $redirected ] = $this->runHook(
			[
				'search' => 'bakers baking today',
				'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT,
			],
			'Article'
		);
		$this->assertFalse( $redirected );
	}

	public function testAdvancedFilterParamIsExcluded(): void {
		[ $redirected ] = $this->runHook(
			[
				'search' => self::QUALIFYING_QUERY,
				'profile' => 'advanced',
				'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT,
			],
			'Article'
		);
		$this->assertFalse( $redirected );
	}

	public function testNamespaceParamIsExcluded(): void {
		[ $redirected ] = $this->runHook(
			[
				'search' => self::QUALIFYING_QUERY,
				'ns0' => '1',
				'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT,
			],
			'Article'
		);
		$this->assertFalse( $redirected );
	}

	public function testAdvancedSyntaxIsExcluded(): void {
		// 9 words, has "how", but carries CirrusSearch advanced syntax: doesn't qualify
		[ $redirected ] = $this->runHook(
			[
				'search' => 'how to insource:bake a chocolate cake at home',
				'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT,
			],
			'Article'
		);
		$this->assertFalse( $redirected );
	}

	public function testNonMainNamespacePrefixIsExcluded(): void {
		// Has "how", > MIN_QUERY_WORDS words, but a leading non-main (User)
		// namespace prefix, which semantic search doesn't support.
		[ $redirected ] = $this->runHook(
			[
				'search' => 'User:how do I bake a chocolate cake at home',
				'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT,
			],
			'Article'
		);
		$this->assertFalse( $redirected );
	}

	public function testQualifyingFromArticleRedirectsToSemanticSearch(): void {
		[ $redirected, $url ] = $this->runHook(
			[
				'search' => self::QUALIFYING_QUERY,
				'uselang' => 'en',
				'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT,
			],
			'Article'
		);
		$this->assertTrue( $redirected );
		$this->assertStringContainsString( 'SemanticSearch', $url );
		// The search term and language are preserved in the redirect URL
		$this->assertStringContainsString( 'search=', $url );
		$this->assertStringContainsString( 'uselang=en', $url );
	}

	public function testOnSemanticSearchAnchorsWithoutRedirect(): void {
		$user = $this->anonUser();
		[ $redirected ] = $this->invoke(
			$user,
			[ 'search' => self::QUALIFYING_QUERY, 'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT ],
			'SemanticSearch'
		);
		$this->assertFalse( $redirected );
		$this->assertOption( $user, 'SemanticSearch' );
	}

	public function testOnSearchPageQualifyingQueryStillRedirects(): void {
		// A qualifying query from any page (except Special:SemanticSearch) redirects to SemanticSearch
		[ $redirected, $url ] = $this->runHook(
			[ 'search' => self::QUALIFYING_QUERY, 'mpo' => Hooks::EXPERIMENT_NAME . ':' . Hooks::GROUP_TREATMENT ],
			'Donald_Duck'
		);
		$this->assertTrue( $redirected );
		$this->assertStringContainsString( 'SemanticSearch', $url );
	}
}
