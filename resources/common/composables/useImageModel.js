/**
 * @typedef {import('types-mediawiki')} MediaWikiTypes
 * @typedef {import('vue').Ref<string | null>} StringRef
 * @typedef {import('../../../../MultimediaViewer/resources/mmv.common/index.js')} MmvCommon
 * @typedef {MmvCommon.ImageModel} ImageModel
 * @typedef {import('vue').Ref<ImageModel | null>} ImageModelRef
 */

const { ref, watch } = require( 'vue' );

/**
 * @param {StringRef} nameRef
 * @return {ImageModelRef}
 */
module.exports = function useImageModel( nameRef ) {
	const imageModel = ref( null );
	watch( nameRef, async ( name ) => {
		imageModel.value = null;

		if ( !name ) {
			return;
		}

		try {
			await mw.loader.using( 'mmv.common' );
		} catch ( error ) {
			// MultimediaViewer is not available.
			// Gracefully bow out and leave the imageModel empty.
			return;
		}

		const namespaceIds = mw.config.get( 'wgNamespaceIds' );
		const NS_FILE = namespaceIds && namespaceIds.file;
		const title = mw.Title.makeTitle( NS_FILE, name );
		if ( !title ) {
			// Invalid title; won't be able to look it up.
			return;
		}

		const { ImageInfo } = /** @type MmvCommon */ require( 'mmv.common' );
		const imageInfo = new ImageInfo( new mw.Api() );

		try {
			const /** @type ImageModel */ model = await imageInfo.get( title );

			// Staleness check after the async call!
			if ( nameRef.value === name ) {
				imageModel.value = model;
			}
		} catch ( error ) {
			mw.log.warn( 'ReaderExperiments: Failed to fetch image info from API', error );
		}
	}, {
		immediate: true
	} );
	return imageModel;
};
