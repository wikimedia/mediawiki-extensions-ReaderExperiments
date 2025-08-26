<template>
	<div class="ib-detail-view-controls">
		<cdx-button
			class="ib-detail-view-controls__fullscreen"
			:aria-label="$i18n( 'readerexperiments-imagebrowsing-detail-fullscreen' ).text()"
			@click="onFullScreen"
		>
			<cdx-icon :icon="cdxIconFullscreen"></cdx-icon>
		</cdx-button>

		<!-- Share -->
		<cdx-toggle-button
			v-if="descriptionUrl"
			ref="triggerShareElement"
			v-model="showSharePopover"
			class="ib-detail-view-controls__share"
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
			:default-action="sharePopoverAction"
			@default="onCopy"
		>
			<cdx-text-input
				v-model="descriptionUrl"
				input-type="url"
				readonly
			>
			</cdx-text-input>
		</cdx-popover>

		<!-- View on Commons -->
		<!-- https://doc.wikimedia.org/codex/latest/components/demos/button.html#link-buttons-and-other-elements -->
		<a
			v-if="( descriptionUrl || '' ).includes( '//commons.wikimedia.org' )"
			:class="fakeButtonClasses"
			role="button"
			:aria-label="$i18n( 'readerexperiments-imagebrowsing-detail-view-on-commons' ).text()"
			:href="descriptionUrl"
		>
			<cdx-icon :icon="cdxIconLogoWikimediaCommons"></cdx-icon>
		</a>

		<!-- Download -->
		<cdx-toggle-button
			v-if="imageInfo.width && imageInfo.height"
			ref="triggerDownloadElement"
			v-model="showDownloadPopover"
			class="ib-detail-view-controls__download"
			:aria-label="$i18n( 'readerexperiments-imagebrowsing-detail-download' ).text()"
			@update:model-value="onDownload"
		>
			<cdx-icon :icon="cdxIconDownload"></cdx-icon>
		</cdx-toggle-button>

		<cdx-popover
			v-model:open="showDownloadPopover"
			:anchor="triggerDownloadElement"
			class="ib-detail-view-controls__download-popover"
			placement="left-end"
			:title="$i18n( 'readerexperiments-imagebrowsing-detail-download' ).text()"
			:primary-action="downloadPopoverAction"
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
</template>

<script>
const { defineComponent, ref, inject, computed, useTemplateRef } = require( 'vue' );
const useMwApi = require( '../composables/useMwApi.js' );
const { CdxButton, CdxToggleButton, CdxIcon, CdxPopover, CdxTextInput, CdxSelect } = require( '@wikimedia/codex' );
const { cdxIconFullscreen, cdxIconShare, cdxIconLogoWikimediaCommons, cdxIconDownload } = require( '../icons.json' );

const fakeButtonClasses = [
	'cdx-button',
	'cdx-button--size-medium',
	'cdx-button--icon-only',
	'cdx-button--fake-button',
	'cdx-button--fake-button--enabled'
];

/**
 * @typedef {import("../types").ImageData} ImageData
 */

/**
 * @typedef {import("../types").MwTitle} Title
 */

// @vue/component
module.exports = exports = defineComponent( {
	name: 'DetailViewControls',
	components: {
		CdxButton,
		CdxToggleButton,
		CdxIcon,
		CdxPopover,
		CdxTextInput,
		CdxSelect
	},
	props: {
		/**
		 * @type {import('vue').PropType<ImageData>}
		 */
		image: {
			type: Object,
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
		const api = useMwApi();
		const title = props.image.title;

		const triggerShareElement = useTemplateRef( 'triggerShareElement' );
		const triggerDownloadElement = useTemplateRef( 'triggerDownloadElement' );

		const { query } = await api.get( {
			formatversion: 2,
			action: 'query',
			prop: 'imageinfo',
			titles: title.getPrefixedDb(),
			iiprop: 'url|size'
		} );

		const imageInfo = computed( () => {
			if ( query && query.pages && query.pages[ 0 ] && query.pages[ 0 ].imageinfo ) {
				return query.pages[ 0 ].imageinfo[ 0 ];
			} else {
				return null;
			}
		} );

		const descriptionUrl = computed( () => {
			if ( imageInfo.value ) {
				return imageInfo.value.descriptionurl;
			} else {
				return null;
			}
		} );

		const selectedDownloadWidth = computed( () => {
			if ( imageInfo.value ) {
				return imageInfo.value.width;
			} else {
				return null;
			}
		} );

		const downloadWidths = computed( () => {
			const widthOptions = [];

			if ( imageInfo.value ) {
				const buckets = {
					original: { width: imageInfo.value.width, height: imageInfo.value.height },
					small: { width: 640, height: 480 },
					medium: { width: 1280, height: 720 }, // HD = 720p
					large: { width: 1920, height: 2160 }, // Full HD = 1080p
					xl: { width: 3840, height: 2160 } // 4K = 2160p
				};

				for ( const bucket in buckets ) {
					const { width, height } = buckets[ bucket ];
					let resizeWidth = width;
					let resizeHeight = parseInt( height * width / imageInfo.value.width );

					// if the source image is (comparatively, against the bounding
					// box of the resize bucket) higher than it is wider, then we
					// need to resize based on height; our resize function works off
					// of width, though, so let's figure out what width matches the
					// height we need to resize to
					if ( ( imageInfo.value.width / width ) < ( imageInfo.value.height / height ) ) {
						resizeWidth = parseInt( width * height / imageInfo.value.height );
						resizeHeight = height;
					}

					const isResizeable = ( imageInfo.value.width >= width ) &&
						( imageInfo.value.height >= height );

					widthOptions.push( {
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
			}

			return widthOptions;
		} );

		const showSharePopover = ref( false );
		const sharePopoverAction = {
			label: $i18n( 'readerexperiments-imagebrowsing-detail-share-copy' ).text()
		};

		const showDownloadPopover = ref( false );
		const downloadPopoverAction = {
			label: $i18n( 'readerexperiments-imagebrowsing-detail-download' ).text()
		};

		function onShare() {
			emit( 'share' );
		}

		function onDownload() {
			emit( 'download' );
		}

		function onCopy() {
			// navigator.clipboard() is not supported in Safari 11.1, iOS Safari 11.3-11.4
			if ( navigator.clipboard && navigator.clipboard.writeText ) {
				navigator.clipboard.writeText( imageInfo.value.descriptionurl );
			}
		}

		function onFileDownload() {
			emit( 'download-file' );
			window.location.href = props.image.resizeUrl( selectedDownloadWidth.value );
		}

		function onChangeDownloadSize( value ) {
			selectedDownloadWidth.value = value;
		}

		function onFullScreen() {
			emit( 'toggle-fullscreen' );
		}

		return {
			imageInfo,
			descriptionUrl,
			selectedDownloadWidth,
			downloadWidths,
			onShare,
			onDownload,
			onFileDownload,
			onFullScreen,
			onCopy,
			onChangeDownloadSize,
			showDownloadPopover,
			showSharePopover,
			sharePopoverAction,
			downloadPopoverAction,
			cdxIconDownload,
			cdxIconFullscreen,
			cdxIconLogoWikimediaCommons,
			cdxIconShare,
			fakeButtonClasses,
			triggerDownloadElement,
			triggerShareElement
		};
	}
} );
</script>

<style lang="less">
.ib-detail-view-controls {
	position: absolute;
	bottom: 16px;
	right: 16px;

	display: flex;
	flex-direction: column;
	gap: 16px;

	&__download-popover .cdx-popover__body {
		overflow-y: unset;
	}
}
</style>
