<template>
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
const { defineComponent, ref } = require( 'vue' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'ReadAloud',
	setup() {
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

		return {
			audioPlayer,
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
			load
		};
	}
} );
</script>
