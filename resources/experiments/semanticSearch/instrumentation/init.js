'use strict';

const { anyPageVisit } = require( 'ext.wikimediaEvents.testKitchen' );
const levenshtein = require( './levenshtein.js' );
const digest = require( './digest.js' );
const semanticSearchRequestInspector = require( './semanticSearchRequestInspector.js' );
const { experimentName, minQueryWords } = require( './config.json' );

const SESSION_KEY_LAST_TERM = 'readerExperiments.semanticSearch/term';
const SESSION_KEY_ABANDON_EXPIRATION = 'readerExperiments.semanticSearch/abandon';

// @see 'CirrusSearchMaxFullTextQueryLength' in CirrusSearch/extension.json
const MAX_FULLTEXT_QUERY_LENGTH = 300;

/**
 * Returns a unique identifier per "search", so we can aggregate per search
 * (as is needed for click-through rate, where we want all clicks per distinct
 * search)
 * Since action_context is limited in size (320 chars), and an absurdly long
 * term might end up being too much we'll generate a shorter hash + user
 * session id.
 *
 * @param {string} term
 * @return {Promise<string>}
 */
async function uniqueSearchId( term ) {
	return await digest( term, 'SHA-1' ) + mw.user.sessionId();
}

/**
 * Replicate the criteria for what we consider "semantic searches", so we can
 * track those explicitly, regardless of where they happen
 * (Special:SemanticSearch either with or without actual semantic results, or
 * even Special:Search)
 *
 * @param {string} term
 * @return {boolean}
 */
function meetsQualification( term ) {
	if ( term === '' ) {
		return false;
	}

	if (
		semanticSearchRequestInspector.wordCount( term ) < minQueryWords &&
		!semanticSearchRequestInspector.hasQuestionWord( term )
	) {
		return false;
	}

	if ( semanticSearchRequestInspector.hasNonMainNamespace( term ) ) {
		return false;
	}

	if ( semanticSearchRequestInspector.hasAdvancedSyntax( term ) ) {
		return false;
	}

	return true;
}

/**
 * @param {mw.testKitchen.ExperimentInterface} experiment
 * @param {string} term
 * @return {Promise<void>}
 */
async function handleSearch( experiment, term ) {
	if ( term && term === mw.storage.session.get( SESSION_KEY_LAST_TERM ) ) {
		// Not a new search; likely a continuation of the previous search through browser
		// history or refresh
		return;
	}

	experiment.submitInteraction(
		'search',
		{
			// eslint-disable-next-line camelcase
			action_source: mw.config.get( 'wgCanonicalSpecialPageName' ).toLowerCase(),
			// semantic-eligible query, or lexical
			// eslint-disable-next-line camelcase
			action_subtype: meetsQualification( term ) ? 'semantic' : 'lexical'
		}
	);

	if ( mw.config.get( 'wgCanonicalSpecialPageName' ) !== 'SemanticSearch' ) {
		// While we are interested in also tracking searches, even on Special:Search,
		// as "exposure" (because users don't know ahead of time where they'll end up,
		// i.e. even a Special:Search visit could be a success because they were
		// anticipating being sent to Special:SemanticSearch again after having seen
		// it previously), we are not interested in further tracking interactions there.
		return;
	}

	// Handle a potentially abandoned earlier search
	await handleAbandonedSearch( experiment, term );

	// Keep track of search and the time it was performed at (for continuation detection &
	// abandonment tracking)
	mw.storage.session.set( SESSION_KEY_LAST_TERM, term );
	mw.storage.session.set( SESSION_KEY_ABANDON_EXPIRATION, Date.now() + ( 60 * 1000 ) );
}

async function handleClick( experiment, term, type, index ) {
	if ( mw.config.get( 'wgCanonicalSpecialPageName' ) !== 'SemanticSearch' ) {
		return;
	}

	// Since a result was clicked, this is no longer an abandoned search
	mw.storage.session.remove( SESSION_KEY_ABANDON_EXPIRATION );

	experiment.submitInteraction(
		'click',
		{
			// eslint-disable-next-line camelcase
			action_source: index < 3 ? 'top_3' : 'below_top_3',
			// eslint-disable-next-line camelcase
			action_context: await uniqueSearchId( term )
		}
	);
}

async function handleLeave( experiment ) {
	if ( mw.config.get( 'wgCanonicalSpecialPageName' ) !== 'SemanticSearch' ) {
		return;
	}

	experiment.submitInteraction( 'leave' );
}

async function handleParticipate( experiment, answer ) {
	if ( mw.config.get( 'wgCanonicalSpecialPageName' ) !== 'SemanticSearch' ) {
		return;
	}

	experiment.submitInteraction(
		'participate',
		{
			// eslint-disable-next-line camelcase
			action_subtype: answer
		}
	);
}

/**
 * @see https://docs.google.com/document/d/1X8lzOmzJljnBlQXR2lOQ8vdV0ywYb4YMEd36Ew13zxE/edit?tab=t.0
 *
 * @param {mw.testKitchen.ExperimentInterface} experiment
 * @param {string} term
 * @return {Promise<void>}
 */
async function handleAbandonedSearch( experiment, term ) {
	const lastSearchExpiration = mw.storage.session.get( SESSION_KEY_ABANDON_EXPIRATION );
	if ( !lastSearchExpiration ) {
		// No abandoned search; nothing to track
		return;
	}

	const expired = lastSearchExpiration <= Date.now();

	// Check whether new query is a reformulation of the previous one, indicating that they
	// aren't simply searching for a new thing, but are tinkering with their existing search
	// because they were not satisfied with the previous results
	const previousTerm = mw.storage.session.get( SESSION_KEY_LAST_TERM );
	const reformulation = previousTerm && levenshtein.distanceNormalized(
		term.toLowerCase(),
		previousTerm.toLowerCase(),
		MAX_FULLTEXT_QUERY_LENGTH
	) <= 0.5;

	// Search expired without having been refined or interacted with: log as "good abandoned"
	mw.storage.session.remove( SESSION_KEY_ABANDON_EXPIRATION );
	experiment.submitInteraction(
		'abandon',
		{
			// eslint-disable-next-line camelcase
			action_subtype: expired && !reformulation ? 'good' : 'bad',
			// eslint-disable-next-line camelcase
			action_context: await uniqueSearchId( mw.storage.session.get( SESSION_KEY_LAST_TERM ) )
		}
	);
}

mw.testKitchen.getExperiment( experimentName ).then( ( experiment ) => {
	if ( experiment.getAssignedGroup() === null ) {
		return;
	}

	experiment.use( anyPageVisit() );

	mw.hook( 'readerExperiments.semanticSearch.search' ).add( handleSearch.bind( null, experiment ) );
	mw.hook( 'readerExperiments.semanticSearch.click' ).add( handleClick.bind( null, experiment ) );
	mw.hook( 'readerExperiments.semanticSearch.leave' ).add( handleLeave.bind( null, experiment ) );
	mw.hook( 'readerExperiments.semanticSearch.participate' ).add( handleParticipate.bind( null, experiment ) );

	// We'll also want to track searches on Special:Search, but not until a user has
	// actually been exposed to Special:SemanticSearch
	if (
		mw.config.get( 'wgReaderExperimentsSemanticSearchExposed' ) &&
		mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Search'
	) {
		// Special:SemanticSearch fires events when users interact with it, but
		// Special:Search does not. We'll wire it up in a similar way.
		const params = new URLSearchParams( window.location.search );
		const term = params.get( 'search' );
		if ( term ) {
			mw.hook( 'readerExperiments.semanticSearch.search' ).fire( term );
		}
	}
} );
