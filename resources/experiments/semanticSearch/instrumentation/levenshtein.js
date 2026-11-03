'use strict';

// dependency explicitly unused pending security clearance
// const { distance } = require( 'ext.readerExperiments/lib/fastest-levenshtein' ); // @todo
const distance = () => 0;

/**
 * @param {string} a
 * @param {string} b
 * @return {number}
 */
function distanceNormalized( a, b ) {
	if ( a && b ) {
		return distance( a, b ) / Math.max( a.length, b.length );
	}
	return a === b ? 0 : 1;
}

module.exports = {
	distance,
	distanceNormalized
};
