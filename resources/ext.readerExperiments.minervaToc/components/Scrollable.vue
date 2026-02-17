<!-- eslint-disable vue/no-v-html -->
<template>
	<div
		ref="scrollableRef"
		class="ext-readerExperiments-minerva-toc__scrollable"
		:class="{
			'ext-readerExperiments-minerva-toc__scrollable--can-scroll-up': canScrollUp,
			'ext-readerExperiments-minerva-toc__scrollable--can-scroll-down': canScrollDown
		}"
	>
		<slot></slot>
	</div>
</template>

<script>
const { defineComponent, onMounted, onUnmounted, ref, useTemplateRef } = require( 'vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'Scrollable',
	setup() {
		const scrollableRef = useTemplateRef( 'scrollableRef' );
		const canScrollUp = ref( false );
		const canScrollDown = ref( false );

		const setScrollIndicators = () => {
			if ( !scrollableRef.value ) {
				return;
			}
			canScrollUp.value = scrollableRef.value.scrollTop > 0;
			canScrollDown.value = scrollableRef.value.scrollHeight - scrollableRef.value.scrollTop - scrollableRef.value.clientHeight > 1;
		};

		onMounted( () => {
			if ( scrollableRef.value ) {
				setScrollIndicators();
				scrollableRef.value.addEventListener( 'scroll', setScrollIndicators, { passive: true } );
			}
		} );

		onUnmounted( () => {
			if ( scrollableRef.value ) {
				scrollableRef.value.removeEventListener( 'scroll', setScrollIndicators );
			}
		} );

		return {
			scrollableRef,
			canScrollUp,
			canScrollDown
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ext-readerExperiments-minerva-toc__scrollable {
	@content-padding: @spacing-65; // @todo

	// Scroll indicator gradients for TOC
	// Show a 56px gradient when there's content above/below to scroll to
	// Uses position: sticky so gradients stay at edges of scroll viewport
	@gradient-height: 56px;
	// Use negative margin to extend into padding area
	@gradient-offset: -@content-padding;

	box-sizing: border-box;
	height: 100%;
	overflow-y: auto;
	padding: @content-padding;

	&::before,
	&::after {
		content: '';
		display: block;
		position: sticky;
		height: @gradient-height;
		// Extend horizontally into padding
		margin-left: @gradient-offset;
		margin-right: @gradient-offset;
		pointer-events: none;
		z-index: 1;
		opacity: 0;
		transition: opacity @transition-duration-medium;
	}

	&::before {
		// Position at top edge of scroll viewport, accounting for padding
		top: @gradient-offset;
		margin-top: @gradient-offset;
		// Negative margin to pull content up behind the gradient
		margin-bottom: -@gradient-height - @gradient-offset;
		background: linear-gradient( to bottom, @background-color-base, transparent );
	}

	&::after {
		// Position at bottom edge of scroll viewport, accounting for padding
		bottom: @gradient-offset;
		margin-bottom: @gradient-offset;
		// Negative margin to pull content up behind the gradient
		margin-top: -@gradient-height - @gradient-offset;
		background: linear-gradient( to top, @background-color-base, transparent );
	}

	&--can-scroll-up::before {
		opacity: 1;
	}

	&--can-scroll-down::after {
		opacity: 1;
	}
}
</style>
