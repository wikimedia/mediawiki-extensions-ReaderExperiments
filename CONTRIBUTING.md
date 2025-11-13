# ReaderExperiments Contributing Guide

## Welcome

Welcome to the ReaderExperiments Contributing Guide, and thank you for your
interest.

This guide covers the different ways you can contribute. We are always open to
contributions in the following forms:

- Bug Reports and bug fixes
- Feature Requests
- Documentation improvements

At this time, we do not accept the following contributions:

- Production-scale features (this codebase is for disposable prototypes only)
- Back-end infrastructure changes that require new server resources
- Features that cannot be enabled/disabled via URL parameters or experiment
  configuration

### ReaderExperiments overview

The purpose of the ReaderExperiments extension is to house a series of
prototypes which aim to support the growth and retention of new Wikipedia
readers. Prototypes will be evaluated through A/B testing, and successful
prototypes may be scaled up into future production features (which will live
elsewhere).

For more information, see the [README][readme] and [Architecture Decision
Records][adr].

**Important**: This codebase is for **disposable prototypes** only. No
production-scale features will be housed in this codebase. See [ADR 01:
Disposable Prototypes][adr-01] for more context.

### Community engagement

Refer to the following channels to connect with fellow contributors or to stay
up-to-date with news about the ReaderExperiments:

