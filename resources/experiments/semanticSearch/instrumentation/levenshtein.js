'use strict';

const levenshtein = require( 'ext.readerExperiments/lib/fastest-levenshtein' );

/**
 * @param {string} a
 * @param {string} b
 * @param {number} [maxLength]
 * @return {number}
 */
function distance( a, b, maxLength ) {
	// Defense against potentially-too-long inputs to prevent CPU hanging
	if ( !isNaN( maxLength ) ) {
		a = a.slice( 0, maxLength );
		b = b.slice( 0, maxLength );
	}

	return levenshtein.distance( a, b );
}

/**
 * @param {string} a
 * @param {string} b
 * @param {number} [maxLength]
 * @return {number}
 */
function distanceNormalized( a, b, maxLength ) {
	// Defense against potentially-too-long inputs to prevent CPU hanging
	if ( !isNaN( maxLength ) ) {
		a = a.slice( 0, maxLength );
		b = b.slice( 0, maxLength );
	}

	if ( a && b ) {
		return levenshtein.distance( a, b ) / Math.max( a.length, b.length );
	}
	return a === b ? 0 : 1;
}

module.exports = {
	distance,
	distanceNormalized
};
