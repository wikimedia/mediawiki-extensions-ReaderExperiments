<template>
	<div
		class="ib-carousel"
		tabindex="-1"
		@keydown.left="onLeftArrowKeypress"
		@keydown.right="onRightArrowKeypress"
		@keydown.home="onHomeKeypress"
		@keydown.end="onEndKeypress"
	>
		<carousel-item
			v-for="( image, index ) in images"
			:key="index"
			:ref="( ref ) => assignTemplateRefForCarouselItem( ref, index )"
			:image="image"
			@click="onItemClick( image, $event )"
			@keyup.enter="onItemClick( image, $event )"
			@keyup.space="onItemClick( image, $event )"
			@focus="onItemFocus( index )"
		></carousel-item>
	</div>
</template>

<script>
const { defineComponent, ref, inject, onMounted, ComponentPublicInstance } = require( 'vue' );
const CarouselItem = require( './CarouselItem.vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'Carousel',
	components: {
		CarouselItem
	},
	props: {
		images: {
			type: Array,
			required: true
		}
	},
	emits: [
		'carousel-item-click'
	],
	expose: [
		'focusActiveItem'
	],
	setup( props, { emit } ) {
		// Track which carousel item is currently active for keyboard navigation.
		const activeIndex = ref( 0 );

		// Set up a map to contain references to all carousel item elements, so
		// that they can be programmatically focused.
		// This follows Codex Tabs pattern.
		const carouselItemRefs = ref( new Map() );

		// Instrumentation.
		const clickCounter = ref( 0 );
		const submitInteraction = inject( 'submitInteraction' );

		/* eslint-disable camelcase */
		onMounted( () => {
			// Instrument carousel load.
			submitInteraction( 'image_carousel_load', { action_source: 'init' } );
		} );

		/**
		 * @param {import("../types").ImageData} image
		 * @param {Event} e
		 */
		function onItemClick( image, e ) {
			if ( e.type === 'click' && e.detail === 0 ) {
				// Clicking the image is supposed to open the overlay.
				// <Space> and <Enter> key presses are also considered clicks
				// (and should thus also open the overlay)
				// <Space> and <Enter> are inconsistent, though: the former
				// causes a "click" event on "keyup", the latter on "keydown".
				// Because of this difference, there's this weird bug where
				// an <Enter>-key based "click" will cause the overlay to open,
				// which will in turn move the focus to the close button,
				// and they <Enter>-based "click" will once again fire on that
				// new button that now has focus, effectively immediately
				// closing the overlay again.
				// The "click" event provides no way to differentiate between
				// these 2 keys (<Space> and <Enter>), so we can't meaningfully
				// change how they behave. Instead, we're just going to ignore
				// any keyboard-induced "click", and  explicitly bind separate
				// event handlers for <Space> and <Enter> "keyup" events instead.
				return;
			}

			// By now, this is either a mouse-induced click, a <Space> keyup,
			// or an <Enter> keyup.

			emit( 'carousel-item-click', image );

			clickCounter.value += 1;

			// Instrument click on a carousel image.
			const interactionData = {
				action_subtype: 'view_image',
				action_source: 'image_carousel'
			};
			// Additional interaction field on the first image click only.
			// To be used for click-through rate computation.
			if ( clickCounter.value === 1 ) {
				interactionData.action_context = 'image1';
			}
			submitInteraction( 'click', interactionData );
		}
		/* eslint-enable camelcase */

		/**
		 * Store pointers to each carousel item element following Codex Tabs pattern
		 *
		 * @param {Element|ComponentPublicInstance|null} templateRef
		 * @param {number} index
		 */
		function assignTemplateRefForCarouselItem( templateRef, index ) {
			// A templateRef that has an $el property indicates that it is a
			// component instance as opposed to a regular HTML element. We only
			// care to set up keyboard navigation for component instances.
			if ( templateRef.$el ) {
				carouselItemRefs.value.set( index, templateRef.$el );
			}
		}

		/**
		 * Focus on carousel item at specific index using template refs
		 * Handles Left, Right, Home, and End key navigation
		 *
		 * @param {number} index
		 */
		function focusItem( index ) {
			activeIndex.value = index;
			const element = carouselItemRefs.value.get( index );

			// Null check first that the entry exists, else `get` method returns undefined.
			if ( element ) {
				element.focus();
			}
		}

		/**
		 * Handle left arrow key: move to previous item (with RTL support)
		 *
		 * @param {Event} event
		 */
		function onLeftArrowKeypress( event ) {
			event.preventDefault();
			const currentDirection = document.documentElement.dir || 'ltr';

			if ( currentDirection === 'rtl' ) {
				// In RTL, left arrow moves to next item
				const nextIndex = ( activeIndex.value + 1 ) % props.images.length;
				focusItem( nextIndex );
			} else {
				// In LTR, left arrow moves to previous item
				const prevIndex = activeIndex.value === 0 ?
					props.images.length - 1 :
					activeIndex.value - 1;

				focusItem( prevIndex );
			}
		}

		/**
		 * Handle right arrow key: move to next item (with RTL support)
		 *
		 * @param {Event} event
		 */
		function onRightArrowKeypress( event ) {
			event.preventDefault();
			const currentDirection = document.documentElement.dir || 'ltr';

			if ( currentDirection === 'rtl' ) {
				// In RTL, right arrow moves to previous item
				const prevIndex = activeIndex.value === 0 ?
					props.images.length - 1 :
					activeIndex.value - 1;
				focusItem( prevIndex );
			} else {
				// In LTR, right arrow moves to next item
				const nextIndex = ( activeIndex.value + 1 ) % props.images.length;

				focusItem( nextIndex );
			}
		}

		/**
		 * Handle Home key: move to first item
		 *
		 * @param {Event} event
		 */
		function onHomeKeypress( event ) {
			// Noted undesired behavior with End key so applying here to be safe
			event.preventDefault();
			focusItem( 0 );
		}

		/**
		 * Handle End key: move to last item
		 *
		 * @param {Event} event
		 */
		function onEndKeypress( event ) {
			// Prevent undesired scroll to the end of the document while
			// maintaining focus on carousel item (Chrome, Firefox, and Safari)
			event.preventDefault();
			focusItem( props.images.length - 1 );
		}

		/**
		 * Handle focus event on carousel item
		 *
		 * @param {number} index
		 */
		function onItemFocus( index ) {
			// Keep left/right navigation state in sync with browser focus (tabbing)
			activeIndex.value = index;
		}

		/**
		 * Focus on the currently active carousel item using template refs
		 * Called when overlay closes to restore focus to carousel item
		 */
		function focusActiveItem() {
			const element = carouselItemRefs.value.get( activeIndex.value );

			// Null check first that the entry exists, else `get` method returns undefined.
			if ( element ) {
				element.focus();
			}
		}

		return {
			onItemClick,
			focusActiveItem,
			assignTemplateRefForCarouselItem,
			onLeftArrowKeypress,
			onRightArrowKeypress,
			onHomeKeypress,
			onEndKeypress,
			onItemFocus
		};
	}
} );
</script>

<style lang="less">
.ib-carousel {
	display: block;
	white-space: nowrap;
	overflow-x: auto;
	margin-bottom: 10px;
	padding: 6px;
}
</style>
