// Adds and dismisses a one-time pulsating dot for the share toolbelt button.

const TOOLBAR_SHARE_BUTTON_SELECTOR = '#ca-re-share';
/**
 * CSS classes applied by this module:
 * - `ext-readerExperiments-shareHighlight-toolbeltDot`
 * - `ext-readerExperiments-shareHighlight-toolbeltDotHost`
 */
const TOOLBAR_BLUE_DOT_STORAGE_KEY = 'mw.readerExperiments.shareHighlight.toolbarBlueDotSeen';
const TOOLBAR_BLUE_DOT_CLASS = 'ext-readerExperiments-shareHighlight-toolbeltDot';
const TOOLBAR_BLUE_DOT_HOST_CLASS = 'ext-readerExperiments-shareHighlight-toolbeltDotHost';

function hasSeenToolbarBlueDot() {
	return !!mw.storage.get( TOOLBAR_BLUE_DOT_STORAGE_KEY );
}

function markToolbarBlueDotSeen() {
	mw.storage.set( TOOLBAR_BLUE_DOT_STORAGE_KEY, '1' );
}

function removeToolbarBlueDot() {
	const blueDot = document.querySelector( '.' + TOOLBAR_BLUE_DOT_CLASS );

	if ( blueDot ) {
		blueDot.remove();
	}
}

function maybeShowToolbarBlueDot( buttonElement ) {
	const toolbarShareButtonItem = buttonElement.parentElement;

	if (
		!toolbarShareButtonItem ||
		hasSeenToolbarBlueDot() ||
		document.querySelector( '.' + TOOLBAR_BLUE_DOT_CLASS )
	) {
		return;
	}

	const blueDot = document.createElement( 'div' );

	// eslint-disable-next-line mediawiki/class-doc
	toolbarShareButtonItem.classList.add( TOOLBAR_BLUE_DOT_HOST_CLASS );
	// eslint-disable-next-line mediawiki/class-doc
	blueDot.className = 'mw-pulsating-dot ' + TOOLBAR_BLUE_DOT_CLASS;
	blueDot.setAttribute( 'role', 'img' );
	blueDot.setAttribute(
		'aria-label',
		mw.msg( 'readerexperiments-sharehighlight-blue-dot-label' )
	);

	toolbarShareButtonItem.appendChild( blueDot );
}

function setupToolbarBlueDot( buttonElement ) {
	maybeShowToolbarBlueDot( buttonElement );
}

function dismissToolbarBlueDot() {
	removeToolbarBlueDot();
	markToolbarBlueDotSeen();
}

const toolbarShareButton = document.querySelector( TOOLBAR_SHARE_BUTTON_SELECTOR );
if ( toolbarShareButton ) {
	setupToolbarBlueDot( toolbarShareButton );
	toolbarShareButton.addEventListener( 'click', dismissToolbarBlueDot );
}
