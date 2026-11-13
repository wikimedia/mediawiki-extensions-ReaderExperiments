<template>
	<div class="ext-readerExperiments-readAloud__playback-toolbar">
		<playback-speed></playback-speed>
		<div class="ext-readerExperiments-readAloud__playback-controls">
			<cdx-button
				:aria-label="$i18n( 'readerexperiments-readaloud-previous' ).text()"
				weight="quiet"
				@click="onPrevious">
				<cdx-icon :icon="cdxIconDoubleChevronStart"></cdx-icon>
			</cdx-button>
			<cdx-button
				:aria-label="isPlaying ?
					$i18n( 'readerexperiments-readaloud-pause' ).text() :
					$i18n( 'readerexperiments-readaloud-play' ).text()"
				action="progressive"
				weight="quiet"
				@click="onTogglePlayback">
				<cdx-icon :icon="isPlaying ? cdxIconPause : cdxIconPlay"></cdx-icon>
			</cdx-button>
			<cdx-button
				:aria-label="$i18n( 'readerexperiments-readaloud-next' ).text()"
				weight="quiet"
				@click="onNext">
				<cdx-icon :icon="cdxIconDoubleChevronEnd"></cdx-icon>
			</cdx-button>
		</div>
		<cdx-button
			:aria-label="$i18n( 'readerexperiments-readaloud-close' ).text()"
			weight="quiet"
			@click="onClose">
			<cdx-icon :icon="cdxIconClose"></cdx-icon>
		</cdx-button>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const PlaybackSpeed = require( './PlaybackSpeed.vue' );
const {
	cdxIconPlay,
	cdxIconPause,
	cdxIconDoubleChevronStart,
	cdxIconDoubleChevronEnd,
	cdxIconClose
} = require( '../readAloudIcons.json' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'PlaybackToolbar',
	components: { CdxButton, CdxIcon, PlaybackSpeed },
	props: {
		isPlaying: {
			type: Boolean,
			default: false
		},
		// TODO: progress and loading state
		// eslint-disable-next-line vue/no-unused-properties
		isLoading: {
			type: Boolean,
			default: false
		},
		// eslint-disable-next-line vue/no-unused-properties
		currentTime: {
			type: Number,
			default: 0
		},
		// eslint-disable-next-line vue/no-unused-properties
		duration: {
			type: Number,
			default: 0
		}
	},
	emits: [
		'play',
		'pause',
		'previous',
		'next',
		'close'
	],
	setup( props, { emit } ) {

		function onTogglePlayback() {
			emit( props.isPlaying ? 'pause' : 'play' );
		}

		function onPrevious() {
			emit( 'previous' );
		}

		function onNext() {
			emit( 'next' );
		}

		function onClose() {
			emit( 'close' );
		}

		return {
			cdxIconPlay,
			cdxIconPause,
			cdxIconDoubleChevronStart,
			cdxIconDoubleChevronEnd,
			cdxIconClose,
			onTogglePlayback,
			onPrevious,
			onNext,
			onClose
		};
	}
} );
</script>

<style lang="less">
@import 'mediawiki.skin.variables.less';

.ext-readerExperiments-readAloud {
	&__playback-toolbar {
		position: fixed;
		bottom: 0;
		inset-inline: 0;
		max-width: 640px;
		// Centers the bar when the viewport is wider than max-width.
		margin-inline: auto;
		z-index: @z-index-above-content;
		background-color: @background-color-interactive;
		padding-top: @spacing-35;
		padding-bottom: @spacing-35;
		display: flex;
		justify-content: space-between;
	}

	/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
	&__playback-controls {
		display: flex;
		gap: calc( @spacing-125 + @spacing-12 );
	}
}

</style>
