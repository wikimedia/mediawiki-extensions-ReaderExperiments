/**
 * Global type definitions for the Image Browsing feature
 */

import 'types-mediawiki';

export interface InstrumentationPluginConfig {
	enabled: boolean;
	instrumentName: string;
	experiments: mw.testKitchen.Experiment[] | null;
}
