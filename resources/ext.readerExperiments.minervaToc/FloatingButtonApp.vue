<template>
	<div
		v-if="hasToc"
		class="readerExperiments-minerva-toc__button"
	>
		<cdx-button @click="onToggle">
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
			<div class="readerExperiments-minerva-toc__button__toc">
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
.readerExperiments-minerva-toc__button {
	position: fixed;
	bottom: 20px;
	left: 50%;
	transform: translate( -50% );
}

.readerExperiments-minerva-toc__button__toc {
	background: #fff;
	border: 1px solid #000;
	position: fixed;
	top: 10px;
	left: 10px;
	right: 10px;
	bottom: 80px;
	overflow: auto;
	padding: 10px;
}
</style>
