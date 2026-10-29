'use strict';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
 * @param {string} text
 * @param {string} algorithm
 * @return {Promise<string>}
 */
module.exports = async function digest( text, algorithm ) {
	const msgUint8 = new TextEncoder().encode( text );
	const hashBuffer = await window.crypto.subtle.digest( algorithm, msgUint8 );
	if ( Uint8Array.prototype.toHex ) {
		return new Uint8Array( hashBuffer ).toHex();
	}
	const hashArray = Array.from( new Uint8Array( hashBuffer ) );
	return hashArray
		.map( ( b ) => b.toString( 16 ).padStart( 2, '0' ) )
		.join( '' );
};
