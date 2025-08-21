/**
 * Global type definitions for the Image Browsing feature
 */

/**
 * Placeholeder type definition for MW Title objects. Does not include static methods.
 * For full documentation see https://doc.wikimedia.org/mediawiki-core/master/js/mw.Title.html.
 *
 * @todo replace this with https://github.com/wikimedia-gadgets/types-mediawiki
 * once we can use that library here.
 */
export class MwTitle {
	public constructor( title: string, namespace?: number );

	public canHaveTalkPage(): boolean;

	public exists(): boolean | null;

	public getExtension(): string | null;

	public getFileNameTextWithoutExtension(): string;

	public getFileNameWithoutExtension(): string;

	public getFragment(): string | null;

	public getMain(): string;

	public getMainText(): string;

	public getName(): string;

	public getNamespaceId(): number;

	public getNamespacePrefix(): string;

	public getNameText(): string;

	public getPrefixedDb(): string;

	public getPrefixedText(): string;

	public getRelativeText( namespace: number ): string;

	public getSubjectPage(): Title | null;

	public getTalkPage(): Title | null;

	public getUrl( params?: QueryParams ): string;

	public isTalkPage(): boolean;

	public toString(): string;

	public toText(): string;
}

/**
 * Interface for the data returned by the `thumbExtractor.js` utilities.
 */
export interface ImageData {
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

	title: MwTitle;

	/**
	 * A function for producing new thumbnails with target resolution on demand;
	 * pass in desired width in pixels to receive a URL of the appropriate size.
	 */
	resizeUrl: ( w: number ) => string;
}
