# ReaderExperiments
A set of prototypes that aim at growing Wikipedia readers.


## Highlights
- Prototypes are temporary, disposable, and not optimized
- Decoupled architecture for fast development: back-end PHP API endpoints
  deliver JSON over HTTP to front-end JavaScript & CSS applications
- API endpoints are _stubs_ and can be tailored for a single feature
- User interfaces in [Vue.js](https://www.mediawiki.org/wiki/Vue.js) and
  [Codex](https://www.mediawiki.org/wiki/Codex). The HTML output or cache is
  left untouched if possible
- One-time shared setup for metrics integration, user preferences, etc.


## Get your hands dirty

- Install MediaWiki through the [local development quickstart](https://www.mediawiki.org/wiki/Local_development_quickstart)
- Clone these repositories:
``` sh
USERNAME=  # Fill in your shell user name here
git clone ssh://${USERNAME}@gerrit.wikimedia.org:29418/mediawiki/skins/MinervaNeue skins/MinervaNeue
for extension in MobileFrontend MobileFrontendContentProvider WikimediaMessages ReaderExperiments; do
    git clone "ssh://${USERNAME}@gerrit.wikimedia.org:29418/mediawiki/extensions/${extension}" "extensions/${extension}"
done
```

- Add the following to `LocalSettings.php`:
``` php
wfLoadExtensions( [
    'MobileFrontend',
    'MobileFrontendContentProvider',
    'WikimediaMessages',
    'ReaderExperiments'
] );

wfLoadSkin( 'MinervaNeue' );
$wgDefaultMobileSkin = 'minerva';
 
$wgLanguageCode = "en";  # You can set another language here
$wgMFMwApiContentProviderBaseUri = "https://$wgLanguageCode.wikipedia.org/w/api.php";
$wgReaderExperimentsApiBaseUri = $wgMFMwApiContentProviderBaseUri;
$wgGenerateThumbnailOnParse = false;
```


### Enable Image Browsing

This feature can be enabled in two ways:

1. **URL parameter** (for testing) - append `?imageBrowsing=1` to any article URL
2. **Experiment assignment** - users assigned to the treatment group via `ExperimentManager`

Example with URL parameter: `/wiki/Angkor_Wat?imageBrowsing=1`

Notes:

- The URL parameter bypasses experiment gating for easy testing
- Without the URL parameter, the feature only loads for users in the experiment treatment group


## Development
The following instructions apply to the local development quickstart.

### Lint

#### Back end
``` sh
cd extensions/ReaderExperiments
composer update
composer fix  # Auto-fix PHP
composer test
```


#### Front end
``` sh
cd extensions/ReaderExperiments
npm ci
npm run fix  # Auto-fix JavaScript
npm run lint
```


### Test

#### Back end
``` sh
composer phpunit:entrypoint -- extensions/ReaderExperiments/tests/phpunit/
```


#### Front end
``` sh
cd extensions/ReaderExperiments
npm ci
npm run jest
```


## Instrumentation
This recipe sets up a full environment to develop instruments.

- Clone these repositories:
``` sh
for extension in EventBus EventLogging EventStreamConfig MetricsPlatform WikimediaEvents; do
    git clone "https://gerrit.wikimedia.org/r/mediawiki/extensions/${extension}" "extensions/${extension}"
done
for schema in primary secondary; do
    git clone "https://gitlab.wikimedia.org/repos/data-engineering/schemas-event-${schema}.git" "extensions/EventLogging/schemas/${schema}"
done
```

- Install `EventLogging` dependencies:
``` sh
cd extensions/EventLogging
composer update
```

- Add the following to `LocalSettings.php`:
```php
# https://www.mediawiki.org/wiki/MediaWiki-Docker/Configuration_recipes/EventLogging#Event_Platform
wfLoadExtensions( [
	'EventBus',
	'EventLogging',
	'EventStreamConfig',
    'MetricsPlatform',
	'WikimediaEvents'
] );

# EventBus
$wgEventServices = [
	'*' => [ 'url' => 'http://eventlogging:8192/v1/events' ],
];
$wgEventServiceDefault = '*';
$wgEnableEventBus = 'TYPE_EVENT';

# EventLogging
# https://github.com/wikimedia/mediawiki-extensions-EventLogging/blob/master/devserver/README.md
$wgEventLoggingServiceUri = 'http://localhost:8192/v1/events';
$wgEventLoggingBaseUri = '/beacon/event';
# Wait 1 second before sending batches of queued events
$wgEventLoggingQueueLingerSeconds = 1;
# Disable events when running PHP tests
if ( defined( 'MW_PHPUNIT_TEST' ) ) {
	$wgEnableEventBus = 'TYPE_NONE';
	$wgEventLoggingServiceUri = false;
}

# MetricsPlatform
# https://wikitech.wikimedia.org/wiki/Experimentation_Lab/Local_development_setup#Install_MetricsPlatform_extension
$wgMetricsPlatformEnable = true;
$wgMetricsPlatformInstrumentConfiguratorBaseUrl = 'http://localhost';  # MPIC URL
$wgMetricsPlatformEnableExperiments = true;
$wgMetricsPlatformEnableExperimentOverrides = true;

# Image browsing experiment's stream, pasted from
# https://github.com/wikimedia/operations-mediawiki-config/blob/f9cafeb65f80a685b64eb519691e8e4a95486e56/wmf-config/ext-EventStreamConfig.php#L2518
$wgEventStreams = [
	'mediawiki.product_metrics.readerexperiments_imagebrowsing' => [
		'schema_title' => 'analytics/product_metrics/web/base',
		'destination_event_service' => 'eventgate-analytics-external',
		'producers' => [
			'metrics_platform_client' => [
				'provide_values' => [
					// Contextual attributes, see
					// https://wikitech.wikimedia.org/wiki/Experimentation_Lab/Contextual_attributes
					'agent_client_platform',
					'agent_client_platform_family',
					'mediawiki_database',
					'mediawiki_skin',
					'page_content_language',
					'page_namespace_id',
					'performer_is_bot',
					'performer_is_logged_in',
					'performer_is_temp',
					'performer_session_id',
				],
			],
			'eventgate' => [
				'enrich_fields_from_http_headers' => [
					// Don't collect the HTTP user agent.
					'http.request_headers.user-agent' => false,
				],
				// Target non-logged readers through edge unique cookies, see
				// https://wikitech.wikimedia.org/wiki/Edge_uniques
				'use_edge_uniques' => true,
			],
		],
	],
];
$wgEventLoggingStreamNames = array_keys( $wgEventStreams );
# Uncomment this to treat all streams as if they are configured and registered
//$wgEventLoggingStreamNames = false;
```

- Edit `extensions/EventLogging/devserver/eventgate.config.yaml`:
``` yaml
schema_base_uris:
  - "../schemas/primary/jsonschema"
  - "../schemas/secondary/jsonschema"
```

- Spin up the events server:
``` sh
cd extensions/EventLogging/devserver
npm install --omit=optional
npm run eventgate-devserver
```

- Open another terminal window, cd to `devserver` and `tail -f events.json`
- Load a page like `http://localhost:4000/index.php/Eddie_Cochran`
- In the browser console, fire a test event:
``` js
mw.eventLog.submitInteraction('foo', '/analytics/product_metrics/web/base/1.4.3', 'bar')
```
- You should see the event JSON in `events.json`


## A/B tests
A/B tests live in the [Experimentation Lab](https://wikitech.wikimedia.org/wiki/Experimentation_Lab) (xLab) as _experiments_.

There are 3 layers where you can test an experiment before launch:

1. Local development environment - [set up](#Instrumentation), then use the [HTTP headers method](https://wikitech.wikimedia.org/wiki/Experimentation_Lab/Conduct_an_experiment#Test_and_debug)
2. Beta cluster - same as above, but in a production-like environment
3. Production - [override enrollment](https://wikitech.wikimedia.org/wiki/Experimentation_Lab/Conduct_an_experiment#Override_enrollment)
