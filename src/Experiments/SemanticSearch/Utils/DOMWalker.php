<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils;

use Wikimedia\Parsoid\DOM\Node;

class DOMWalker {
	public function __construct( protected readonly Node $node ) {
	}

	public function walk(
		?callable $leaf = null,
		?callable $descend = null,
		?callable $ascend = null,
		bool $reverse = false,
		?Node $node = null
	): mixed {
		$leaf ??= static fn ( $node ) => null;
		$descend ??= static fn ( $node ) => null;
		$ascend ??= static fn ( $node ) => null;
		$node ??= $this->node;

		// @phan-suppress-next-line PhanUndeclaredMethod
		if ( !$node->hasChildNodes() ) {
			$result = $leaf( $node );
			if ( $result !== null ) {
				return $result;
			}
		} else {
			// Execute callback method;
			// unless anything is returned, we'll continue walking
			$result = $descend( $node );
			if ( $result !== null ) {
				return $result;
			}

			// @phan-suppress-next-line PhanUndeclaredProperty
			$children = iterator_to_array( $node->childNodes );
			if ( $reverse ) {
				$children = array_reverse( $children );
			}

			foreach ( $children as $child ) {
				$result = $this->walk( $leaf, $descend, $ascend, $reverse, $child );
				if ( $result !== null ) {
					return $result;
				}
			}

			// Execute callback method;
			// unless anything is returned, we'll continue walking
			$result = $ascend( $node );
			if ( $result !== null ) {
				return $result;
			}
		}

		return null;
	}
}
