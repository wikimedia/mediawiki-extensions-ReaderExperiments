<template>
	<teleport to="body">
		<transition name="ext-readerExperiments-shareQuoteButton">
			<div
				v-if="visible"
				class="ext-readerExperiments-shareQuoteButton"
			>
				<cdx-button
					weight="primary"
					action="progressive"
					@click="$emit( 'share-request' )"
				>
					<cdx-icon :icon="cdxIconShare"></cdx-icon>
					{{ $i18n( 'readerexperiments-sharehighlight-share-quote' ).text() }}
				</cdx-button>
			</div>
		</transition>
	</teleport>
</template>

<script>
const { CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const icons = require( '../icons.json' );

// @vue/component
module.exports = exports = {
	name: 'ShareQuoteButton',
	components: {
		CdxButton,
		CdxIcon
	},
	props: {
		/**
		 * Whether the button should be visible.
		 */
		visible: {
			type: Boolean,
			default: false
		}
	},
	emits: [ 'share-request' ],
	setup: function () {
		return {
			cdxIconShare: icons.cdxIconShare
		};
	}
};
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ext-readerExperiments-shareQuoteButton {
	position: fixed;
	bottom: @spacing-150;
	left: 50%;
	transform: translateX( -50% );
	z-index: 1000;

	.cdx-button {
		box-shadow: @box-shadow-drop-medium;
		white-space: nowrap;
	}
}

// Transition animations
.ext-readerExperiments-shareQuoteButton-enter-active,
.ext-readerExperiments-shareQuoteButton-leave-active {
	transition-property: opacity, transform;
	transition-duration: @transition-duration-medium;
	transition-timing-function: @transition-timing-function-system;
}

.ext-readerExperiments-shareQuoteButton-enter-from,
.ext-readerExperiments-shareQuoteButton-leave-to {
	opacity: 0;
	transform: translateX( -50% ) translateY( 20px );
}
</style>
