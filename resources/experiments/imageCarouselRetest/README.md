# Image Carousel Retest: How Tracking Works

This experiment tests different versions of the mobile Wikipedia image carousel.

Readers are placed into one of five groups:

| Group                  | Carousel | Captions | Jump link | Hide/Show |
| ---------------------- | -------: | -------: | --------: | --------: |
| Control                |       No |       No |        No |        No |
| Vanilla carousel       |      Yes |       No |        No |       Yes |
| Captions only          |      Yes |      Yes |        No |       Yes |
| Jump link only         |      Yes |       No |       Yes |       Yes |
| Captions and jump link |      Yes |      Yes |       Yes |       Yes |

## Eligibility

Before showing the experiment, the system checks that the reader:

* Is using a mobile device and the Minerva skin
* Is logged out
* Is viewing a regular article page
* Is not viewing a diff, old revision, special page, or main page
* Is not excluded by a page setting
* Is viewing a page with at least three eligible images
* Has a recognized experiment assignment

## When tracking begins

Checking a reader’s group does not send tracking data.

Tracking begins only after:

1. The reader passes the eligibility checks.
2. The system finds the reader’s assigned group.
3. The correct carousel version is applied.
4. The carousel finishes loading.

The system then records the reader’s experiment exposure and page visit. A shared setup process prevents duplicate visits if the page starts more than once.

If setup fails, it is not automatically retried on the same page.

## Actions that are recorded

The experiment records these accepted actions:

* `thumbnailOpen` — the reader opens an image thumbnail
* `carouselHide` — the reader hides the carousel
* `carouselShow` — the reader shows it again
* `viewDetails` — the reader opens more image information
* `licenseInfo` — the reader opens the license information
* `scrollToImage` — the reader uses the jump link

Actions before the experiment is ready, actions from the control group, and unknown action names are ignored.

The jump link is available only in the two groups that include it. There is no separate caption event.

New controls should send actions through the shared action system instead of calling `recordInteraction()` directly.

## MMV and carousel behavior

MMV is the Media Viewer feature that displays images.

The experiment listens for accepted MMV actions. It creates only one listener, even if setup happens more than once.

If a reader clicks while tracking is still loading, the action waits for setup to finish. A click that happened before the listener existed is not counted afterward.

Tracking errors must not stop the carousel from working.

Actions are recorded at these points:

* `thumbnailOpen`: after a valid thumbnail opens the image details
* `carouselHide` and `carouselShow`: after the reader changes the carousel’s state
* `viewDetails`: just before opening the Media Viewer
* `scrollToImage`: after the jump-link action is accepted

If the destination image cannot be found, the jump-link click is still counted.

Restoring a saved carousel setting does not count as a new hide or show action.

## License information

The retest reuses the existing full-screen viewer license/file-page link in
`mmv.ui.beta/LightboxCaption.vue`, matching the reviewed user flow. It does not
add a license control to the intermediate carousel dialog or fetch extra metadata.

The existing label and file-page destination are unchanged. Its click handler
fires `licenseInfo` through the retest action hook and retains the generic MMV
`go_to_file` event. The retest listener accepts the event only after readiness
and for treatment assignments; control and unenrolled readers do not emit it.
Metadata loading itself does not count as a click.

## Server and browser setup

The server checks eligibility, reads the assigned group, and:

* Shows no carousel for the control group
* Prepares the carousel for treatment groups
* Sends the same eligibility information to all groups

The browser then confirms that its assignment matches the server’s assignment. It applies the correct settings for captions, the jump link, and the Hide/Show button.

The browser waits for the carousel to finish loading before recording the exposure.

If configuration is missing, assignments do not match, or loading fails, no exposure is recorded.

Experiment pages disable MMV’s normal automatic startup so the carousel cannot start with the wrong settings. License information and View details remain available in every treatment group.

The GrowthBook key is:

`image-carousel-retest`


## TODO(image-carousel-retest): Cleanup after the experiment

Coordinate removal across ReaderExperiments and MultimediaViewer after the
experiment's measurement period, including the 21-day retention follow-up, is
complete. Choose the permanent carousel UI before removing treatment options.
Search both repositories for `TODO(image-carousel-retest)` to find inline reminders.

- [ ] Retire the `image-carousel-retest` assignment/configuration in Test Kitchen
  as part of experiment shutdown. Configuration is outside this directory.
- [ ] Remove this entire `resources/experiments/imageCarouselRetest/` directory,
  including `groups.json` and this README, after completing this checklist.
- [ ] Remove `src/Experiments/ImageCarouselRetest/Hooks.php`.
- [ ] In ReaderExperiments `extension.json`, remove the `ImageCarouselRetestHooks`
  handler, its `MultimediaViewerBeforeMobileCarousel` hook registration, and both
  `ext.readerExperiments.imageCarouselRetest` ResourceModules (base and `.init`).
- [ ] Remove `tests/jest/ImageCarouselRetestEntryPoint.test.js`,
  `tests/jest/ImageCarouselRetestInstrumentation.test.js`, and
  `tests/phpunit/unit/ImageCarouselRetestHooksTest.php` with the experiment code.
- [ ] In MultimediaViewer `includes/Hooks.php`, remove the temporary rendering
  override and restore the direct normal rollout check. Remove the additional
  root-attribute plumbing and `MediaWikiServices` import if no other consumers
  need them. Preserve the shared page/image eligibility checks.
- [ ] In MultimediaViewer `carousel.js`, remove the experiment initialization
  handoff/export, deferred-root handling, and arm-specific display options once
  ReaderExperiments no longer calls them. Preserve normal automatic startup and
  the chosen permanent captions, jump-link, and hide/show behavior.
- [ ] Remove `showJumpLink` injection, prop wiring, conditional rendering, and
  experiment-specific guards in `App.vue` and `Detail.vue` in accordance with
  the chosen permanent UI.
- [ ] Remove the `mmv.carousel.action` fires in MultimediaViewer and their
  ReaderExperiments listener together, after checking for other consumers.
  Preserve existing `instrument.send` tracking and actual navigation, scrolling,
  section expansion, thumbnail opening, and hide/show behavior.
- [ ] Remove the retest hook fire from `mmv.ui.beta/LightboxCaption.vue`.
  Preserve its existing license label, link destination, and generic `go_to_file`
  event. There is no additional license UI or metadata lookup to remove.
- [ ] Verify the permanent carousel starts without ReaderExperiments, and that
  no references to removed modules, config variables, hooks, or messages remain.

JSON files cannot contain TODO comments; their removals are listed here instead.
