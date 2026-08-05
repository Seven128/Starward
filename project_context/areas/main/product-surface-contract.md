# Product Surface Contract: Starward

## Purpose

This Context owns durable responsibility and main-versus-drilldown placement for the Starward mobile product and its owner operations surfaces. It does not own visual token values, authored target pixels, delivery scope, implementation status, or one-off evidence.

## Current Product Boundary

- The current product target is an owner-only, non-commercial personal trial. Public operation, store release, commercial activation, paid-provider purchase, legal approval, and representative field sign-off are future gates and must not appear as completed states.
- The mobile product is the primary user surface. Owner operations is a separate authenticated desktop surface; it must not be exposed as ordinary mobile navigation or collapse raw operational detail into the consumer journey.
- The auxiliary share projection exposes only an authorized, expiring trip/place summary. It is not a thirteenth operations control, a full mobile substitute, or a route to administrative data.

## Mobile Product Surfaces

### `mobile-shell-and-preferences`

- Surface: native shell and `/onboarding-preferences`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: How do I start with the least permission necessary and keep reusable observing, travel, facility, target, and equipment preferences?
- Main Surface Allows: five primary destinations, point-of-use permission explanations, manual alternatives, preference editing, profile switching, save/merge feedback.
- Main Surface Forbids: pre-emptive permission collection, hidden defaults, fake account continuity, debug/provider fields.
- Drilldown Ownership: permission rationale and system settings handoff, profile merge preview, detailed equipment/preferences.
- Long Task State Requirement: preference save and guest merge preserve draft, conflict, retry, and restart recovery.

### `tonight-decision`

- Surface: `/tonight`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: Is tonight worth going, where should I go, and what is the best continuous observing window?
- Main Surface Allows: one honest conclusion, safety blockers, primary/backup places, best window, next action, freshness and concise uncertainty.
- Main Surface Forbids: a score without explanation, guaranteed visibility, professional tables before the decision, invented fallback values.
- Drilldown Ownership: `/forecast` owns model/layer evidence; `/spot/:spotId` owns place evidence; `/map` owns discovery and route editing.
- Long Task State Requirement: refresh retains prior context as stale, exposes cancellation/retry, and commits one coherent NightReport revision.

### `forecast-and-astronomy`

- Surface: `/forecast`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: What weather and astronomical evidence supports or weakens the tonight decision?
- Main Surface Allows: aligned hourly evidence, model disagreement, trends, twilight/moon/target windows, provenance, freshness and limitations.
- Main Surface Forbids: provider payloads, certainty language, decorative dashboards, or silently mixing place/time/model revisions.
- Drilldown Ownership: layer/source details and model comparison stay here; the tonight surface receives only decision-relevant summaries.
- Long Task State Requirement: provider refresh is cancellable, bounded, provenance-bearing, and has stale/partial/degraded/error recovery.

### `map-route-discovery`

- Surface: `/map`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: Which feasible place and route best fit the selected night, origin, preferences, and risk?
- Main Surface Allows: immersive map, search context, filters, layers, marker density, selected-place sheet, route alternatives, external-navigation handoff.
- Main Surface Forbids: selection encoded only by color, unsynchronized marker/card/route state, unlabelled coordinate conversion, or pretending straight-line fallback is a route.
- Drilldown Ownership: place evidence moves to `/spot/:spotId`; itinerary commitment moves to `/trips`; vendor navigation remains an explicit handoff.
- Long Task State Requirement: search/route requests preserve inputs and selected state, expose provider/cache/fallback state, and commit one versioned place/route revision.

### `spot-detail-and-trust`

- Surface: `/spot/:spotId`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: Is this real place suitable, reachable, trustworthy, and safe for this observing plan?
- Main Surface Allows: decision summary, observing window, licensed media when available, horizon/light evidence, access/facilities, safety override, trust and plan/navigation actions.
- Main Surface Forbids: unlicensed production media, precise private contributor data, safety hidden behind score, or unsupported certainty.
- Drilldown Ownership: provenance/reviews and facility detail are progressive evidence; route editing remains on `/map` or `/trips`.
- Long Task State Requirement: media and trust loads preserve safe prior facts, label missing/placeholder assets, and recover without changing the selected place.

### `itinerary-and-collaboration`

