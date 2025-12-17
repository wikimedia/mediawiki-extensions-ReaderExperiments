/**
 * Global type definitions for the Image Browsing feature
 */

import 'types-mediawiki';

/**
 * Interface for the data returned by the `thumbExtractor.js` utilities.
 */
export interface ImageData {
	/** Name of the file, extracted from thumb URLs */
	name: string;

	/** The provided alt text for the thumbnail */
	alt?: string;

	/** The original thumbnail (may change if lazy-loading so beware) */
	thumb?: Element;

	/** The wrapping 'a' tag, if any */
	link?: Element;

	/** The thumbnail container, if present (includes image and caption) */
	container?: Element;

	/** The figcaption element, if present (contains caption) */
	caption?: Element;

	/** The extracted src attribute (may be from lazy-loader) */
	src: string;

	/** The extracted srcset attribute (may be from lazy-loader) */
	srcset: string;

	/** The extracted width attribute (may be from lazy-loader) */
	width: number;

	/** The extracted height attribute (may be from lazy-loader) */
	height: number;

	title: mw.Title;

	/** The nearby paragraph text in raw HTML format */
	paragraph?: string;

	/** The wikibase label ("caption" in commonswiki parlance) */
	label?: string;

	/** Domain names of external projects where this image is used */
	externalSources?: string[];

	/**
	 * A function for producing new thumbnails with target resolution on demand;
	 * pass in desired width in pixels to receive a URL of the appropriate size.
	 */
	resizeUrl: ( w: number ) => string;
}

export interface InstrumentationPluginConfig {
	enabled: boolean;
	instrumentName: string;
	experiments: mw.testKitchen.Experiment[] | null;
}
