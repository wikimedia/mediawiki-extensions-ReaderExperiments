// TODO(image-carousel-retest): Remove this experiment-only file after the retest.
// See README.md for the coordinated cleanup across ReaderExperiments and MMV.
// Machine-readable group IDs from the retest instrumentation spec.
// Keep control distinct from an unenrolled or unrecognized assignment.
const groups = require( './groups.json' );

for ( const group of Object.keys( groups ) ) {
	Object.freeze( groups[ group ] );
}

module.exports = Object.freeze( groups );
