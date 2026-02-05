<template>
	<div
		class="readerExperiments-minerva-toc__sticky-header"
		:class="{ 'readerExperiments-minerva-toc__sticky-header__active': isActive }"
	>
		<cdx-button
			:action="isOpen ? 'progressive' : 'default'"
			:aria-label="isOpen ?
				$i18n( 'readerexperiments-minerva-toc-toggle-text-close' ).text() :
				$i18n( 'readerexperiments-minerva-toc-toggle-text-open' ).text()
			"
			@click="$emit( 'toggle' )"
		>
			<cdx-icon :icon="isOpen ? cdxIconClose : cdxIconListBullet"></cdx-icon>
		</cdx-button>
		<h3 v-html="headingHtml"></h3>
		<span v-if="subheadingText">{{ subheadingText }}</span>
		<cdx-button
			v-if="linkUrl"
			:aria-label="$i18n( 'edit' ).text()"
			:action="isOpen ? 'progressive' : 'default'"
			@click="onClickLink"
		>
			<cdx-icon :icon="cdxIconEdit"></cdx-icon>
		</cdx-button>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { cdxIconClose, cdxIconListBullet, cdxIconEdit } = require( '../icons.json' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'StickyHeader',
	components: {
		CdxButton,
		CdxIcon
	},
	props: {
		isOpen: {
			type: Boolean,
			required: true
		},
		isActive: {
			type: Boolean,
			required: true
		},
		headingHtml: {
			type: String,
			required: true
		},
		subheadingText: {
			type: String,
			default: ''
		},
		linkUrl: {
			type: String,
			default: ''
		}
	},
	emits: [
		'toggle'
	],
	setup( props ) {
		const onClickLink = () => window.open( props.linkUrl, '_blank' );

		return {
			cdxIconClose,
			cdxIconListBullet,
			cdxIconEdit,
			onClickLink
		};
	}
} );
</script>

<style lang="less">
// rather than overflowing up to the root element (which messes
// up sticky/fixed positioned elements elsewhere in the DOM),
// set the overflow window on the content element itself
body:has( .readerExperiments-minerva-toc__sticky-header ) {
	.collapsible-block, .mf-collapsible-content {
		overflow-x: auto;
	}
}

.readerExperiments-minerva-toc__sticky-header {
	z-index: 1;
	background: #fff;
	border-bottom: 1px solid #000;
	position: fixed;
	top: 0;
	display: flex;
	width: 100%;
	justify-content: space-between;
	transition: opacity 0.3s;

	&:not( &__active ) {
		// Ensure the sticky, insofar there is one, is not visible without
		// setting it to display: none so that we can still get the dimensions
		// it is/will be rendered at
		opacity: 0;
	}
}
</style>
