<template>
	<div class="ib-detail-view-controls">
		<!-- Full screen -->
		<cdx-toggle-button
			v-model="isUncropped"
			class="ib-detail-view-controls__crop"
			:aria-label="$i18n( 'readerexperiments-imagebrowsing-detail-crop' ).text()"
			:disabled="loading"
			@update:model-value="onCropToggle"
		>
			<cdx-icon :icon="cdxIconFullscreen"></cdx-icon>
		</cdx-toggle-button>

		<!-- Share -->
		<cdx-toggle-button
			ref="triggerShareElement"
			v-model="showSharePopover"
			class="ib-detail-view-controls__share"
			:aria-label="$i18n( 'readerexperiments-imagebrowsing-detail-share' ).text()"
			:disabled="loading"
			@update:model-value="onShareToggle"
		>
			<cdx-icon :icon="cdxIconShare"></cdx-icon>
		</cdx-toggle-button>

		<cdx-popover
			v-model:open="showSharePopover"
			:anchor="triggerShareElement"
			placement="left-end"
			:render-in-place="true"
			:title="$i18n( 'readerexperiments-imagebrowsing-detail-share' ).text()"
			:default-action="sharePopoverAction"
			@default="onClipboardCopyTo"
		>
			<cdx-text-input
				v-model="descriptionUrl"
				input-type="url"
				readonly
			>
			</cdx-text-input>
		</cdx-popover>

		<!-- Go to Commons -->
		<!-- https://doc.wikimedia.org/codex/latest/components/demos/button.html#link-buttons-and-other-elements -->
		<a
			v-if="( image.src || '' ).includes( '/wikipedia/commons/' )"
			:class="fakeButtonClasses"
			role="button"
			:aria-label="$i18n( 'readerexperiments-imagebrowsing-detail-view-on-commons' ).text()"
			:href="descriptionUrl"
			target="_blank"
			rel="noreferrer noopener"
			:disabled="loading"
			@click="onCommonsGoTo"
		>
			<cdx-icon :icon="cdxIconLogoWikimediaCommons"></cdx-icon>
		</a>

		<!-- Download -->
		<cdx-toggle-button
			ref="triggerDownloadElement"
			v-model="showDownloadPopover"
			class="ib-detail-view-controls__download"
			:aria-label="$i18n( 'readerexperiments-imagebrowsing-detail-download' ).text()"
			:disabled="loading"
			@update:model-value="onDownloadToggle"
		>
			<cdx-icon :icon="cdxIconDownload"></cdx-icon>
		</cdx-toggle-button>

		<cdx-popover
			v-model:open="showDownloadPopover"
			:anchor="triggerDownloadElement"
			class="ib-detail-view-controls__download-popover"
			placement="left-end"
			:render-in-place="true"
			:title="$i18n( 'readerexperiments-imagebrowsing-detail-download' ).text()"
			:primary-action="downloadPopoverAction"
			@primary="onFileDownload"
		>
			<cdx-select
				v-model:selected="selectedDownloadWidth"
				:menu-items="downloadWidths"
				@update:selected="onDownloadSizeChange"
			>
			</cdx-select>
		</cdx-popover>
	</div>
</template>

<script>
const { defineComponent, ref, inject, computed, useTemplateRef, watch } = require( 'vue' );
const useMwApi = require( '../composables/useMwApi.js' );
const { CdxToggleButton, CdxIcon, CdxPopover, CdxTextInput, CdxSelect } = require( '@wikimedia/codex' );
const { cdxIconFullscreen, cdxIconShare, cdxIconLogoWikimediaCommons, cdxIconDownload } = require( '../icons.json' );

