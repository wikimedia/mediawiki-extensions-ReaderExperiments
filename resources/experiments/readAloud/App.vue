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
		v-if="audioSet.length > 0"
		ref="audioPlayer"
		autoplay
		preload
		:src="audioSet[ 0 ]"
		@timeupdate="onTimeUpdate"
		@play="onPlay"
		@pause="onPause"
		@ended="onEnded"
		@progress="onProgress"
		@canplay="onCanPlay"
		@loadstart="onLoadStart"
		@waiting="onWaiting"
		@playing="onPlaying"
	></audio>
	<teleport :to="teleportTarget">
		<playback-toolbar
			v-show="isVisible"
			:is-playing="isPlaying"
			:is-loading="isLoading"
			:current-time="currentTime"
			:duration="duration"
			:seek-offset="seekOffsetSeconds"
			@play="play"
			@pause="pause"
			@backward="seekTo( -seekOffsetSeconds )"
			@forward="seekTo( seekOffsetSeconds )"
			@close="onClose"
			@speed="( rate ) => setPlaybackRate( rate )"
		>
		</playback-toolbar>
	</teleport>
</template>

<script>
const { computed, defineComponent, ref, onMounted, onBeforeUnmount, inject } = require( 'vue' );
const { CdxButton, CdxIcon, CdxPopover } = require( '@wikimedia/codex' );
const { cdxIconVolumeUp, cdxIconClose } = require( './readAloudIcons.json' );
const SEEN_KEY = 'mw.readerExperiments.readAloud.coachMarkSeen';
const SEEK_OFFSET_SECONDS = 30;
const PlaybackToolbar = require( './components/PlaybackToolbar.vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'ReadAloud',
	components: { CdxButton, CdxIcon, CdxPopover, PlaybackToolbar },
	props: {
		ttsBaseUri: {
			type: String,
			required: true
		},
		manifestPath: {
			type: String,
			required: true
		}
	},
	setup( props ) {
		const speaker = ref( null );
		const audioPlayer = ref( null );
		const currentTime = ref( 0 );
		const isPlaying = ref( false );
		const isLoading = ref( true );
		const duration = ref( 0 );
		const buffered = ref( 0 );
		const isVisible = ref( false );
		const manifest = ref( null );
		const audioSet = computed( () => ( manifest.value && manifest.value.sections || [] ).map( ( section ) => props.ttsBaseUri + section.audio.key ) );
		const teleportTarget = inject( 'CdxTeleportTarget' );

		function onTimeUpdate() {
			currentTime.value = audioPlayer.value && audioPlayer.value.currentTime || 0;
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
			if ( audioPlayer.value && audioPlayer.value.buffered.length ) {
				buffered.value = audioPlayer.value.buffered.end(
					audioPlayer.value.buffered.length - 1
				);
			}
		}

		function onCanPlay() {
			duration.value = audioPlayer.value && audioPlayer.value.duration || 0;
			isLoading.value = false;
		}

		// Browser started to load a resource.
		// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/loadstart_event
		function onLoadStart() {
			isLoading.value = true;
		}

		// Playback stopped because the next media data isn't available yet (buffering).
		// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/waiting_event
		function onWaiting() {
			isLoading.value = true;
		}

		// Playback started or restarted.
		// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playing_event
		function onPlaying() {
			isLoading.value = false;
		}

		function play() {
			if ( !audioPlayer.value ) {
				return;
			}

			audioPlayer.value.play().catch( ( error ) => {
				mw.log.warn( 'Read Aloud: unable to play audio', error );
			} );
		}

		function pause() {
			if ( !audioPlayer.value ) {
				return;
			}

			audioPlayer.value.pause();
		}

		/**
		 * Stop the audio (implicit through clearing manifest),
		 * and then dismiss the toolbar.
		 */
		function onClose() {
			manifest.value = null;
			currentTime.value = 0;
			isVisible.value = false;
		}

		/**
		 * Seek forward or backward by offset amount (seconds)
		 * Limited to start or end of track by the browser
		 *
		 * @param {number} timeOffset Seconds to move within track.
		 */
		function seekTo( timeOffset ) {
			if ( !audioPlayer.value ) {
				return;
			}

			audioPlayer.value.currentTime += timeOffset;
		}

		/**
		 * Set the audio's playback rate.
		 *
		 * @param {number} rate
		 */
		function setPlaybackRate( rate ) {
			if ( !audioPlayer.value ) {
				return;
			}

			audioPlayer.value.playbackRate = rate;
		}

		/**
		 * Load the audio source.
		 *
		 * @param {string} manifestPath
		 */
		async function load( manifestPath ) {
			currentTime.value = 0;
			duration.value = 0;
			buffered.value = 0;
			isPlaying.value = false;
			isLoading.value = true;

			const response = await fetch( props.ttsBaseUri + manifestPath );
			manifest.value = await response.json();
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

		async function start() {
			dismissAndFocus();
			mw.storage.set( SEEN_KEY, '1' );
			// Playback (T434890) can subscribe to either entry point here.
			mw.hook( 'ext.readerExperiments.readAloud.start' ).fire();
			isVisible.value = true;

			try {
				await load( props.manifestPath );
			} catch ( e ) {
				// @todo handle missing audio (IIRC show a link to a list of articles with audio?)
			}
		}

		return {
			audioPlayer,
			isPlaying,
			isLoading,
			currentTime,
			duration,
			isVisible,
			audioSet,
			onTimeUpdate,
			onPlay,
			onPause,
			onEnded,
			onProgress,
			onCanPlay,
			onLoadStart,
			onWaiting,
			onPlaying,
			play,
			pause,
			onClose,
			seekTo,
			setPlaybackRate,
			speaker,
			showCoachMark,
			start,
			dismiss,
			dismissAndFocus,
			cdxIconVolumeUp,
			cdxIconClose,
			teleportTarget,
			seekOffsetSeconds: SEEK_OFFSET_SECONDS
		};
	}
} );
</script>
