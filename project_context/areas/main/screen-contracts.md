# Screen Contracts: Starward

## Authority Boundary

- `product-surface-contract.md` owns cross-surface responsibility and main/drilldown placement.
- This file owns stable route identity, semantic order, region/overlay ownership, navigation/state invariants, and the inventory of material Control Keys.
- `DESIGN.md` owns exact authored tokens and selected target interpretation. The copied resources under `docs/design-targets/**` own concrete composition only for their declared viewport, mode, state, and content coverage.
- `docs/source-plan.md` remains delivery Source and the Delivery Contract owns delivery scope and proof. Current code and implementation screenshots cannot redefine these contracts.

## Shared Mobile Screen Contract

- Platform: iOS and Android React Native; baseline viewport 390×844 with platform safe areas and 44px minimum primary targets.
- Semantic order: current conclusion or safety blocker; next place/time/route/action; supporting evidence, source, limitation, and recovery.
- Regions: platform/system safe area; route-owned header/context; one primary scroll or immersive canvas owner; route-owned overlays/sheets; safe-area fixed primary action or five-tab navigation where declared.
- Scroll and overlays: one active scroll owner at a time. A sheet owns its handle and bounded content scroll; map/sky owns pan/pinch only outside an active sheet/control gesture. Closing a layer restores focus and selection to its trigger.
- Shared state: `origin`, `observingNight`, `moment`, `preferences`, `target`, `selectedSpot`, `primaryBackupRole`, `route`, `itineraryRevision`, `freshness`, and `risk` commit through one versioned decision context.
- Navigation: Back closes the top route-owned layer before leaving the route; Android system/predictive back and iOS navigation ownership remain native. Deep links restore compatible shared state or present an honest missing/stale recovery state.
- Interaction: press feedback is immediate; commit occurs once at a valid completion point; cancellation, interruption, superseding requests, and retries preserve the last safe state. Direct manipulation starts from the live presentation value and settles only to valid bounds.
- Variants: planning, night, and red-light keep the same control/focus order. Loading, empty, no-results, stale, partial, degraded, unknown, error, offline, disabled, saving, and success appear only where applicable and never fabricate facts.
- Accessibility: 200% text reflows without clipping the primary judgment/action; screen readers receive role/name/value and material async/safety changes; reduced motion replaces large-axis/depth/elastic movement rather than merely accelerating it.
- Mobile targets: `target.mobile-product-pages-v2` is the page constraint; `target.mobile-controls-v3` is exact only for the declared per-control contract fields and stated coverage.

## `mobile-shell-and-preferences`

- Route / Entry: native shell and `/onboarding-preferences`; enter from Me → Preferences & Permissions, first-use routing, or deep link.
- Primary judgment: whether the product has enough explicit location/profile/preference context to produce a truthful personal decision.
- Regions: safe-area shell; five-tab navigation; permission/profile summary; scrolling preference flow; guarded merge or permission sheet.
- Fixed / Overlay ownership: `primary-tab-bar` is safe-area fixed; `permission-step` and merge/selection layers own focus while open.
- Material controls in order: `primary-tab-bar`, `permission-step`, `preference-wizard`, `profile-switcher`.
- Commit / Exit: permission choice may choose a manual/degraded path; preference/profile changes commit one version and return to the prior route without losing task context.
- Verification emphasis: native navigation/back, point-of-use denial alternative, durable profile save/switch/merge, 200% text, three modes.

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

## `sky-orientation-ar`

- Route / Entry: `/sky`; primary Sky tab, itinerary target, or deep link.
- Primary judgment: where the selected object is now/at the selected time and which orientation mode is trustworthy on this device.
- Regions: immersive sky canvas; top place/time/target/layer context; bottom time/orientation/FOV/AR controls; calibration sheet.
- Fixed / Overlay ownership: sky owns pan/orientation gestures; `sky-time-scrubber` owns time manipulation; `orientation-calibration-sheet` owns its drag/scroll; system edges and accessibility gestures retain priority.
- Material controls in order: `sky-canvas`, `sky-object-and-layer-panel`, `sky-time-scrubber`, `orientation-follow-toggle`, `orientation-calibration-sheet`, `obstruction-and-trajectory-overlay`, `field-of-view-overlay`, `ar-mode-toggle`.
- Commit / Exit: time commits to the shared moment after valid release; sensor/AR denial or low accuracy preserves manual orientation and universal sky; Back exits AR/calibration before route exit.
- Verification emphasis: time-position input variation, sensor/camera boundary invocation, denial/degradation, interruption/velocity seams, manual fallback, reduced motion, and the representative Android runtime required by the current target profile. The same iOS behavior remains an implementation obligation, but live iOS runtime validation is explicitly deferred and unverified.

## `shooting-assistant`

