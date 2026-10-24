# Mobile Screen Contracts: Core Journeys

This on-demand subdomain node normatively continues the Mobile Screen Contract for its six core discovery and planning Surfaces.

## `mobile-shell-and-preferences`

- Route / Entry: native shell and `/onboarding-preferences`; enter from Me → Preferences & Permissions, first-use routing, or deep link.
- Primary judgment: whether the product has enough explicit location/profile/preference context to produce a truthful personal decision.
- Regions: safe-area shell; five-tab navigation; permission/profile summary; scrolling preference flow; guarded merge or permission sheet.
- Fixed / Overlay ownership: `primary-tab-bar` is safe-area fixed; `permission-step` and merge/selection layers own focus while open.
- Material controls in order: `primary-tab-bar`, `permission-step`, `preference-wizard`, `profile-switcher`.
- Commit / Exit: permission choice may choose a manual/degraded path; preference/profile changes commit one version and return to the prior route without losing task context.
- Verification emphasis: five distinct tab route/screen identities, independent tab stack and scroll/canvas restoration, native back/deep-link recovery, point-of-use denial alternative, durable profile save/switch/merge, 200% text, three modes.
- RuntimeRoot owns startup restoration of the native shell's local preferences, independently of whether Me is visited. Hydration has its own in-flight/retry state, separate from saves; a late read merges untouched fields and presets without replacing already committed local choices. The saved destination is only a restoration hint and never replaces the Expo Router route graph.
- The shell publishes location, profile, map selection and Decision Context revision in one state snapshot. `useDecisionSnapshot` distinguishes the route/search origin from the selected observing place; Tonight, Forecast, Sky and Shooting consume the latter. Map selection rules remain in their pure owner, with one stored selection. Browsing a spot deep link does not adopt its potentially approximate coordinate or replace the observing place.
- A current qualified Map-list refetch may update facts for the same selected id atomically across marker, summary, observer, route and navigation. Admission captures location and selection generation before dispatch; a later explicit choice, including same-id replacement or ABA, cannot be overwritten. Route mode and role edits preserve their intent without cancelling independent current place facts. Missing selected items never select the first result; detail-only restricted coordinates do not supply exact observing facts.
- Decision time preserves the exact UTC moment and its origin (`now`, night preview or explicit selection). Observing-night membership follows local noon to next noon. Changing night uses the existing 18:00 forecast start as an explicitly unselected preview; it is not a best-time result. Until a verified place-timezone source exists, the App discloses its `Asia/Shanghai` product default. Invalid date/time edits do not commit.
- Device-location selection obtains a one-shot foreground fix through the installed Expo adapter after permission succeeds. Its actual coordinates, WGS84 identity, accuracy, sampling time and reported mock flag travel together to local persistence; zero coordinates are valid, and legacy missing provenance stays unknown. Permission denial, unavailable positioning and failed persistence remain distinct. Closing, manual replacement, tab departure and backgrounding detach the pending logical reader; already dispatched durable writes settle in order before later choices. The adapter owns one native request until it settles, even after all readers leave, so reopening cannot accumulate native requests. The public one-shot API exposes no cancellation acknowledgement; logical cancellation does not establish physical resource release. Profile switching reports persistence failure in its owning dialog and preserves the current profile for retry; late completion cannot close a newer dialog session.

## `tonight-decision`

- Route / Entry: `/tonight`; primary Tonight tab and notification/deep-link return.
- Primary judgment: whether to go, the best continuous observing window, and the primary/backup next action.
- Regions: location/night context; decision hero; expandable condition summary; target timeline; primary/backup recommendations; plan action.
- Fixed / Overlay ownership: the five-tab navigation owns the bottom safe area; supporting evidence expands in the route scroll without replacing the decision.
- Material controls in order: `location-date-refresh`, `decision-hero`, `condition-summary-expander`, `visible-target-timeline`, `recommendation-card`, `plan-backup-selector`.
- Commit / Exit: refresh keeps the prior report marked stale until one NightReport revision commits; place/target changes update the shared context before navigating.
- Tonight/tomorrow buttons commit directly; a custom date has a local draft with explicit Apply/Cancel. Mounting or returning does not reset the committed night. Queries derive their key and request from the same committed snapshot; late data from another night cannot be presented as current evidence.
- The POST query retains an uncertain attempt's original input/requestId and server-derived storage/owner qualification. Ephemeral or unqualified responses cannot confirm an older durable/unknown attempt. A separate temporary guest result may remain usable while the original attempt awaits its owner/readback; confirmation preserves original evidence, and a subsequent explicit refresh obtains new evidence with a new identity. No separate Save action is introduced.
- Verification emphasis: two places and two nights vary the result, safety blockers override score, partial-provider failure degrades honestly, restart replays the committed report.

## `forecast-and-astronomy`

- Model comparison qualification: the shared forecast comparison owner distinguishes unavailable, partial, stale and genuinely comparable evidence. The page consumes that meaning and its explanation; absent disagreement alone does not mean agreement. Missing compatibility confidence is hidden, and a partial single-range summary must not imply full continuous coverage. Primary data and complete source hours remain independently available under their own validity.

