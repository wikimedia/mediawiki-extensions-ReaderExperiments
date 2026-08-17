const CONFIG_KEY = 'wgReaderExperimentsMinimalMinervaToolbar';
const GROUP_TREATMENT = 'treatment';
const SOURCE_CONTROL = 'toolbar';
const SOURCE_OVERFLOW = 'overflow_menu';
const SOURCE_TREATMENT = 'minmin_toolbar';
const INIT_STATE_KEY = '__readerExperimentsMinimalMinervaToolbarInstrumentation';

function isTreatmentActive() {
	const config = mw.config.get( CONFIG_KEY ) || {};
	return config.group === GROUP_TREATMENT &&
		document.body.classList.contains( 'minerva--minimal' );
}

function getExperiment() {
	const config = mw.config.get( CONFIG_KEY ) || {};

	if ( !config.experimentName || !mw.loader || !mw.loader.using ) {
		return Promise.resolve( null );
	}

	return mw.loader.using( 'ext.testKitchen' )
		.then( () => mw.testKitchen.getExperiment( config.experimentName ) )
		.catch( () => (
			// eslint-disable-next-line no-console
			console.info(
				'[Minimal Minerva Toolbar] TestKitchen not available: skipping instrumentation.'
			)
		) );
}

function isLanguageElement( element, treatmentActive ) {
	if ( !element ) {
		return false;
	}

	if ( treatmentActive ) {
		return !!element.closest(
			'.minerva__page-tags-container .language-selector, .minerva__page-tags-container a[href="#p-lang"]'
		);
	}

	return !!element.closest(
		'#page-actions-language-selector a, .page-actions-menu .language-selector'
	);
}

function isCommentsElement( element, treatmentActive ) {
	if ( !element ) {
		return false;
	}

	if ( treatmentActive ) {
		return !!element.closest( '.minerva__page-tags-container a:not([href="#p-lang"])' );
	}

	return !!element.closest( '.minerva__tab-container .minerva__tab:not(.selected) a' );
}

function getActionSubtype( element ) {
	if ( !element ) {
		return null;
	}

	if (
		element.closest(
			'#page-actions-edit a, #page-actions-ve-edit a, #page-actions-viewsource a'
		)
	) {
		return 'edit';
	}

	if (
		element.closest(
			'#page-actions-watch a, #page-actions-unwatch a'
		)
	) {
		return 'watch';
	}

	return null;
}

function getDownloadActionData( element ) {
	if (
		!element ||
		!element.closest( '#minerva-download a, a#minerva-download' )
	) {
		return null;
	}

	return {
		subtype: 'download',
		source: element.closest( '.page-actions-overflow-list, #page-actions-overflow' ) ?
			SOURCE_OVERFLOW :
			SOURCE_CONTROL
	};
}

function getActionData( element, treatmentActive ) {
	if ( !element ) {
		return null;
	}

	if ( isLanguageElement( element, treatmentActive ) ) {
		return {
			subtype: 'language',
			source: treatmentActive ? SOURCE_TREATMENT : SOURCE_CONTROL
		};
	}

	if ( isCommentsElement( element, treatmentActive ) ) {
		return {
			subtype: 'comments',
			source: treatmentActive ? SOURCE_TREATMENT : 'page_tab'
		};
	}

	const downloadAction = getDownloadActionData( element );
	if ( downloadAction ) {
		return downloadAction;
	}

	const subtype = getActionSubtype( element );
	if ( !subtype ) {
		return null;
	}

	return {
		subtype,
		source: treatmentActive ? SOURCE_TREATMENT : SOURCE_CONTROL
	};
}

function installClickTracking( submit ) {
	const clickHandler = ( event ) => {
		const action = getActionData( event.target, isTreatmentActive() );
		if ( !action ) {
			return;
		}

		submit( action.subtype, action.source );
	};

	document.addEventListener( 'click', clickHandler );
	return clickHandler;
}

function initInstrumentation() {
	if ( !document || !document.addEventListener ) {
		return;
	}

	const previousState = document[ INIT_STATE_KEY ];
	if ( previousState && previousState.clickHandler ) {
		document.removeEventListener( 'click', previousState.clickHandler );
	}
	if ( previousState && previousState.postEditHandler ) {
		mw.hook( 'postEdit' ).remove( previousState.postEditHandler );
	}
	if ( previousState && previousState.editAttemptStepHandler ) {
		mw.trackUnsubscribe( previousState.editAttemptStepHandler );
	}

	let sendClick = () => {};
	const pendingClicks = [];
	const clickHandler = installClickTracking( ( subtype, source ) => {
		pendingClicks.push( { subtype, source } );
		sendClick( subtype, source );
	} );

	// postEdit does not fire for null edits, and wgRevisionId is set to the new
	// revision before it fires: https://gerrit.wikimedia.org/g/mediawiki/core/+/master/resources/src/mediawiki.action/mediawiki.action.view.postEdit.js
	let sendEditSaved = () => {};
	const postEditHandler = () => sendEditSaved();
	mw.hook( 'postEdit' ).add( postEditHandler );

	// editAttemptStep is VisualEditor's own instrumentation (Schema:EditAttemptStep,
	// also consumed by WikimediaEvents). Its 'init' action fires once the editor has
	// activated, which is a later and more meaningful step than the edit button 'click'.
	let sendEditAttemptInit = () => {};
	const editAttemptStepHandler = ( topic, data ) => {
		if ( data && data.action === 'init' ) {
			sendEditAttemptInit();
		}
	};
	mw.trackSubscribe( 'editAttemptStep', editAttemptStepHandler );

	document[ INIT_STATE_KEY ] = { clickHandler, postEditHandler, editAttemptStepHandler };

	getExperiment().then( ( experiment ) => {
		if ( !experiment ) {
			return;
		}

		experiment.sendExposure();
		experiment.send( 'page_visit' );

		sendClick = ( subtype, source ) => {
			const data = {};
			// eslint-disable-next-line camelcase
			data.action_source = source;
			// eslint-disable-next-line camelcase
			data.action_subtype = subtype;
			experiment.send( 'click', data );
		};

		sendEditSaved = () => {
			experiment.send( 'edit_saved', {}, [ 'page_revision_id' ] );
		};

		sendEditAttemptInit = () => {
			experiment.send( 'edit_attempt_init' );
		};

		pendingClicks.splice( 0 ).forEach( ( click ) => {
			sendClick( click.subtype, click.source );
		} );
	} );
}

initInstrumentation();

// Export for tests
module.exports = {
	getActionData,
	isTreatmentActive
};