const fakeButtonClassesBase = [
	'cdx-button',
	'cdx-button--size-medium',
	'cdx-button--icon-only',
	'cdx-button--fake-button'
];
const fakeButtonClassesEnabled = fakeButtonClassesBase.concat( [
	'cdx-button--fake-button--enabled'
] );
const fakeButtonClassesDisabled = fakeButtonClassesBase.concat( [
	'cdx-button--fake-button--disabled'
] );

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
		},
		/**
		 * @type {boolean}
		 */
		initialCropped: {
			type: Boolean,
			required: true
		}
	},
	emits: [
		'detail-view-crop-toggle'
	],
	setup( props, { emit } ) {
		const loading = ref( true );
		const $i18n = inject( 'i18n' );
		const api = useMwApi();

		const triggerShareElement = useTemplateRef( 'triggerShareElement' );
		const triggerDownloadElement = useTemplateRef( 'triggerDownloadElement' );

		const imageInfo = ref( null );

		const submitInteraction = inject( 'submitInteraction' ); // Instrumentation plugin

		const fetchImageInfo = async ( image ) => {
			loading.value = true;

			const { query } = await api.get( {
				formatversion: 2,
				action: 'query',
				prop: 'imageinfo',
				titles: image.title.getPrefixedDb(),
				iiprop: 'url|size'
			} );

			if ( query && query.pages && query.pages[ 0 ] && query.pages[ 0 ].imageinfo ) {
				imageInfo.value = query.pages[ 0 ].imageinfo[ 0 ];
			} else {
				imageInfo.value = null;
			}

			loading.value = false;
		};

		// Initial fetch.
		fetchImageInfo( props.image );

		// Watch for image prop changes and refetch.
		watch( () => props.image, ( newImage ) => {
			fetchImageInfo( newImage );
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

					// If the source image is (comparatively, against the bounding
					// box of the resize bucket) higher than it is wider, then we
					// need to resize based on height; our resize function works off
					// of width, though, so let's figure out what width matches the
					// height we need to resize to.
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

		const fakeButtonClasses = computed( () => {
			return loading.value ?
				fakeButtonClassesDisabled :
				fakeButtonClassesEnabled;
		} );

		//
		// Event handlers.
		//

		// Below may be a little confusing because the values are inverted.
		// Parent uses "cropped" terminology for convenience ("fullscreen"
		// is a poor descriptor for the non-cropped state, and "uncropped"
		// (are basically any inverted descriptors) are more annoying to
		// reason with. However, we're handling a button, where the true
		// state is the inverse of "cropped", so we're stuck with the
		// inverted descriptor here, but we'll swap things around when it
		// comes to interfacing with this component.
		const isUncropped = ref( !props.initialCropped );
		function onCropToggle( toggled ) {
			emit( 'detail-view-crop-toggle', !toggled );
		}

		/* eslint-disable camelcase */
		function onShareToggle( toggled ) {
			if ( toggled ) {
				submitInteraction(
					'click',
					{
						action_subtype: 'share',
						action_source: 'detail_view'
					}
				);
			}
		}

		function onCommonsGoTo() {
			submitInteraction(
				'click',
				{
					action_subtype: 'commons',
					action_source: 'detail_view'
				}
			);
		}

		function onDownloadToggle( toggled ) {
			if ( toggled ) {
				submitInteraction(
					'click',
					{
						action_subtype: 'download',
						action_source: 'detail_view'
					}
				);
			}
		}
		/* eslint-enable camelcase */

		function onClipboardCopyTo() {
			// navigator.clipboard() is not supported in Safari 11.1, iOS Safari 11.3-11.4
			if ( navigator.clipboard && navigator.clipboard.writeText ) {
				navigator.clipboard.writeText( imageInfo.value.descriptionurl );
			}
		}

		function onFileDownload() {
			window.location.href = props.image.resizeUrl( selectedDownloadWidth.value ) + '?download';
		}

		function onDownloadSizeChange( value ) {
			selectedDownloadWidth.value = value;
		}

		return {
			loading,
			descriptionUrl,
			selectedDownloadWidth,
			downloadWidths,
			isUncropped,
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
			triggerShareElement,
			onCropToggle,
			onShareToggle,
			onCommonsGoTo,
			onDownloadToggle,
			onClipboardCopyTo,
			onFileDownload,
			onDownloadSizeChange
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