- Route / Entry: `/shooting`; enter from Sky, itinerary, or a saved shooting plan.
- Primary judgment: which conservative settings/checklist fit the selected equipment and conditions.
- Regions: equipment/target setup; preset assumptions; rule recommendation; explanation; checklist; save/version action.
- Fixed / Overlay ownership: form scroll owns content; pickers/sheets own focus while open; save remains reachable without covering fields or errors.
- Material controls in order: `shooting-setup-form`, `shooting-preset-picker`, `shooting-recommendation`, `ai-explanation-panel`, `shooting-checklist`, `save-shooting-plan`.
- Commit / Exit: recommendation is deterministic from versioned input; explanation cannot change the rule result; save writes a new version with context and supports restore.
- Verification emphasis: phone/camera/equipment input variation, assumption and risk copy, offline checklist, durable version save/readback, explanation boundary.

## `field-offline-safety`

- Route / Entry: `/field`; enter from an itinerary or Tonight field action after a readiness check.
- Primary judgment: whether the current offline plan is valid and which low-distraction safety action is next.
- Regions: offline pack/status; field dashboard; mode control; tool grid; parking/backup; safety session; location share; sync queue.
- Fixed / Overlay ownership: return/safety actions remain reachable in the safe area; native/vendor surfaces require pre-warning in red-light mode; no layer may flash to bright white/blue when controllable.
- Material controls in order: `offline-pack-manager`, `field-dashboard`, `night-red-mode-toggle`, `field-tool-grid`, `return-to-parking`, `backup-switcher`, `safety-session-panel`, `location-share-action`, `offline-sync-queue`.
- Commit / Exit: pack activation is atomic after file checksum/version validation; queued writes and share/session state persist; stop/revoke is explicit and idempotent.
- Verification emphasis: flight mode plus app kill/restart, corrupt/partial pack rejection, red-light continuity, return route, bounded share expiry/revoke, queue conflict/replay.

## `community-contribution`

- Route / Entry: `/contribute`; enter from Spot detail or Me → Contributions.
- Primary judgment: what can be safely submitted and what is its current review/expiry state.
- Regions: submission type; guided form; evidence/media privacy review; confirmation; status/appeal.
- Fixed / Overlay ownership: media picker/system permission is pre-warned; privacy review owns the pre-submit gate; status details remain route-owned.
- Material controls in order: `new-spot-wizard`, `field-report-form`, `multidimensional-review-form`, `correction-report`, `media-privacy-review`, `contribution-status-center`.
- Commit / Exit: original media enters a private sink; only a sanitized derivative can advance; submissions use idempotent revision/status transitions and preserve drafts/errors.
- Verification emphasis: EXIF-bearing input, private original/derived hashes, moderation and restart readback, transient expiry, permission denial, retry without duplicate publication.

## `notifications-and-toolbox`

- Route / Entry: `/toolbox`; enter from Me or a notification deep link.
- Primary judgment: which alert/tool is enabled, what it will do, and what limitation applies.
- Regions: notification rules/settings; deep-link message context; tool index; event detail; calculators.
- Fixed / Overlay ownership: rule/picker layers restore focus; OS notification permission/scheduling is point-of-use and its result returns to the owning rule.
- Material controls in order: `notification-rule-editor`, `notification-settings-center`, `notification-message-deeplink`, `toolbox-index`, `celestial-event-detail`, `astronomy-calculator-form`.
- Commit / Exit: local schedule/change/cancel uses durable notification IDs; remote channel remains explicitly unavailable unless its adapter succeeds; deep links preserve message and destination context.
- Verification emphasis: real native local scheduling, modify/cancel, denied permission Inbox, timezone/calendar semantics, calculator variation and precision/source limitations.

## `identity-profile-privacy`

- Route / Entry: `/me` and account/privacy subroutes; primary Me tab and auth-gated actions.
- Primary judgment: what identity/data/device state exists and which guarded action is safe to take.
- Regions: auth gate; guest merge; profile/content/equipment; sessions; privacy; export/delete; help/sources.
- Fixed / Overlay ownership: auth/merge/export/delete use focused guarded sheets/flows; destructive confirmation restores focus and never traps the user.
- Material controls in order: `auth-gate-sheet`, `guest-data-merge`, `profile-hub`, `content-library-browser`, `equipment-manager`, `session-security`, `privacy-center`, `export-delete-flow`, `help-and-source-center`.
- Commit / Exit: basic query remains guest-capable; owner session secrets use platform secure storage; merge/export/delete have preview, operation identity, audit, retry and restart readback.
- Verification emphasis: unauthorized rejection, secure-storage boundary, merge conflict, session revoke, real export artifact/expiry, auditable deletion and retained exceptions.

## Shared Owner Operations Screen Contract

- Platform: authenticated responsive desktop web; preferred 1440×900, compact below 1180, one-column/top navigation below 900, and 200% text without page-level horizontal overflow.
- Regions: workspace navigation; route heading/context; stable control composition; route-owned guarded dialog/drawer; redacted status/audit feedback.
- Interaction: every action is keyboard reachable; writes deny by default, preserve draft/input on error, use optimistic revision or idempotency identity, and require impact/confirmation where declared.
- State: loading, empty, no-results, fresh/populated, stale, partial, degraded, error, disabled, saving, success and edge appear only when applicable with source/version/last-success context.
- Operations targets: `target.ops-product-pages-v1` is the workspace/page constraint; `target.ops-controls-v2` is exact only for its declared per-control contract fields and stated coverage.

