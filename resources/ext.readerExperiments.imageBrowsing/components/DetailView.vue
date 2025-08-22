<!-- TODO refactor into smaller components -->
<template>
	<div class="ib-detail-view">
		<!-- Image -->
		<img :src="resizedSrc" alt="">

		<!-- Caption -->
		<detail-view-caption
			v-if="caption"
			:caption="caption"
			:dominant-color-hex="dominantColorHex"
			:dominant-color-is-dark="dominantColorIsDark"
		></detail-view-caption>

		<div class="ib-detail-view__buttons">
			<!-- Full screen -->
			<cdx-button
				class="ib-detail-view__fullscreen"
				:aria-label="$i18n( 'readerexperiments-imagebrowsing-detail-fullscreen' ).text()"
				@click="onFullScreen"
			>
				<cdx-icon :icon="cdxIconFullscreen"></cdx-icon>
			</cdx-button>

			<!-- Share -->
			<cdx-toggle-button
				v-if="imageInfo.descriptionurl"
				ref="triggerShareElement"
				v-model="showSharePopover"
				class="ib-detail-view__share"
				:aria-label="$i18n( 'readerexperiments-imagebrowsing-detail-share' ).text()"
				@update:model-value="onShare"
			>
				<cdx-icon :icon="cdxIconShare"></cdx-icon>
			</cdx-toggle-button>
			<cdx-popover
				v-model:open="showSharePopover"
				:anchor="triggerShareElement"
				placement="left-end"
				:title="$i18n( 'readerexperiments-imagebrowsing-detail-share' ).text()"
				:default-action="{ label: $i18n( 'readerexperiments-imagebrowsing-detail-share-copy' ).text() }"
				@default="onCopy"
			>
				<cdx-text-input
					v-model="imageInfo.descriptionurl"
					input-type="url"
					readonly
				>
				</cdx-text-input>
			</cdx-popover>

			<!-- View on Commons -->
			<!-- https://doc.wikimedia.org/codex/latest/components/demos/button.html#link-buttons-and-other-elements -->
			<a
				v-if="( imageInfo.descriptionurl || '' ).includes( '//commons.wikimedia.org' )"
				class="cdx-button cdx-button--size-medium cdx-button--icon-only cdx-button--fake-button cdx-button--fake-button--enabled"
				role="button"
				:aria-label="$i18n( 'readerexperiments-imagebrowsing-detail-view-on-commons' ).text()"
				:href="imageInfo.descriptionurl"
			>
				<cdx-icon :icon="cdxIconLogoWikimediaCommons"></cdx-icon>
			</a>

			<!-- Download -->
			<cdx-toggle-button
				v-if="imageInfo.width && imageInfo.height"
				ref="triggerDownloadElement"
				v-model="showDownloadPopover"
				class="ib-detail-view__download"
				:aria-label="$i18n( 'readerexperiments-imagebrowsing-detail-download' ).text()"
				@update:model-value="onDownload"
			>
				<cdx-icon :icon="cdxIconDownload"></cdx-icon>
			</cdx-toggle-button>
			<cdx-popover
				v-model:open="showDownloadPopover"
				:anchor="triggerDownloadElement"
				class="ib-detail-view__download-popover"
				placement="left-end"
				:title="$i18n( 'readerexperiments-imagebrowsing-detail-download' ).text()"
				:primary-action="{ label: $i18n( 'readerexperiments-imagebrowsing-detail-download' ).text() }"
				@primary="onFileDownload"
			>
				<cdx-select
					v-model:selected="selectedDownloadWidth"
					:menu-items="downloadWidths"
					@update:selected="onChangeDownloadSize"
				>
				</cdx-select>
			</cdx-popover>
		</div>
	</div>
</template>

<script>
const { defineComponent, ref, inject } = require( 'vue' );
const { CdxButton, CdxToggleButton, CdxIcon, CdxPopover, CdxTextInput, CdxSelect } = require( '@wikimedia/codex' );
const DetailViewCaption = require( './DetailViewCaption.vue' );
// https://doc.wikimedia.org/codex/latest/using-codex/developing.html#vue-3-icons
// https://www.mediawiki.org/wiki/Codex#Using_Codex_icons
const { cdxIconFullscreen, cdxIconShare, cdxIconLogoWikimediaCommons, cdxIconDownload } = require( '../icons.json' );
const useBackgroundColor = require( '../composables/useBackgroundColor.js' );
const useMwApi = require( '../composables/useMwApi.js' );

/**
 * @typedef {import("../types").ImageData} ImageData
 */

