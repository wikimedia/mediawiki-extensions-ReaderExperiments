<template>
	<cdx-toast
		standalone
		:auto-dismiss="false"
		:action-button-label="$i18n( 'readerexperiments-preferredsources-cta-action' ).text()"
		@action-button-click="$emit( 'cta-click' )"
		@user-dismissed="$emit( 'cta-dismiss' )"
	>
		{{ $i18n( 'readerexperiments-preferredsources-cta-message' ).text() }}
	</cdx-toast>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { CdxToast } = require( '@wikimedia/codex' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'PreferredSourcesCta',
	components: { CdxToast },
	emits: [
		'cta-click',
		'cta-dismiss'
	]
} );
</script>
