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

## `tonight-decision`

- Route / Entry: `/tonight`; primary Tonight tab and notification/deep-link return.
- Primary judgment: whether to go, the best continuous observing window, and the primary/backup next action.
- Regions: location/night context; decision hero; expandable condition summary; target timeline; primary/backup recommendations; plan action.
- Fixed / Overlay ownership: the five-tab navigation owns the bottom safe area; supporting evidence expands in the route scroll without replacing the decision.
- Material controls in order: `location-date-refresh`, `decision-hero`, `condition-summary-expander`, `visible-target-timeline`, `recommendation-card`, `plan-backup-selector`.
- Commit / Exit: refresh keeps the prior report marked stale until one NightReport revision commits; place/target changes update the shared context before navigating.
- Verification emphasis: two places and two nights vary the result, safety blockers override score, partial-provider failure degrades honestly, restart replays the committed report.

## `forecast-and-astronomy`

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
- Verification emphasis: real create/edit, route/time propagation, reverse/interrupted timeline drag, optimistic conflict, idempotent share, application/API restart readback.
