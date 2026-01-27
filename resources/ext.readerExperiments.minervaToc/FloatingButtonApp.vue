<template>
	<div
		v-if="hasToc"
		class="ext-readerExperiments-minerva-toc__button"
		:class="[
			isOpen ?
				'ext-readerExperiments-minerva-toc__button--toc-open' :
				'ext-readerExperiments-minerva-toc__button--toc-closed'
		]"
	>
		<cdx-button
			class="ext-readerExperiments-minerva-toc__button__action"
			@click="onToggle"
		>
			<cdx-icon :icon="isOpen ? cdxIconClose : cdxIconListBullet"></cdx-icon>
			{{
				isOpen ?
					$i18n( 'readerexperiments-minerva-toc-toggle-text-close' ).text() :
					$i18n( 'readerexperiments-minerva-toc-toggle-text-open' ).text()
			}}
		</cdx-button>

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
const { CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconClose, cdxIconListBullet } = require( './icons.json' );
const TableOfContents = require( './components/TableOfContents.vue' );
const useTableOfContentsCoordinator = require( './composables/useTableOfContentsCoordinator.js' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'FloatingButtonApp',
	components: {
		CdxButton,
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
		const onToggle = () => ( isOpen.value = !isOpen.value );

		return {
			teleportTarget,
			cdxIconClose,
			cdxIconListBullet,
			hasToc,
			isOpen,
			onToggle
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
	& &__action {
		background-color: @background-color-progressive-subtle;
		border-radius: @border-radius-pill;
		border-color: @border-color-progressive;
		box-shadow: @box-shadow-large;
	}

	// When the TOC is closed
	&--toc-closed {
		& .ext-readerExperiments-minerva-toc__button__action {
			color: @color-progressive;
		}
	}

	// When the TOC is open
	&--toc-open {
		& .ext-readerExperiments-minerva-toc__button__action {
			background-color: @background-color-progressive-subtle--active;
			color: @color-progressive--active;
			padding-right: @spacing-250;
			padding-left: @spacing-250;

			& .cdx-icon {
				color: @color-progressive;
			}
		}
	}

	&__toc {
		.minerva-toc__toc();
		top: 10px;
		left: 10px;
		right: 10px;
		bottom: 80px;
	}
}

</style>
