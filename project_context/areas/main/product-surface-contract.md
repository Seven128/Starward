# Product Surface Contract: Starward

## Purpose

This Context owns durable responsibility and main-versus-drilldown placement for the Starward native mobile product, the independently scoped WeChat Mini Program, and owner operations surfaces. It does not own visual token values, authored target pixels, delivery scope, implementation status, or one-off evidence. The Mini Program surfaces below implement the current accepted product/technical Source under its correction/disposition precedence and selected constraint; document version labels remain provenance only, and exact visual values remain owned only by `DESIGN.md`.

## Current Product Boundary

- The current product target is an owner-only, non-commercial personal trial. Public operation, store release, commercial activation, paid-provider purchase, legal approval, and representative field sign-off are future gates and must not appear as completed states.
- The mobile product is the primary user surface. Owner operations is a separate authenticated desktop surface; it must not be exposed as ordinary mobile navigation or collapse raw operational detail into the consumer journey.
- The auxiliary share projection exposes only an authorized, expiring trip/place summary. It is not a thirteenth operations control, a full mobile substitute, or a route to administrative data.
- The WeChat Mini Program is one independently completable current product carrier, evolved in place under the current accepted Source. It coexists with the native App and does not prove, replace, inherit, or silently shrink that product. Its primary navigation is exactly Map and My; its Night capability is formal-Spot-Detail drilldown only.
- Formal-spot field facts are populated through authenticated user contribution or authenticated owner entry, not fabricated by startup data or inferred from nearby providers. A user submission remains provisional and visible to its contributor until owner review; owner operations alone can merge it into the canonical spot/evidence record, after which the same server publication gate is rerun before any formal-map projection changes.
- The Mini Program does not ship or retain a Web/H5 counterpart. Its consumer UI is WEAPP-only and follows the selected Mini Program design closure; current owner moderation uses authenticated server APIs plus the project-owned CLI until a separately selected owner-operations design authorizes a real administrative UI.
- The previous repository posture that limited a future Mini Program to share/light-query/invitation remains native-App provenance only and is superseded for the independent `apps/wechat-miniapp/**` product by `docs/wechat-miniapp-v2-1-1-source.md`. Shared owners must model both product carriers rather than overwriting the App boundary.

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

## WeChat Mini Program Surfaces

### `miniapp-map-discovery`

- Surface: `pages/map/index` and its route-owned `SourceLiftFocusLayer`, Finder suggestion/filter, and selected-spot overlays.
- Surface Platform: WeChat Mini Program, Taro + React + TypeScript.
- Primary User Question: Which formal stargazing spots should I filter or compare from a simplified map view, and which one should I inspect next?
- Main Surface Allows: one-time location with manual fallback; a compact page header and one high-density `搜索` bar summarizing the active query/city, at most two high-priority committed filters and a remaining-count cue; one route-owned `SourceLiftFocusLayer.panelOnly` Finder whose lifted `查找观星点` source header is itself the expanded/collapsed control, followed by name/city search whose field-local Search glyph is suppressed while the lifted header already supplies that cue, mutually exclusive anchored search-suggestion or filter-editor overlays, the Source-defined 18 flat terminal filters (10 first-level plus 8 advanced) under one draft/commit/revert owner, and one jointly filtered formal-spot result projection divided only into collapsible `想去` and `其他观星点` partitions with city headings; hidden scrollbar chrome with retained touch/wheel/keyboard reachability for the bounded Finder/filter/result owners; the ordinary base map as the remaining first-viewport subject with formal-spot markers visible by default; one compact in-map `观测条件` status bar with a condition/instrument symbol, the active analysis/time summary and an entry to `SourceLiftFocusLayer.mapCoupled`, whose non-scrolling compact control surface shows one visible selected local time and co-locates the controls with the same physical map; layout-neutral overlay lifting and atomically continuous restoration for both SourceLift variants; compact selected-spot callouts; coordinated Finder-result/marker/callout selection; Spot Detail and explicit external-navigation handoff.
- Main Surface Forbids: separate peer entries for Search, Filter, point list and Favorites; an independent Finder close button or redundant `查找与比较` heading beside the lifted source-header toggle; duplicate Search glyphs in one focused Finder composition; a nested Finder child Modal or simultaneously open suggestion/filter overlays; search suggestions detached from their field or left visible after focus leaves the field-plus-overlay group; a permanent expanded analysis dashboard above the map; a scrollable or visibly scroll-barred observing-condition control surface; a Favorite/star metaphor for observing conditions; duplicated visible renderings of the same selected time; a second or remounted map in the analysis focus state; a SourceLift opening or restoration that changes the underlying page/map flow geometry, exposes a blank/white terminal frame or snaps the map; treating the base map as a peer layer tab; hiding formal spots until a separate tab is selected; duplicating light/time as another bar or peer tab; Finder dropdowns changing the owner scroll geometry rather than overlaying it with bounded owned overflow; hiding scrollbar chrome by disabling, clipping or otherwise making long Finder/filter/results unreachable; undersized, optically misaligned or non-rotating disclosure chevrons; permanent pan-arrow or zoom-stepper chrome when direct pan/pinch is available; full Observation Context, detailed place cards or complete facility/route/safety evidence on the map; a Finder result jumping directly to Detail; ordinary POIs masquerading as formal spots; unsynchronized selection; hidden committed filter state; product-design rationale, ordinary gesture tutorials, route/debug/reviewer metadata or sample-disclosure chrome inside the user phone surface; or straight-line distance described as a route. User-relevant freshness, provenance, limitations and uncertainty remain visible in their owning product drilldown rather than being removed with reviewer metadata.
- Drilldown Ownership: complete formal-place decision, route, facility, safety, media and provenance evidence belongs to `miniapp-spot-detail`; formal-spot sky belongs below that detail in `miniapp-spot-night`; provider navigation remains an explicit handoff.

