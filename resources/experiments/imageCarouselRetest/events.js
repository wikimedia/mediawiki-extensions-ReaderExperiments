// TODO(image-carousel-retest): Remove this experiment-only file after the retest.
// See README.md for the coordinated cleanup across ReaderExperiments and MMV.
/* eslint-disable camelcase */
// Provisional payloads from the instrumentation spec.
const events = {
	thumbnailOpen: [ 'open', 'image_carousel', 'image_thumbnail' ],
	carouselHide: [ 'collapse', 'image_carousel', 'carousel_toggle' ],
	carouselShow: [ 'expand', 'image_carousel', 'carousel_toggle' ],
	viewDetails: [ 'navigate', 'image_detail_view', 'view_details_link' ],
	licenseInfo: [ 'open', 'image_detail_view', 'license_info' ],
	scrollToImage: [ 'navigate', 'image_detail_view', 'scroll_to_image_link' ]
};

for ( const name of Object.keys( events ) ) {
	const [ subtype, source, element ] = events[ name ];
	events[ name ] = Object.freeze( {
		action_subtype: subtype,
		action_source: source,
		element_friendly_name: element
	} );
}

module.exports = Object.freeze( events );