- Surface: `/trips` and itinerary detail subroutes.
- Surface Platform: iOS and Android React Native.
- Primary User Question: How do I turn the current place/time/route decision into a versioned, recoverable observing plan?
- Main Surface Allows: itinerary library/create/detail, overview, editable timeline, candidate places, route comparison, version/share actions, bounded collaboration.
- Main Surface Forbids: silent conflict resolution, unversioned overwrites, public-social feed behavior, or share links without scope/expiry/revocation state.
- Drilldown Ownership: professional evidence links back to forecast/spot; share projection is read-only and strictly scoped.
- Long Task State Requirement: drafts, revisions, conflicts, share operations and retries persist across restart with idempotency and recovery history.

### `sky-orientation-ar`

- Surface: `/sky`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: At the selected place and time, where is the target and what can I use when sensors or AR are unavailable?
- Main Surface Allows: immersive sky, object/layer controls, continuous time scrub, orientation follow/manual calibration, obstruction/trajectory, equipment field of view, optional AR.
- Main Surface Forbids: AR as the only core path, hidden sensor accuracy, fabricated orientation, or gesture-only essential actions.
- Drilldown Ownership: equipment edits belong to profile; photography decisions belong to `/shooting`; provenance belongs to forecast/spot evidence.
- Long Task State Requirement: time/orientation manipulation is interruptible and reversible; capability denial/failure keeps a manual degraded path and the same shared context revision.

### `shooting-assistant`

- Surface: `/shooting`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: Given my equipment, target, place, and conditions, what conservative settings and preparation should I try?
- Main Surface Allows: setup, presets with assumptions, deterministic recommendation, optional explanation, checklist, versioned save.
- Main Surface Forbids: AI-invented exposure facts, guaranteed results, hidden assumptions, or saving a plan without its context/version.
- Drilldown Ownership: source evidence remains in forecast/spot; equipment inventory remains in profile.
- Long Task State Requirement: recommendation and save preserve inputs, distinguish rule result from explanation, and recover the saved version after restart.

### `field-offline-safety`

- Surface: `/field`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: How do I execute the trip safely in low light and without reliable connectivity?
- Main Surface Allows: verified offline pack, concise dashboard, night/red-light modes, field tools, return-to-parking, backup switch, bounded safety session, explicit location share, sync queue.
- Main Surface Forbids: online-only critical actions, bright/blue surprise surfaces, implicit continuous sharing, or treating an unverified manifest as an offline pack.
- Drilldown Ownership: detailed evidence remains available but does not displace safety, return, time, and current-plan actions.
- Long Task State Requirement: downloads, activation, queued writes, safety session and share/revoke expose progress, checksum/version, expiry, idempotency, conflict and restart recovery.

### `community-contribution`

- Surface: `/contribute`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: How can I contribute a place, field report, review, correction, or media without leaking sensitive data?
- Main Surface Allows: guided submission, validation, privacy review, transient-report expiry, multidimensional review, correction evidence and visible moderation status.
- Main Surface Forbids: raw EXIF/precise private location in ordinary views, instant-public claims, or a general social network.
- Drilldown Ownership: moderation detail and appeals are bounded; owner moderation actions live only in operations.
- Long Task State Requirement: upload/submission state, sanitized derivative, review revision, errors and retry survive restart without duplicating the original write.

### `notifications-and-toolbox`

- Surface: `/toolbox`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: Which bounded alerts and astronomy tools should help me prepare or respond without becoming noise?
- Main Surface Allows: rule editor, consent/settings, deep-link result, tool index, event detail and labelled calculators.
- Main Surface Forbids: notification without consent, silent timezone changes, unexplained precision, or remote-channel success when only local scheduling exists.
- Drilldown Ownership: detailed event/source limitations stay with the tool/event; destination screens own the action after a deep link.
- Long Task State Requirement: schedule/change/cancel and denial paths have durable identifiers, visible inbox/history and restart readback.

### `identity-profile-privacy`

- Surface: `/me` and account/privacy subflows.
- Surface Platform: iOS and Android React Native.
- Primary User Question: How do I control identity, local/cloud data, devices, content, equipment, sessions, export, deletion, and help?
- Main Surface Allows: explicit auth gate, guest merge preview, profile/content/equipment, session security, privacy controls, real export/delete status, sources/help.
- Main Surface Forbids: mandatory login for basic query, secrets or raw sensitive fields, deletion-success before completion, or unreviewed guest/cloud overwrite.
- Drilldown Ownership: high-impact merge/export/delete/session actions use focused guarded flows; ordinary profile remains concise.
- Long Task State Requirement: auth/session/export/delete operations expose operation identity, progress, idempotency, expiry, retry, audit and restart recovery.

## Owner Operations Surfaces

### `admin-data-operations`