// @vue/component
module.exports = exports = defineComponent( {
	name: 'DetailView',
	components: {
		CdxButton,
		CdxToggleButton,
		CdxIcon,
		CdxPopover,
		CdxTextInput,
		CdxSelect,
		DetailViewCaption
	},
	props: {
		activeImage: {
			type: /** @type {import('vue').PropType<ImageData> */ ( Object ),
			required: true
		},

		caption: {
			type: [ String, null ],
			required: true
		}
	},
	emits: [
		'toggle-fullscreen',
		'share',
		'download',
		'download-file'
	],
	async setup( props, { emit } ) {
		const $i18n = inject( 'i18n' );

		const imageInfo = ref( {} );
		const downloadWidths = ref( [] );
		const selectedDownloadWidth = ref();
		const api = useMwApi();

		api.get( {
			formatversion: 2,
			action: 'query',
			prop: 'imageinfo',
			titles: props.activeImage.title.getPrefixedDb(),
			iiprop: 'url|size'
		} ).then( ( data ) => {
			imageInfo.value = data.query && data.query.pages && data.query.pages[ 0 ] && data.query.pages[ 0 ].imageinfo && data.query.pages[ 0 ].imageinfo[ 0 ];

			selectedDownloadWidth.value = imageInfo.value.width;

			// image resize download options
			const buckets = {
				original: { width: imageInfo.value.width, height: imageInfo.value.height },
				small: { width: 640, height: 480 },
				medium: { width: 1280, height: 720 }, // HD ready = 720p
				large: { width: 1920, height: 1080 }, // Full HD = 1080p
				xl: { width: 3840, height: 2160 } // 4K = 2160p
			};
			for ( const bucket in buckets ) {
				const dimensions = buckets[ bucket ];

				let resizeWidth = dimensions.width;
				let resizeHeight = parseInt( dimensions.height * dimensions.width / imageInfo.value.width );
				if ( imageInfo.value.width / dimensions.width < imageInfo.value.height / dimensions.height ) {
					// if the source image is (comparatively, against the bounding
					// box of the resize bucket) higher than it is wider, then we
					// need to resize based on height; our resize function works off
					// of width, though, so let's figure out what width matches the
					// height we need to resize to
					resizeWidth = parseInt( dimensions.width * dimensions.height / imageInfo.value.height );
					resizeHeight = dimensions.height;
				}

				const isResizeable = imageInfo.value.width >= dimensions.width && imageInfo.value.height >= dimensions.height;

				downloadWidths.value.push( {
					// i18n messages:
					// readerexperiments-imagebrowsing-detail-download-size-original,
					// readerexperiments-imagebrowsing-detail-download-size-small,
					// readerexperiments-imagebrowsing-detail-download-size-medium,
					// readerexperiments-imagebrowsing-detail-download-size-large,
					// readerexperiments-imagebrowsing-detail-download-size-xl,
					label: $i18n( 'readerexperiments-imagebrowsing-detail-download-size-' + bucket, resizeWidth, resizeHeight ).text(),
					value: resizeWidth,
					disabled: !isResizeable
				} );
			}
		} );

		//
		// Buttons
		//
		function onFullScreen() {
			emit( 'toggle-fullscreen' );
			if ( !document.fullScreenElement ) {
				props.activeImage.thumb.requestFullscreen();
			} else {
				document.exitFullscreen();
			}
		}
		function onShare() {
			emit( 'share' );
		}
		function onDownload() {
			emit( 'download' );
		}

		//
		// Popovers
		//

		// Share
		const triggerShareElement = ref();
		const showSharePopover = ref( false );
		// Copy to clipboard
		function onCopy() {
			// navigator.clipboard() is not supported in Safari 11.1, iOS Safari 11.3-11.4
			if ( navigator.clipboard && navigator.clipboard.writeText ) {
				navigator.clipboard.writeText( imageInfo.value.descriptionurl );
			}
		}

		// Download
		const triggerDownloadElement = ref();
		const showDownloadPopover = ref( false );
		function onFileDownload() {
			emit( 'download-file' );
			window.location.href = props.activeImage.resizeUrl( selectedDownloadWidth.value );
		}
		function onChangeDownloadSize( value ) {
			selectedDownloadWidth.value = value;
		}

		// Full-screen image src
		const fullscreenWidth = Math.max(
			window.innerWidth,
			parseInt( window.innerHeight / props.activeImage.thumb.height * props.activeImage.thumb.width )
		);
		const resizedSrc = props.activeImage.resizeUrl( fullscreenWidth );

		const color = await useBackgroundColor(
			props.activeImage.thumb.src,
			props.activeImage.thumb.width,
			props.activeImage.thumb.height
		);

		const dominantColorHex = color.hex;
		const dominantColorIsDark = color.isDark;

		return {
			cdxIconFullscreen,
			cdxIconShare,
			cdxIconLogoWikimediaCommons,
			cdxIconDownload,
			onFullScreen,
			onShare,
			onDownload,
			onCopy,
			onFileDownload,
			onChangeDownloadSize,
			imageInfo,
			triggerShareElement,
			showSharePopover,
			triggerDownloadElement,
			showDownloadPopover,
			downloadWidths,
			selectedDownloadWidth,
			resizedSrc,
			dominantColorHex,
			dominantColorIsDark
		};
	}
} );
</script>

<style lang="less">
.ib-detail-view {
	width: 100%;
	height: 100vh;
	display: flex;
	align-items: end;

	img {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: -1;
	}

	&__buttons {
		position: absolute;
		bottom: 16px;
		right: 16px;

		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	&__download-popover .cdx-popover__body {
		overflow-y: unset;
	}
}

</style>
