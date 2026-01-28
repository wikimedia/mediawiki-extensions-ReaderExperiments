<template>
	<div
		v-if="hasToc"
		class="ext-readerExperiments-minerva-toc__button"
	>
		<cdx-toggle-button
			v-model="isOpen"
			class="ext-readerExperiments-minerva-toc__button__action"
		>
			<cdx-icon :icon="isOpen ? cdxIconClose : cdxIconListBullet"></cdx-icon>
			{{
				isOpen ?
					$i18n( 'readerexperiments-minerva-toc-toggle-text-close' ).text() :
					$i18n( 'readerexperiments-minerva-toc-toggle-text-open' ).text()
			}}
		</cdx-toggle-button>

		<teleport
			v-if="isOpen"
			:to="teleportTarget"
		>
			<div class="ext-readerExperiments-minerva-toc__button__toc">
				<table-of-contents></table-of-contents>
			</div>
		</teleport>
	</div>
</template>

<script>
const { defineComponent, inject, ref } = require( 'vue' );
const { CdxIcon, CdxToggleButton } = require( '@wikimedia/codex' );
const { cdxIconClose, cdxIconListBullet } = require( './icons.json' );
const TableOfContents = require( './components/TableOfContents.vue' );
const useTableOfContentsCoordinator = require( './composables/useTableOfContentsCoordinator.js' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'FloatingButtonApp',
	components: {
		CdxToggleButton,
		CdxIcon,
		TableOfContents
	},
	setup() {
		const teleportTarget = inject( 'CdxTeleportTarget' );

		let isOpen, hasToc;
		try {
			isOpen = useTableOfContentsCoordinator( 'floating-button' );
			hasToc = true;
		} catch ( e ) {
			isOpen = ref( false );
			hasToc = true;
		}

		return {
			teleportTarget,
			cdxIconClose,
			cdxIconListBullet,
			hasToc,
			isOpen
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';
@import './mixins/minerva-toc.less';

.ext-readerExperiments-minerva-toc__button {
	position: fixed;
	bottom: 20px;
	left: 50%;
	transform: translate( -50% );

	// Specificity needed to override Codex styles
	& &__action.cdx-toggle-button {
		border-radius: @border-radius-pill;
		box-shadow: @box-shadow-large;

		// When the TOC is closed
		&--toggled-off:enabled {
			background-color: @background-color-progressive-subtle;
			border-color: @border-color-progressive;
			color: @color-progressive;

			&:hover {
				background-color: @background-color-progressive-subtle--hover;
				border-color: @border-color-progressive--hover;
			}
		}

		// When the TOC is open
		&--toggled-on:enabled {
			background-color: @background-color-progressive-subtle--active;
			border-color: @border-color-progressive--active;
			color: @color-progressive--active;

			&:hover {
				background-color: @background-color-progressive-subtle--hover;
				border-color: @border-color-progressive--hover;
			}

			& .cdx-icon {
				color: @color-progressive;
			}
		}
	}

	&__toc {
		.minerva-toc__toc();
		top: 10px;
		// Create a gap between bottom edge of viewport
		// and about 24px gap between the button and TOC
		// (calculate both elements bottom position and button height)
		bottom: 76px;
	}
}

</style>