- Surface: authenticated desktop workspaces `data-operations`, `moderation`, and `recommendation`.
- Surface Platform: responsive desktop web, 1440×900 preferred.
- Primary User Question: What owner action can safely inspect or change place, moderation, provider, job, replay, rule, and audit state?
- Main Surface Allows: stable revision editing, moderation queue, source health, job operations, deterministic replay, rule lifecycle, redacted audit history.
- Main Surface Forbids: anonymous access, raw secrets/EXIF/precise trajectories in ordinary logs, unguarded bulk writes, silent conflict overwrite, or success without backend receipt.
- Drilldown Ownership: technical payloads and sensitive-field access require separate permission and audit; the mobile product receives only user-relevant status.
- Long Task State Requirement: every mutating or long-running action has operation/idempotency identity, impact preview, progress, duplicate protection, retry, recovery point and immutable audit history.

### `quality-release-observability`

- Surface: authenticated desktop workspaces `release-quality`, `recovery`, and `metrics`.
- Surface Platform: responsive desktop web, 1440×900 preferred.
- Primary User Question: Is the owner-only target usable, recoverable, observable, within budget, and truthfully bounded?
- Main Surface Allows: promotion gate for the selected target only, technical/data quality, isolated backup/restore exercise, consented product metrics and exact blockers.
- Main Surface Forbids: claiming public production readiness, equating backup presence with restore success, hiding stale/partial evidence, or allowing a future external gate to masquerade as current machine acceptance.
- Drilldown Ownership: detailed traces, quality samples and recovery evidence remain operations detail; consumer surfaces receive concise degradation and provenance.
- Long Task State Requirement: gate runs, recovery exercises and rollbacks have run identity, current evidence, progress, cancel/retry, validated result, history and isolated recovery targets.

## Cross-Surface Rules

- Stable Surface Keys are the fourteen headings above. Stable Control Keys and screen routing are owned by `screen-contracts.md`; active system-target interpretation, legacy-target applicability, and token values are owned by `DESIGN.md`.
- Mobile primary navigation is exactly Tonight, Map, Trips, Sky, and Me. Forecast, spot detail, shooting, field, contribution, toolbox, and onboarding/preferences are contextual or secondary routes, not extra primary tabs.
- The five primary destinations are five distinct route/screen roots—Tonight `/tonight`, Map `/map`, Trips `/trips`, Sky `/sky`, and Me `/me`—inside one persistent native tab navigator. A shared `ScrollView`, section-anchor jump, or conditional content block that merely imitates separate pages is forbidden.
- Each primary destination owns its route-local stack and primary scroll or immersive-canvas position. Switching away and back preserves that local task position; shared place/time/mode/selection changes continue through the versioned decision context rather than through duplicate tab state.
- Origin, observing night, moment, preferences, target, selected spot, primary/backup role, route, itinerary revision, freshness, and risk form one versioned decision context. A committed change propagates coherently or every lagging surface is explicitly stale.
- Planning, night, and red-light modes preserve surface ownership, route, control order, focus order, selection, and task position. Mode is presentation state, not a second information architecture.
- Every applicable data-bearing surface distinguishes loading, empty, no-results, stale, partial, degraded, unknown, error, offline, disabled/saving, and success without realistic-looking fabricated fallback data.
- Main mobile surfaces show decision, next action, and decision-relevant uncertainty. Professional evidence, diagnostics, raw provider material, audit history, and operational controls stay in their owning drilldown or operations surface.
- Critical or mutating work cannot be represented by a transient success label. Its owning surface exposes operation identity, committed state, applicable external/native boundary result, retry/recovery, and restart readback.
- Owner operations deny by default, redact ordinary telemetry and audit views, and require impact preview plus explicit confirmation for high-risk actions. Current owner-only access does not waive authentication, authorization, privacy, idempotency, or audit behavior.
- The CNY 200/month ceiling and paid-default-zero policy are visible at decision points that could consume external cost. Budget state may degrade or block a capability; it never silently purchases, upgrades, or adds a paid source.

## Screen Contract Routing

- `project_context/areas/main/screen-contracts.md` remains the canonical owner/index for stable route, hierarchy, region/overlay ownership, Control inventory, mode/state variants, navigation, and target references for all fourteen Surface Keys. Its registered `screen-contracts/mobile.md` and `screen-contracts/operations.md` nodes hold the platform-specific detail without creating another authority.
- `DESIGN.md` owns the authored tokens, visual rationale, active system adoption record, legacy-target applicability, and target conflict order.
- `project_context/areas/main/verification.md` owns the default repeatable-verification index; its registered on-demand verification nodes own detailed authority, product-runtime, native-runtime, persistence, recovery, and target-fidelity paths.