### `miniapp-spot-detail`

- Surface: Spot package `spot/detail` shell with Overview/Guides/Site content and an explicit child-route entry to `spot/sky`.
- Surface Platform: WeChat Mini Program subpackage.
- Primary User Question: Is this formal spot suitable, reachable, trustworthy and safe tonight?
- Main Surface Allows: a spaced identity/header region with the spot name and a visually quiet accessible Favorite icon action in its transparent hit region, a distance/route row with one quiet trailing `去这里 →` action rather than a filled block, only user-interpretable decision facts inside their owning content, representative licensed media, hard-blocker-aware conclusion, route/facilities/provenance, animated Overview/Guides/Site segmentation, plan actions, one quiet field-feedback/correction handoff and one explicit Night Sky child-page entry.
- Main Surface Forbids: unexplained status chips such as generic data-availability or changing-conditions badges in the identity header, hard blockers averaged away, missing facts shown as zero, unlicensed media as truth, a Night Sky entry without `spot_id`, an instantaneous un-signalled segment content swap, or repeating page-level Favorite/Night/navigation actions as a crowded action row inside the facilities card.
- Drilldown Ownership: professional sky data and observation execution belong to `miniapp-spot-night`; article detail remains content drilldown.

### `miniapp-spot-night`

- Surface: `spot/sky` plus delegated `sky/detail`, `sky/map`, `sky/targets`, and `sky/observe` routes.
- Surface Platform: WeChat Mini Program subpackages and native canvas/sensor adapters.
- Primary User Question: What is observable from this formal spot, and how can the user orient and observe without losing dark adaptation?
- Main Surface Allows: summary and aligned professional evidence, structured targets, versioned 2D sky, time scrub, sensor/manual orientation and consumption of the closed warm-red observation presentation configured from `miniapp-my-library` Settings.
- Main Surface Forbids: a local `进入观测红模式` entry on the Spot Night page, global/current-location sky entry, examples as live facts, AR/full deep-sky catalogue outside the current accepted scope, sensor-only controls, or white/blue flashes in observation mode.
- Drilldown Ownership: source/algorithm detail remains progressive evidence; the formal spot/time context remains shared and immutable across sky routes.

### `miniapp-my-library`

- Surface: `pages/my/index` account center plus Plan, Contribution and Settings child routes. Routine favorite browsing remains in `miniapp-map-discovery` Finder `想去`; the favorite relation is also operable from formal Spot Detail.
- Surface Platform: WeChat Mini Program main/user subpackages.
- Primary User Question: How can the user understand their account state and reach plans or settings without mixing those tasks into the root page?
- Main Surface Allows: a title-only account-center header with one conventional Tier-A Settings gear action; a concise login/profile summary; a small grouped list of routine account entries; quiet Plan and field-feedback/correction rows that open recoverable child routes; contribution pending/review status; and an independent Settings child route for objective-fact-preserving preferences and the explicit enter/exit control for the closed warm-red observation presentation.
- Main Surface Forbids: peer My/Favorites/Plan/Settings tabs; a “收藏、计划与显示偏好” explanatory subtitle; any Favorite count, row, list or duplicate favorite-browsing page on the My root; page horizontal scrolling; plan/official sample cards on My home; copied e-commerce orders/coupons/membership/promotion modules or third-party brand styling; duplicate Spot Detail; or provider failure deleting the static favorite relation retained by Finder/Detail.
- Drilldown Ownership: profile links and imported content belong to `miniapp-profile-content`; Spot cards return to the unified formal detail.

