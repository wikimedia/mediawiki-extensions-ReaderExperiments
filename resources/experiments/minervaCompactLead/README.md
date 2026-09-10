# Minerva Compact Lead

[GrowthBook experiment](https://growthbook.wikimedia.org/experiment/exp-2lq00w7nmtvpm33f) · [T432075](https://phabricator.wikimedia.org/T432075)

Experiment key: `minerva-compact-lead`. **Three arms**, split equally:

| Variation ID | Treatment |
| --- | --- |
| `control` | Full lead, existing infobox |
| `trunc-lead` | Truncated lead with Read more, existing infobox |
| `trunc-lead-infobox` | Truncated lead with Read more, collapsed Quick Facts |

## Configuration

GrowthBook uses **Edge Unique ID (Cache splitting)**, 100% of permitted traffic,
and wiki targeting: `arwiki`, `eswiki`, `frwiki`, `idwiki`, `itwiki`, `jawiki`,
`ptwiki`, `viwiki`, `zhwiki`. Dates and allocation are managed in GrowthBook.
The PHP hook limits participation to anonymous mobile Minerva article views
with a nonempty Parsoid lead, excluding main pages and diffs. Short leads and
pages without infoboxes remain eligible. Keep global `MFQuickFacts` and
`MinervaTruncateLeadSection` flags off; the hook enables the assigned treatment.

Stream: `product_metrics.web_base`. Schema: `/analytics/product_metrics/web/base/2.2.0`.
Contextual attributes: `mediawiki_database`, `mediawiki_skin`, `page_content_language`,
`page_namespace_id`, `performer_is_logged_in`, `performer_is_temp`,
`performer_session_id`, `performer_pageview_id`. Risk: Tier 3 (Low).

## Metrics

All arms send exposure and `page_visit` when first visible. The primary metric,
**21-day web reader retention**, accepts `page_visit` and `page-visited` from
Web Actions, from 1 day after first exposure until before 22 days after exposure.
Our observations cover eligible experiment pages only.

These secondary ratios count matching Web Actions events divided by `page_visit`
events after exposure, with no additional metric window:

| Metric | Numerator filters (AND) |
| --- | --- |
| [Minimal Minerva Toolbar] Edit attempt rate | `action = edit_attempt_init` |
| Read more tap rate | `action = click`, `element_friendly_name = read_more_button` |
| Quick Facts expansion rate | `action = click`, `element_friendly_name = quick_facts_toggle`, `action_subtype = expand` |
| Quick Facts collapse rate | `action = click`, `element_friendly_name = quick_facts_toggle`, `action_subtype = collapse` |

Ratios include repeated taps and visits without the control. Read more applies to
both treatments; Quick Facts applies only to `trunc-lead-infobox`. Edits use
MobileFrontend's `editAttemptStep` signal. No guardrail metric is selected.

**Readers with a session over 60 seconds** is a Proportion metric on Web session
tick times, filtered by `tick_time_s > 60`. **Web session length**, also selected,
averages each reader's maximum tick time. Both use observations after exposure
without an additional metric window.

## Session tracking and testing

`sessionTracker.js` adapts the former SessionLengthInstrumentMixin for
`experiment.send()`. It sends `tick` with `instrument_name = SessionLength` and
a zero-based counter string in `action_context`. The fact table multiplies this
by 30 seconds; counter 3 is the first value above 60 (90 estimated seconds).
State persists across eligible pages in sessionStorage. Ticks pause after 100
seconds of inactivity and reset on resuming after more than one hour since the
last tick. Hiding the tab does not itself pause ticks; idle gaps add no catch-up
ticks. Unavailable storage sends `feature_not_available` and stops timing.

Use the [local setup](../../../README.md#instrumentation) with
`?mpo=minerva-compact-lead:trunc-lead-infobox`, substituting each variation ID.
Before launch, verify incoming events and fact-table queries: the shared tick
table still selects the older `performer.active_browsing_session_token` column.