- Route / Entry: `/forecast`; enter from Tonight evidence or a context-preserving deep link.
- Primary judgment: which forecast/astronomy evidence supports, weakens, or limits the current decision.
- Regions: hourly matrix; model comparison; future-night trend; twilight/moon/target strip; layer provenance/details.
- Fixed / Overlay ownership: dense matrices own bounded horizontal/time navigation; route scroll owns vertical content; layer details use a route-owned panel/sheet.
- Material controls in order: `hourly-matrix`, `model-selector`, `trend-calendar`, `twilight-window-strip`, `weather-layer-panel`.
- Commit / Exit: model/night/layer changes update evidence for the same place/time revision or mark affected consumers stale; Back restores the Tonight evidence trigger.
- Verification emphasis: model disagreement, source/version/freshness, variable coordinates/timezones, missing-provider behavior, no invented atmospheric certainty.

## `map-route-discovery`

- Route / Entry: `/map`; primary Map tab, place/route deep link, or Tonight recommendation.
- Primary judgment: which feasible place and route should become the current plan.
- Regions: immersive map canvas; top search/night context; floating filter/layer/location controls; marker/density surface; selected-place sheet; route editor and external handoff.
- Fixed / Overlay ownership: map owns canvas gestures; `map-filter-sheet` and `selected-spot-sheet` own drag/scroll within valid 25/55/90 detents; selection remains visible outside color alone.
- Material controls in order: `map-search-context-bar`, `map-filter-sheet`, `map-layer-selector`, `map-marker-density-surface`, `selected-spot-sheet`, `route-plan-editor`, `external-navigation-action`.
- Commit / Exit: marker, card/sheet, route, place detail, and itinerary use one selected-place revision; external navigation requires an explicit vendor/field-mode warning and safe cancel/return.
- Verification emphasis: selection B synchronizes all consumers, filter no-results differs from no data, provider success/cache/timeout/straight-line degradation, coordinate policy, sheet interruption and native back.

## `spot-detail-and-trust`

- Route / Entry: `/spot/:spotId`; enter from selected map/recommendation/itinerary place.
- Primary judgment: whether this selected place is suitable, real, reachable, trustworthy, and safe.
- Regions: decision/hero; licensed media; evidence navigation; horizon/light evidence; access/facilities; safety; trust; safe-area action dock.
- Fixed / Overlay ownership: `spot-action-dock` owns the bottom safe area; media/evidence overlays restore focus and never obscure safety or source state.
- Material controls in order: `spot-hero`, `spot-media-gallery`, `evidence-section-nav`, `horizon-polar-view`, `access-facility-fact-list`, `safety-block`, `trust-panel`, `spot-action-dock`.
- Commit / Exit: adding/navigating uses the same selected place and coordinate policy; safety blockers suppress unsafe primary action and provide an alternative.
- Verification emphasis: media licence/placeholder boundary, provenance, last-mile/facilities, safety-over-score, coordinate conversion on every exit, trust/moderation state.

## `itinerary-and-collaboration`

- Route / Entry: `/trips` plus itinerary detail routes; primary Trips tab and add-to-plan actions.
- Primary judgment: whether the current versioned itinerary is executable and what changed or conflicts.
- Regions: library/create; detail tabs; overview; timeline; candidate tray; route comparison; version/share; collaboration.
- Fixed / Overlay ownership: one detail scroll owner; timeline direct manipulation owns its node only; conflict/share layers are guarded and restore their trigger.
- Material controls in order: `itinerary-library`, `itinerary-creation-form`, `itinerary-detail-tabs`, `itinerary-overview-card`, `observation-timeline-editor`, `candidate-tray`, `route-option-comparator`, `version-and-share-actions`, `collaboration-panel`.
- Commit / Exit: edits create a new itinerary revision; cancel restores the prior revision; conflicting local/remote edits require explicit resolution; share has scope, expiry and revocation.
- Private draft authority: server-derived family qualification binds each new frozen command before persistence/dispatch; unknown retries retain the original owner/body/key. Current private lists, details and editor projections withdraw on denial, and an older read cannot restore them; a later explicit successful read may restore current qualification. Recovery input remains scoped to its original owner. Legacy attempts without original proof stay unknown, and source checks do not complete native storage/restart/navigation or the whole itinerary family.
- Manual stage editing: the original draft owns supported stage add/remove/type/time changes and explicit chronological sorting; sorting preserves the actual instants. A feature-local IANA adapter validates local date/time by full roundtrip, preserves seconds/milliseconds and repeated-hour identity, rejects nonexistent local time and asks for an occurrence only when ambiguous. Timeline reading and historical differences share precise presentation. Date changes require an explicit stage-time review and never silently shift existing stages; unsupported old stage content stays read-only and is omitted from unrelated basic-field patches. Save/cancel, conflicts and unknown results continue through the original owner/base/command/receipt boundary; cancelling local editing cannot withdraw an already unknown save. This manual path does not supply route/place or computed astronomy facts, native interaction acceptance or the entire timeline family.
- Version history and restore: browse private summaries, then validate a selected exact revision and freeze its comparison with current. Preview/cancel is read-only and retains unsaved input; saving/cancelling that edit precedes restore. Restore sends the immutable source reference through the original command owner and creates one new revision atomically. Conflict retains the selected history and requires an explicit current reread/recomparison; closing history does not erase an unknown original reference/key. Stage differences include the full supported UTC instant alongside local time to distinguish seconds/milliseconds and repeated DST hours; history-summary timestamps keep their separate compact style. Actual Native readability, storage and lifecycle evidence remain with device verification.
- Verification emphasis: real create/edit, route/time propagation, reverse/interrupted timeline drag, optimistic conflict, idempotent share, application/API restart readback.