### `miniapp-contribution-intake`

- Surface: `content/contribution/index`, entered from My for general intake or from formal Spot Detail with that `spot_id` preselected.
- Surface Platform: WeChat Mini Program user/content subpackage.
- Primary User Question: How can I submit a field report, correction or new-place proposal and know what happens before it affects a formal spot?
- Main Surface Allows: a guided structured report; explicit observed time and affected fact topics; optional location only for a deliberate new-place proposal; bounded media upload with rights confirmation and metadata sanitization; durable draft/upload/submission status; retry without duplicate writes; and contributor-visible pending/approved/rejected feedback.
- Main Surface Forbids: instant publication, treating a report as confirmed evidence before owner review, hidden precise-location collection, raw EXIF exposure, upload without MIME/size limits, loss of a draft after transport failure, or a new-place proposal receiving a formal `spot_id` before the canonical completeness gate.
- Drilldown Ownership: owner review, sensitive evidence inspection, canonical fact merge and publication remain in authenticated `admin-data-operations`; the consumer surface sees only its own redacted submission state.
- Long Task State Requirement: the submission and every media upload have durable identities, explicit expiry/progress, idempotent retry, restart readback and cleanup of abandoned objects.

Across all Mini Program user scenes, vertical scrolling may remain available where content requires it but its scrollbar chrome is hidden and consumes no layout width. Horizontal scrolling is exceptional and belongs only to an explicitly bounded row or data matrix; when a visible indicator is necessary it overlays the content, consumes no layout height/width and uses a white semi-transparent presentation that remains legible in the active mode.

Across all Mini Program user scenes, persistent/actionable permission, stale, offline and failure feedback uses one shared inline Notification family in the owning surface's document flow; non-critical acknowledgement uses the same family's floating safe-area variant without changing page, Map or scroll geometry. Severity and placement are independent. One owner exposes at most one full notification at a time, preserves concurrent states through deterministic severity order and an accessible residual count/queue, and never replaces the sole recovery path with an auto-dismissing toast or a stack of full-height cards.

### `miniapp-profile-content`

- Surface: `profile/links`, `content/import`, gated `submission/*` and related preview/status routes.
- Surface Platform: WeChat Mini Program user/content subpackage.
- Primary User Question: How can a user preserve external identity/content provenance while retaining copy/manual fallbacks, rights, privacy and moderation?
- Main Surface Allows: neutral external links with copy-first recovery; rights attestation; parser capability gate; manual import; editable draft; formal spot association or independent proposal; lineage, sanitization and review status.
- Main Surface Forbids: platform affiliation claims, dangerous URLs, unlicensed parsing, edited-field overwrite, proposal-to-spot shortcut or unreviewed public UGC.
- Drilldown Ownership: operations moderation remains in authenticated owner operations; the Mini Program shows only user-relevant status and recovery.

The stable Mini Program Control inventory, route/package bindings, cross-control invariants and responsive/motion/accessibility responsibilities are owned by `screen-contracts/wechat-miniapp.md`.

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

- Stable Surface Keys are the fourteen native App/owner-operations headings plus the six explicitly named Mini Program surfaces above. Stable Control Keys and screen routing are owned by `screen-contracts.md` and its registered detail nodes; independently scoped system-target interpretation, legacy-target applicability, and token values are owned by `DESIGN.md`.
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
- The Mini Program independently uses a current external-services hard ceiling of CNY 300/month excluding application/database IaaS. That budget does not authorize purchase, commercial use, provider promotion or public production traffic; provider/license/cost gates remain explicit.

## Screen Contract Routing

- `project_context/areas/main/screen-contracts.md` remains the canonical owner/index for stable route, hierarchy, region/overlay ownership, Control inventory, mode/state variants, navigation, and target references. Its registered `screen-contracts/mobile.md`, `screen-contracts/wechat-miniapp.md`, and `screen-contracts/operations.md` nodes hold platform-specific detail without creating another authority.
- `DESIGN.md` owns authored tokens, visual rationale, the independent App and Mini Program system-adoption records, legacy-target applicability, and target conflict order. Its Mini Program record cannot expand this Product Surface Contract by implication.
- `project_context/areas/main/verification.md` owns the default repeatable-verification index; its registered on-demand verification nodes own detailed authority, product-runtime, native-runtime, persistence, recovery, and target-fidelity paths.
