<?php

namespace MediaWiki\Extension\ReaderExperiments\Tests\Unit\Experiments\SemanticSearch\Utils;

use MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\DOMWalker;
use MediaWikiUnitTestCase;
use Wikimedia\Parsoid\Core\DOMCompat;
use Wikimedia\Parsoid\Utils\DOMUtils;

/**
 * @covers \MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\DOMWalker::walk
 */
class DOMWalkerTest extends MediaWikiUnitTestCase {
	public function provideWalk(): iterable {
		yield [
			// phpcs:disable Generic.Files.LineLength.TooLong
			'<span class="searchmatch">Cat</span><span class="searchmatch">Dog</span> is an American animated sitcom created by Peter Hannan for Nickelodeon. It follows the zany hijinks of a <span class="searchmatch">cat</span> and <span class="searchmatch">dog</span> who are inexplicably conjoined...',
			[
				[ 'descend', '<span class="searchmatch">Cat</span><span class="searchmatch">Dog</span> is an American animated sitcom created by Peter Hannan for Nickelodeon. It follows the zany hijinks of a <span class="searchmatch">cat</span> and <span class="searchmatch">dog</span> who are inexplicably conjoined...' ],
				[ 'descend', '<span class="searchmatch">Cat</span>' ],
				[ 'leaf', 'Cat' ],
				[ 'ascend', '<span class="searchmatch">Cat</span>' ],
				[ 'descend', '<span class="searchmatch">Dog</span>' ],
				[ 'leaf', 'Dog' ],
				[ 'ascend', '<span class="searchmatch">Dog</span>' ],
				[ 'leaf', ' is an American animated sitcom created by Peter Hannan for Nickelodeon. It follows the zany hijinks of a ' ],
				[ 'descend', '<span class="searchmatch">cat</span>' ],
				[ 'leaf', 'cat' ],
				[ 'ascend', '<span class="searchmatch">cat</span>' ],
				[ 'leaf', ' and ' ],
				[ 'descend', '<span class="searchmatch">dog</span>' ],
				[ 'leaf', 'dog' ],
				[ 'ascend', '<span class="searchmatch">dog</span>' ],
				[ 'leaf', ' who are inexplicably conjoined...' ],
				[ 'ascend', '<span class="searchmatch">Cat</span><span class="searchmatch">Dog</span> is an American animated sitcom created by Peter Hannan for Nickelodeon. It follows the zany hijinks of a <span class="searchmatch">cat</span> and <span class="searchmatch">dog</span> who are inexplicably conjoined...' ],
			],
		];

		yield [
			'Fermi wrote a paper &quot;On the Origin of Cosmic Radiation &quot; in which he proposed that cosmic rays arose through material being accelerated by magnetic fields in interstellar space, which led to a difference of opinion with Teller. Fermi examined the issues surrounding magnetic fields in the arms of a spiral galaxy. He mused about what is now referred to as the &quot; Fermi paradox &quot;: <span class="searchmatch">the contradiction between the presumed probability of the existence of extraterrestrial life and the fact that contact has not been made</span>.',
			[
				[ 'descend', 'Fermi wrote a paper "On the Origin of Cosmic Radiation " in which he proposed that cosmic rays arose through material being accelerated by magnetic fields in interstellar space, which led to a difference of opinion with Teller. Fermi examined the issues surrounding magnetic fields in the arms of a spiral galaxy. He mused about what is now referred to as the " Fermi paradox ": <span class="searchmatch">the contradiction between the presumed probability of the existence of extraterrestrial life and the fact that contact has not been made</span>.' ],
				[ 'leaf', 'Fermi wrote a paper "On the Origin of Cosmic Radiation " in which he proposed that cosmic rays arose through material being accelerated by magnetic fields in interstellar space, which led to a difference of opinion with Teller. Fermi examined the issues surrounding magnetic fields in the arms of a spiral galaxy. He mused about what is now referred to as the " Fermi paradox ": ' ],
				[ 'descend', '<span class="searchmatch">the contradiction between the presumed probability of the existence of extraterrestrial life and the fact that contact has not been made</span>' ],
				[ 'leaf', 'the contradiction between the presumed probability of the existence of extraterrestrial life and the fact that contact has not been made' ],
				[ 'ascend', '<span class="searchmatch">the contradiction between the presumed probability of the existence of extraterrestrial life and the fact that contact has not been made</span>' ],
				[ 'leaf', '.' ],
				[ 'ascend', 'Fermi wrote a paper "On the Origin of Cosmic Radiation " in which he proposed that cosmic rays arose through material being accelerated by magnetic fields in interstellar space, which led to a difference of opinion with Teller. Fermi examined the issues surrounding magnetic fields in the arms of a spiral galaxy. He mused about what is now referred to as the " Fermi paradox ": <span class="searchmatch">the contradiction between the presumed probability of the existence of extraterrestrial life and the fact that contact has not been made</span>.' ],
			],
		];

		yield [
			'<span class="searchmatch">Of course mermaids exist</span>. Or, to be more precise, of course water spirits and magical marine beings of every kind are real and numerous and, in certain circumstances, somewhat dangerous....The modern reports of real encounters with mermaids or other water-spirits, such as two from Zimbabwe, one from South Africa, three from northeastern India, and so on...are so ingenuous, well-attested, and credible that only a brute would refuse to believe them there is a real moral imperative in not dismissing such tales as lies or delusions.',
			[
				[ 'descend', '<span class="searchmatch">Of course mermaids exist</span>. Or, to be more precise, of course water spirits and magical marine beings of every kind are real and numerous and, in certain circumstances, somewhat dangerous....The modern reports of real encounters with mermaids or other water-spirits, such as two from Zimbabwe, one from South Africa, three from northeastern India, and so on...are so ingenuous, well-attested, and credible that only a brute would refuse to believe them there is a real moral imperative in not dismissing such tales as lies or delusions.' ],
				[ 'descend', '<span class="searchmatch">Of course mermaids exist</span>' ],
				[ 'leaf', 'Of course mermaids exist' ],
				[ 'ascend', '<span class="searchmatch">Of course mermaids exist</span>' ],
				[ 'leaf', '. Or, to be more precise, of course water spirits and magical marine beings of every kind are real and numerous and, in certain circumstances, somewhat dangerous....The modern reports of real encounters with mermaids or other water-spirits, such as two from Zimbabwe, one from South Africa, three from northeastern India, and so on...are so ingenuous, well-attested, and credible that only a brute would refuse to believe them there is a real moral imperative in not dismissing such tales as lies or delusions.' ],
				[ 'ascend', '<span class="searchmatch">Of course mermaids exist</span>. Or, to be more precise, of course water spirits and magical marine beings of every kind are real and numerous and, in certain circumstances, somewhat dangerous....The modern reports of real encounters with mermaids or other water-spirits, such as two from Zimbabwe, one from South Africa, three from northeastern India, and so on...are so ingenuous, well-attested, and credible that only a brute would refuse to believe them there is a real moral imperative in not dismissing such tales as lies or delusions.' ],
			],
			// phpcs:enable Generic.Files.LineLength.TooLong
		];
	}

