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

### Installation

- Install [MediaWiki](https://gerrit.wikimedia.org/g/mediawiki/core/+/HEAD/DEVELOPERS.md)
- Set up desktop and mobile skins:
``` sh
cd core
USERNAME=  # Fill in your shell user name here
git clone ssh://${USERNAME}@gerrit.wikimedia.org:29418/mediawiki/skins/Vector skins/Vector
git clone ssh://${USERNAME}@gerrit.wikimedia.org:29418/mediawiki/skins/MinervaNeue skins/MinervaNeue
printf "\nwfLoadSkin( 'Vector' );\nwfLoadSkin( 'MinervaNeue' );\n" >> LocalSettings.php
```

- Set up the extension:
``` sh
git clone ssh://${USERNAME}@gerrit.wikimedia.org:29418/mediawiki/extensions/ReaderExperiments extensions/ReaderExperiments
printf "\nwfLoadExtension( 'ReaderExperiments' );\n" >> LocalSettings.php
```



- When running this with MobileFrontendContentProvider, also add these variables to LocalSettings.php:
```php
$wgReaderExperimentsApiBaseUri = 'https://en.wikipedia.org/w/api.php'; // or whatever $wgMFMwApiContentProviderBaseUri is set to
$wgGenerateThumbnailOnParse = false;
```

#### Quick start

The quickest way to get up and running with the extension is to enable:
- [MobileFrontendContentProvider](https://www.mediawiki.org/wiki/Extension:MobileFrontendContentProvider)
- [WikimediaMessages](https://www.mediawiki.org/wiki/Extension:WikimediaMessages)

After doing so, navigate to the page Angkor_Wat.

### Enabling image browsing

Image browsing can be enabled in two ways:

1. **URL parameter** (for testing): Add `?imageBrowsing=1` to any article URL
2. **Experiment assignment**: Users assigned to the treatment group via ExperimentManager

Example with URL parameter: `/wiki/Angkor_Wat?imageBrowsing=1`

Notes:
- The URL parameter bypasses experiment gating for easy testing
- Without the URL parameter, the feature only loads for users in the experiment treatment group

### Development

The following instructions are specific to a local environment setup that
uses Docker.

#### Lint

##### Back end
``` sh
docker compose exec mediawiki bash
cd extensions/ReaderExperiments
composer install
composer fix  # Auto-fix PHP
composer test
```


##### Front end
``` sh
curl -fsS 'https://gerrit.wikimedia.org/g/fresh/+/24.05.1/bin/fresh-install?format=TEXT' | base64 --decode | python3
fresh-node -env -net
cd extensions/ReaderExperiments
npm ci
npm run fix  # Auto-fix JavaScript, Styles, and Banana (i18n messages)
npm run lint
```


#### Test

##### Back end
``` sh
docker compose exec mediawiki bash
composer phpunit:entrypoint -- extensions/ReaderExperiments/tests/phpunit/
```


##### Front end
``` sh
fresh-node -env -net
cd extensions/ReaderExperiments
npm ci
npm run jest
