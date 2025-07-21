# ReaderExperiments
A set of prototypes that aim at growing Wikipedia readers.


## Highlights
- Prototypes are temporary, disposable, and not optimized
- Decoupled architecture for fast development: back-end PHP API endpoints deliver JSON over HTTP to front-end JavaScript & CSS applications
- API endpoints are _stubs_ and can be tailored for a single feature
- User interfaces in [Vue.js](https://www.mediawiki.org/wiki/Vue.js) and [Codex](https://www.mediawiki.org/wiki/Codex). The HTML output or cache is left untouched if possible
- One-time shared setup for metrics integration, user preferences, etc.


## Get your hands dirty
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


### Lint

#### Back end
``` sh
docker compose exec mediawiki bash
cd extensions/ReaderExperiments
composer install
composer test
```


#### Front end
``` sh
curl -fsS 'https://gerrit.wikimedia.org/g/fresh/+/24.05.1/bin/fresh-install?format=TEXT' | base64 --decode | python3
fresh-node -env -net
cd extensions/ReaderExperiments
npm ci
npm test
```


### Test

#### Back end
``` sh
docker compose exec mediawiki bash
composer phpunit:entrypoint -- extensions/ReaderExperiments/tests/phpunit/
```


#### Front end
To be defined.