	/**
	 * @dataProvider provideWalk
	 */
	public function testWalk( string $html, array $visits ): void {
		$doc = DOMCompat::newDocument( true );
		$dom = DOMUtils::parseHTMLToFragment( $doc, $html );

		$results = [];
		$walker = new DOMWalker( $dom );
		$walker->walk(
			leaf: static function ( $node ) use ( &$results ) {
				$results[] = [ 'leaf', DOMCompat::getOuterHTML( $node ) ];
			},
			descend: static function ( $node ) use ( &$results ) {
				$results[] = [ 'descend', DOMCompat::getOuterHTML( $node ) ];
			},
			ascend: static function ( $node ) use ( &$results ) {
				$results[] = [ 'ascend', DOMCompat::getOuterHTML( $node ) ];
			},
		);

		$this->assertArrayEquals( $visits, $results, true );
	}

	/**
	 * @dataProvider provideWalk
	 */
	public function testWalkReverse( string $html, array $visits ): void {
		$doc = DOMCompat::newDocument( true );
		$dom = DOMUtils::parseHTMLToFragment( $doc, $html );

		$results = [];
		$walker = new DOMWalker( $dom );
		$walker->walk(
			leaf: static function ( $node ) use ( &$results ) {
				$results[] = [ 'leaf', DOMCompat::getOuterHTML( $node ) ];
			},
			descend: static function ( $node ) use ( &$results ) {
				$results[] = [ 'descend', DOMCompat::getOuterHTML( $node ) ];
			},
			ascend: static function ( $node ) use ( &$results ) {
				$results[] = [ 'ascend', DOMCompat::getOuterHTML( $node ) ];
			},
			reverse: true,
		);

		$reverseVisits = array_map(
			static function ( $visit ) {
				$visit[ 0 ] = match ( $visit[ 0 ] ) {
					'ascend' => 'descend',
					'descend' => 'ascend',
					default => $visit[ 0 ],
				};
				return $visit;
			},
			array_reverse( $visits ),
		);

		$this->assertArrayEquals( $reverseVisits, $results, true );
	}
}
