'use strict';

const { searchKeywords, searchNamespaces, questionWords } = require( './config.json' );

/**
 * @param {string} term
 * @return {number}
 */
function wordCount( term ) {
	return term.split( /\W+/ ).filter( ( word ) => word ).length;
}

/**
 * @param {string} term
 * @return {boolean}
 */
function hasQuestionWord( term ) {
	const pattern = '\\b(' + questionWords.join( '|' ) + ')\\b';
	return new RegExp( pattern, 'i' ).test( term );
}

/**
 * @param {string} term
 * @param {string[]} [keywords] Defaults to search engine keyword prefixes
 * @return {boolean}
 */
function hasAdvancedSyntax( term, keywords ) {
	keywords = keywords || searchKeywords;

	const escape = ( text ) => text.replace( /[-[\]/{}()*+?.\\^$|]/g, '\\$&' );
	const escapedKeywords = keywords.map( escape );
	const pattern =
		// Keywords
		'(?<=^|\\s)[-!]?(' + escapedKeywords.join( '|' ) + '):\\S+' +
		// Wildcard, boosting, fuzzy / proximity
		'|[*^~]' +
		// Boolean operators
		'|(?<=^|\\s)(?:AND|OR|NOT)(?=$|\\s)';

	return new RegExp( pattern ).test( term );
}

/**
 * @param {string} term
 * @return {boolean}
 */
function hasNonMainNamespace( term ) {
	if ( !term.includes( ':' ) ) {
		return false;
	}

	const prefix = term.match( /^[^:]+/ )[ 0 ].trim().replace( / /g, '_' );
	for ( let i = 0; i < searchNamespaces.length; i++ ) {
		if ( prefix.toLowerCase() === searchNamespaces[ i ].toLowerCase() ) {
			return true;
		}
	}

	return false;
}

module.exports = {
	wordCount,
	hasQuestionWord,
	hasAdvancedSyntax,
	hasNonMainNamespace
};
