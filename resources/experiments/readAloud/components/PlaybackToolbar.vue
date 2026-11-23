<template>
	<div class="ext-readerExperiments-readAloud__playback-toolbar">
		<div class="ext-readerExperiments-readAloud__playback-toolbar__header">
			<cdx-icon :icon="cdxIconVolumeUp" size="small"></cdx-icon>
			<!-- TODO: add real section and href -->
			<a
				class="ext-readerExperiments-readAloud__playback-toolbar__header-title"
				href=""
			>
				Section title
			</a>
		</div>

		<cdx-progress-bar
			class="ext-readerExperiments-readAloud__playback-toolbar__progress"
			:aria-label="$i18n( 'readerexperiments-readaloud-progress' ).text()"
			:value="currentTime"
			:max="duration"
			:inline="true"
		>
		</cdx-progress-bar>

		<div class="ext-readerExperiments-readAloud__playback-toolbar__content">
			<playback-speed
				@select="onSelectSpeed"
			></playback-speed>
			<div class="ext-readerExperiments-readAloud__playback-controls">
				<cdx-button
					:aria-label="$i18n(
						'readerexperiments-readaloud-seek-backward', seekOffsetLabel ).text()"
					weight="quiet"
					:disabled="isLoading"
					@click="onSeekBackward"
				>
					<cdx-icon :icon="cdxIconDoubleChevronStart"></cdx-icon>
				</cdx-button>
				<cdx-button
					:aria-label="playPauseLabel"
					action="progressive"
					weight="quiet"
					@click="onTogglePlayback"
				>
					<cdx-progress-indicator v-if="isLoading">
						{{ $i18n( 'readerexperiments-readaloud-loading' ).text() }}
					</cdx-progress-indicator>
					<cdx-icon v-else :icon="isPlaying ? cdxIconPause : cdxIconPlay"></cdx-icon>
				</cdx-button>
				<cdx-button
					:aria-label="$i18n(
						'readerexperiments-readaloud-seek-forward', seekOffsetLabel ).text()"
					weight="quiet"
					:disabled="isLoading"
					@click="onSeekForward"
				>
					<cdx-icon :icon="cdxIconDoubleChevronEnd"></cdx-icon>
				</cdx-button>
			</div>
			<cdx-button
				:aria-label="$i18n( 'readerexperiments-readaloud-close' ).text()"
				weight="quiet"
				@click="onClose"
			>
				<cdx-icon :icon="cdxIconClose"></cdx-icon>
			</cdx-button>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );
const { CdxButton, CdxIcon, CdxProgressBar, CdxProgressIndicator } = require( '@wikimedia/codex' );
const PlaybackSpeed = require( './PlaybackSpeed.vue' );
const {
	cdxIconPlay,
	cdxIconPause,
	cdxIconDoubleChevronStart,
	cdxIconDoubleChevronEnd,
	cdxIconClose,
	cdxIconVolumeUp
} = require( '../readAloudIcons.json' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'PlaybackToolbar',
	components: { CdxButton, CdxIcon, PlaybackSpeed, CdxProgressBar, CdxProgressIndicator },
	props: {
		isPlaying: {
			type: Boolean,
			default: false
		},
		isLoading: {
			type: Boolean,
			default: false
		},
		currentTime: {
			type: Number,
			default: 0
		},
		duration: {
			type: Number,
			default: 0
		},
		seekOffset: {
			type: Number,
			required: true
		}
	},
	emits: [
		'play',
		'pause',
		'backward',
		'forward',
		'close',
		'speed'
	],
	setup( props, { emit } ) {
		// Format the seek offset number for current language.
		const seekOffsetLabel = computed(
			() => mw.language.convertNumber( props.seekOffset )
		);

		const $i18n = inject( 'i18n' );
		const playPauseLabel = computed( () => {
			if ( props.isLoading ) {
				return $i18n( 'readerexperiments-readaloud-loading' ).text();
			}
			return props.isPlaying ?
				$i18n( 'readerexperiments-readaloud-pause' ).text() :
				$i18n( 'readerexperiments-readaloud-play' ).text();
		} );

		function onTogglePlayback() {
			emit( props.isPlaying ? 'pause' : 'play' );
		}

		function onSeekBackward() {
			emit( 'backward' );
		}

		function onSeekForward() {
			emit( 'forward' );
		}

		function onClose() {
			emit( 'close' );
		}

		function onSelectSpeed( speed ) {
			emit( 'speed', speed );
		}

		return {
			cdxIconPlay,
			cdxIconPause,
			cdxIconDoubleChevronStart,
			cdxIconDoubleChevronEnd,
			cdxIconClose,
			cdxIconVolumeUp,
			seekOffsetLabel,
			playPauseLabel,
			onTogglePlayback,
			onSeekBackward,
			onSeekForward,
			onClose,
			onSelectSpeed
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

		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		&__header {
			margin-left: @spacing-75;
			margin-right: @spacing-75;
			margin-bottom: @spacing-25;
			display: flex;
			gap: @spacing-35;
			align-items: center;
		}

		&__header-title {
			.cdx-mixin-link-base();
			display: inline-block;
			overflow: hidden;
			font-size: @font-size-small;
			font-weight: @font-weight-bold;
			line-height: @line-height-small;
			text-overflow: ellipsis;
			white-space: nowrap;

			// Override Codex link mixin styles
			&:visited,
			&:visited:hover,
			&:visited:active {
				color: @color-link;
			}
		}

		/* stylelint-disable-next-line no-descending-specificity */
		&__progress {
			border-bottom: solid @border-width-base @border-color-subtle;
		}

		/* stylelint-disable-next-line no-descending-specificity */
		&__content {
			display: flex;
			justify-content: space-between;
			margin-top: @spacing-50;
		}
	}

	/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
	&__playback-controls {
		display: flex;
		gap: calc( @spacing-125 + @spacing-12 );
	}
}

</style>
