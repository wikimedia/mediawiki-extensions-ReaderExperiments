<template>
	<cdx-toast
		v-if="!dialogOpen"
		class="ext-readerExperiments-preferred-sources-cta"
		standalone
		:auto-dismiss="false"
		:icon="cdxIconHeart"
		:action-button-label="$i18n( 'readerexperiments-preferredsources-cta-action' ).text()"
		@action-button-click="onNoticeClick"
		@user-dismissed="$emit( 'notice-dismiss' )"
	>
		{{ $i18n( 'readerexperiments-preferredsources-cta-message' ).text() }}
	</cdx-toast>

	<cdx-dialog
		:open="dialogOpen"
		:title="$i18n( 'readerexperiments-preferredsources-dialog-title' ).text()"
		use-close-button
		@update:open="onDialogOpenUpdate"
	>
		<template #default>
			{{ $i18n( 'readerexperiments-preferredsources-dialog-body' ).text() }}
		</template>

		<!-- Override the default Dialog footer for custom button w/icon treatment -->
		<template #footer>
			<div class="ext-readerExperiments-preferred-sources-cta__actions">
				<cdx-button
					weight="primary"
					action="progressive"
					@click="$emit( 'cta-click' )"
				>
					<cdx-icon :icon="cdxIconLinkExternal"></cdx-icon>
					{{ $i18n( 'readerexperiments-preferredsources-dialog-action' ).text() }}
				</cdx-button>
				<cdx-button @click="$emit( 'cta-suppress' )">
					{{ $i18n( 'readerexperiments-preferredsources-dialog-dismiss' ).text() }}
				</cdx-button>
			</div>
		</template>
	</cdx-dialog>
</template>

<script>
const { defineComponent, nextTick, ref } = require( 'vue' );
const { CdxToast, CdxDialog, CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconLinkExternal, cdxIconHeart } = require( './icons.json' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'PreferredSourcesCta',
	components: { CdxToast, CdxDialog, CdxButton, CdxIcon },
	emits: [
		'notice-click',
		'notice-dismiss',
		'cta-impression',
		'cta-click',
		'cta-dismiss',
		'cta-suppress'
	],
	setup( props, { emit } ) {
		const dialogOpen = ref( false );

		/**
		 * Codex closes the dialog itself for the close button, the backdrop and
		 * the Esc key; each of those counts as a soft dismissal. The
		 * "don't show again" button emits `cta-suppress` instead.
		 *
		 * @param {boolean} open
		 */
		function onDialogOpenUpdate( open ) {
			dialogOpen.value = open;

			if ( !open ) {
				emit( 'cta-dismiss' );
			}
		}

		function onNoticeClick() {
			emit( 'notice-click' );
			dialogOpen.value = true;
			nextTick( () => emit( 'cta-impression' ) );
		}

		return {
			cdxIconHeart,
			cdxIconLinkExternal,
			dialogOpen,
			onDialogOpenUpdate,
			onNoticeClick
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

// Red heart in the toast message instead of default grey
.ext-readerExperiments-preferred-sources-cta {
	.cdx-toast__message .cdx-message__icon--vue {
		color: #d33;
	}
}

// Stacked, full-width buttons, as in the standard footer
.ext-readerExperiments-preferred-sources-cta__actions {
	display: flex;
	flex-direction: column;

	.cdx-button {
		max-width: none;
	}

	.cdx-button + .cdx-button {
		margin-top: @spacing-75;
	}
}
</style>
