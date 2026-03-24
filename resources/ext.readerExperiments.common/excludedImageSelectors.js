/**
 * CSS classes for images that should be excluded from the image browsing feature.
 *
 * These classes typically represent:
 * - Template-generated images
 * - Images that don't make sense in a gallery context
 *
 * Add new classes here as they are discovered to cause issues with the feature.
 *
 * @todo Find a more sustainable way to handle some of these very-specific
 *       classes and placeholder images by fixing the templates that emit them
 *       to use explicit markup like the `noviewer` or `metadata` classes
 *       around images that shouldn't be treated as photo-view-friendly
 *       content.
 *       It won't scale to list all the ones people notice one at a time
 *       if we push this feature to production.
 */
module.exports = [
	// Clade table images derived from Template:Clade (cladogram)
	'.clade',
	// thumbnails in a navigational template
	'.navbox',
	// non-printable data is not content
	'.noprint',
	// placeholder images
	'a.mw-file-description[href$=":No_photo.svg"]',
	'a.mw-file-description[href$=":No-photo.svg"]',
	'a.mw-file-description[href$=":No-image.png"]',
	'a.mw-file-description[href$=":Noimage.svg"]',
	'a.mw-file-description[href$=":Noimage.png"]',
	'a.mw-file-description[href$=":Noimage_2-1.png"]',
	'a.mw-file-description[href$=":Noimage_MC.png"]',
	'a.mw-file-description[href$=":Brak_obrazka.svg"]',
	'a.mw-file-description[href$=":Brak_zdjęcia.svg"]',
	'a.mw-file-description[href$=":Ensin_imaxe.svg"]',
	'a.mw-file-description[href$=":Image_non_disponible_portrait.svg"]',
	'a.mw-file-description[href$=":ImageNA.svg"]',
	'a.mw-file-description[href$=":Noenzyimage.png"]',
	'a.mw-file-description[href$=":Imagem_em_falta.svg"]',
	'a.mw-file-description[href$=":Falta_imagem_aves.svg"]',
	'a.mw-file-description[href$=":Man_silhouette.svg"]',
	'a.mw-file-description[href$=":Replace_this_image_male.svg"]',
	'a.mw-file-description[href$=":Replace_this_image_female.svg"]',
	'a.mw-file-description[href$=":Placeholder_no_text.svg"]',
	'a.mw-file-description[href$=":Blank_50px.png"]',
	'a.mw-file-description[href$=":Blank1x1.svg"]',
	'a.mw-file-description[href$=":Cross.svg"]',
	'a.mw-file-description[href$=":Image_PlaceHolder.png"]',
	'a.mw-file-description[href$=":No_image_available.svg"]',
	'a.mw-file-description[href$=":Image_manquante.png"]',
	'a.mw-file-description[href$=":No_free_image.png"]',
	'a.mw-file-description[href$=":No_free_image.svg"]',
	'a.mw-file-description[href$=":Noantimage.svg"]',
	'a.mw-file-description[href$=":Nosnail.png"]'
];
