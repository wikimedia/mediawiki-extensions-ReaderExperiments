/**
 * Global type definitions for the Image Browsing feature
 */

/**
 * Interface for the data returned by the `thumbExtractor.js` utilities.
 */
export interface ThumbnailImageData {
	/** Name of the file, extracted from thumb URLs */
	name: string;

	/** The provided alt text for the thumbnail */
	alt: string;

	/** The original thumbnail (may change if lazy-loading so beware) */
	thumb: Element;

	/** The wrapping 'a' tag, if any */
	link?: Element;

	/** The thumbnail container, if present (includes image and caption) */
	container?: Element;

	/** URLs mapped by width */
	urls: Record<string, {
		src: string;
		width: number;
		height: number;
	}>;
}
