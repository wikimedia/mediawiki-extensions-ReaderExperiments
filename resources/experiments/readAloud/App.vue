<template>
	<cdx-button
		ref="speaker"
		weight="quiet"
		size="large"
		:aria-label="$i18n( 'readerexperiments-readaloud-title' ).text()"
		@click="start"
	>
		<cdx-icon :icon="cdxIconVolumeUp"></cdx-icon>
	</cdx-button>
	<cdx-popover
		:anchor="speaker"
		:open="showCoachMark"
		class="ext-readerExperiments-readAloud-coachMark"
		role="region"
		aria-labelledby="read-aloud-coach-title"
		:title="$i18n( 'readerexperiments-readaloud-title' ).text()"
		:use-close-button="true"
		:close-button-label="$i18n( 'readerexperiments-readaloud-dismiss' ).text()"
		:primary-action="{
			label: $i18n( 'readerexperiments-readaloud-try' ).text(),
			actionType: 'progressive'
		}"
		placement="bottom-end"
		@update:open="dismiss"
		@primary="start"
	>
		<template #header>
			<div class="ext-readerExperiments-readAloud-sky" aria-hidden="true"></div>
			<div class="ext-readerExperiments-readAloud-heading">
				<h2 id="read-aloud-coach-title">
					{{ $i18n( 'readerexperiments-readaloud-title' ).text() }}
				</h2>
				<cdx-button
					weight="quiet"
					:aria-label="$i18n( 'readerexperiments-readaloud-dismiss' ).text()"
					@click="dismissAndFocus"
				>
					<cdx-icon :icon="cdxIconClose"></cdx-icon>
				</cdx-button>
			</div>
		</template>
		<p>{{ $i18n( 'readerexperiments-readaloud-description' ).text() }}</p>
	</cdx-popover>
	<audio
		ref="audioPlayer"
		class="ext-readerExperiments-readAloud-audio-player"
		@timeupdate="onTimeUpdate"
		@play="onPlay"
		@pause="onPause"
		@ended="onEnded"
		@progress="onProgress"
		@canplay="onCanPlay"
	></audio>
</template>

<script>
const { defineComponent, ref, onMounted, onBeforeUnmount } = require( 'vue' );
const { CdxButton, CdxIcon, CdxPopover } = require( '@wikimedia/codex' );
const { cdxIconVolumeUp, cdxIconClose } = require( './readAloudIcons.json' );
const SEEN_KEY = 'mw.readerExperiments.readAloud.coachMarkSeen';

// @vue/component
module.exports = exports = defineComponent( {
	name: 'ReadAloud',
	components: { CdxButton, CdxIcon, CdxPopover },
	setup() {
		const speaker = ref( null );
		const audioPlayer = ref( null );
		const currentTime = ref( 0 );
		const isPlaying = ref( false );
		const duration = ref( 0 );
		const buffered = ref( 0 );

		function onTimeUpdate() {
			currentTime.value = audioPlayer.value.currentTime;
		}

		function onPlay() {
			isPlaying.value = true;
		}

		function onPause() {
			isPlaying.value = false;
		}

		function onEnded() {
			isPlaying.value = false;
		}

		function onProgress() {
			if ( audioPlayer.value.buffered.length ) {
				buffered.value = audioPlayer.value.buffered.end(
					audioPlayer.value.buffered.length - 1
				);
			}
		}

		function onCanPlay() {
			duration.value = audioPlayer.value.duration || 0;
		}

		function play() {
			audioPlayer.value.play().catch( ( error ) => {
				mw.log.warn( 'Read Aloud: unable to play audio', error );
			} );
		}

		function pause() {
			audioPlayer.value.pause();
		}

		/**
		 * Load the audio source.
		 *
		 * @param {string} audioSourceUrl
		 */
		function load( audioSourceUrl ) {
			currentTime.value = 0;
			duration.value = 0;
			buffered.value = 0;
			isPlaying.value = false;
			audioPlayer.value.src = audioSourceUrl;
			audioPlayer.value.load();
		}

		const showCoachMark = ref( false );
		let openingFrame;
		onMounted( () => {
			if ( mw.storage.get( SEEN_KEY ) ) {
				return;
			}
			// ResourceLoader applies module styles on an animation frame. Wait for
			// that paint before Codex measures the newly inserted toolbar button.
			openingFrame = requestAnimationFrame( () => {
				openingFrame = requestAnimationFrame( () => {
					showCoachMark.value = true;
					mw.storage.set( SEEN_KEY, '1' );
				} );
			} );
		} );
		onBeforeUnmount( () => cancelAnimationFrame( openingFrame ) );

		function dismiss() {
			cancelAnimationFrame( openingFrame );
			showCoachMark.value = false;
		}

		function dismissAndFocus() {
			dismiss();
			// Vue exposes a native button element, not a jQuery object.
			// eslint-disable-next-line no-jquery/no-event-shorthand
			speaker.value.$el.focus();
		}

		function start() {
			dismissAndFocus();
			mw.storage.set( SEEN_KEY, '1' );
			// Playback (T434890) can subscribe to either entry point here.
			mw.hook( 'ext.readerExperiments.readAloud.start' ).fire( audioPlayer.value );
		}

		return {
			onTimeUpdate,
			onPlay,
			onPause,
			onEnded,
			onProgress,
			onCanPlay,
			// eslint-disable-next-line vue/no-unused-properties
			play,
			// eslint-disable-next-line vue/no-unused-properties
			pause,
			// eslint-disable-next-line vue/no-unused-properties
			load,
			speaker, audioPlayer, showCoachMark, start, dismiss, dismissAndFocus,
			cdxIconVolumeUp, cdxIconClose
		};
	}
} );
</script>
