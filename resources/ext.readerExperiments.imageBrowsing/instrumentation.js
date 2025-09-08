// Naming convention: mediawiki.product_metrics.<product>_<component>_<interaction>.
// See https://wikitech.wikimedia.org/wiki/Experimentation_Lab/Stream_configuration#Choosing_a_stream_name
const EVENT_STREAM = 'mediawiki.product_metrics.readerexperiments_imagebrowsing';
const SCHEMA = '/analytics/product_metrics/web/base/1.4.3';

function submitInteraction( action, interactionData ) {
	mw.eventLog.submitInteraction( EVENT_STREAM, SCHEMA, action, interactionData );
}

module.exports = { submitInteraction };