- Connect with our project contributors on the
[Reader Growth page][reader-growth].
- Participate in discussions in [Village Pump][village-pump].
- Stay updated on the latest news and changes to the project by following
  [MediaWiki's version lifecycle page][version-lifecycle].

## Contributing

Guidelines for specific ways of contributing to this project can be found
below.

### Ground rules

Before contributing, read our [Code of Conduct][coc] to learn more about our
community guidelines and expectations.

### Bug Reports

We use Phabricator to track tasks and bug reports. To report a bug:

1. **Search for existing issues**: Check if the issue has already been reported
   in [Phabricator][phabricator-board].
2. **Create a new issue**: If the issue doesn't exist, create a new issue on
   Phabricator through the Create Task dropdown.
3. **Provide details**: Include:
   - A clear description of the issue
   - Steps to reproduce
   - Expected vs. actual behavior
   - Your environment (MediaWiki version, browser, etc.)
   - Screenshots or error messages if applicable

### Proposals and feature requests

To share your new ideas for the project, perform the following actions:

1. Create an issue on [Phabricator][phabricator-project].
2. Describe your idea clearly, including:
   - The problem you're trying to solve
   - How your prototype would address it
   - Why it fits the disposable prototype model
3. Wait for feedback from maintainers before starting implementation.

### Code contribution

#### Before you start

Before you start contributing, ensure you have the following:

- A [Wikimedia developer account][wmf-dev-account] with Gerrit access
- A local MediaWiki development environment (see [Local development
  quickstart][local-dev])
- Node.js and npm
- PHP 8.1+ and Composer
- Basic familiarity with MediaWiki extension development, Vue.js, and PHP

For more information, see [How to become a MediaWiki hacker][mw-hacker].

#### Environment setup

For installation and setup instructions, including cloning the repository,
installing dependencies, and configuring LocalSettings.php, see the [README's
setup section][readme-setup].

For instrumentation setup for event logging, see the [README's Instrumentation
section][readme-instrumentation].

#### Troubleshooting

For general MediaWiki development issues, consult the [Installing MediaWiki
documentation][installing-mw].

#### Best practices

Our project uses the following resources as our parent guides for best
practices:

- **PHP**: [MediaWiki's PHP coding conventions][php-conventions]
- **JavaScript/Vue.js**: [MediaWiki's JavaScript coding
  conventions][js-conventions] and [Vue.js style guide][vue-style]
- **CSS/LESS**: [MediaWiki's CSS coding conventions][css-conventions]

Reference these guides to familiarize yourself with the best practices we want
contributors to follow.

#### Prototype development principles

- **Disposability**: Prototypes are temporary and not optimized for long-term
  use
- **Client-side focus**: Prefer client-side solutions over back-end
  infrastructure
- **Self-contained**: Prototypes should be as self-contained as possible
- **Experiment-ready**: Prototypes should be easily enabled/disabled via URL
  parameters or experiment configuration.

#### Contribution workflow

##### Fork and clone repositories

ReaderExperiments uses [Gerrit Code Review][gerrit] for code review. To
contribute:

1. **Set up Gerrit**: Follow the [Gerrit/Tutorial][gerrit-tutorial] to set up
   your Gerrit account and SSH keys.

2. **Clone the repository**:
```sh
   git clone "ssh://USERNAME@gerrit.wikimedia.org:29418/mediawiki/extensions/ReaderExperiments"
```

3. **Install the commit-msg hook**:
```sh
   cd ReaderExperiments
   git review -s
```

#### Issue management

Issues are managed through Gerrit Code Review. When creating or tagging issues:

- Use descriptive titles
- Tag issues with appropriate labels (bug, enhancement, documentation, etc.)
- Reference related issues or patches when applicable
- Keep issues up to date with status changes

#### Commit messages

Follow [MediaWiki's commit message guidelines][commit-guidelines]:

- Use a short summary line (50 characters or less)
- Follow with a blank line and a detailed description
- Reference related issues or patches
- Use the present tense ("Add feature" not "Added feature")

Example:
```
Add image browsing prototype

This commit adds a new prototype for browsing images in articles.
The feature can be enabled via URL parameter ?imageBrowsing=1.

Bug: T123456
```

#### Submitting patches

In MediaWiki, we use "change requests" (patches) in Gerrit instead of pull
requests. To submit a change:

1. **Make your changes** following the best practices and coding conventions.

2. **Run tests and linting**:
```sh
   # Back end
   composer test

   # Front end
   npm run test
```

3. **Fix any issues** found by the linters or tests.

4. **Commit your changes** following the commit message guidelines.

5. **Push to Gerrit**:
```sh
   git review
```

6. **Wait for code review**: A maintainer will review your change. Address any
   feedback by amending your commit and pushing again.

For more information, see [Gerrit/Tutorial][gerrit-tutorial].

#### Releases

ReaderExperiments follows MediaWiki's "continuous integration" development
model, where software changes are pushed live to wikis regularly. [See
deployment schedule][deployment].

#### Text formats

When editing and creating documents:

- **Markdown**: Use Markdown (`.md` files) for documentation
- **PHP**: Use PHP for back-end code, following MediaWiki's PHP coding
  conventions
- **JavaScript**: Use JavaScript/ES6+ for front-end code, following MediaWiki's
  JavaScript coding conventions
- **Vue.js**: Use [Vue.js][vuejs] for component-based UI development
- **LESS**: Use LESS for stylesheets, following MediaWiki's CSS coding
  conventions
- **JSON**: Use JSON for configuration files (e.g., `extension.json`,
  `package.json`)

[readme]: README.md
[adr]: docs/adr/
[adr-01]: docs/adr/01-disposable-prototypes.md
[reader-growth]: https://www.mediawiki.org/wiki/Readers/Reader_Growth
[village-pump]: https://en.wikipedia.org/wiki/Wikipedia:Village_pump
[version-lifecycle]: https://www.mediawiki.org/wiki/Version_lifecycle
[coc]: CODE_OF_CONDUCT.md
[phabricator-board]: https://phabricator.wikimedia.org/project/board/8003/
[phabricator-project]: https://phabricator.wikimedia.org/project/view/8003/
[wmf-dev-account]: https://www.mediawiki.org/wiki/How_to_become_a_MediaWiki_hacker#Get_a_developer_account
[local-dev]: https://www.mediawiki.org/wiki/Local_development_quickstart
[mw-hacker]: https://www.mediawiki.org/wiki/How_to_become_a_MediaWiki_hacker
[readme-setup]: README.md#get-your-hands-dirty
[readme-instrumentation]: README.md#instrumentation
[installing-mw]: https://www.mediawiki.org/wiki/Manual:Installing_MediaWiki
[php-conventions]: https://www.mediawiki.org/wiki/Manual:Coding_conventions/PHP
[js-conventions]: https://www.mediawiki.org/wiki/Manual:Coding_conventions/JavaScript
[vue-style]: https://vuejs.org/style-guide/
[css-conventions]: https://www.mediawiki.org/wiki/Manual:Coding_conventions/CSS
[gerrit]: https://www.mediawiki.org/wiki/Gerrit
[gerrit-tutorial]: https://www.mediawiki.org/wiki/Gerrit/Tutorial
[commit-guidelines]: https://www.mediawiki.org/wiki/Gerrit/Commit_message_guidelines
[deployment]: https://wikitech.wikimedia.org/wiki/Deployments
[vuejs]: https://vuejs.org/