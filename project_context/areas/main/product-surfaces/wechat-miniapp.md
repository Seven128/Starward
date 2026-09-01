# Product Surfaces: WeChat Mini Program

This on-demand contract node continues the independent Mini Program responsibility portion of `product-surface-contract.md`; route, Control and interaction detail remain in the owning Mini Program Screen Contract.

## WeChat Mini Program Surfaces

### `miniapp-map-discovery`

- Surface: `pages/map/index`, its map-parallel Finder Bottom Sheet, the route-owned observing-condition `SourceLiftFocusLayer.mapCoupled`, Search suggestion/filter overlays, and selected-spot overlays.
- Surface Platform: WeChat Mini Program, Taro + React + TypeScript.
- Primary User Question: Which formal stargazing spots should I filter or compare from a simplified map view, and which one should I inspect next?
- Main Surface Allows: one-time location with manual fallback; one conventional floating Search field; one adaptive compact row of immediately committed quick filters beneath Search; and one map-parallel Finder Bottom Sheet with exactly `closed`, `peek` and `expanded` extents. The clean default is `closed`; the first committed query or first unselected-to-selected quick filter may open `peek`; the named handle provides both direct drag and an accessible tap toggle. Advanced filters and the two `想去`/`其他观星点` result partitions live inside the Sheet, while quick filters remain only beneath Search. Advanced edits use one opening snapshot plus conditional commit/revert and discard-on-close semantics. Bounded Finder/filter/result owners retain touch, wheel and keyboard reachability while hiding scrollbar chrome.
  The ordinary base map remains visible with formal-spot markers by default. One compact in-map `观测条件` bar opens `SourceLiftFocusLayer.mapCoupled`, keeps the same physical map and the sole selected local time, and shows at most one analysis overlay. Compact selected-spot callouts and the Finder result/marker/callout coordinator share one formal-spot selection; activating a Finder result selects the map callout, and activating the whole callout enters Spot Detail.
- Main Surface Forbids: a standalone visible Finder launcher; a visible “展开筛选/收起筛选” action; a redundant “找今晚的观星点” or explanatory header inside the Sheet; a default-open Finder; quick filters repeated inside the Sheet; gesture-only access to an essential Sheet extent; Finder `SourceLiftFocusLayer.panelOnly`; separate peer entries for Search, Filter, point list and Favorites; nested Finder child Modals or simultaneously open suggestion/filter disclosures; search suggestions detached from their field or left visible after focus leaves the field-plus-overlay group; a permanent expanded analysis dashboard above the map; a scrollable or visibly scroll-barred observing-condition control surface; a Favorite/star metaphor for observing conditions; duplicated visible renderings of the same selected time; a second or remounted map in the analysis focus state;
  a SourceLift opening or restoration that changes underlying map identity, exposes a blank/white terminal frame or snaps the map; treating the base map as a peer layer tab; hiding formal spots until a separate tab is selected; duplicating light/time as another bar or peer tab; Finder dropdowns changing the owner scroll geometry rather than overlaying it with bounded owned overflow; hiding scrollbar chrome by disabling, clipping or otherwise making long Finder/filter/results unreachable; permanent pan-arrow or zoom-stepper chrome when direct pan/pinch is available; full Observation Context, detailed place cards or complete facility/route/safety evidence on the map; a Finder result jumping directly to Detail; a separate “查看地点判断” text row inside the whole-callout action; ordinary POIs masquerading as formal spots; unsynchronized selection;
  hidden committed filter state; product-design rationale, ordinary gesture tutorials, route/debug/reviewer metadata or sample-disclosure chrome inside the user phone surface; or straight-line distance described as a route. User-relevant freshness, provenance, limitations and uncertainty remain visible in their owning product drilldown rather than being removed with reviewer metadata.
- Drilldown Ownership: complete formal-place decision, route, facility, safety, media and provenance evidence belongs to `miniapp-spot-detail`; formal-spot sky belongs below that detail in `miniapp-spot-night`; provider navigation remains an explicit handoff.

### `miniapp-spot-detail`

- Surface: Spot package `spot/detail` shell with Overview/Guides/Site content and an explicit child-route entry to `spot/sky`.
- Surface Platform: WeChat Mini Program subpackage.
- Primary User Question: Is this formal spot suitable, reachable, trustworthy and safe tonight?
- Main Surface Allows: a spaced identity/header region with the spot name and a visually quiet accessible Favorite icon action in its transparent hit region, a distance/route row with one quiet trailing `去这里 →` action rather than a filled block, only user-interpretable decision facts inside their owning content, representative licensed media, hard-blocker-aware conclusion, route/facilities/provenance, animated Overview/Guides/Site segmentation, plan actions, one quiet field-feedback/correction handoff and one explicit Night Sky child-page entry.
- Main Surface Forbids: unexplained status chips such as generic data-availability or changing-conditions badges in the identity header, hard blockers averaged away, missing facts shown as zero, unlicensed media as truth, a Night Sky entry without `spot_id`, an instantaneous un-signalled segment content swap, or repeating page-level Favorite/Night/navigation actions as a crowded action row inside the facilities card.
- Drilldown Ownership: professional sky data and observation execution belong to `miniapp-spot-night`; article detail remains content drilldown.

### `miniapp-spot-night`

- Surface: astronomy parent `spot/sky` plus delegated sensor-following `sky/detail` and target drilldown `sky/targets` routes.
- Surface Platform: WeChat Mini Program subpackages and native canvas/sensor adapters.
- Primary User Question: What is observable from this formal spot, and how can the user orient and observe without losing dark adaptation?
- Main Surface Allows: an astronomy-information parent with summary, source/freshness/completeness feedback, icon-assisted aligned condition bands and matrices, structured targets, versioned 2D sky and one shared time scrubber; one explicit `方位天空` child carrying the same formal `spot_id`, selected time, timezone and revision; sensor-follow-only orientation with permission, calibration, accuracy, retry and unavailable states; one concise recovery panel that keeps the sky dominant; a non-canvas celestial-object list for accessibility and degraded use; and consumption of the closed warm-red observation presentation configured from `miniapp-my-library` Settings.
- Main Surface Forbids: a local `进入观测红模式` entry on the Spot Night page; a global/current-location or independently seeded sky route; examples or DRA fixture values presented as live facts; a manual orientation mode, direction stepper, heading slider or drag-to-heading control; fabricated heading when sensor quality is unavailable; AR/full deep-sky catalogue outside the current accepted scope; making astronomy information, target detail or recovery sensor-only; or white/blue flashes in observation mode.
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
