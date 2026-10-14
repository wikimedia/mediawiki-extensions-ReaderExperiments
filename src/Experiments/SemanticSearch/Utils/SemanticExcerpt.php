<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils;

/** Builds a short display excerpt without cutting the highlighted passage. */
class SemanticExcerpt {
	private const LIMIT = 250;

	/**
	 * Keep a single highlighted span intact. Unknown or multiple-highlight markup
	 * is left unchanged rather than risking the loss of a highlight.
	 * Counts decoded Unicode characters, not HTML bytes. Sentence boundaries are
	 * punctuation-based heuristics; abbreviations may be treated as sentence ends.
	 *
	 * @param string $html
	 * @return string
	 */
	public static function format( string $html ): string {
		if ( preg_match_all( '#<span class="searchmatch">(.*?)</span>#s', $html, $matches,
			PREG_OFFSET_CAPTURE ) !== 1
		) {
			return $html;
		}
		[ $span, $offset ] = $matches[0][0];
		$decode = static fn ( string $text ) => html_entity_decode(
			strip_tags( $text ), ENT_QUOTES | ENT_HTML5, 'UTF-8'
		);
		$before = $decode( substr( $html, 0, $offset ) );
		$highlight = $decode( $matches[1][0][0] );
		$after = $decode( substr( $html, $offset + strlen( $span ) ) );
		if ( mb_strlen( $before . $highlight . $after ) <= self::LIMIT || $highlight === '' ) {
			return $html;
		}

		// Reserve room for omission marks. The highlight can exceed this budget.
		$budget = max( 0, self::LIMIT - 2 - mb_strlen( $highlight ) );
		// Start at the sentence before the one containing the highlight, if it fits.
		$sentences = preg_split( '/(?<=[.!?。！？])\s+/u', $before, -1, PREG_SPLIT_OFFSET_CAPTURE );
		$start = count( $sentences ) > 1 ? $sentences[count( $sentences ) - 2][1] : 0;
		$prefix = substr( $before, $start );
		if ( mb_strlen( $prefix ) > $budget ) {
			// Share the available context with following text when the sentence is too long.
			$prefix = mb_substr( $before, -min( mb_strlen( $before ), intdiv( $budget, 2 ) ) );
			if ( intdiv( $budget, 2 ) === 0 ) {
				$prefix = '';
			} elseif ( mb_strlen( $prefix ) < mb_strlen( $before ) ) {
				$prefix = preg_replace( '/^\S+\s/u', '', $prefix );
			}
		}
		$remaining = $budget - mb_strlen( $prefix );
		$suffix = mb_substr( $after, 0, $remaining );
		if ( mb_strlen( $suffix ) < mb_strlen( $after ) &&
			preg_match( '/\S$/u', $suffix ) && preg_match( '/^\S/u', mb_substr( $after, $remaining ) )
		) {
			$suffix = preg_replace( '/\s\S*$/u', '', $suffix );
		}
		$leading = mb_strlen( $prefix ) < mb_strlen( $before ) ? '…' : '';
		$trailing = mb_strlen( $suffix ) < mb_strlen( $after ) ? '…' : '';
		$escape = static fn ( string $text ) => htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
		return $leading . $escape( ltrim( $prefix ) ) . '<span class="searchmatch">' .
			$escape( $highlight ) . '</span>' . $escape( rtrim( $suffix ) ) . $trailing;
	}
}
