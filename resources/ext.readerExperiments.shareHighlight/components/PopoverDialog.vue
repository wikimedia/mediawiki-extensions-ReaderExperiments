<template>
	<cdx-dialog
		class="ext-readerExperiments-popover-dialog"

		:open="open"
		:title="title"
		:subtitle="subtitle"
		:hide-title="hideTitle"
		:use-close-button="useCloseButton"
		:primary-action="primaryAction"
		:default-action="defaultAction"
		:stacked-action="stackedActions"
		:target="target"
		:render-in-place="renderInPlace"

		@update:open="onUpdateOpen"
		@primary="onPrimary"
		@default="onDefault"
	>
		<template #default>
			<slot name="default"></slot>
		</template>
		<template #footer>
			<slot name="footer"></slot>
		</template>
	</cdx-dialog>
</template>

<script>

/**
 * A component wrapping CdxDialog with some logic to behave more like
 * a mobile popover sheet on small screens. Whereas a CdxDialog will
 * become full-screen at widths under 640px, a PopoverDialog will
 * expand horizontally and anchor to the bottom of the screen.
 *
 * For both CdxDialog and PopoverDialog, if the contents are taller
 * than fits on screen the contents will be vertically scrollable.
 * The #footer template section if provided will be fixed to the
 * screen edge, and will not scroll.
 *
 * Note that on narrow screens, it may be necessary to double-check
 * the layout of your dialogs and form controls to ensure they either
 * fit, wrap, or switch to a vertical layout.
 */

const { CdxDialog } = require( '@wikimedia/codex' );

// @vue/component
module.exports = exports = {
	name: 'PopoverDialog',
	components: {
		CdxDialog
	},
	props: {

		/**
		 * Whether the dialog is visible. Should be provided via a v-model:open
		 * binding in the parent scope.
		 */
		open: {
			type: Boolean,
			default: false
		},

		/**
		 * Title for the dialog header. Used for ARIA purposes even if no
		 * visible header element is displayed.
		 */
		title: {
			type: String,
			required: true
		},

		/**
		 * Optional subtitle for the dialog.
		 */
		subtitle: {
			type: String,
			required: false,
			default: null
		},

		/**
		 * Whether the dialog header should hide the title & subtitle
		 */
		hideTitle: {
			type: Boolean,
			default: false
		},

		/**
		 * Add an icon-only close button to the dialog header.
		 *
		 * On narrow screens, the close button is always displayed. On wide screens, it's only
		 * displayed if this prop is set.
		 */
		useCloseButton: {
			type: Boolean,
			default: false
		},

		/**
		 * Primary user action. This will display a primary button with the specified action
		 * (progressive or destructive).
		 */
		primaryAction: {
			type: Object,
			default: null
		},

		/**
		 * Default user action. This will display a normal button.
		 */
		defaultAction: {
			type: Object,
			default: null
		},

		/**
		 * Whether action buttons should be vertically stacked and 100% width.
		 */
		stackedActions: {
			type: Boolean,
			default: false
		},

		/**
		 * Selector or DOM element identifying the container the dialog should
		 * be rendered in. The dialog will be `<teleport>`ed to this element.
		 * An ID selector is recommended, e.g. `#foo-bar`, but providing an
		 * actual element is also supported.
		 *
		 * If this prop is not set, and the parent or one of its ancestors
		 * provides a teleport target using `provide( 'CdxTeleportTarget',
		 * '#foo-bar' )`, the provided target will be used. If there is no
		 * provided target, the dialog will be teleported to the end of the
		 * `<body>` element.
		 */
		target: {
			type: String,
			default: null
		},

		/**
		 * Whether to disable the use of teleport and render the Dialog in its
		 * original location in the document. If this is true, the `target` prop
		 * is ignored.
		 */
		renderInPlace: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		/**
		 * When the open/close state changes, e.g. when the close button is clicked.
		 *
		 * @property {boolean} newValue The new open/close state (true for open, false for closed)
		 */
		'update:open',

		/**
		 * When the primary action button is clicked.
		 */
		'primary',

		/**
		 * When the default action button is clicked.
		 */
		'default'
	],
	setup: function ( props, { emit } ) {
		const onUpdateOpen = () => emit( 'update:open' );
		const onPrimary = () => emit( 'primary' );
		const onDefault = () => emit( 'default' );

		return {
			onUpdateOpen,
			onPrimary,
			onDefault
		};
	}
};

</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

// Instead of a fullscreen dialog, style as a "popover" on mobile screens.
// This is anchored to the bottom of the screen and sized vertically to fit
// its content.
@media ( max-width: @min-width-breakpoint-tablet ) {
	/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
	.cdx-dialog-backdrop:has( .ext-readerExperiments-popover-dialog ) {
		align-items: end;
	}

	.ext-readerExperiments-popover-dialog.cdx-dialog {
		height: unset;
		border-top: @border-subtle;
	}
}

</style>
