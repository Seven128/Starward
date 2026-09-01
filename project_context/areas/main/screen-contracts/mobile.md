# Mobile Screen Contracts: Starward

This on-demand Context holds the existing shared mobile Screen Contract and the twelve mobile Surface/83 Control detail entries routed by `project_context/areas/main/screen-contracts.md`. It does not own cross-surface main/drilldown placement or visual-system values.

## Shared Mobile Screen Contract

- Platform: iOS and Android React Native; baseline viewport 390×844 with platform safe areas and 44px minimum primary targets.
- Semantic order: current conclusion or safety blocker; next place/time/route/action; supporting evidence, source, limitation, and recovery.
- Regions: platform/system safe area; route-owned header/context; one primary scroll or immersive canvas owner; route-owned overlays/sheets; safe-area fixed primary action or five-tab navigation where declared.
- Scroll and overlays: one active scroll owner at a time. A sheet owns its handle and bounded content scroll; map/sky owns pan/pinch only outside an active sheet/control gesture. Closing a layer restores focus and selection to its trigger.
- Shared state: `origin`, `observingNight`, `moment`, `preferences`, `target`, `selectedSpot`, `primaryBackupRole`, `route`, `itineraryRevision`, `freshness`, and `risk` commit through one versioned decision context.
- Navigation: Back closes the top route-owned layer before leaving the route; Android system/predictive back and iOS navigation ownership remain native. Deep links restore compatible shared state or present an honest missing/stale recovery state.
- Primary tab roots: Tonight `/tonight`, Map `/map`, Trips `/trips`, Sky `/sky`, and Me `/me`. Each is a distinct screen route with its own nested stack and primary scroll or immersive-canvas owner inside one persistent native tab navigator.
- Tab switching: selecting another tab activates that route/screen without scrolling a shared document, jumping to an anchor, or replacing conditional pseudo-page content inside one root `ScrollView`. Each tab preserves its own nested route and scroll/canvas position; switching tabs does not create synthetic cross-tab Back entries.
- Deep-link and recovery: a valid deep link activates the owning tab before its nested route; an invalid or stale nested target recovers to that tab root with an attributable error. Reselect behavior remains unchanged on the current route unless the owning screen contract later declares and tests a pop-to-root or scroll-to-top action.
- Interaction: press feedback is immediate; commit occurs once at a valid completion point; cancellation, interruption, superseding requests, and retries preserve the last safe state. Direct manipulation starts from the live presentation value and settles only to valid bounds.
- Variants: planning, night, and red-light keep the same control/focus order. Loading, empty, no-results, stale, partial, degraded, unknown, error, offline, disabled, saving, and success appear only where applicable and never fabricate facts.
- Accessibility: 200% text reflows without clipping the primary judgment/action; screen readers receive role/name/value and material async/safety changes; reduced motion replaces large-axis/depth/elastic movement rather than merely accelerating it.
- Active mobile visual system: `target.system.starward-blue-skeuomorphic-2026-07-29` controls system-level appearance and three-mode posture. Historical `target.mobile-product-pages-v2` and `target.mobile-controls-v3` retain stable route/control semantics only and are not current page/control visual constraints.

## Contract Detail Routing

The two registered nodes below normatively continue this Screen Contract and preserve all twelve Surface/83 Control entries. Read the node containing the affected Surface together with this shared contract.

- [Shell, Tonight, Forecast, Map, Spot and itinerary/collaboration contracts](mobile/core-journeys.md)
- [Orientation, shooting, offline safety, contribution, notifications/toolbox and identity contracts](mobile/field-and-account.md)