## `admin-data-operations`

- Workspaces / Entry: `data-operations`, `moderation`, `recommendation`; authenticated owner deep links only.
- Primary judgment: which data/job/moderation/rule action is allowed, what it affects, and how it can be recovered.
- Composition: data operations owns revision edit, source state, job operation and audit; moderation owns the queue; recommendation owns replay then rule lifecycle.
- Material controls: `admin-spot-editor`, `moderation-queue`, `data-source-dashboard`, `job-operations-console`, `recommendation-replay-console`, `rule-release-control`, `admin-access-audit`.
- Commit / Exit: guarded writes bind revision, permission, impact, exact confirmation when declared, one idempotency key, backend receipt, audit ID and recovery point; leaving the screen does not erase pending/history state.
- Verification emphasis: real owner authentication/authorization, REV-43 conflict path, backend side effect/readback, job replay dedupe, redacted immutable audit, provider budget/degradation.

## `quality-release-observability`

- Workspaces / Entry: `release-quality`, `recovery`, `metrics`; authenticated owner deep links only.
- Primary judgment: whether the declared owner-only target is usable now and which exact machine/external blocker remains.
- Composition: release quality owns promotion plus technical/data evidence; recovery owns isolated restore exercise; metrics owns consented aggregate product evidence.
- Material controls: `release-promotion-gate`, `technical-observability-dashboard`, `data-quality-dashboard`, `backup-restore-exercise`, `product-metrics-dashboard`.
- Commit / Exit: promotion cannot outrun its current target; restore success requires validated readback from an isolated instance; run history and blockers remain immutable and redacted.
- Verification emphasis: current-execution target-runtime proof, budget 70/90/100% degradation, backup/RPO/RTO/data consistency, telemetry correlation, no public-production claim.

## Selected Target Registry And Coverage Boundary

- `target.mobile-product-pages-v2`: constraint at `docs/design-targets/mobile-product-pages-v2/index.html` with machine coverage in `coverage-manifest.json`; controls mobile route composition, 390×844 layout, five tabs, immersive Map/Sky, three modes and declared data states, not sample facts or native behavior.
- `target.mobile-controls-v3`: exact-with-declared-coverage at `docs/design-targets/mobile-controls-v3/implementation-contract.json`; controls the declared fields for 83 stable Control Keys, with `index.html` as its interactive projection, not production/native evidence.
- `target.ops-product-pages-v1`: constraint at `docs/design-targets/ops-product-pages-v1/index.html` with machine coverage in `coverage-manifest.json`; controls seven workspace compositions and responsive operations layout, not backend behavior.
- `target.ops-controls-v2`: exact-with-declared-coverage at `docs/design-targets/ops-controls-v2/implementation-contract.json`; controls the declared fields for 12 stable Control Keys, not real auth, permission, API, audit, release or restore effects.
- Nine mobile Control Keys retain downstream native/media proof obligations: `map-filter-sheet`, `map-marker-density-surface`, `selected-spot-sheet`, `spot-media-gallery`, `observation-timeline-editor`, `sky-time-scrubber`, `orientation-follow-toggle`, `orientation-calibration-sheet`, and `ar-mode-toggle`.
- All twelve operations Control Keys retain downstream backend endpoint/authentication/authorization proof obligations. These are implementation/proof work, not design gaps and not permission to simulate success.

## Verification Contract

- Authority integrity: `npm run design:targets:verify` must re-hash all copied target files, parse their manifests/contracts, prove 14 Surface Keys and 95 unique Control Keys, and match the Source Plan plus `DESIGN.md` target registry. `make validate-context` and the Long-Task Authority Context snapshot separately protect this Screen Contract and its routing.
- Semantic and state checks: project-owned unit/component/integration tests must observe the committed state and truthful failure/degradation path, not only rendered labels.
- Visual checks: production route renders compare only against the relevant selected exact/constraint target and declared coverage; an implementation screenshot cannot become its own baseline.
- Target-runtime checks: Android native runtime is required for current critical mobile paths. iOS implementation remains required, but macOS/Xcode/iOS Simulator and live iOS runtime checks are deferred and must be reported unverified; browser/Expo Web, Android, static structure, and historical results cannot prove iOS. Responsive desktop browser is the product runtime for owner operations.
- Durable paths: stateful and artifact-producing flows must write the declared database/file/native/external sink, recreate the service/app against the same isolated data, read it back, and fail counterfactually when the write/boundary/readback is removed.
- External boundary: representative outdoor/device tuning, licensed production media, expert/legal/store/public-production approval, paid activation and production provider promotion remain explicitly pending unless separately confirmed; only those marked as blocking the current owner-only target may block `target_profile_usable`.
