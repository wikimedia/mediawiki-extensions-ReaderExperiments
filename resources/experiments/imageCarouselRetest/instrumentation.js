// TODO(image-carousel-retest): Remove this experiment-only file after the retest.
// See README.md for the coordinated cleanup across ReaderExperiments and MMV.
const groups = require( './groups.js' );
const isEligible = require( './eligibility.js' );
const events = require( './events.js' );

let experimentPromise;
let readyPromise;
let readyAssignment;

/**
 * Subscribe once readiness starts, before asynchronous telemetry loading.
 * MediaWiki hooks replay their last value on add; ignore that historical action.
 */
function connectMmvActions() {
	let listening = false;
	mw.hook( 'mmv.carousel.action' ).add( ( name ) => {
		if ( listening ) {
			recordInteraction( name ).catch( () => {
				mw.log.warn( '[Image Carousel Retest] Could not record carousel interaction.' );
			} );
		}
	} );
	listening = true;
}

/**
 * Load Test Kitchen and resolve the experiment once per page.
 *
 * @return {Promise<Object|null>} Experiment, or null when unavailable
 */
function initialize() {
	if ( !experimentPromise ) {
		experimentPromise = Promise.resolve()
			.then( () => mw.loader.using( 'ext.testKitchen' ) )
			.then( () => mw.testKitchen.getExperiment( 'image-carousel-retest' ) )
			.catch( () => {
				mw.log.warn( '[Image Carousel Retest] Test Kitchen unavailable: skipping instrumentation.' );
				return null;
			} );
	}
	return experimentPromise;
}

/**
 * Resolve the assigned group and its UI options for the carousel entry point.
 * Initializes the connection if necessary; does not record exposure or render UI.
 *
 * @return {Promise<Object|null>} Group and options, or null if not assigned a known group
 */
async function getAssignment() {
	const experiment = await initialize();
	if ( !experiment ) {
		return null;
	}
	const group = experiment.getAssignedGroup();
	if ( !Object.prototype.hasOwnProperty.call( groups, group ) ) {
		return null;
	}
	return Object.freeze( Object.assign( { group }, groups[ group ] ) );
}

/**
 * Prepare the same eligibility decision for control and treatments.
 * Call experienceReady only after applying the returned assignment to the UI.
 * For control, applying the assignment means leaving the carousel absent.
 *
 * @param {Object} context Page and reader facts for the shared eligibility check
 * @param {Object} [rules] Provisional eligibility settings
 * @return {Promise<Object>} Assignment, eligibility, and readiness callback
 */
async function prepareExperience( context, rules ) {
	const eligiblePage = isEligible( context, rules );
	const assignment = eligiblePage ? await getAssignment() : null;
	const eligible = eligiblePage && assignment !== null;

	return Object.freeze( {
		assignment,
		eligible,
		experienceReady() {
			if ( !eligible ) {
				return Promise.resolve( false );
			}
			if ( !readyPromise ) {
				readyPromise = Promise.resolve()
					.then( () => mw.loader.using( 'ext.wikimediaEvents.testKitchen' ) )
					.then( ( require ) => {
						const { anyPageVisit } = require( 'ext.wikimediaEvents.testKitchen' );
						return initialize().then( ( experiment ) => {
							if ( !experiment ||
								experiment.getAssignedGroup() !== assignment.group ) {
								return false;
							}
							experiment.sendExposure();
							experiment.use( anyPageVisit() );
							readyAssignment = assignment;
							return true;
						} );
					} )
					.catch( () => {
						mw.log.warn( '[Image Carousel Retest] Could not record experience readiness.' );
						return false;
					} );
				connectMmvActions();
			}
			return readyPromise;
		}
	} );
}

/**
 * Record a named, accepted interaction after the experience is ready.
 *
 * @param {string} name Key in the provisional event map
 * @return {Promise<void>}
 */
async function recordInteraction( name ) {
	// Do not queue interactions that occurred before the readiness callback.
	if ( !readyPromise ) {
		return;
	}
	await readyPromise;
	if ( !readyAssignment || !readyAssignment.showCarousel ||
		!Object.prototype.hasOwnProperty.call( events, name ) ||
		( name === 'scrollToImage' && !readyAssignment.showJumpLink ) ) {
		return;
	}
	const experiment = await experimentPromise;
	experiment.send( 'click', events[ name ] );
}

module.exports = { initialize, getAssignment, prepareExperience, recordInteraction };
