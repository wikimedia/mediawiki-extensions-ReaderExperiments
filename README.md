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
for extension in MobileFrontend MobileFrontendContentProvider MultimediaViewer ReaderExperiments; do
    git clone "ssh://${USERNAME}@gerrit.wikimedia.org:29418/mediawiki/extensions/${extension}" "extensions/${extension}"
done
```

- Add the following to `LocalSettings.php`:
``` php
wfLoadExtensions( [
    'MobileFrontend',
    'MobileFrontendContentProvider',
    'MultimediaViewer',
    'ReaderExperiments'
] );

wfLoadSkin( 'MinervaNeue' );
$wgDefaultMobileSkin = 'minerva';

$wgLanguageCode = "en";  # You can set another language here
$wgMFMwApiContentProviderBaseUri = "https://$wgLanguageCode.wikipedia.org/w/api.php";
$wgReaderExperimentsApiBaseUri = $wgMFMwApiContentProviderBaseUri;
$wgGenerateThumbnailOnParse = false;
```

Consider using [Fresh](https://github.com/wikimedia/fresh) to handle Node.js and/or npm.

## Repo structure/code organization

This repository is not a single project, but a collection of multiple
different experiments.

In order to facilitate work across these experiments, we would like to
set up a clear structure that looks like this:

|                            | PHP Directory     | JS Directory            | RL module                   |
|----------------------------|-------------------|-------------------------|-----------------------------|
| **Shared components**      | src/Common        | resources/common        | ext.readerExperiments       |
| **Individual experiments** | src/Experiments/* | resources/experiments/* | ext.readerExperiments/*     |
| **External libraries**     |                   | resources/lib/*         | ext.readerExperiments/lib/* |

### Shared components

Frontend code shared across multiple experiments is expected to go into
the `resources/common` directory, exported through its `index.js`
entrypoint, and accessible from the `ext.readerExperiments` ResourceLoader
module. Shared PHP goes in `src/Common`.

For these shared resources, we suggest implementing them in the relevant
experiment first (although if we can make it somewhat generic from the go,
all the better) and not move them into "common" until we have a 2nd
experiment where they will actually be re-used (to prevent premature
optimization when we can't properly assess re-use nuances yet)

### Individual experiments

Each distinct experiment is placed in a standalone subdirectory under
`src/Experiments` or `resources/experiments`. The ResourceLoader module
name will be `ext.readerExperiments/<name>`, where the experiment name
suffix matches the directory name.

### External libraries

External libraries should be located in `resources/lib` and are managed
through `resources/lib/foreign-resources.yaml`.

In order to prevent conflicts with other extensions, we'll prefix the
ResourceLoader module names so that they look like
`ext.readerExperiments/lib/<name>`.


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
for extension in EventBus EventLogging EventStreamConfig TestKitchen WikimediaEvents; do
    git clone "https://gerrit.wikimedia.org/r/mediawiki/extensions/${extension}" "extensions/${extension}"
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
	'TestKitchen',
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

# Test Kitchen (FKA xLab)
# https://wikitech.wikimedia.org/wiki/Test_Kitchen/Local_development_setup#Install_TestKitchen_extension
$wgTestKitchenEnable = true;
$wgTestKitchenEnableExperiments = true;
$wgTestKitchenEnableExperimentOverrides = true;

$wgEventStreams = [
	// Add custom streams here.
];
$wgTestKitchenExperimentStreamNames = array_keys( $wgEventStreams );
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
mw.eventLog.submit(
  'foo',
  {
    $schema: '/analytics/product_metrics/web/base/2.1.0',
    action: 'test'
  }
);
```
- You should see the event JSON in `events.json`


## A/B tests
A/B tests live in the [Test_Kitchen](https://wikitech.wikimedia.org/wiki/Test_Kitchen) (FKA xLab) as _experiments_.

There are 3 layers where you can test an experiment:

1. Local development environment - [set up instrumentation](#Instrumentation), then use the [HTTP headers method](https://wikitech.wikimedia.org/wiki/Experimentation_Lab/Conduct_an_experiment#HTTP_header)
2. Beta cluster - [override enrollment](https://wikitech.wikimedia.org/wiki/Test_Kitchen/Conduct_an_experiment#Enrollment_override)
3. Production - [override enrollment](https://wikitech.wikimedia.org/wiki/Test_Kitchen/Conduct_an_experiment#Enrollment_override)
