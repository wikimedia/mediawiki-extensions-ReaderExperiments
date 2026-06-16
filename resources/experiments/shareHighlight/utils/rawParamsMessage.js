/**
 * Provides a quick shim for mw.Message with added support for
 * raw params (i.e. parameters that are *not* parsed according
 * to the requested format, but only inserted post-transform.
 * This is similar to the PHP implementation, and very
 * convenient for instances where we are dealing with safe
 * parameters (that we don't want to be escaped) but
 * potentially unsafe message content (which we do want to
 * escape)
 *
 * @param {string} key
 * @param {...string} parameters
 * @return {mw.Message}
 */
module.exports = function rawParamsMessage( key, ...parameters ) {
	// eslint-disable-next-line mediawiki/msg-doc
	const msg = mw.message( key, ...parameters );
	const rawParameters = parameters.map( ( value, index ) => '$' + ( index + 1 ) );

	/**
	 * @param {'escaped' | 'parse' | 'plain' | 'text'} [format]
	 * @return {string}
	 */
	const toString = ( format = 'text' ) => mw.format( msg.toString( format ), ...rawParameters );

	return {
		/**
		 * @param {Array<string>} params
		 */
		params: ( params ) => {
			msg.params( params );
			rawParameters.push( ...params.map( ( v, i ) => '$' + ( rawParameters.length + i + 1 ) ) );
		},
		/**
		 * @param {Array<string>} params
		 */
		rawParams: ( params ) => {
			msg.params( params.map( ( v, i ) => '$' + ( rawParameters.length + i + 1 ) ) );
			rawParameters.push( ...params );
		},
		toString,
		parse: () => toString( 'parse' ),
		parseDom: () => $( document.createTextNode( toString( 'text' ) ) ),
		plain: () => toString( 'plain' ),
		text: () => toString( 'text' ),
		escaped: () => toString( 'escaped' ),
		exists: () => msg.exists(),
		isParseable: () => msg.isParseable()
	};
};
