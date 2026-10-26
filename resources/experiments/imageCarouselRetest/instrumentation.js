// TODO(image-carousel-retest-v2): Remove this experiment-only file after the retest.
// See README.md for the coordinated cleanup across ReaderExperiments and MMV.
const groups = require( './groups.js' );
const isEligible = require( './eligibility.js' );
const events = require( './events.js' );

const experimentPromise = mw.testKitchen.getExperiment( 'image-carousel-retest-v2' );
let readyPromise;
let readyAssignment;
let initializationRecorded = false;

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
 * Resolve the assigned group and its UI options for the carousel entry point.
 * Does not record exposure or render UI.
 *
 * @return {Promise<Object|null>} Group and options, or null if not assigned a known group
 */
async function getAssignment() {
	const experiment = await experimentPromise;
	const group = experiment.getAssignedGroup();
	if ( !Object.prototype.hasOwnProperty.call( groups, group ) ) {
		return null;
	}
	return Object.freeze( Object.assign( { group }, groups[ group ] ) );
}

/**
 * Prepare the same eligibility decision for control and treatments.
 * Call experienceReady after confirming the server/client assignments agree,
 * before carousel initialization. The server has already varied the page output:
 * treatments receive carousel markup, while control does not.
 *
 * @param {Object} context Page and reader facts for the shared eligibility check
 * @param {Object} [rules] Provisional eligibility settings
 * @return {Promise<Object>} Assignment, eligibility, and tracking callbacks
 */
async function prepareExperience( context, rules ) {
	const eligiblePage = isEligible( context, rules );
	const assignment = eligiblePage ? await getAssignment() : null;
	const eligible = eligiblePage && assignment !== null;

	return Object.freeze( {
		assignment,
		eligible,
		// Called after carousel initialization succeeds.
		async carouselInitialized() {
			if ( !eligible || !assignment.showCarousel || initializationRecorded ) {
				return;
			}
			const experiment = await experimentPromise;
			if ( initializationRecorded ) {
				return;
			}
			initializationRecorded = true;
			experiment.send( 'carousel_initialize', {
				// eslint-disable-next-line camelcase
				action_subtype: 'success', action_source: 'image_carousel'
			}, [ 'performer_session_id', 'performer_pageview_id' ] );
		},
		experienceReady() {
			if ( !eligible ) {
				return Promise.resolve( false );
			}
			if ( !readyPromise ) {
				readyPromise = Promise.resolve()
					.then( () => mw.loader.using( 'ext.wikimediaEvents.testKitchen' ) )
					.then( ( require ) => {
						const { anyPageVisit } = require( 'ext.wikimediaEvents.testKitchen' );
						return experimentPromise.then( ( experiment ) => {
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

module.exports = { getAssignment, prepareExperience, recordInteraction };
