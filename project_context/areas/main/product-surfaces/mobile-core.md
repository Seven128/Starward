# Product Surfaces: Mobile Core Journeys

This on-demand contract node continues the mobile responsibility portion of `product-surface-contract.md`; exact controls and state remain in the owning Mobile Screen Contract.

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
