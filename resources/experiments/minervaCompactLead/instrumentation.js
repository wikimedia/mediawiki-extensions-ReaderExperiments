/* eslint-disable camelcase */

// GrowthBook needs experiment-linked ticks. WikimediaEvents' sessionTick.js has no
// reusable API and sends ticks to a legacy stream without experiment identifiers.
// Past experiments used SessionLengthInstrumentMixin, deleted in gerrit:1306389.
// T413296 moved only failure reports to Test Kitchen, not the ticks themselves.
// This helper adapts the former mixin for experiment.send(); use() only attaches it.
// See sessionTracker.js for timing rules.
const sessionTracker = require( './sessionTracker.js' );

const CONFIG_KEY = 'wgReaderExperimentsMinervaCompactLead';
const LEAD_GROUPS = [ 'trunc-lead', 'trunc-lead-infobox' ];
let initialized = false;

/**
 * Identify the clicked button before it disappears or changes its expanded state.
 *
 * @param {Element} element Click target
 * @param {string} group Experiment assignment
 * @return {Object|null}
 */
function getActionData( element, group ) {
	if ( !( element instanceof Element ) ) {
		return null;
	}
	if ( LEAD_GROUPS.includes( group ) && element.closest( '.minerva--lead-section__button' ) ) {
		return {
			action_subtype: 'expand',
			action_source: 'lead_section',
			element_friendly_name: 'read_more_button'
		};
	}
	const heading = element.closest( '.mw-heading' );
	if (
		group === 'trunc-lead-infobox' &&
		heading && heading.querySelector( '#mf-quick-facts' ) &&
		!element.closest( 'a[href]' )
	) {
		// Parsoid puts aria-expanded on a button, but legacy puts it on the div.mw-heading.
		const toggle = heading.querySelector( '[aria-expanded]' ) || heading;
		const expanded = toggle.getAttribute( 'aria-expanded' );
		if ( expanded === 'true' || expanded === 'false' ) {
			return {
				action_subtype: expanded === 'true' ? 'collapse' : 'expand',
				action_source: 'quick_facts',
				element_friendly_name: 'quick_facts_toggle'
			};
		}
	}
	return null;
}

/**
 * Track the page visit, session ticks, clicks, and edit attempts after the page becomes visible.
 *
 * @param {Object} experiment Test Kitchen experiment
 * @param {string} group Experiment assignment
 * @return {Function} Remove pageview listeners
 */
function trackPageview( experiment, group ) {
	let exposed = false;

	function trackFirstVisibility() {
		if ( !exposed && document.visibilityState === 'visible' ) {
			exposed = true;
			experiment.sendExposure();
			experiment.send( 'page_visit' );
			experiment.use( sessionTracker( 'readerExperiments-minerva-compact-lead-session' ) );
			document.removeEventListener( 'visibilitychange', trackFirstVisibility );
		}
	}

	const clickHandler = ( event ) => {
		const data = getActionData( event.target, group );
		if ( exposed && data ) {
			experiment.send( 'click', data );
		}
	};
	// Ignore old edit events that MediaWiki sends so we don’t count an edit that started before the reader saw the experiment.
	let listeningForEdits = false;
	const editAttemptStepHandler = ( topic, data ) => {
		if ( exposed && listeningForEdits && data && data.action === 'init' ) {
			const interactionData = {};
			for ( const key of [ 'action_source', 'action_context' ] ) {
				if ( data[ key ] !== undefined ) {
					interactionData[ key ] = data[ key ];
				}
			}
			experiment.send( 'edit_attempt_init', interactionData );
		}
	};

	document.addEventListener( 'click', clickHandler, true );
	document.addEventListener( 'visibilitychange', trackFirstVisibility );
	mw.trackSubscribe( 'editAttemptStep', editAttemptStepHandler );
	listeningForEdits = true;
	trackFirstVisibility();

	return () => {
		document.removeEventListener( 'click', clickHandler, true );
		document.removeEventListener( 'visibilitychange', trackFirstVisibility );
		mw.trackUnsubscribe( editAttemptStepHandler );
	};
}

function initInstrumentation() {
	const config = mw.config.get( CONFIG_KEY );
	if ( initialized || !config ) {
		return;
	}
	initialized = true;

	mw.loader.using( 'ext.testKitchen' )
		.then( () => mw.testKitchen.getExperiment( config.experimentName ) )
		.then( ( experiment ) => {
			if ( !experiment || experiment.getAssignedGroup() !== config.group ) {
				return;
			}
			// The module depends on Minerva's scripts, which initialize the assigned
			// UI on document ready. Include control in exposure and pageview metrics.
			$( () => {
				const lead = document.querySelector(
					'#mw-content-text section[data-mw-section-id="0"], #mw-content-text #mf-section-0'
				);
				if ( lead && lead.textContent.trim() ) {
					trackPageview( experiment, config.group );
				}
			} );
		} )
		.catch( () => {
			// eslint-disable-next-line no-console
			console.info( '[Minerva Compact Lead] TestKitchen not available: skipping instrumentation.' );
		} );
}

initInstrumentation();

module.exports = { getActionData, trackPageview, initInstrumentation };
