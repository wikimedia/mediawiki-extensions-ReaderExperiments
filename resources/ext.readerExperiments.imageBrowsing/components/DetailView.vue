<!-- TODO refactor into smaller components -->
<template>
	<div class="ib-detail-view">
		<!-- Image -->
		<img :src="resizedSrc" alt="">

		<!-- Caption -->
		<div
			v-if="caption"
			class="ib-detail-view__caption"
			:style="{
				'--dominant-color-hex': dominantColorHex,
				'--dominant-color-is-dark': dominantColorIsDark ? 1 : 0
			}"
		>
			<p
				ref="captionTextElement"
				class="ib-detail-view__caption-text"
				:class="{ 'ib-detail-view__caption-collapsed': !isCaptionExpanded }"
			>
				{{ caption }}
			</p>

			<cdx-button
				v-if="canCaptionExpand && !isCaptionExpanded"
				class="ib-detail-view__caption-expand"
				weight="quiet"
				size="small"
				@click="onCaptionExpand"
			>
				<cdx-icon :icon="cdxIconAdd" size="small"></cdx-icon>
				{{ $i18n( 'readerexperiments-imagebrowsing-detail-caption-expand' ).text() }}
			</cdx-button>
			<cdx-button
				v-if="canCaptionExpand && isCaptionExpanded"
				class="ib-detail-view__caption-collapse"
				weight="quiet"
				size="small"
				@click="onCaptionCollapse"
			>
				<cdx-icon :icon="cdxIconSubtract" size="small"></cdx-icon>
				{{ $i18n( 'readerexperiments-imagebrowsing-detail-caption-collapse' ).text() }}
			</cdx-button>
		</div>

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
const { defineComponent, ref, inject, nextTick } = require( 'vue' );
const { CdxButton, CdxToggleButton, CdxIcon, CdxPopover, CdxTextInput, CdxSelect } = require( '@wikimedia/codex' );
// https://doc.wikimedia.org/codex/latest/using-codex/developing.html#vue-3-icons
// https://www.mediawiki.org/wiki/Codex#Using_Codex_icons
const { cdxIconFullscreen, cdxIconShare, cdxIconLogoWikimediaCommons, cdxIconDownload, cdxIconAdd, cdxIconSubtract } = require( '../icons.json' );
const { FastAverageColor } = require( 'fast-average-color' );

// @vue/component
module.exports = exports = defineComponent( {
	name: 'DetailView',
	components: {
		CdxButton,
		CdxToggleButton,
		CdxIcon,
		CdxPopover,
		CdxTextInput,
		CdxSelect
	},
	props: {
		activeImage: {
			type: Object,
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
	setup( props, { emit } ) {
		const $i18n = inject( 'i18n' );

		const imageInfo = ref( {} );
		const downloadWidths = ref( [] );
		const selectedDownloadWidth = ref();
		const apiBaseUri = mw.config.get( 'ReaderExperimentsApiBaseUri' );
		const api = apiBaseUri ? new mw.ForeignApi( apiBaseUri, { anonymous: true } ) : new mw.Api();
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

		// render captions collapsed by default; once rendered, nextTick will
		// execute and check if the caption text is overflowing - if not, then
		// we ought to hide the "More" button because there's nothing to expand
		const captionTextElement = ref();
		const canCaptionExpand = ref( true );
		const isCaptionExpanded = ref( false );
		nextTick( () => {
			canCaptionExpand.value = captionTextElement.value.clientHeight !== captionTextElement.value.scrollHeight;
		} );
		function onCaptionExpand() {
			isCaptionExpanded.value = true;
		}
		function onCaptionCollapse() {
			isCaptionExpanded.value = false;
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

		// Captions background color (= dominant image color)
		const dominantColorHex = ref();
		const dominantColorIsDark = ref();
		const image = new Image();
		image.onload = () => {
			const options = {
				algorithm: 'simple',
				width: props.activeImage.thumb.width,
				height: props.activeImage.thumb.height
			};
			const color = new FastAverageColor().getColor( image, options );
			dominantColorHex.value = color.hex;
			dominantColorIsDark.value = color.isDark;
		};
		if ( apiBaseUri ) {
			image.crossOrigin = 'anonymous';
		}
		image.src = props.activeImage.thumb.src;

		return {
			cdxIconFullscreen,
			cdxIconShare,
			cdxIconLogoWikimediaCommons,
			cdxIconDownload,
			cdxIconAdd,
			cdxIconSubtract,
			onFullScreen,
			onShare,
			onDownload,
			onCopy,
			onFileDownload,
			onChangeDownloadSize,
			onCaptionExpand,
			onCaptionCollapse,
			imageInfo,
			triggerShareElement,
			showSharePopover,
			triggerDownloadElement,
			showDownloadPopover,
			downloadWidths,
			selectedDownloadWidth,
			resizedSrc,
			dominantColorHex,
			dominantColorIsDark,
			captionTextElement,
			canCaptionExpand,
			isCaptionExpanded
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

	&__caption {
		--caption-padding: 20px;
		--gradient-height: 60px;

		font-weight: bold;
		width: 100%;
		max-height: calc( 100% - var( --caption-padding ) - var( --gradient-height ) );
		margin: 0;
		padding: var( --caption-padding );

		// preserve space for buttons on the right: 32px (button width) + 2x 20px (button margin on either side)
		padding-right: calc( var( --caption-padding ) + 32px + var( --caption-padding ) );

		// colorize caption text & background (which comes in from a transparent top)
		padding-top: calc( var( --caption-padding ) + var( --gradient-height ) );
		background-image: linear-gradient( transparent, var( --dominant-color-hex ) var( --gradient-height ) );

		p, .ib-detail-view__caption-expand, .ib-detail-view__caption-collapse {
			color: ~"oklch( from var( --dominant-color-hex ) calc( l * var( --dominant-color-is-dark ) * 100 ) c h )";
		}

		.ib-detail-view__caption-expand, .ib-detail-view__caption-collapse {
			float: right;
		}

		.ib-detail-view__caption-text {
			padding: 0;
			max-height: 75vh;
			overflow: hidden;

			&.ib-detail-view__caption-collapsed {
				display: -webkit-box;
				-webkit-box-orient: vertical;
				-moz-box-orient: vertical;
				-ms-box-orient: vertical;
				box-orient: vertical;
				-webkit-line-clamp: 3;
				-moz-line-clamp: 3;
				-ms-line-clamp: 3;
				line-clamp: 3;
			}
		}
	}

	&__download-popover .cdx-popover__body {
		overflow-y: unset;
	}
}

</style>
