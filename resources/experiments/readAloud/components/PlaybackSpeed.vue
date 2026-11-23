<template>
	<cdx-toggle-button
		ref="speedRateButton"
		v-model="showSpeedPopover"
		class="ext-readerExperiments-readAloud__playback-speed__button"
		quiet
		@update:model-value="onUpdate"
	>
		{{ formatSpeed( selectedPlaybackSpeed ) }}
	</cdx-toggle-button>

	<cdx-popover
		ref="speedPopover"
		v-model:open="showSpeedPopover"
		class="ext-readerExperiments-readAloud__playback-speed__popover"
		:anchor="speedRateButton"
		placement="top"
		:use-close-button="true"
	>
		<template #default>
			<cdx-menu
				:id="menuId"
				ref="speedRateMenu"
				v-model:selected="selectedPlaybackSpeed"
				v-model:expanded="showSpeedPopover"
				class="ext-readerExperiments-readAloud__playback-speed__menu"
				:aria-expanded="expanded"
				:menu-items="menuItems"
				:render-in-place="true"
				@update:selected="( selected ) => ( $emit( 'select', parseFloat( selected ) ) )"
			></cdx-menu>
		</template>
	</cdx-popover>
</template>

<script>
const { defineComponent, useTemplateRef, ref, useId, inject } = require( 'vue' );
const { CdxPopover, CdxToggleButton, CdxMenu } = require( '@wikimedia/codex' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'PlaybackSpeed',
	components: { CdxPopover, CdxToggleButton, CdxMenu },
	emits: [ 'select' ],
	setup() {
		const speedRateButton = useTemplateRef( 'speedRateButton' );
		const speedPopover = useTemplateRef( 'speedPopover' );
		const showSpeedPopover = ref( false );
		const speedRateMenu = useTemplateRef( 'speedRateMenu' );
		const selectedPlaybackSpeed = ref( '1' );
		const expanded = ref( false );
		const menuId = useId();
		const $i18n = inject( 'i18n' );

		/**
		 * Format a playback speed rate for display in the user's language.
		 *
		 * @param {string} rate Playback speed rate, e.g. '1.25'
		 * @return {string}
		 */
		function formatSpeed( rate ) {
			return $i18n(
				'readerexperiments-readaloud-speed-button-label',
				mw.language.convertNumber( Number( rate ) )
			).text();
		}

		const menuItems = [ '0.5', '1', '1.25', '1.5' ].map( ( rate ) => ( {
			label: formatSpeed( rate ),
			value: rate
		} ) );

		function onUpdate( value ) {
			expanded.value = value;
		}

		return {
			speedRateButton,
			speedPopover,
			showSpeedPopover,
			speedRateMenu,
			selectedPlaybackSpeed,
			expanded,
			menuId,
			menuItems,
			formatSpeed,
			onUpdate
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ext-readerExperiments-readAloud__playback-speed {
	&__menu.cdx-menu {
		position: relative;
		border: unset;
		box-shadow: unset;

		ul {
			padding-left: 0;
			padding-inline: 0;
		}
	}

	&__popover {
		padding: @spacing-65 @spacing-100;
	}
}
</style>
