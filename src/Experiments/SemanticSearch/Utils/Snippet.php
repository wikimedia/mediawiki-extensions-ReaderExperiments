<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils;

use Wikimedia\Parsoid\Core\DOMCompat;
use Wikimedia\Parsoid\DOM\Node;
use Wikimedia\Parsoid\Utils\DOMUtils;

class Snippet {
	private const DEFAULT_LIMIT = 250;

	public function __construct( private readonly string $html ) {
	}

	public function truncate( int $limit = self::DEFAULT_LIMIT ): string {
		$doc = DOMCompat::newDocument( true );
		$dom = DOMUtils::parseHTMLToFragment( $doc, $this->html );

		$highlight = DOMCompat::querySelector( $dom, '.searchmatch' );
		if ( $highlight ) {
			// First truncate to $limit characters to the left of the first highlight
			// (-1 for any ellipsis that may be added)
			$this->truncateWords( $dom, $limit - 1, true, $highlight );

			// Now potentially reduce that further, if there is a sentence break
			$preTruncateLength = mb_strlen( $dom->textContent );
			$this->truncateSentence( $dom );

			// If we were unable to snap to the beginning of a sentence,
			// might as well truncate that left-hand-side text a bit more:
			// from there + $limit characters would currently land us around
			// right after the first highlight, but we'll try to reposition
			// that highlight just about in the middle for maximum context
			$postTruncateLength = mb_strlen( $dom->textContent );
			if (
				$postTruncateLength === $preTruncateLength &&
				$postTruncateLength > $limit
			) {
				$highlightLength = mb_strlen( $highlight->textContent );
				$evenlySplitEdgeLength = (int)( ( $limit - $highlightLength ) / 2 );
				$rightEdgeAvailableLength = $postTruncateLength - $limit;
				$leftEdgeCutLength = min( $evenlySplitEdgeLength, $rightEdgeAvailableLength );
				$this->truncateWords( $dom, $limit - $leftEdgeCutLength, true, $highlight );
			}
		}
		// Now, from the left, truncate on the right, before $limit characters
		$this->truncateWords( $dom, $limit - 1 );

		return DOMUtils::getFragmentInnerHTML( $dom );
	}

	private function truncateSentence( Node $snippet, bool $reverse = false ) {
		$start = false;

		// @phan-suppress-next-line PhanUndeclaredProperty
		if ( ctype_upper( mb_substr( $snippet->textContent, 0, 1 ) ) ) {
			// Hard to confirm without knowing exactly where the provided snippet
			// has been cut off... but if the very first character is an uppercase,
			// we'll assume this is the start of a sentence already!
			return;
		}

		// First find the sentence end, and manipulate it in-place
		$walker = new DOMWalker( $snippet );
		$begin = $walker->walk(
			leaf: static function ( Node $node ) use ( $reverse ) {
				$regex = $reverse ? '/(?<=[.!?。！？])\s+.+?$/u' : '/^.+?[.!?。！？]\s+/u';
				// @phan-suppress-next-line PhanUndeclaredProperty
				$node->textContent = preg_replace( $regex, '', $node->textContent, -1, $count );
				if ( $count ) {
					return $node;
				}
			},
			reverse: $reverse,
		);

		// ... then iterate from the other direction until we encounter it again.
		// We're coming at if from the other direction now, so that we know what
		// is safe to remove. We can't just start pruning nodes until we encounted
		// our target, because one of those pruned nodes might just be its parent...
		$walker->walk(
			leaf: static function ( Node $node ) use ( &$begin, &$start ) {
				// @phan-suppress-next-line PhanUndeclaredMethod
				if ( $begin && $node->isSameNode( $begin ) ) {
					$start = true;
				} elseif ( $start ) {
					// @phan-suppress-next-line PhanUndeclaredProperty
					$node->parentNode->removeChild( $node );
				}
			},
			descend: static function ( Node $node ) use ( &$start ) {
				if ( $start ) {
					// @phan-suppress-next-line PhanUndeclaredProperty
					$node->parentNode->removeChild( $node );
				}
			},
			reverse: !$reverse,
		);
	}

	private function truncateWords(
		Node $snippet,
		int $limit,
		bool $reverse = false,
		?Node $begin = null,
	) {
		// If no start node is set, start straight away!
		$start = !$begin;
		$done = false;
		$length = 0;

		$walker = new DOMWalker( $snippet );
		$walker->walk(
			leaf: static function ( Node $node ) use ( $reverse, $limit, &$start, &$length, &$done ) {
				if ( $done ) {
					// When done, all following nodes can be removed
					// @phan-suppress-next-line PhanUndeclaredProperty
					$node->parentNode->removeChild( $node );
					return;
				}

				if ( !$start ) {
					return;
				}

				do {
					// @phan-suppress-next-line PhanUndeclaredProperty
					$nodeLength = mb_strlen( $node->textContent );
					// @phan-suppress-next-line PhanUndeclaredProperty
					if ( $node->textContent === '…' || $length + $nodeLength <= $limit ) {
						$length += $nodeLength;
						break;
					}

					// Gobble the first/last word, depending on truncation direction
					$regex = $reverse ? '/^\W*\w+\W*/u' : '/\W*\w+\W*$/u';
					// @phan-suppress-next-line PhanUndeclaredProperty
					$node->textContent = preg_replace( $regex, '…', $node->textContent );
					$done = true;
				} while ( $length < $limit );
			},
			descend: static function ( Node $node ) use ( $begin, &$start, &$done )  {
				// @phan-suppress-next-line PhanUndeclaredMethod
				if ( $begin && $node->isSameNode( $begin ) ) {
					$start = true;
				} elseif ( $done ) {
					// When done, all following nodes can be removed
					// @phan-suppress-next-line PhanUndeclaredProperty
					$node->parentNode->removeChild( $node );
				}
			},
			reverse: $reverse,
		);
	}
}
