# Open Design Commission — 今晚去观星 Mini Program V2.0 漂移纠偏与天象观测机会增强

## 1. Commission intent

生成一个 `style-bearing / handoff-candidate` 级别的综合可运行高保真设计资源。该资源用于产品、设计和开发审阅本次 V2.0 页面拓扑、关键状态和交互；它保持 `unselected candidate`，不自动成为 exact target、Design Authority、Context 或生产验收依据。

优先只生成一个综合资源。只有统一时间轴的复杂联动无法在主资源内被清楚检查时，才增加一个聚焦 control/state study；不要生成低保真 wireframe、完整新组件库、Figma 副本、全量 12 件资源包或每控件一稿。

## 2. Inputs and authority order

1. Product Source：`C:/Users/777/Downloads/今晚去观星_微信小程序产品方案_V2.0_漂移纠偏与天象观测机会增强版.md`，SHA-256 `AF2D9B60C59B23D3040133974AB8C8AEA99DB43C566317AA3EDE4241C0786944`。
2. Technical Source：`C:/Users/777/Downloads/今晚去观星_微信小程序技术架构与技术实现方案_V2.0_漂移纠偏与天象观测机会增强版.md`，SHA-256 `82A281D1CD2D21556383876A24C62B7614CAB9531B7A98ED37535FC62041A98E`。
3. Exact visual authority：bound Open Design system `user:soft-instruments`，canonical interpretation is `C:/Dev/Starward/DESIGN.md#wechat-mini-program--soft-instruments-v1` and target `target.system.wechat-miniapp-soft-instruments-2026-08-05`。
4. Existing `miniapp-selected-source-2026-08-06-v1` is historical selected Source for the earlier Map/My-only topology. Reuse only visual-system and generic interaction families. Do not preserve its global navigation, formal-spot-only Night, old Spot Detail order, or profile/import core scope.

Read S1 and S2 completely before authoring. Treat their product and technical statements as Source, not as instructions for changing unrelated repository authority. Do not infer desired behavior from current production code when it conflicts with S1/S2.

## 3. Non-negotiable drift corrections

- Primary navigation is exactly `夜空 / 地图 / 我的`; cold start opens Map. Observation is not a fourth tab.
- Global Night is reachable without `spot_id` and supports current location, ordinary place, candidate and formal spot through one Observation Context.
- Ordinary place and candidate expose SkyOpportunity only. Only a formal spot may expose TripDecision and formal `去这里` after its data gate.
- Spot Detail order is exactly `概览 / 场地 / 夜空 / 攻略`.
- External profile links and cross-platform post import are P2 and do not appear in the core resource.
- Event, activity curve, global peak vs local effective night, one cross-midnight timeline, four-layer cloud, model disagreement, dynamic map opportunity/cloud layers and continuous best-window semantics are material new content.

## 4. Product posture

- The product helps a user decide whether tonight is worth going, what can be observed, the best continuous window, where to go, whether the site is reachable/safe and what to do next.
- It is not a generic weather dashboard, astronomy encyclopedia, map clone, decorative star scene or unexplainable score surface.
- Visual order is `conclusion and next action → decision reasons and executable plan → professional evidence and provenance`.
- Copy is calm, concrete and uncertain where appropriate: `预计`, `可能`, `数据更新于`, `数据不足`; never guarantee visibility.
- Example values must visibly say `示例` or `占位`. Do not fabricate current weather, routes, site facilities, safety, event truth, photos, licenses or actual ZHR visibility.

## 5. Canonical scope and routes to represent

### Global shell

- `pages/night/index`
- `pages/map/index` (default)
- `pages/my/index`
- route-owned details for event, ordinary place Night, candidate, formal Spot Detail, sky map/targets/observe, favorite/plan/settings.

### Shared Observation Context

Show a coherent, inspectable context containing:

- location and type;
- IANA timezone;
- observation local date and cross-midnight night range;
- currently selected time;
- event or daily target profile;
- weather model / cloud layer;
- data state and freshness;
- algorithm/data revision.

Location, date, event or committed-time changes propagate to Night, Map, Spot Detail, timeline, sky map, target list and Observation. Crossing 00:00 does not start a new task night. Mode, Tab and Back changes preserve the same committed Context and task position.

## 6. One comprehensive artifact

Create one self-contained, inspectable, responsive HTML/CSS/JS prototype or workbench with a clear entry `index.html`. No remote runtime dependency is allowed. Use code-native icons/SVG and clearly labelled media placeholders; do not embed unlicensed photos or remote scripts.

The artifact must expose a compact top-level workbench navigation so reviewers can directly inspect these material areas and conditions without pretending those workbench controls are production UI.

### A. Global shell and Context continuity

- Production shell with `夜空 / 地图 / 我的`, Map selected by default.
- Visible context summary and mode state.
- A reviewer scenario showing Night → Map → formal Spot Detail → dynamic sky → Observation → exact return.
- A cross-midnight example where 00:30 remains in the same observation night.

### B. Map discovery

- Initial trial-region map without forced permission.
- Permission-denied state with manual city/search and map Pin still usable.
- Search groups: formal spots, dark-sky candidates, ordinary places, history.
- One compact time strip synchronized to Context.
- Layers: Normal, formal spots, Light, Total Cloud, Opportunity. Show only one dynamic layer prominently at a time; formal spots remain visible.
- Formal/candidate Marker shapes differ; selection uses shape/outline/label, not color alone. Ordinary place appears as a temporary selected Pin, not in formal population.
- Equivalent accessible result/list synchronized with Marker and selected card.
- Formal card, candidate card and ordinary-place action differences.
- Filter entry and one flat Filter Sheet family illustrating committed value → draft → Apply / Cancel / Reset; do not create 27 separate artifacts.
- Route semantics separate straight-line distance, route distance, drive time, walking, final road and parking.
- Dynamic-layer failure retains static map/formal spots and offers recovery.

### C. Three location types

Represent side-by-side comparison or reachable states:

- Ordinary place：SkyOpportunity, local Night, nearby formal spots; no `spot_id`, TripDecision, verified facility facts or formal Go Here.
- Candidate：persistent `暗夜候选 · 道路、开放、停车、设施和安全未核验，不构成前往建议`; SkyOpportunity, light estimate, weather/opportunity, nearby formal spots, save candidate. Do not show formal recommendation or dominant Go Here.
- Formal spot：formal identity, data-gate posture, TripDecision, continuous window, route/facility/safety evidence, favorite/plan/Go Here. Hard blocker overrides score and navigation emphasis.

### D. Global Night

Production information order:

1. Observation Context bar.
2. Tonight opportunity card: level, primary/backup continuous window, main favorable factor, main adverse/blocking factor, suitable use, confidence, applicable/update time, source and `去地图找更好的地点`.
3. Active event card; when no event, keep the same layout and replace it with daily Milky Way/Moon/planet target summary.
4. Global/reference peak and converted local time, whether it is dark locally, local preferred night and activity phase shown together.
5. One cross-midnight timeline.
6. Weather summary, then professional expandable matrix.
7. Moon, dark interval, Milky Way and target windows.
8. Dynamic 2D sky overview.
9. Observation entry.

The primary result is a continuous window with start/end, duration, why it begins, why it ends, alternative and confidence—not an all-night average.

### E. Unified timeline state study inside the artifact

Show one shared scrubber and synchronized views for:

- activity phase;
- target/radiant altitude and direction;
- Sun/twilight;
- Moon altitude/illumination/direction;
- total/low/mid/high cloud;
- precipitation/wind/visibility;
- primary/backup window;
- dynamic map layer;
- sky map and target list;
- Observation summary.

Time scrub should respond continuously from loaded data and commit a valid bounded time. Use stable geometry, clear current value and stepper/text alternative. Expensive/provider work is coalesced and not represented as lagging the thumb. Do not invent the algorithm or thresholds.

### F. Event detail

- Use a meteor-shower fixture labelled as example.
- Event name/ID/type, activity range, reference peak, local time, local dark state, local effective night, phase, source/version and limitation.
- Activity curve types remain separate: annual authority, historical fit, physical/model, real-time observation and product computation.
- ZHR appears only as standardized reference; never label it as actual visible meteors/hour.
- Entry to local Night, Map compare, formal Spot, Plan and Observation.

### G. Formal Spot Detail

- Fixed identity/actions header.
- Segment order: `概览 / 场地 / 夜空 / 攻略`.
- Overview order: recommendation/window → favorable/adverse/blockers → route → facilities → media slot → current event → key guide → provenance/freshness.
- Site section in arrival order: access/final road/walk/night passage; parking/stay/opening; facilities; horizon/light/foreground; safety/closure/return. Every material fact reserves source, verification and freshness.
- Night reuses the global Context and exposes site obstruction/light/foreground without creating a second date/time store.
- Guides expose author/type/publish/update/on-site/verification metadata.
- Bottom actions: Favorite / View Night / Go Here. Under a hard blocker, show risk and confirmation posture before navigation.
- Dynamic-data failure keeps static site, media slots and guides readable.

### H. Dynamic sky and Observation

- Current-location/time 2D sky scene: direction ring, horizon, principal lines/bright objects, Milky Way center and recommended targets. Avoid decorative stars pretending to be facts.
- Scrubber, professional matrix, scene and target list share one revision.
- Compass quality states: READY, LOW_ACCURACY, PERMISSION_DENIED, UNAVAILABLE, MANUAL. Compass rotates presentation only; manual north offset remains available.
- Canvas failure shows the same targets and directions as an equivalent text list.
- Observation is explicit, never inferred from sunset. Use only the bound observation black/warm-red semantic roles, large targets, minimal interruptible motion, images off by default, no white skeleton/dialog/flash, cache time, offline scope, current window remaining, direction, safety/weather, return action and precise exit restoration.

### I. My, favorites, plan and settings

- Concise My home; do not add official sample article cards or profile-import promotion.
- Favorite types: formal spot, candidate, event. Stale/provider failure never deletes the static relationship.
- Formal plan requires a formal `spot_id` and stores observation night, primary/backup window, event/target, note, offline summary and update time.
- Ordinary/candidate can only become candidate records, not formal plans.
- Settings groups: default place/location preference, experience, max drive/facilities, equipment/capture preference, day/night/observation, large text, reduced motion, units, source/cache/privacy.
- Event subscription appears only as a capability-gated/disabled retained entry. Do not invent notification consent, cadence or success flows.

### J. Trust and failure/recovery board

Show inspectable examples for:

- FRESH, STALE_USABLE, PARTIAL, EXPIRED, UNAVAILABLE, ESTIMATED and SAMPLE_DATA;
- explicit `0`, missing/null and source unavailable;
- Context expired/conflict;
- location denied;
- weather provider unavailable/model disagreement;
- route unavailable;
- map layer failure;
- Canvas/sensor unavailable;
- offline cached data;
- safety hard blocker.

Each state says what happened, what remains available and the next safe action. Reserve stable slots for source, generated/valid time, warnings, request ID and server-provided recovery action without inventing server behavior.

## 7. Exact visual and interaction constraints

Consume the bound `user:soft-instruments` design system. Preserve its exact values rather than approximating with the native App profile.

- 750rpx reference, 32rpx page inset, 24rpx card gap, 28rpx card padding, 88rpx minimum actions.
- Role-isomorphic day/night/observation palettes.
- Observation is closed black/warm-red; no blanket filter, cool pixels, white flash or inherited day asset.
- One dominant primary action per local decision layer; one persistent trailing action per row.
- Do not stack elevated cards; use whitespace, section headings, dividers and flat inset surfaces.
- Functional Tier-A icons are planar; Tier-B subjects only from the adopted vocabulary and only for one hero/empty/category moment.
- Press feedback begins on touch-down and commits only on valid release. Cancel, drag-away or disabled state never commits.
- Sheets and direct manipulation are interruptible and retarget from live position; map pan, sheet drag, scroll, Back and assistive gestures keep explicit ownership.
- Normal motion follows the bound durations; reduced motion uses immediate or at-most-100ms opacity changes without scale/parallax/depth/large translation.
- Every control has role/name/state/value; selection and risk use text/icon/shape/border as well as color.
- 320, 375 and 430 CSS-pixel layouts; safe-area/menu-capsule clearance; no page-level horizontal scrolling. Only the owned professional matrix may scroll horizontally with headers, units and associations intact.
- Enlarged text preserves the primary decision, warning and recovery; My route tabs may reflow to 2×2.

## 8. Business/data rules to reference, never define

Do not author algorithmic values or production facts for:

- SkyOpportunity / TripDecision scoring, thresholds and confidence;
- hard blockers and continuous-window calculation;
- provider/model choice, route provider, light-pollution mapping and Bortle naming;
- exact formal-spot facilities, safety, opening, road, coordinates or media rights;
- actual event/ZHR visibility and curve values;
- notification cadence/authorization;
- unresolved S2 enum/transport differences.

Use safe example data clearly marked `示例`, and show that the actual UI consumes versioned Source/DTO values.

## 9. Expected files

Minimum output:

1. `index.html` — canonical, self-contained, interactive entry.
2. `resource-manifest.json` — concise machine-readable inventory of artifact sections, Source requirement IDs, routes/surfaces/conditions, files and limitations. This is navigation/provenance metadata, not a formal selected-resource Fact manifest.
3. `README.md` — entry instructions, scope/exclusions, scenario controls, Design System binding, provider provenance placeholders and honest non-claims.

Only add local CSS/JS/SVG files when keeping them separate materially improves inspectability. Enumerate every dependency. Do not add remote URLs as runtime dependencies.

## 10. Requirement mapping

Map every material section and condition to the Source identifiers:

- `NAV-001/002`
- `CTX-001/002/003`
- `MODE-001`
- `LOC-001/002/003/004`
- `SPOT-001/002`
- `EVT-001..006`
- `SKY-001..007`
- `OBS-001/002`
- `MAP-001..008`
- `DETAIL-001..007`
- `DEC-001..005`
- `DATA-001..005`
- `MY-001..004`
- `SCOPE-001`
- `GOV-001`

The manifest must identify each ID as `covered`, `partial`, `excluded`, `not-applicable` or `decision-required`, with a locator and reason. Do not claim unseen states from a default frame.

## 11. Required scenario controls

Provide directly reachable reviewer scenarios:

1. Map formal-spot selection and route/facility decision.
2. Meteor-shower event → local effective night → place compare → formal spot → Plan.
3. Ordinary city/place → View Night Here → nearby formal spots.
4. Candidate → unverified warning → nearby formal spots.
5. Milky Way/photo target → moon/cloud/obstruction → sky scene.
6. Observation red/offline → manual orientation → return and exact restore.
7. Provider/layer/route failure with static content retained and recovery.
8. No-event daily Night.
9. Model disagreement and reduced confidence.
10. Safety hard blocker overriding a nominal score.

## 12. Sanity checks before returning

- Open `index.html` and exercise all reviewer scenarios.
- No missing local dependency, duplicate ID, console error or corrupt section.
- Check 320 / 375 / 430, day / night / observation, enlarged text and reduced motion.
- Check no document horizontal overflow, and all actions are at least 44px/88rpx.
- Check observation colors and first visible frame; no cool/white flash.
- Check focus order, visible focus, sheet/dialog containment and focus return.
- Check press cancel, filter draft/apply/cancel/reset, timeline step/scrub, marker/card/list synchronization and context restore.
- Check that every shown value is clearly example/source-bound and that ordinary/candidate/formal semantics do not collapse.
- Keep limitations visible: candidate only, current Context conflicts, no production runtime/native/real-provider/field acceptance.

## 13. Stop condition

Return the smallest complete candidate and exact file inventory. Do not adopt or select it, edit repository authority, reconcile the old proposal, overwrite selected v1, create a formal selected handoff, or claim production readiness.

## 14. Candidate-review iteration — map time focus and interaction locality

This section appends the accepted review delta; it does not rewrite the original S1/S2 commission or change authority.

### 14.1 Task-local requirements

- `USER-MAP-TIME-001`: replace the separated below-map time scrub with the **existing semantic light-estimate affordance** as the sole 44px in-map top-left trigger. Its visible first-frame copy is “光害估算 · 暗度 4/5 / 切换时间” with a time-semantic icon; do not invent a generic “图层与时间” trigger. The ordinary Map first frame uses `LIGHT`. On activation, enter a modal-like focus state made of a compact time/metrics panel above the **same physical map node**, and temporarily preview dynamic `OPPORTUNITY`. Move that map into the focus dock and keep an equal-height blank placeholder at its origin. Use one `selectedAt`, viewport and selection truth. Exit through scrim, close, Escape or system back with the reverse motion, restore `LIGHT`, and return focus to the trigger.
- The panel contains the scrubber, ±30 controls and four concise metric bars. Detailed source/limitation text is available by tap/focus on mobile; desktop hover may enhance but never own the only path.
- The scrub visibly updates time-varying `TOTAL_CLOUD`, `OPPORTUNITY`, spot weather, ranking and selected-card projections. `LIGHT` remains an annual/static estimate and must not pretend to vary hourly.
- Entry/exit motion is reversible and interruptible. The trigger may rise/scale/fade into the panel while the map moves to its dock; reduced motion removes positional/scale travel and uses near-immediate opacity. Map/marker interaction does not dismiss the focus state.
- `USER-UX-LOCALITY-001`: on mobile, keep continuous manipulation and its primary feedback in the same viewport / scroll-ownership region whenever practical. Avoid a flow that makes the user scroll down to manipulate and then scroll back up to inspect the result. The button + modal-like focus pattern is the selected solution for this map-time case, not a universal mandate for every control.

### 14.2 Design and state decision

The candidate owns only presentation state `timeFocusOpen`; the existing Observation Context owns time and the existing map owns viewport/layer/selection. Selected: one reparented map + equal-height placeholder + co-located focus panel. Rejected for this case: a sticky inline strip that still separates manipulation from feedback, and a bottom sheet that obscures the map. Prohibited: duplicate map/time stores, a second rendered map, fake hourly light-pollution data, hover-only mobile disclosure and uninterruptible large motion.

### 14.3 Authoring and production asset boundary

The self-contained candidate may use inline SVG for functional icons. That is an authoring carrier, not a production dependency decision. Production should first map semantic Tier-A keys to approved existing Mini Program icon/component assets; if no fit exists, apply the repository Build / Reuse / Buy judgment across installed dependencies, a mature compatible lightweight external icon set and bounded project SVG. Do not introduce a heavy UI library merely for a few icons, create duplicate icon truth, accept platform/license incompatibility or lose the ability to tune DESIGN stroke/size/state. Product-specific map-layer and marker geometry may remain custom.

### 14.4 Iteration provenance and writeback timing

- Review revision run: `bfb1f290-b8bc-471b-903a-9aea15481ee6`.
- Current-byte repair run: `f706ef2f-7d44-43ec-8134-b4e8a6e6125b`.
- External-QA metadata closure run: `e94724ba-9b8f-4a8c-894b-0b38d77d333c`.
- Exact light-estimate entry / visible time-preview repair run: `8a38ed85-d4a9-4bd5-a930-6cdd1d9a2ecb`.
- Current exact-byte external-QA metadata closure run: `f02b7866-7b48-4ef5-b411-775fba1b2cc8`.
- During candidate review, accepted deltas remain task-local in candidate/manifest/handoff/commission/index files. After explicit selection, reconcile all accepted/rejected/unresolved review outcomes into S1/S2 once, then perform Surface/Screen Context correction and UI Authority Closure. Until then the candidate stays unselected and non-production.

## 15. Candidate-review iteration — mobile interaction locality pattern and same-view repairs

This section records the next accepted requirement delta. Unlike the candidate-specific screen solutions, its reusable interaction invariant is also owned by the existing Mini Program Screen Contract through an explicitly invoked `context_surface_contract` update. It does not select this candidate or resolve the known V2 topology conflict.

### 15.1 Reusable interaction requirements

- `USER-UX-LOCALITY-001`: a continuous manipulation, its current value and its primary visual or numerical feedback must stay together in one mobile viewport or one bounded control-owned scroll surface. Do not require “scroll down → manipulate → scroll back up to inspect”.
- `USER-UX-FOCUS-PATTERN-001`: first prefer direct same-view co-location. When that cannot fit, use one self-explanatory functional trigger plus a route-owned modal-like focus layer or native Modal. An icon may stand alone visually only when conventional and unambiguous in context; every icon-only control still needs an accessible name/role/state, otherwise pair the icon with a concise label. The focus layer owns scrim, explicit close, Back/Escape, focus containment and return, one underlying state truth and reduced-motion equivalence. Secondary explanation uses an explicit operable disclosure and is never hover-only.
- This is a conditional pattern, not a rule that every mobile interaction must become a Modal. If control and feedback fit in one bounded surface, direct co-location is preferred.

### 15.2 Concrete repairs

- `USER-NIGHT-TIME-FOCUS-001`: remove the long-scroll inline unified timeline from the global Night route. Put an icon + “切换时间” trigger and current time in the opportunity card. Its focus layer keeps the scrubber, current time and concise opportunity / total-cloud / moon-impact / window-stability bars in one view; drag preview and commit reuse the sole selectedAt/Observation Context. Detail text is an explicit disclosure. Do not fabricate hourly light-pollution values.
- `USER-MAP-SELECTION-FOCUS-001`: put an icon + “选地点 · count” trigger inside the map. Its focus layer moves the same physical map node beside a compact native candidate list and selected summary while the origin holds an equal-height blank placeholder. Marker, list and summary share the sole selection truth. Exit restores the same map and preserves selection, pan/zoom, layer, filters and opener focus. The below-map ranking/accessibility list moves into this layer; the selected place decision card may remain in the normal route because it is a subsequent action surface, not the selection control itself.
- `USER-SKY-ORIENTATION-LOCALITY-001`: move manual-orientation control and live direction/sensor/manual-state feedback into the sky scene card beside the canvas. This case fits directly and therefore must not open a focus layer merely to imitate the pattern.

### 15.3 Shared lifecycle and acceptance

The candidate uses one mutually exclusive focus-layer presentation state across map time, Night time and map selection. Only map-related layers relocate the one map DOM; Night time has no duplicate opportunity/time store. Opening makes the rest of the phone inert and scroll-locked; closing by scrim, close, Escape or system Back reverses motion and returns focus. Normal motion completes within 180–220ms; reduced motion removes spatial travel and keeps state/opacity feedback at no more than 100ms. Functional map interaction never owns dismiss. All new triggers and locators remain at least 44px, work at 320/375/430px, have no page-level horizontal overflow, and remain operable by keyboard and screen reader.

Required locators include `night-time-focus-trigger`, `night-time-focus-layer`, `night-time-scrubber`, `night-time-metric-opportunity`, `night-time-metric-cloud`, `night-time-metric-moon`, `night-time-metric-stability`, `night-time-details-toggle`, `map-selection-focus-trigger`, `map-selection-focus-layer`, `map-selection-map-dock`, `map-selection-list`, `map-selection-summary`, `sky-orientation-local-control` and `sky-orientation-feedback`.

### 15.4 Iteration provenance and writeback timing

- Open Design major revision run: `a3fc28ee-c68c-4903-bbcb-0bef63f04299`, requested `gpt-5.6-sol / xhigh` against `user:soft-instruments`.
- Shared focus-animation lifecycle repair run: `c5bcb680-11ec-4ea5-aeda-85c340cb7de1`, `succeeded`, exit `0`, `endedWithUnfinishedWork=false`. It fixes stale WAAPI `fill:forwards` state across normal-motion / reduced-motion round trips by interrupting from live computed state, applying stable end styles before cancellation and clearing stale effects on every open/close.
- Historical pre-map-first external-QA lifecycle metadata closure run: `df9e9945-13cd-484d-90f9-056ad0dd07ad`, requested/effective start trace `gpt-5.6-sol / xhigh`, `succeeded`, exit `0`, `endedWithUnfinishedWork=false`. It only updated `README.md`, `resource-manifest.json` and `index.html.artifact.json`; it recorded rather than performed independent QA. At that snapshot, `index.html` was SHA-256 `56311DF6EA5E64E79B63CE8D57E6CD2CCA0319AB4CDD05181D6DFFFD301A5686` and `brand-spec.md` was `C1552347FD06724A45B12ACB51032A8619A94F9B3B6AA36361A824A184E6DFA1`.

## 16. Candidate-review iteration — map-first discovery boundary and formal-spot Night routing

This section records the map-first major revision inside the same DRA requirement-confirmation-iteration loop. It did not create a second product request, select the candidate, adopt authority or reconcile S1/S2. Section 18 later adds the Source-conformance filter correction, and Section 19 owns the current closure.

### 16.1 Active explicit-user requirements

- `USER-MAP-CONTENT-BOUNDARY-002`: Map exists to filter and compare formal stargazing spots using simplified basic information. Remove the full top Observation Context block and all below-map detailed spot cards. Complete decision, route, facility, safety, media and provenance content belongs to `spot/detail`.
- `USER-MAP-LAYERS-002`: the ordinary map is the base canvas, not a tab. Formal spots are visible by default. One layer entry controls at most one optional analytical overlay: none, light pollution, total cloud or user-facing `今晚观测条件` (internal SkyOpportunity). Remove the horizontal duplicated layer-tab row.
- `USER-MAP-TIME-002`: retain the compact in-map light/time bar as a persistent summary and self-explanatory time trigger, independent of the active overlay. Reuse the current one-map time-focus lifecycle and equal-height origin placeholder. Exit restores the overlay active before entry (default `NONE`); it does not force `LIGHT`. Light data remains period-static unless Source says otherwise.
- `USER-MAP-DIRECT-GESTURES-002`: remove permanent left/right pan and `+`/`−` zoom buttons. The map supports pan, pinch and tap. Search, Favorites and the accessibility list are operable non-gesture alternatives; automatic recentering cannot fight a user pan.
- `USER-MAP-CALLOUT-002`: marker activation selects one formal spot and opens a compact callout on the same map. Show the name plus a small icon/value comparison set such as light class, parking, distance/drive estimate and tonight observing condition. Callout border feedback begins on press-in; only valid press-out or keyboard/accessibility activation enters `spot/detail`; drag-away/cancel/disable/gesture loss never navigates.
- `USER-MAP-FAVORITES-002`: replace the previous generic “选地点” focus layer with a true `观星点收藏夹` trigger and centered modal-like vertical card list. Include only favorited formal spots; do not mix nearby, search or filtered results. Its list owns bounded vertical scrolling. Scrim/close/Back/Escape dismiss and restore trigger focus. Selecting a favorite closes, recenters only if necessary, commits the shared selection once and opens its callout.
- `USER-PRIMARY-NAV-002`: primary navigation is exactly `地图 / 我的`, two equal destinations, with Map as the default. Remove global `夜空`.
- `USER-SPOT-NIGHT-002`: Night is a child of formal Spot Detail at `spot/sky` and inherits `spot_id`, date/time, timezone and revision. Ordinary/candidate places cannot synthesize formal Spot Night. Move the accepted time-locality focus interaction to this route.
- `USER-UI-LIBRARY-REUSE-001`: inline SVG may keep this authored artifact self-contained, but production defaults to project-approved Mini Program components/icons and may use a mature lightweight compatible library or bounded self-implementation. Any choice must preserve DESIGN theme/modes, accessibility, platform and license compatibility and one token/icon truth; a heavy dependency or a second system is not required or allowed without justification.

### 16.2 Supersession and inactive-meaning containment

- `USER-MAP-TIME-002` supersedes only the default-layer/forced-restore portion of `USER-MAP-TIME-001`; its one-map focus transition, placeholder, time synchronization, reverse exit, focus return and reduced-motion semantics remain active.
- `USER-MAP-FAVORITES-002` supersedes the all-candidates same-map picker composition of `USER-MAP-SELECTION-FOCUS-001`; one shared selected-spot truth, modal lifecycle and focus restoration remain active.
- `USER-SPOT-NIGHT-002` supersedes the global route scope of `USER-NIGHT-TIME-FOCUS-001`; its local scrubber/value/feedback contract remains active under formal `spot/sky`.
- S1/S2-derived visible three-tab navigation, global Night, ordinary/candidate Night actions, the full Map Observation Context card, detailed Map result cards, the generic location picker and horizontal map-layer tabs are inactive for the current candidate and must not remain visible or be counted as active coverage.
- The original S1/S2 files remain byte-unchanged during review. After explicit final selection, reconcile every accepted/rejected/superseded/unresolved delta once into the authorized product/technical proposal and then perform final authority closure.

### 16.3 Required current-candidate journeys

1. Cold start shows Map/My only, ordinary base map and formal markers without choosing a layer.
2. A single layer control switches none/light/cloud/tonight-conditions without changing selected spot or duplicating the persistent time bar.
3. The time bar opens the one-map focus state; scrubbing changes time-dependent map/metrics; scrim/close/Back/Escape reverses and restores the prior overlay, viewport, selection and trigger focus.
4. Marker tap opens the compact callout; callout press-in is visible; cancel does not navigate; valid release opens existing Spot Detail.
5. Spot Detail visibly owns complete information and exposes Night as a child entry; Spot Night retains the accepted local time-focus pattern and shared formal-spot context.
6. Favorites opens a centered independently scrolling modal, preserves static favorites under dynamic-summary failure, selects one favorite, closes, recenters if needed and opens the same callout.
7. Pan/pinch/tap remain the map gestures, with no visible arrows/zoom steppers; keyboard/accessibility alternatives remain usable.
8. Day/night/observation, 320/375/430px, large text and reduced motion preserve the same ownership, no horizontal page overflow, at least 44px targets, focus containment/return and no inactive-meaning leakage.

### 16.4 Provider and status boundary

This is a major revision because it changes cross-surface information architecture and the primary map interaction model. Re-discover the live provider immediately before the run, use the highest authoritatively ranked eligible model and highest reasoning value supported by the actual Open Design run surface, verify `user:soft-instruments` binding, and preserve requested/effective provenance. Provider completion, artifact retrieval and independent resource QA remain separate. The result stays `unselected / SAMPLE_DATA / non-production`.
- Independent current-byte QA is carried by `candidate-handoff.md` and `WORK_INDEX.md`: 320/375/430px, large text, reduced-motion round trips, Night time focus, same-map time and selection focus, local sky orientation, scrim/Escape/system Back, focus return, 44px targets, overflow, duplicate IDs and warn/error console were checked. This is design-resource QA, not product, selection, native WeChat or production acceptance.
- Reusable locality rules and the accepted surface ownership are now durable in `product-surface-contract.md` and `screen-contracts/wechat-miniapp.md`; the authored visual arrangement remains task-local and unselected.
- Original S1/S2 stay byte-identical during candidate review. After explicit selection, reconcile all accepted/rejected/superseded/unresolved screen semantics into S1/S2 once, then perform UI Authority Closure and create a new immutable selected version.

## 17. Historical map-first major-revision execution and independent closure

Section 16 was executed through Open Design run `963bc775-dceb-4a0b-a15a-e6cfc5527a39` against the same project/conversation and `user:soft-instruments` binding. Requested/effective model and reasoning were `gpt-5.6-sol / xhigh`; terminal state was `succeeded`, exit `0`, `endedWithUnfinishedWork=false`.

The run rebuilt the visible candidate rather than retaining the prior topology. The byte-exact snapshot immediately after that run was:

- `index.html`: `C3477A02B5F3FEAA4071D369CA87CA7A3591815834F8B224B2AFFF7BEE94DEF5`.
- `README.md`: `9FFA8729AA531028F4E261FAA9FF1ED33811AE6EB2BDFFAA575CC62962AEE0C9`.
- `resource-manifest.json`: `500326FBAEA8BA3AC41B768658189F6660C22555A9D471152CBCD106B1967DC4`.
- `brand-spec.md`: `C1552347FD06724A45B12ACB51032A8619A94F9B3B6AA36361A824A184E6DFA1`, unchanged.

That snapshot contained 73 unique dispositions: 57 covered, 3 covered-active-remainder, 3 partial, 1 excluded and 9 inactive-superseded. All nine Section 16 explicit-user IDs were covered. The three earlier USER IDs retained only their still-valid locality/single-state lifecycle portions; the old default LIGHT, generic all-candidates picker and global Night scopes were not active coverage. Section 18 later found and corrected one missing S1 filter requirement, so these hashes/counts are historical rather than current.

Provider current-byte browser QA discovered and repaired route/overlay History ownership, bounded animation settlement under browser throttling, Detail/My selected-segment styling, Observation-mode route leakage and the Observation range-track cold-gray leak. Its final checks reported one physical map, zero ghosts, zero duplicate IDs, zero open layers, no overflow and zero console warnings/errors.

After exact-byte retrieval, the outer workflow independently verified the repository candidate at 320×800, 375×900 and 430×932. It exercised sparse Map/default formal markers, layer switching, one-map time focus, real scrim and Escape, Favorites, callout drag-away and valid commit, Detail → Spot Night, night time focus, Observation scope restoration, My Favorites, large text, filter apply, accessibility list and direct map pan. Final dialog/a11y, locator, hash, JavaScript/JSON, duplicate-ID, ghost, overflow and console checks passed. Exact evidence and non-claims are carried by `candidate-handoff.md`, `WORK_INDEX.md` and the repository sidecar.

The canonical provider README/manifest deliberately retain `independent = not run` as the provider pre-retrieval lifecycle snapshot. The later outer independent QA is not back-written into those provider bytes; the handoff explicitly reconciles this lifecycle so there is one current interpretation without pretending the provider performed the independent check.

Current Context now owns Map/My, sparse Map-versus-Detail responsibility, formal `spot/sky` child ownership and the reusable locality/focus pattern through `product-surface-contract.md` and `screen-contracts/wechat-miniapp.md`. S1/S2 remain unchanged until explicit candidate selection and one-time requirements reconciliation. The candidate remains unselected, sample-only and non-production.

## 18. Source-conformance correction — complete filter taxonomy

Final Source reconciliation found one concrete omission in the current candidate and one durable-count drift. S1 §9.7 defines exactly 18 terminal filters, not 27 and not the candidate's representative six. This correction is part of the same DRA loop; it does not add product scope, select the candidate or alter S1/S2.

- `MAP-009`: expose all 10 first-level filters — 今晚推荐、最佳窗口时长、距离/驾车时间、光害、少云、停车、厕所、可驾车直达、摄影前景、可露营/驻车 — and all 8 advanced filters — 特定天象、低云阈值、月亮影响、徒步难度、信号、充电、天空开阔方向、最近核验时间.
- Keep one Filter Modal/focus layer and one `filterDraft`/`committedFilters` truth with draft → apply, cancel-without-commit and reset-draft-only semantics. Grouping may be visually explicit, but all 18 choices remain terminal and operable in the Modal's own bounded vertical scroll.
- The normal Map stays sparse; do not surface the 18 choices as horizontal tabs, chips or detailed cards on the base screen. The trigger shows the committed count and receives focus after close/apply. Scrim, explicit close, Escape/system Back, focus containment/return, large text, 320/375/430px and 44px targets remain required.
- Update `resource-manifest.json` and `README.md` so `MAP-009` has an explicit current disposition and the Source-defined count/taxonomy is inspectable. Preserve all Section 16 behavior and run current-byte provider QA covering all 18 labels, draft/apply/cancel/reset, independent scrolling, responsive layout, focus lifecycle, no overflow/duplicates/ghosts and zero console warning/error.

The durable owners were corrected from 27 to 18 in `product-surface-contract.md` and `screen-contracts/wechat-miniapp.md`; no production code is changed.

## 19. Complete-filter correction execution and current independent closure

Section 18 was executed through Open Design run `b5e1811d-de7b-4ad7-8c9f-b69f9ee019d0` against the same project, conversation and `user:soft-instruments` binding. Requested/effective model and reasoning were `gpt-5.6-sol / xhigh`; terminal state was `succeeded`, exit `0`, `endedWithUnfinishedWork=false`.

Current Open Design project files were retrieved byte-exact into the repository:

- `index.html`: `26EDF20E9AE016A8911CF78CF8F9F8AB3293274BBE36BD001EDAA3E81BDBD506`.
- `README.md`: `D05CFF1C0DE036FDF7F7B515320447F5E1DD4923FC72984E8A7532FB884520E8`.
- `resource-manifest.json`: `A5360F8738EE6C4E7205B0A7707DAA1C293F2D72E9EA89C7438408F6A18B9DD6`.
- `brand-spec.md`: `C1552347FD06724A45B12ACB51032A8619A94F9B3B6AA36361A824A184E6DFA1`, unchanged.

That correction snapshot's manifest contains 74 unique dispositions: 58 covered, 3 covered-active-remainder, 3 partial, 1 excluded and 9 inactive-superseded; `MAP-009` is covered and decision-required remains zero for that snapshot. Provider snapshot-byte QA mechanically matched the 18 labels in exact S1 order, toggled every terminal choice and proved Cancel/Reset/Apply boundaries, committed-count feedback, owned scrolling, responsive/large-text behavior and all dismissal paths. It also found and repaired one shared focus-trap defect where initial Filter-title `Shift+Tab` could reach the outer reviewer controls. The repair contains Tab/Shift+Tab in the topmost Modal without changing routes or visual topology.

After exact-byte retrieval, the outer workflow independently repeated that snapshot-hash's checks. At 320×800, 375×900 and 430×932, normal and large text had zero page/phone horizontal overflow and zero visible targets below 44px; the Filter Modal exposed exact 10+8 groups, scrolled independently while phone/page scroll stayed fixed, and brought the final 44px item fully into view. All 18 choices toggled; Cancel retained committed=1, Reset cleared only the draft, Apply committed 4 and restored opener focus. Explicit close, scrim, Escape and system Back all left zero open layers and returned focus; Shift+Tab remained inside.

Regression on the same repository bytes preserved the sparse Map, four optional layer choices, one-map time relocation/restoration, prior overlay, no ghosts, formal-only Favorites, compact callout → Overview/Guides/Site Detail → formal `spot/sky`, Spot Night time focus, Observation scope restoration and Map/My navigation. Runtime `map-filter-first-level` and `map-filter-advanced` locators resolved once each and contained 10/8 terminal choices. JSON, both inline JavaScript blocks, manifest totals/hashes and remaining locator strings passed; duplicate authored/runtime IDs, remote dependencies and browser warn/error were zero.

The canonical provider README/manifest still say independent outer QA was not run at the Provider boundary. That is an intentional frozen lifecycle statement, not the current outer conclusion. The current independent result is owned by `candidate-handoff.md`, `WORK_INDEX.md` and `candidate/index.html.artifact.json`, all bound to the current index hash above. The candidate remains unselected, sample-only and non-production; S1/S2 remain byte-unchanged until explicit candidate selection and one-time requirements reconciliation.

## 20. Candidate-review iteration — production-clean phone, unified Search and adjacent analysis/time

This section is the current controlling delta in the same DRA confirmation → critique → requirement change → regenerated-resource loop. It does not create a new request, select the candidate, mutate S1/S2 or authorize production. Where it conflicts with Sections 14–19, this later explicit-user decision controls the next candidate.

### 20.1 Active explicit-user requirements

- `USER-PRODUCT-COPY-BOUNDARY-001`: the phone is a user product surface, not a design rationale or reviewer report. Remove visible product-thinking slogans, routine gesture tutorials, route/debug/revision labels, provider QA prose and `SAMPLE_DATA` review disclosures from the phone. Put review-only provenance/disclosure in the outer reviewer shell. Do not remove user-relevant source date, freshness, uncertainty, limitation, permission rationale, failure or recovery content from its owning product surface.
- `USER-SPOT-FINDER-001`: replace peer point-list, Favorites, Search and Filter controls with one visible `搜索` trigger above the map and one near-full-height modal Bottom Sheet. The Sheet contains a search field and inline access to the exact S1 §9.7 18-filter draft/apply/cancel/reset owner. Query plus committed filters jointly project both result partitions. `想去` contains matching favorited formal spots; `其他观星点` contains the remaining matches. Both expose count and expanded state. Preserve query, committed filters, partition state and useful scroll on close/reopen. Empty, partial, stale-summary and Provider-failure states must not destroy static spot/favorite identity.
- `USER-FINDER-CITY-GROUPING-001`: `想去` and `其他观星点` are the only first-level collapsible partitions. City names are headings/sticky labels inside a partition, never a nested disclosure. Cards remain compact location/comparison results, not full Spot Detail. Include enough sample results across at least two cities and both partitions to demonstrate the grouping and joint filtering.
- Finder result activation closes the Sheet, recenters the existing map only if needed, commits the sole selected formal spot and opens the same compact callout. It must not navigate to Detail. A later valid callout release/keyboard/screen-reader activation enters `spot/detail`; drag-away or map-pan competition cancels navigation.
- `USER-MAP-ANALYSIS-TIME-001`: replace the in-map light/time bar and separate analysis trigger with one compact `分析与时段` region above the map, after `搜索` and immediately before the map. The ordinary map and formal markers are always present and are not tabs. The region offers mutually exclusive `无叠加 / 光害 / 总云量 / 今晚观测条件` choices plus one shared local date/time scrubber directly adjacent to the map feedback. One colored raster/forecast overlay is active at most. Dragging previews already-loaded frames and dependent point summaries; valid release commits `ObservationContext.selectedAt` and may request/prefetch a new window; cancel restores the last committed value. Exact date/time activation may open a small picker using the same state. `LIGHT` is visibly source-period/static unless Source later proves a time series; never fabricate hourly light movement. This direct co-location supersedes the previous Map-relocation time focus layer and its placeholder, while the formal `spot/sky` time focus remains active.
- `USER-SPOT-DETAIL-ACTIONS-001`: in Spot Detail, put the Favorite state as an accessible icon beside the spot name; put distance/route and `去这里` directly below the identity in the header hierarchy, similar to a local-place information page. Keep one Night child entry in the upper Detail hierarchy. Remove the repeated three-button `收藏 / 查看夜空 / 去这里` row from the arrival/facilities card. Restore the DESIGN card gap and keep facilities cards factual.

### 20.2 Visible composition and state graph

The default phone route is intentionally simple: product title/header if needed → one `搜索` trigger → one `分析与时段` region → one map → two-item `地图 / 我的` navigation. Do not print explanatory copy such as “筛选与对比观星点”, “用简化信息先找到…” or “拖动/双指缩放”. Native gesture behavior is discovered through use; the accessible non-gesture alternative is the Search Sheet.

The Search Sheet is one dialog lifecycle and one owned vertical scroll, not a nested-modal stack. Search remains visible near the top; the 18 filters may expand inline or use an in-sheet disclosure region without opening another Modal. Applying filters updates the two result partitions atomically. City headings may stick within the Sheet. Closing by scrim, explicit close, Escape or system Back returns focus to `搜索`; keyboard and safe area never hide the active field or selected result.

The analysis/time region is not a long dashboard. Use concise layer chips/segmented options, a single time label, a directly manipulable scrubber and only the minimum legend/value needed to interpret the active overlay. The map remains physically in place throughout Map time editing. Changing time never causes a scroll-away/return journey, second map, duplicate selectedAt store or motion-only feedback.

### 20.3 Supersession and requirement reconciliation

- `USER-SPOT-FINDER-001` supersedes the visible composition of `USER-MAP-FAVORITES-002`, the separate Filter entry and any peer point-list/Search control. The still-valid lifecycle remainder is one route-owned modal surface, bounded scroll, shared selection, static favorite identity, dismissal and focus return.
- `USER-MAP-ANALYSIS-TIME-001` supersedes the visible composition of `USER-MAP-TIME-002` and the Map relocation/focus-layer portions of `USER-MAP-TIME-001`. It preserves single selectedAt, preview/commit, static-LIGHT honesty, one active overlay and interaction locality. It does not supersede the formal Spot Night time-focus pattern.
- `USER-SPOT-DETAIL-ACTIONS-001` supersedes S1 §10.7 and S2 `DETAIL-007` bottom action placement in the current candidate. These Source conflicts remain pending one-time Proposal writeback only after explicit selection.
- S1 §9.2 direct Search-result → Detail, S1/S2 separate Search/Filter/layer/time controls and the current candidate's review-copy leakage are inactive for this next candidate. S1/S2 bytes remain unchanged during review.

### 20.4 Provider instructions and acceptance journeys

Perform a major revision of all four canonical Open Design project files while preserving the verified `user:soft-instruments` binding, self-contained runtime, unique `data-od-id` locators, day/night/observation modes, large text, reduced motion and all still-active Map/My/Detail/Spot Night/My/failure scenarios. `brand-spec.md` should remain unchanged unless the established design-system binding truly requires a correction.

Required new/updated locators include: `map-search-trigger`, `spot-finder-sheet`, `spot-finder-search-input`, `spot-finder-filter-disclosure`, `spot-finder-filter-first-level`, `spot-finder-filter-advanced`, `spot-finder-wanted-section`, `spot-finder-other-section`, `spot-finder-city-heading`, `spot-finder-result-card`, `map-analysis-time-panel`, `map-analysis-layer-control`, `map-analysis-time-scrubber`, `map-analysis-time-value`, `spot-detail-favorite`, `spot-detail-route-action` and `spot-detail-night-entry`. Retired visible locators must not remain as ghost UI.

Provider current-byte QA must exercise:

1. Cold start at 320/375/430px shows no phone-visible product rationale, routine gesture tutorial, route/debug/reviewer or `SAMPLE_DATA` text; the outer reviewer shell still discloses unselected/sample-only provenance.
2. Exactly one `搜索` trigger opens one modal Sheet; query and each of 18 filters jointly affect both partitions; counts, collapse/expand, multi-city headings, no-results and reopen restoration work with one owned scroll and no nested dialog.
3. Result activation returns to the same map callout without route change; valid callout activation alone enters Detail.
4. Exactly one analysis/time region sits above the map. All four overlay values are mutually exclusive, one map remains mounted, formal markers remain visible, time drag previews and release commits, static LIGHT does not fake hourly change, and no old in-map time/layer bar or Map relocation layer remains.
5. Detail has card spacing, Favorite beside name, `去这里` in the identity route row and one upper Night entry; the old facilities action row is absent.
6. Scrim/close/Escape/system Back, focus containment/return, keyboard, 44px targets, large text, reduced motion, day/night/observation, overflow, duplicate IDs, stale async cancellation and zero browser warnings/errors pass on current bytes.

Provider completion is self-QA only. Exact-byte retrieval and independent repository Browser QA remain outer-workflow responsibilities. The result remains `unselected / sample-only / non-production` and must not overwrite the old selected v1.

## 21. Unified-Search major revision, final authoring repair and independent closure

Section 20 was executed as a major revision in the existing Open Design project and conversation through run `a2a94690-dc4a-49af-bb21-abb1717837d7`. Requested/effective start-trace model and reasoning were `gpt-5.6-sol / xhigh`; terminal state was `succeeded`, exit `0`, `endedWithUnfinishedWork=false`. The run regenerated the candidate around the production-clean phone, one Search Sheet, adjacent analysis/time panel and revised Detail action hierarchy while preserving `user:soft-instruments` digest `5dd2e7acf43973793a8ae70bd0db8266c7253f27ebdeb6d944657b83e3a855e6`.

Exact retrieval and outer QA found two closure defects rather than a new product requirement: the manifest's current-delta pointer still referenced historical Section 16, and callout keyboard activation depended on the browser's synthetic `click(detail=0)`, which the independent browser harness could not reproduce directly. Final authoring-repair run `41cc4739-0720-45c6-90eb-6e5bc67a3079` stayed in the same project/conversation/binding, used requested/effective `gpt-5.6-sol / xhigh`, and ended `succeeded`, exit `0`, `endedWithUnfinishedWork=false`. It changed only `index.html` and `resource-manifest.json`: `authority.activeDelta[0]` now points to Section 20, and the map callout has explicit Enter/Space handling with repeat suppression and generated-click de-duplication while retaining pointer press, valid release, drag-away and pointercancel semantics. README and `brand-spec.md` remained byte-identical.

The final four provider files were retrieved byte-exact into the repository:

- `index.html`: `D614642E9348B201341E593DAC7C6FB17B7250F5ABCEFF9B6777F5BC1FD6A92B`.
- `README.md`: `3C2151626282A3077649F06877BC546C8FDB95834E08487C6EB1C1E1006F8A8E`.
- `resource-manifest.json`: `26B10C2AC566B63B656D15ABE2FE5D2E8A5402E5F8184EDA25D3800F790E347D`.
- `brand-spec.md`: `C1552347FD06724A45B12ACB51032A8619A94F9B3B6AA36361A824A184E6DFA1`, unchanged.

The final manifest contains 79 unique dispositions: 60 `covered`, 1 `covered-active-remainder`, 3 `partial`, 1 `excluded`, 14 `inactive-superseded` and 0 `decision-required`; 65 dispositions remain active. U11–U15 (`USER-PRODUCT-COPY-BOUNDARY-001`, `USER-SPOT-FINDER-001`, `USER-MAP-ANALYSIS-TIME-001`, `USER-SPOT-DETAIL-ACTIONS-001`, `USER-FINDER-CITY-GROUPING-001`) are all `covered` with current locators. Earlier standalone Favorites, Filter/list/Search entries, in-map time/layer bars, Map relocation focus, duplicated Detail actions and related visible compositions remain historical/inactive rather than double-counted.

Independent QA was rerun against the final `index.html` hash above. At 320×800, 375×900 and 430×932, the phone had zero horizontal overflow, zero visible action targets below 44px, one Search trigger, one analysis/time region, one physical map, six formal markers and exactly Map/My navigation. The Search Sheet had one dialog, no nested dialog, exact 10+8 filters, one owned scroll, `想去/其他观星点` as the only first-level partitions and Shanghai/Hangzhou/Huzhou city headings. Search `杭州` plus committed `光害` filtering returned only `余杭高地草场`; activating it closed the Sheet, stayed on Map, preserved one map and focused the same callout. Enter and Space each entered Detail exactly once. Detail exposed one Favorite icon beside the name, one route/`去这里` action below it, one upper Night entry and zero facilities-card actions.

Analysis/time regression proved one map remained mounted, LIGHT retained identical static class/opacity/transform across time changes with source-period copy, while TOTAL_CLOUD opacity/transform changed with the shared scrubber. At 320px large text plus reduced motion, the Search Sheet owned scrolling while phone scroll stayed fixed, the last filter could be brought fully into view, Escape closed the Sheet and restored focus to Search. Final runtime checks found zero open layers, ghosts, duplicate IDs, unnamed visible buttons or browser warnings/errors. JSON and both inline scripts parse, current hashes/locators/counts reconcile, and no external runtime dependency exists.

Provider README/manifest intentionally retain `independent = NOT RUN for current bytes` because provider self-QA stops at its boundary. The later independent result is owned by `candidate-handoff.md`, `WORK_INDEX.md` and the repository sidecar and is bound to the final index hash. This remains one unselected, sample-only, non-production DRA candidate. S1/S2 remain byte-unchanged until explicit candidate selection and one-time accepted/rejected/superseded/unresolved reconciliation.

## 22. Candidate-review iteration — first-viewport Map and SourceLift visual refinement

This section is the current controlling delta in the same DRA confirmation → critique → requirement change → regenerated-resource loop. It is later than Sections 20–21 and therefore controls the next candidate wherever the compositions conflict. It does not create a second request, adopt a new Design System, select the candidate, mutate S1/S2 or authorize production.

### 22.1 Active explicit-user requirements

- `USER-MAP-FIRST-VIEWPORT-001`: at normal text size, keep the compact page header, one high-density Search row, a usable Map origin and the Map/My bottom navigation in the same 320×800, 375×900 and 430×932 phone viewport. The Map is the subject and consumes the remaining safe height; the user must not scroll past a permanent analysis panel before comparing markers. Large text may compress summaries to `+N` and reflow secondary copy, but it cannot eliminate a usable map or hide the source controls.
- `USER-SOURCE-LIFT-FOCUS-LAYER-001`: define one reusable **原位提升焦点层 / `SourceLiftFocusLayer`** family with one state machine `IDLE → LIFTING → FOCUSED → RESTORING/CANCELLED`, one source anchor, an exact geometry-preserving origin placeholder, a fixed-like safe-area destination, scrim, explicit close, Back/Escape, contained focus, opener-focus return, reversible interruption, live-value retargeting and a reduced-motion equivalent. It has exactly two current variants:
  - `mapCoupled`: the in-map analysis/time Bar lightly scales and rapidly fades as its information surface fades in; the same physical map translates/resizes into the companion dock without opacity animation, cloning, remounting or a second map state. Exit reverses from the live presentation values, the information panel fades out, the source Bar fades back in and the map returns without a fade.
  - `panelOnly`: the Search source Bar lifts to the fixed safe top and the Finder surface reveals downward; no companion map moves.
  Normal motion uses the existing Soft Instruments state/content and compact-panel timing grammar, not bounce/overshoot/idle motion. Reduced motion uses immediate geometry plus at-most-100ms opacity and preserves all semantic state. Input remains accepted during retargeting.
- `USER-SEARCH-LIFT-COMPACT-001`: Search remains one compact control row rather than a large empty button. It exposes a primary query/placeholder and a secondary summary drawn from city, at most two high-priority committed filters and `+N`/result count; insufficient width shortens the summary instead of listing everything. Activating it uses `SourceLiftFocusLayer.panelOnly`; the fixed Search header owns an explicit `×` close. Focused query may open an anchored history/fuzzy-suggestion overlay that does not consume the main Finder scroll geometry. Choosing a suggestion or confirming text updates query/results and never enters Detail or bypasses the later map-callout activation.
- `USER-FINDER-COMPACT-HIERARCHY-001`: recompose Finder as one calm planar surface. `筛选条件`, `想去` and `其他观星点` are typographic disclosure headings, not bordered button cards. The exact 18 filters remain 10 first-level plus 8 advanced and use a compact adaptive grid: three columns normally, four only when short labels fit, and long labels span/reflow; visible text may be 12–13 CSS px while each choice retains at least a 44px hit region. The Filter editor is an anchored overlay above the result surface and does not alter the parent scroll height; it owns bounded vertical overflow when needed. Search suggestions and Filter editor are mutually exclusive and close before the parent focus layer. Opening filters snapshots committed values to one draft. Remove the large Reset/Cancel/Apply row. Only while the draft is dirty, the disclosure header shows compact circular `×` revert and `✓` commit icon actions with programmatic names, 44px hit regions and non-color-only meaning. Revert restores the opening snapshot; commit atomically updates both result partitions. Whole-Finder dismissal discards any uncommitted draft. Partition chevrons use a small optical glyph inside the full header hit row. Use typography, whitespace, dividers and one flat inset before borders/radii/shadows; no nested elevated card wall.
- `USER-SPOT-DETAIL-QUIET-ACTIONS-001`: in Spot Detail, Favorite is a visually borderless 20–24px glyph immediately beside the spot name inside a transparent 44px hit target; pressed/selected state is not color-only. The distance/drive row has one quiet trailing text action `去这里 →`, with no filled block or enclosing border. Keep exactly one upper Night entry and no facilities action row.
- `USER-SOFT-INSTRUMENTS-APPLICATION-001`: do not create or imply a new Design System. Apply the existing `target.system.wechat-miniapp-soft-instruments-2026-08-05` correctly: map/place/data are the subject; primary blue is high signal, not blanket decoration; LIGHT uses the existing warm accent family, TOTAL_CLOUD uses cyan, OPPORTUNITY uses violet, and success/warning/danger remain semantic with icon/shape/text reinforcement. Use the existing typography roles and spacing rhythm, visually separate hit area from glyph/chrome, avoid stacked elevation, and preserve the one-trailing-action rule. Add only candidate-level component contracts/locators for SourceLift, compact map status Bar, flat disclosure header, overlay suggestion/filter and quiet trailing action. `DESIGN.md` and `brand-spec.md` remain unchanged.

### 22.2 Composition, state and scroll ownership

The default Map phone is: compact title/freshness header → one Search summary Bar → one remaining-height map with the analysis/time Bar inside it → Map/My safe-area navigation. The selected-spot callout may float in the map's lower safe region, but no permanent analysis card may push the map below the first viewport. Reviewer routes, requirements and provenance remain outside the phone.

There is one physical `map-base` element for idle Map, Map analysis focus and restoration. When `mapCoupled` begins, preserve its origin geometry with a placeholder and move/dock that same element; mutation observers and runtime counts must continue to report exactly one map. Do not hide a duplicate at opacity zero. The analysis Bar displays only the current overlay name, one current metric/state, local time and a concise disclosure cue. The focused information surface contains the mutually exclusive overlay selector, shared time scrubber/exact value, compact metric bars and source/static-dynamic explanation. `LIGHT` stays visually/data static across time; `TOTAL_CLOUD` and `OPPORTUNITY` update from the same `selectedAt` preview/commit owner.

The Finder focus layer owns one result scroll. `map-finder-query-overlay` and `map-finder-filter-overlay` are sibling anchored disclosures within it, never nested dialogs. Each overlays the results without changing the result scroll height/position and owns a bounded scroll only when its own content exceeds its allowed height. Close order is disclosure → Finder → route. Search query, committed filters, partition expanded state and useful result scroll survive Finder close/reopen; draft filter edits do not.

### 22.3 Supersession and exact requirement inventory

- `USER-SPOT-FINDER-001` becomes `inactive-superseded`; U18/U19 fully preserve its one-entry, one result projection, exact 18-filter semantics, two partitions, city headings, state retention, failure/static-identity behavior and result → same-map-callout navigation while replacing its standard near-full-height Sheet shell, large filter controls and apply-row composition.
- `USER-MAP-ANALYSIS-TIME-001` becomes `inactive-superseded`; U16/U17 preserve mutually exclusive overlays, one `selectedAt`, preview/commit/cancel, one map and static-LIGHT honesty while replacing the permanent above-map panel with the compact in-map source Bar and `mapCoupled` focus layer.
- `USER-SPOT-DETAIL-ACTIONS-001` becomes `inactive-superseded`; U20 preserves the identity-header ownership, no duplicate facilities actions and one upper Night entry while replacing the visible Favorite/navigation treatment.
- `USER-FINDER-CITY-GROUPING-001`, `USER-UX-LOCALITY-001`, `USER-UX-FOCUS-PATTERN-001`, `USER-MAP-DIRECT-GESTURES-002`, `USER-MAP-CALLOUT-002`, `USER-PRIMARY-NAV-002`, `USER-SPOT-NIGHT-002` and the formal `USER-NIGHT-TIME-FOCUS-001` remainder stay active.

Starting from the frozen 79-row manifest, add exactly U16–U21 and change only the three superseded statuses above. The next manifest therefore has exactly **85 unique dispositions**: 63 `covered`, 1 `covered-active-remainder`, 3 `partial`, 1 `excluded`, 17 `inactive-superseded`, 0 `decision-required`, and 68 active dispositions. Do not create synonymous extra requirement IDs or count one old and new composition as simultaneously active.

Required current locators include at minimum: `map-search-trigger`, `map-search-summary`, `source-lift-focus-layer`, `source-lift-origin-placeholder`, `spot-finder-sheet`, `spot-finder-search-input`, `spot-finder-query-overlay`, `spot-finder-filter-disclosure`, `spot-finder-filter-overlay`, `spot-finder-filter-revert`, `spot-finder-filter-commit`, `spot-finder-wanted-section`, `spot-finder-other-section`, `spot-finder-city-heading`, `spot-finder-result-card`, `map-analysis-time-bar`, `map-analysis-focus-layer`, `map-analysis-focus-panel`, `map-analysis-layer-control`, `map-analysis-time-scrubber`, `map-analysis-time-value`, `map-base`, `spot-detail-favorite`, `spot-detail-route-action` and `spot-detail-night-entry`. Dynamic-template locators are valid only when the current source and runtime each resolve them without duplicates or ghosts.

### 22.4 Provider execution and current-byte QA

Perform a major revision of the existing Open Design project and conversation under the verified `user:soft-instruments` binding. Regenerate `index.html`, `README.md` and `resource-manifest.json` as needed; keep `brand-spec.md` byte-identical. Preserve the self-contained runtime, outer reviewer shell, day/night/observation modes, large text, reduced motion, direct map gestures, callout commit/cancel, formal Spot Night, My/failure journeys and all still-active requirements.

Provider current-byte QA must prove:

1. At 320×800, 375×900 and 430×932 normal text, the compact header, one Search Bar, a usable map and Map/My navigation are simultaneously visible before phone scrolling; the map has six formal markers, one selected callout when chosen, one analysis/time Bar and no permanent expanded analysis panel.
2. Analysis Bar activation follows the named SourceLift lifecycle. During and after entry/exit/interruption, exactly one physical map exists; its opacity never animates; the source placeholder matches origin geometry; scrim/close/Escape/Back work; focus returns; no WAAPI/CSS fill residue or ghost remains. Reduced motion removes travel/scale and completes in at most 100ms opacity/immediate geometry.
3. The Search Bar exposes compact committed-summary behavior at all three widths. `panelOnly` lifts it to the safe top, reveals one Finder, and closes with explicit X/scrim/Escape/Back. History/fuzzy suggestions overlay results, are keyboard/touch operable, update query/results and never navigate directly.
4. Filter disclosure has exact 10+8 terminal choices, adaptive compact layout, no large Reset/Cancel/Apply row, and dirty-only revert/commit icon actions. Revert and commit semantics are exact; suggestion/filter overlays are mutually exclusive, overlay rather than reflow results, own necessary scrolling, close before Finder, and retain 44px targets/accessible names.
5. Query plus committed filter still projects both partitions and city headings. A deterministic `杭州 + 光害` journey returns only `余杭高地草场`; result activation closes Finder, preserves one map and focuses the same callout rather than Detail.
6. Detail exposes one visually borderless Favorite hit target beside the name, one quiet `去这里 →` trailing action, one upper Night entry and zero facilities actions. No filled/bordered action block remains around Favorite or route action.
7. Current CSS/DOM uses the existing Soft Instruments roles with visibly differentiated LIGHT/warm, TOTAL_CLOUD/cyan and OPPORTUNITY/violet semantics without blending overlays or relying on hue alone; planar headings/dividers replace nested card chrome. Day/night/observation preserve role/state parity and observation stays in its closed warm-red palette.
8. Large text, reduced motion, focus containment/return, close order, rapid repeat, drag-away/cancel, stale async cancellation, 44px targets, horizontal overflow, duplicate IDs, unnamed controls, remote dependencies and browser console all pass on the final bytes.

Provider success is provider self-QA only. The outer workflow must retrieve exact current bytes, independently run Browser QA and update repository sidecar/handoff/index. The candidate remains `unselected / sample-only / non-production`; no S1/S2, selected v1, Design Authority or production path may change.

## 23. First-viewport / SourceLift revision execution and independent closure

Section 22 was executed in the existing Open Design project, conversation and `user:soft-instruments` binding through major revision `d61cfad7-c9e7-4282-9866-debb44d0af5e`. Requested/effective start-trace model and reasoning were `gpt-5.6-sol / xhigh`; terminal state was `succeeded`, exit `0`, `endedWithUnfinishedWork=false`. It regenerated the candidate around the first-viewport Map, compact Search, `SourceLiftFocusLayer.panelOnly`, `SourceLiftFocusLayer.mapCoupled`, anchored Finder overlays and quiet Detail actions without changing the Design System binding or `brand-spec.md`.

Exact retrieval and independent Browser inspection found one narrow authoring defect: a phone-visible `FOCUSED` lifecycle debug label appeared at the bottom-right of the Search and Analysis focus states. This was not product meaning and contradicted the phone-copy boundary. Minimal repair run `e61015ef-cf3f-4125-a7c5-b39de91fc72e` stayed in the same project/conversation/binding, used requested/effective `gpt-5.6-sol / xhigh`, and ended `succeeded`, exit `0`, `endedWithUnfinishedWork=false`. It hid/removed only the visible debug node while preserving the state machine, machine-observable phase, data attributes and phone-external inspector; README and `brand-spec.md` remained byte-identical.

Final provider/repository canonical identities are:

- `candidate/index.html`: `94B7D9AE168F2AF031891A9C8E452422340F06942DACF7DC7AB6E90C67F4282B`.
- `candidate/README.md`: `178DABA8024983F1179A15BB0D59167863A33A4762827044DEA102B2A182DF6C`.
- `candidate/resource-manifest.json`: `9EC8AA67B1A951A7A91838D5B709CCA83C6C2872429DC38AB1C83EAA1EA21FB9`.
- `candidate/brand-spec.md`: `C1552347FD06724A45B12ACB51032A8619A94F9B3B6AA36361A824A184E6DFA1`, unchanged.

The current manifest contains exactly 85 unique dispositions: 63 `covered`, 1 `covered-active-remainder`, 3 `partial`, 1 `excluded`, 17 `inactive-superseded`, 0 `decision-required`, and 68 active dispositions. U16–U21 are all covered with current locators. The prior `USER-SPOT-FINDER-001`, `USER-MAP-ANALYSIS-TIME-001` and `USER-SPOT-DETAIL-ACTIONS-001` compositions are inactive and their still-valid semantics are carried by U18/U19, U16/U17 and U20 rather than counted twice.

Independent QA was run against the final `index.html` hash above. At 320×800, 375×900 and 430×932, compact header/Search, useful Map and Map/My navigation remained in the first phone viewport with zero phone scroll delta and zero horizontal overflow. The default surface had one Search, one in-map analysis/time Bar, one physical map and six formal markers, with no permanent pan/zoom chrome or phone-visible product-thinking/tutorial/reviewer/debug text.

Search `panelOnly` produced one dialog and no nested dialog. Query and Filter overlays were mutually exclusive and did not change result-scroll geometry. The exact 10+8 filters remained reachable; dirty-only `×`/`✓` controls were 44px, restored the opening snapshot or atomically committed. `杭州 + 光害` returned only `余杭高地草场`; result activation restored Map and the same callout without entering Detail.

Analysis `mapCoupled` preserved one opaque physical map and its identity while moving between the origin and focus dock; the origin placeholder matched its height and disappeared after restoration. `NONE / LIGHT / TOTAL_CLOUD / OPPORTUNITY` remained mutually exclusive, one selectedAt updated dynamic layers, and LIGHT remained source-period static. Explicit X, a real gray scrim hit, Escape, Back, interruption and reduced motion all reached a clean restored state and returned opener focus. Detail Favorite and `去这里 →` each retained 44px hit areas without visible button chrome, and the upper Night entry remained unique.

After the final repair, the phone contained none of `IDLE / LIFTING / FOCUSED / RESTORING / CANCELLED`; the outer inspector remained state-observable. JSON and both inline scripts parse; requirement totals, locators and hashes reconcile; external runtime dependencies, duplicate IDs, open layers, ghosts, unnamed visible buttons and browser warnings/errors are zero.

The provider README/manifest retain `independent = NOT RUN for current bytes` because provider self-QA stops at its boundary. Outer independent QA is owned by `candidate-handoff.md`, `WORK_INDEX.md` and `candidate/index.html.artifact.json`. The manifest is deliberately a **rolling current-snapshot machine index** while user review continues, not the final selected-design Expected Fact Universe or preflight package. The candidate remains unselected, sample-only and non-production; S1/S2, DESIGN, old selected v1 and production remain unchanged until explicit selection and one-time authority closure.

## 24. Candidate-review iteration — observing conditions and Finder disclosure polish

This is the current controlling delta in the same DRA confirmation → critique → requirement change → regenerated-resource loop. It is later than Sections 22–23 wherever visible composition conflicts. It does not create a second request, select/adopt the candidate, rebuild the Design System, mutate S1/S2, or authorize production.

### 24.1 Active explicit-user requirements

- `USER-OBSERVING-CONDITIONS-COMPACT-001`: rename the in-map source Bar and focused heading from `分析与时段` to exactly `观测条件`. Replace the current Favorite/star-like symbol with a simple Tier-A functional conditions/gauge instrument symbol; it must not be a star, heart or saved/favorite metaphor. In `SourceLiftFocusLayer.mapCoupled`, compact the upper information/control surface so it has no internal vertical scroll and no visible scrollbar at 320×800, 375×900, 430×932, normal text or the candidate large-text mode. Preserve one physical non-fading map below. Use one quiet analysis close action with a visually 18–22px optically centered × inside a transparent 44px hit region; no oversized bordered square. The time scrubber exposes exactly one visible current local date/time value in the phone focus panel. Remove duplicate hero time, “随时段” time copy, duplicate date-time field/value or other repeated rendering of the same selectedAt. The slider retains a programmatic value and preview/commit/cancel semantics.
- `USER-FINDER-TOGGLE-POLISH-001`: preserve U18/U19’s compact committed Search summary, `panelOnly` SourceLift, one query/filter projection, exact 18 filters, Wanted/Other city-grouped results, result → same-map-callout navigation and one owned result scroll, but replace their current shell/polish as follows:
  1. The lifted source header itself is exactly `查找观星点` and owns Finder expanded/collapsed state. Its trailing chevron is optically centered, exposes `aria-expanded`, and rotates with the existing 160ms stable-geometry state-swap grammar. Delete the separate Finder × close control and the `查找与比较` title. The same header is the explicit toggle/close route; scrim, Escape and system Back still close the layer and return focus.
  2. Add a Tier-A Search glyph inside the name/city input. The history/fuzzy query overlay is anchored immediately below that field, not below Filter. It overlays without moving Filter/results, and closes with a short opacity fade when focus leaves the field plus overlay. A pointer/keyboard suggestion activation commits before blur-close; focus movement inside the overlay does not close it.
  3. Separate Search and the Filter disclosure by at least the existing `space-3` rhythm. Query and Filter overlays remain mutually exclusive.
  4. The Finder result owner and Filter overlay may retain bounded touch/wheel/keyboard scrolling for reachability, but their scrollbar chrome is visually hidden in every supported browser/mode. Do not disable or clip long-result scrolling. The analysis control surface is different: it must fit without internal scrolling.
  5. Render all 18 filter choices on a uniform compact grid with equal visual height/column width and 12–13px readable labels. Keep a full 44px interactive region even if visible chrome/padding is tighter. Long labels reflow within the same uniform row strategy; no oversized two-column cards or mismatched lengths.
  6. Wanted and Other disclosure rows use balanced left/right inset, at least a 44px full-row target, and an 18–20px optically centered trailing chevron. The chevron rotates with expanded state; count, title and icon align on one baseline. Do not glue the title to the sheet edge or render the header as a bordered card.

The three supplied screenshots are defect-location evidence only. Their browser frame, red rectangles, exact pixels and current flawed composition are not style sources or exact targets. Soft Instruments remains the only visual authority.

### 24.2 Supersession and rolling requirement inventory

`USER-FINDER-TOGGLE-POLISH-001` supersedes `USER-SEARCH-LIFT-COMPACT-001` and `USER-FINDER-COMPACT-HIERARCHY-001` because their explicit standalone X, `查找与比较`, small-chevron and current overlay/scrollbar treatment no longer represent the chosen composition. U23 must preserve their compact source summary, panelOnly lifecycle, one query/filter result projection, exact 10+8 filters, draft/revert/commit, query/filter mutual exclusion, Wanted/Other partitions, city headings, retained state, failure/static identity and result → same map callout semantics. U22 refines rather than supersedes `USER-SOURCE-LIFT-FOCUS-LAYER-001` and `USER-SOFT-INSTRUMENTS-APPLICATION-001`.

Starting from the frozen 85-row manifest, add exactly U22 and U23 and change only U18/U19 to `inactive-superseded`. The next rolling manifest therefore contains exactly **87 unique dispositions**: 63 `covered`, 1 `covered-active-remainder`, 3 `partial`, 1 `excluded`, 19 `inactive-superseded`, 0 `decision-required`, and 68 active dispositions. No synonymous extra requirement IDs or duplicate current composition are allowed.

Required current locators include the previous still-active locators plus at least: `map-analysis-time-bar`, `map-observing-conditions-icon`, `map-analysis-focus-panel`, `map-analysis-close`, `map-analysis-time-scrubber`, one and only one visible `map-analysis-time-value`, `spot-finder-title-toggle`, `spot-finder-title-chevron`, `spot-finder-search-input`, `spot-finder-search-icon`, `spot-finder-query-overlay`, `spot-finder-filter-disclosure`, `spot-finder-filter-overlay`, `spot-finder-filter-choice`, `spot-finder-result-scroll`, `spot-finder-wanted-section`, `spot-finder-other-section`, and `spot-finder-section-chevron`. Dynamic locators must resolve without duplicates or ghosts.

### 24.3 Provider execution and current-byte QA

Perform a major revision in the existing Open Design project/conversation with the verified `user:soft-instruments` binding and the live highest-authority model/reasoning selection. Regenerate `index.html`, `README.md` and `resource-manifest.json` as needed; keep `brand-spec.md` byte-identical. Preserve every active non-conflicting route, mode, failure, callout, Detail, My and one-map behavior.

Provider current-byte QA must prove:

1. Default Map at 320/375/430 still satisfies the first-viewport budget, shows exactly one `观测条件` Bar with a non-Favorite functional icon, one physical map and no visible `分析与时段` text.
2. The focused conditions panel has no internal scroll range and no visible scrollbar at all three widths in normal and large text; controls remain reachable, nothing clips, and the companion map remains useful. Exactly one visible selectedAt string exists in the phone panel. The quiet close hit region is 44px, its glyph is 18–22px, and its visible box/border is absent.
3. The lifted `查找观星点` header toggles open/closed, has no sibling X and no `查找与比较`, reports expanded state, rotates its chevron, and retains scrim/Escape/Back/focus-return behavior.
4. Search field has one Search glyph. Focusing it places the query overlay directly below the field; the overlay does not shift Filter/results, survives focus inside itself, commits a pointer and keyboard suggestion before closing, then fades/clears on true outside blur. Opening Filter closes query overlay and vice versa.
5. Search-to-Filter gap uses the target spacing rhythm. All 18 filter choices are uniform and compact while every target remains at least 44px. Filter owned scroll remains reachable with hidden scrollbar chrome. Dirty revert/commit semantics still pass.
6. Wanted/Other headers have balanced inset; 18–20px chevrons are optically centered and rotate on full-row activation. Counts, section state and city-grouped results remain correct.
7. Finder/result scrolling still reaches the last result at 320/375/430 and large text while no scrollbar chrome is visible. Hiding scrollbar presentation must not set the long result owner to non-scrollable overflow.
8. `杭州 + 光害` still returns only `余杭高地草场`; result activation restores one Map/callout and does not enter Detail. One map identity, SourceLift interruption/reduced motion, day/night/observation role parity, 44px targets, horizontal overflow, duplicate IDs, ghost layers, unnamed controls and console warning/error remain clean.

Provider success remains provider self-QA only. The outer workflow retrieves exact bytes and independently repeats these journeys. The resulting manifest remains a rolling current-snapshot index, not a final selected-design Fact Universe.

## 25. Observing-conditions / Finder polish execution and independent closure

Section 24 was executed in the existing project, conversation and verified `user:soft-instruments` binding through whole-current-candidate revision `e32bbf31-6ffe-4db4-b845-a41ad47d17f4`. Requested/effective start-trace model and reasoning were `gpt-5.6-sol / xhigh`; terminal state was `succeeded`, exit `0`, `endedWithUnfinishedWork=false`. It updated `index.html`, `README.md` and `resource-manifest.json`, kept `brand-spec.md` byte-identical, added exactly U22/U23 and changed only U18/U19 to inactive-superseded.

Independent inspection found two narrow interaction-fidelity gaps in otherwise conforming bytes: the literal disclosure glyphs rendered optically too small/inconsistent across fonts, and native-button behavior did not make the suggestion Space path explicit enough for a stable current-byte claim. Final authoring repair `afe4911f-6b30-4c00-99d0-17c5e5f34a40` stayed in the same project/conversation/binding, used requested/effective `gpt-5.6-sol / xhigh`, and ended `succeeded`, exit `0`, `endedWithUnfinishedWork=false`. It replaced literal Finder chevrons with Tier-A inline SVG (`18×18px`, `2px` stroke inside `20×20px` wrappers, `160ms` rotation) and added explicit Enter / space / `Spacebar` suggestion commit before blur-close. It did not change requirement dispositions or the Design System.

Final provider/repository canonical identities are:

- `candidate/index.html`: `69E407A58B2F82288F6D72A0A1743D355FB32A7012EEE71E717C9637171FCD05`.
- `candidate/README.md`: `20F92C30AF09A7FB1BFA4A5B20490CDDD9B731227FB359E326F5884C51BF2DB7`.
- `candidate/resource-manifest.json`: `124E2761B5AA9511F9B786D2253579252B406E6EDDD9287DD68882DF8C679FD8`.
- `candidate/brand-spec.md`: `C1552347FD06724A45B12ACB51032A8619A94F9B3B6AA36361A824A184E6DFA1`, unchanged.
- normalized 87-requirement ledger: `1AC8AE7283A542A3AB5E069ABE500BE54050D74BE5984E9659C77594E700219A`.

The rolling manifest now contains exactly 87 unique dispositions: 63 `covered`, 1 `covered-active-remainder`, 3 `partial`, 1 `excluded`, 19 `inactive-superseded`, 0 `decision-required`, and 68 active dispositions. `USER-OBSERVING-CONDITIONS-COMPACT-001` and `USER-FINDER-TOGGLE-POLISH-001` are covered with current locators; U18/U19 are historical and their non-conflicting meaning is carried by U23.

Independent current-byte QA established:

- Default Map at 320×800, 375×900 and 430×932 in normal/large text has zero phone/page horizontal overflow and zero phone scroll delta, keeps header/Search/useful Map/Map–My navigation in the first viewport, and exposes exactly one `观测条件` Bar, one functional gauge, one physical map and six formal markers. Legacy `分析与时段` is absent.
- Conditions `mapCoupled` panel height is about 314.6px normal and 322.6px large, has `scrollHeight - clientHeight = 0`, `overflow-y:hidden`, no clipped control, exactly one visible `08-21 00:30`, one scrubber, and a transparent borderless 44×44px close target with a 20px glyph. Preview/cancel/commit remains `00:30 → 21:30 → 00:30 → 21:30`; the same opaque `map-1` moves with one origin placeholder and restores cleanly.
- Finder header is exactly `查找观星点`, is the only visible disclosure/close control, reports expanded state and rotates its SVG chevron; standalone X and `查找与比较` are absent. Scrim, Escape, system Back and reduced-motion close paths restore `IDLE`, one map, zero placeholder/ghost and opener focus.
- The Search icon is inside the field. Query overlay is 4px below the field, shares its horizontal bounds, does not reflow Filter/results and fades to hidden on true outside blur. Pointer, Enter and space each call the query choice once, update the input, close the overlay and retain field focus; Filter activation closes Query and vice versa.
- Search-to-Filter gap is 12.8px. Exact 10+8 filters keep source order, uniform three-column geometry, 12px/54px normal and 13px/60px large presentation with targets at least 44px. Filter/result owners remain scrollable where needed while Firefox/WebKit scrollbar chrome is hidden.
- Wanted/Other headers have 10px left/right inset, a full 44px row and 18×18px SVG chevrons centered inside 20×20px wrappers; full-row activation updates `aria-expanded` and rotation. Dirty revert/commit and `杭州 + 光害 → 余杭高地草场 → same Map callout` remain closed.
- JSON, both inline scripts, 87 unique dispositions, current locators and canonical hashes reconcile; no external runtime URL or duplicate authored/runtime ID was found. All outer current-byte journeys completed without a runtime exception. Provider current-byte QA separately records zero browser console warning/error.

This remains an unselected, sample-only, non-production rolling review snapshot. The outer sidecar/handoff/index own independent QA; provider `independent = NOT RUN` continues to describe only its own boundary. No final selected-design manifest, preflight, S1/S2 writeback, Design Authority adoption or production implementation is implied.

## 26. Candidate-review iteration — continuous SourceLift, scroll chrome, Detail motion and selection language

This is the next controlling delta in the same DRA confirmation → critique → requirement change → regenerated-resource loop. It is later than Sections 24–25 wherever the current visible/lifecycle treatment conflicts. It does not open a second request, select/adopt the candidate, rebuild the Design System, mutate S1/S2, authorize production or convert the rolling manifest into selected-design closure.

### 26.1 Active explicit-user requirements

- `USER-SOURCE-LIFT-RESTORE-CONTINUITY-001`: repair both SourceLift variants. From focused through restoring/cancelled, keep the live lifted node under the overlay/composition owner and keep exactly one origin placeholder in the unchanged underlying flow. Animate from the current live geometry to the placeholder geometry. Only after the visual reaches origin may one `requestAnimationFrame`/atomic ownership swap replace the placeholder with the live node and hide/clear the overlay. At no sampled normal-motion frame may Finder restoration change `.map-origin` position/height or phone scroll geometry; mapCoupled may move the same map visually but cannot push its placeholder, expose a blank/white focus dock, snap, clone or remount. Scrim, header/X, Escape, system Back, rapid reversal and reduced motion all converge on one live node, zero placeholder/ghost, exact origin geometry and opener focus.
- `USER-FINDER-FOCUSED-ICON-DEDUP-001`: while `panelOnly` is focused, the lifted `查找观星点` header supplies the sole visible Search cue. Hide the Finder field-local Search glyph and remove its padding reservation in that composition; do not hide a programmatic field label. The compact idle Search source still has its conventional Search glyph. Any sampled state exposes at most one visible same-meaning Search glyph.
- `USER-FILTER-DIRTY-ACTION-POLISH-001`: replace font `×`/`✓` with Tier-A inline SVG paths centered by explicit `20×20` view boxes inside transparent circular 44px actions. Keep distinct accessible names and non-color-only meanings. Add a visible `space-2`/target-aligned gap between the Filter title row and its anchored editor without shifting Finder/result geometry; the overlay remains mutually exclusive with Query and scroll-owned.
- `USER-SPOT-DETAIL-HEADER-CORE-INFO-001`: remove both identity-header chips `地点资料可用` and `今晚条件会变化`. Do not replace them with synonyms. Preserve their meaningful data only where it is interpretable: Tonight conditions, source/freshness/limitations and facility evidence. Favorite, route and the one Night entry remain in the established quiet hierarchy.
- `USER-MINIAPP-SCROLLBAR-CHROME-001`: across every user-phone route and overlay, keep required vertical touch/wheel/keyboard scrolling but hide native vertical scrollbar chrome with zero layout width in Chromium/WebKit and Firefox. This includes Detail and Spot Night, plus Finder/Filter/results/My. Horizontal scroll remains only for an explicitly owned row or professional data matrix. Hide the native horizontal bar; if the candidate exposes a visible overflow affordance, use a custom overlay indicator that consumes zero content height/width and is white semi-transparent in every mode. Do not make the table unreachable or falsely claim no overflow.
- `USER-SPOT-DETAIL-TAB-MOTION-001`: preserve Overview/Guides/Site labels and state. Add a stable-geometry active indicator that translates between tab positions plus target-aligned roughly 160ms content opacity handoff. The newly committed panel is the only interactive/accessibility-visible panel; rapid retargeting cannot leave overlap/ghosts. Reduced motion uses immediate or at-most-100ms opacity while retaining selected feedback. Ant Design is inspiration for mature Tab feedback only; do not import it, copy its design tokens or change the exact target.
- `USER-OBSERVATION-MODE-SETTINGS-001`: remove the whole Spot Night mode-entry card and its copy. Add the sole explicit `进入观测红模式` / active-state exit control to My → Settings. Activation changes the existing document mode without navigating away from Settings; exit restores the exact prior day/night mode/context. Spot Night remains a formal-spot child route that consumes the active mode and never creates a second store or entry.
- `USER-CARD-SELECTION-STAR-001`: all card-like Filter choices and the four Observing Conditions layer choices use one selected decorator: a rounded star positioned at the top-right and clipped by the card boundary so approximately half remains visible. Day/night build its rainbow gradient only from current Soft Instruments semantic accents (`primary`, warm, cyan and violet); observation uses the same geometry with closed warm-red shades only. Selected border plus `aria-checked`/pressed state and accessible naming remain; the gradient is never the sole selected cue.

The user's numbered points 5 and 7 intentionally compile to the one global scrollbar requirement above, with both attached screenshots retained as distinct scene evidence. No synonymous ninth requirement ID is allowed.

### 26.2 Evidence, authority and supersession

The six supplied screenshots are defect-location evidence only. Browser chrome, red rectangles, exact pixels and the current flawed composition are not visual authority or instructions. Their local evidence identities are: conditions white restore frame `8CAD1E58F182672D9AA3CE29ABAC41DF4309BD8264760AD44E59F1A5CDFACC60`; Finder restore screenshot visible in the prompt at `C:/Users/777/AppData/Local/Temp/codex-clipboard-99ef017d-b2bc-4011-b8cf-f0ff35d54ce9.png` but no longer locally readable for hashing; Filter alignment `22B017F3D5430B45F1225A86F91A4448D519934A5B54F4EF55573FFAFC4CE2E8`; Detail chips `FCBE71A5204194849B6E2B15A0C369EA6DEB1E62AE37BC855587E02B4BA46325`; Detail scrollbar/tabs `38422B361D614935DFB3856F9427F5DEB1BA742F39960699C873ED4B54F87A7A`; Spot Night scroll/mode entry `DEA1BB36012A037C8A2C6BEB0171E8351281E175ABCC776FD1C8F392D8799B1B`. Soft Instruments remains the sole exact visual authority.

Pre-change frame sampling on canonical SHA-256 `69E407A58B2F82288F6D72A0A1743D355FB32A7012EEE71E717C9637171FCD05` established the lifecycle defect: Finder restore displaced `.map-origin` from `y=139,h=500` to `y=191,h=448` throughout the reverse before snapping back; mapCoupled restore pushed the 500px placeholder to `y=639` while the map animated over a white focus dock. Provider output must remove the mechanism, not only hide the last screenshot.

U24–U31 refine the current composition. U25 conditionally narrows only U23's focused icon rendering; U30 supersedes only the prior visible mode-entry placement, not `USER-SPOT-NIGHT-002` or closed observation behavior. No existing disposition becomes inactive. Starting from 87 rows, add exactly eight covered rows to produce **95 unique dispositions**: 71 `covered`, 1 `covered-active-remainder`, 3 `partial`, 1 `excluded`, 19 `inactive-superseded`, 0 `decision-required`, and 76 active dispositions.

### 26.3 Required locators and resource scope

Preserve all current active locators and add/update at least: `source-lift-origin-placeholder`, `spot-finder-title-toggle`, `spot-finder-search-input`, `spot-finder-search-icon` with focused visibility state, `spot-finder-filter-revert`, `spot-finder-filter-commit`, `spot-finder-filter-overlay`, `spot-finder-filter-choice`, `map-analysis-layer-control`, `map-analysis-layer-choice`, `selected-card-star`, `spot-detail`, `spot-detail-tabs`, `spot-detail-tab-indicator`, `spot-detail-panel`, `spot-night`, `sky-professional-matrix`, `my-settings`, and `observation-mode-entry`. Dynamic locators must resolve without duplicate physical identities or stale ghosts. The two removed Detail chips and removed Spot Night entry must resolve zero current elements; `observation-mode-entry` resolves exactly once only in Settings.

The sufficient resource remains one comprehensive, self-contained interactive `index.html` plus its current-snapshot README/manifest and unchanged `brand-spec.md`. Work in the existing Open Design project `starward-miniapp-v2-drift-correction-2026-08-20`, conversation `61006884-d0d8-48d2-bc4c-f0136e8ade3b`, exact binding `user:soft-instruments`. Immediately before execution, rediscover provider capabilities and use the highest live authoritative model/reasoning that the provider actually exposes. Regenerate `index.html`, `README.md` and `resource-manifest.json` as needed; keep `brand-spec.md` byte-identical. No external runtime, CDN, UI-library dependency, Figma target or second token/icon truth.

### 26.4 Provider and outer current-byte QA

Provider self-QA and the later outer independent QA must establish on exact retrieved bytes:

1. At 320×800, 375×900 and 430×932, normal/large and normal/reduced motion, sampled Finder restore keeps underlying map origin/page geometry invariant at every frame and ends with one source, one map, zero placeholder/ghost/white/blank frame and restored focus. mapCoupled may transform the one opaque map but its immutable origin placeholder never moves; no focus-dock white frame is exposed at the handoff.
2. Focused Finder has exactly one visible Search glyph; idle compact Search remains self-explanatory. Query/Filter/result semantics and `杭州 + 光害 → 余杭高地草场 → same map callout` still pass.
3. Dirty `×`/`✓` SVG geometry is optically centered inside 44px targets at all widths/modes; Filter editor has a measurable nonzero gap from its title row and remains an overlay with unchanged result/phone scroll geometry.
4. Detail identity header contains neither removed chip text nor replacement synonyms. Favorite, route, Night entry, source/freshness/facility facts and card spacing remain. Overview/Guides/Site indicator moves and content fades on normal motion; rapid and reduced paths leave exactly one visible/interactive/accessible panel and correct focus.
5. Every user-phone route with long content can reach its last item by wheel/touch/keyboard but shows no native vertical scrollbar and loses zero content width. Spot Detail and Spot Night are explicit checks. The professional matrix remains horizontally reachable; any visible indicator is custom overlay/no-footprint/white semi-transparent, with native bar absent.
6. Spot Night contains zero mode-entry control/card. My → Settings contains exactly one named enter/exit control, mode toggles without route change, observation uses only closed black/warm-red roles, and exit restores the prior day/night mode/context.
7. All 18 Filter choices and all four Conditions layer choices expose the same half-clipped selected-star geometry in selected state, preserve 44px targets and non-color-only selected semantics, and use only warm-red shades in observation mode.
8. Current scripts/JSON parse; 95 dispositions/counts/locators/hashes reconcile; one map identity, static LIGHT honesty, selectedAt, day/night/observation semantic-role parity, no page horizontal overflow, duplicate IDs, external URLs, unnamed actions, console warnings/errors or unfinished provider work.

Provider success remains provider self-QA only. Retrieve exact bytes and independently repeat the frame-, route-, scroll-, motion-, mode- and selection-sensitive journeys before marking U24–U31 candidate-covered. The manifest remains a rolling current-snapshot index while user review is open.

## 27. U24–U31 execution and independent current-byte closure

Section 26 was executed in the same Open Design project/conversation with the verified `user:soft-instruments` binding and live highest eligible `codex / gpt-5.6-sol / xhigh` path. Initial run `f81db9ac-135e-46d8-90c3-38762d530ffa` was cancelled after its Provider QA transport stopped progressing; none of its canonical writes were accepted. Whole-current-candidate run `5ae13469-4d98-40a1-b404-e1e8c58d5f91`, U29 motion repair `fefbd023-00b1-4a3c-b352-df7d22229d93`, and final U24 history-continuity repair `b1cd5ee7-1c7c-4065-aaf3-c330700df064` all ended `succeeded`, exit `0`, `endedWithUnfinishedWork=false`.

Final provider/repository byte identities are `index.html` `409960252D7BC095A95311C2CC467CC538117915566A88A3E2FC560345043EC3`, `README.md` `B9433829A81CD9D3B2F3DA2270914F445A6E51AC22B5E253649A82E9BE873E4A`, `resource-manifest.json` `E1A7D0C96F17BA1470AE79BCCED92D5255D876146852A67D6B98EC92108567E3`, and unchanged `brand-spec.md` `C1552347FD06724A45B12ACB51032A8619A94F9B3B6AA36361A824A184E6DFA1`. The manifest contains exactly 95 unique dispositions: 71 covered, 1 covered-active-remainder, 3 partial, 1 excluded, 19 inactive-superseded, 0 decision-required, 76 active.

Outer QA sampled both SourceLift variants at 320/375/430 and a pre-scrolled history context. Flow geometry stayed invariant, restore distance was monotonic to exact origin, one map/source identity and the required placeholder count held, no blank/white frame appeared, native history restoration did not change `window.scrollY=300`, and opener focus returned. It also established one focused Search cue, centered 44px dirty actions, 18 Filter plus four Conditions selected-star states, removed Detail chips with preserved evidence, hidden native scroll chrome with reachable final content, real 160ms Detail panel opacity plus rapid/reduced closure, zero Spot Night observation entry, exactly one Settings entry with prior-mode restoration, an operable professional matrix with a white semi-transparent no-footprint indicator, and clean 320/375/430 normal/large responsive/a11y/runtime invariants. These results bind only SHA-256 `40996025…EC3`; they remain historical current-snapshot evidence after a later iteration.

## 28. Candidate-review iteration — shared Notification component family

This is the next controlling delta in the same DRA confirmation → critique → requirement change → regenerated-resource loop. It does not open a second request, select/adopt the candidate, rebuild the Design System, mutate S1/S2, authorize production or complete the rolling manifest.

### 28.1 Active explicit-user requirement

- `USER-NOTIFICATION-COMPONENT-FAMILY-001`: replace page-local hand-authored notification/banner fragments with one reusable Notification component family. Semantic tone (`info`, `warning`, `error`, `success`) and placement (`inline`, `floating`) are independent axes rather than separate components. Both placements share the same compact Soft Instruments anatomy: one Tier-A status icon, concise title, optional body, at most one trailing action, optional named dismiss, clear non-color-only severity and a full 44px action hit region without an oversized visible button box. Typography, line height, padding, inter-element spacing, radius, border, background, mode roles and shadows come from the existing exact target; eliminate the screenshot's oversized cards, accidental empty height, oversized text/actions and inconsistent spacing.
- `inline` belongs to its local owner's normal document flow and is used for persistent/actionable state such as permission denial, stale data, offline or Provider failure. It cannot auto-dismiss when it is the sole recovery path. `floating` is a safe-area overlay for non-critical acknowledgement/light feedback; it must not alter page, Map, SourceLift, Bottom Navigation or scroll geometry, steal focus for passive content, or cover the current primary action. Both use target state-swap opacity timing with stable geometry; reduced motion is immediate or at most 100ms opacity.
- One local owner displays at most one full notification at a time. Concurrent states are ordered `error → warning → info → success`; the visible item exposes an accessible residual count/summary and resolving/dismissing it advances to the next state. Do not discard lower-priority recovery information and do not render three full-height cards. Floating acknowledgements likewise queue rather than overlap.
- Reuse this family in every current candidate occurrence: Map permission/stale/provider states, Spot Night offline state, My/Favorites stale/provider state, and a real floating acknowledgement produced by a successful refresh/retry/dismiss action. Existing state meaning, static-data preservation and recovery actions must remain; extraction cannot turn dynamic failure into fake success or remove useful static Map/Favorite content.

The supplied screenshot is defect-location evidence only, SHA-256 `39BC889E7F8BF668B7F02CF85870AF5FEE91CDDBD39DAE405708BCB7EC8C47C0`. Its browser crop, pointer, current borders, sizes, gaps and malformed empty height are not visual authority. Exact values continue to come only from `target.system.wechat-miniapp-soft-instruments-2026-08-05`.

### 28.2 Required resource structure and locators

Keep one self-contained comprehensive `index.html`, current-snapshot `README.md`/`resource-manifest.json`, and byte-identical `brand-spec.md`. Work in project `starward-miniapp-v2-drift-correction-2026-08-20`, conversation `61006884-d0d8-48d2-bc4c-f0136e8ade3b`, exact binding `user:soft-instruments`. Immediately before execution rediscover live provider capability and use the highest authoritatively ranked eligible model plus highest supported reasoning effort.

The canonical resource must expose one shared renderer/component contract and stable locators at least for `notification-feedback`, `notification-inline`, `notification-floating`, `notification-icon`, `notification-title`, `notification-body`, `notification-action`, `notification-dismiss`, and `notification-residual-count`, plus existing state locators `map-permission-state`, `map-stale-state`, `map-provider-failure`, the Spot Night offline state and My/Favorites dynamic-state owner. Every instance declares tone and placement. Do not satisfy reuse only through similar CSS or reviewer prose: actual route states must call the one family and no obsolete `.banner` instance may remain.

Starting from 95 rows, add exactly one covered U32 row and change no prior disposition. The next rolling manifest must contain 96 unique dispositions: 72 covered, 1 covered-active-remainder, 3 partial, 1 excluded, 19 inactive-superseded, 0 decision-required and 77 active.

### 28.3 Provider and outer current-byte QA

Provider self-QA and later independent QA on retrieved exact bytes must establish:

1. Map permission, stale and Provider states individually render through the same `inline` family with compact content, no clipped/widowed title/body, no accidental fixed/empty height and one correctly sized trailing action. Turning all three on renders one full notification plus an accurate accessible residual count; resolving the top state advances deterministically through the remaining queue without losing state.
2. At 320×800, 375×900 and 430×932 normal/large text, a single inline notice retains a useful Map/Search/navigation composition and no horizontal overflow or sub-44px action. The notification height is content-driven and the Map is never replaced by blank space.
3. Spot Night offline and My/Favorites stale/provider use the same family and preserve last-known/static content. Day/night/observation role parity holds; observation notifications use only closed black/warm-red roles and never flash white.
4. A successful acknowledgement/retry demonstrates `floating`: it overlays inside the phone safe area, does not change the before/after bounding boxes of page, map, SourceLift origin or scroll owner, exposes appropriate live-region semantics, does not steal focus, and closes/queues through normal and reduced motion without ghost layers.
5. Both variants share actual anatomy and action semantics; inline/floating differ only through declared placement behavior. Severity remains understandable without color. There is at most one visible full notification per owner and one visible floating notification globally.
6. Existing U24–U31 frame, history, Search, Filter/Conditions selection, Detail tab/scroll, Spot Night/My observation, matrix and responsive invariants remain clean. JSON/scripts parse; 96 counts/locators/hashes reconcile; no external runtime, duplicate IDs, obsolete `.banner`, unnamed action, open layer, ghost or console warning/error remains.

Provider success is not independent QA. Retrieve every canonical file byte-exact, preserve the unchanged design-system binding, and repeat the route/state/geometry/mode/accessibility journeys before marking U32 candidate-covered. The result remains an unselected rolling review snapshot.

## 29. U32 execution and independent current-byte closure

Section 28 was executed in the existing Open Design project `starward-miniapp-v2-drift-correction-2026-08-20`, conversation `61006884-d0d8-48d2-bc4c-f0136e8ade3b`, with exact `user:soft-instruments` binding and digest `5dd2e7acf43973793a8ae70bd0db8266c7253f27ebdeb6d944657b83e3a855e6`. Live provider discovery selected the highest authoritatively ranked eligible path exposed at execution time: requested/effective `codex / gpt-5.6-sol / xhigh`. Run `66687218-4d8b-4869-8c85-ecb6afaac0bc` ended `succeeded`, exit `0`, `endedWithUnfinishedWork=false`.

The four provider/repository canonical files were retrieved byte-exact and frozen as:

- `candidate/index.html`: `C184A335F36D8B77206F05E9046E89C42D2E15D2DACF4B2E45049880D3689067`.
- `candidate/README.md`: `5146E1D82629C959DF5FB6298F3F240930F6A7E2D92B836F02698A801634BDDF`.
- `candidate/resource-manifest.json`: `B9B22AE55A816E09DA9CDC089D5A40F0EB85A37411C0E30674D55CB8966CBF9C`.
- `candidate/brand-spec.md`: `C1552347FD06724A45B12ACB51032A8619A94F9B3B6AA36361A824A184E6DFA1`, byte-identical to the prior binding.

The final manifest contains exactly 96 unique dispositions: 72 covered, 1 covered-active-remainder, 3 partial, 1 excluded, 19 inactive-superseded, 0 decision-required and 77 active. U32 is the sole new row and is `covered`; all U1–U31 dispositions remain unchanged.

Static current-byte checks parsed JSON and both inline JavaScript blocks, found zero duplicate authored IDs, zero remote runtime URLs, zero obsolete `banner` occurrences, one `NotificationComponent` definition and all required Notification locators. Outer Browser and reproducible multi-viewport QA then established:

- Map permission alone renders one compact inline info notice. At 320/375/430 normal and large text, inline height is `61.6–74.6px`, action size is at least 44px, horizontal overflow is zero and the Map remains at least 240px useful height.
- Permission + stale + Provider concurrently render exactly one full error notice with residual `另有 2 条通知：1 条注意，1 条提示`. Actions advance deterministically error → warning → info without discarding state. Each success/ack joins one global floating queue; exactly one full floating notice is visible and three dismissals drain it to zero.
- The first floating acknowledgement leaves Map width/height, Map and Search relative positions, phone `scrollTop`, `scrollHeight` and client height unchanged. It does not take passive focus from the next inline recovery action. Inline and floating actions/dismiss are named 44px targets.
- Normal notification opacity animation is `0.16s`; candidate/system reduced motion resolves at `0.00001s`, within the at-most-100ms rule. Provider error is `alert/assertive`; info/success feedback is `status/polite`.
- Spot Night offline uses the same inline family and preserves cached Sky/matrix content. My/Favorites Provider + stale use the same family, preserve favorite relationships and expose one error plus one residual warning.
- Day, Night and Observation all render through the existing semantic role system. Observation resolves to closed warm-red roles `#FF514A/#D94842/#B83A35/#C4403A`; no second palette or white flash is introduced.
- U24–U31 regressions remain closed: 320/375/430 SourceLift restores one live Map to exact origin with one non-IDLE placeholder and zero IDLE placeholder/ghost; Finder focused field icon remains hidden; all 18 Filter and four Conditions selected states retain the shared clipped star; dirty SVG actions are centered in 44px targets; Detail panel normal/rapid/reduced motion remains single-panel; scrollbar chrome stays hidden while Detail/Night/matrix content remains reachable; Observation entry remains Settings-only.
- Final application runtime checks report zero warnings/errors after current-byte journeys. The local static test server emitted one initial non-artifact `/favicon.ico` 404 before reload; the candidate itself contains no external runtime request or application exception and subsequent current-page console inspection was clean.

These results bind only the exact current candidate hashes above and are recorded by `candidate-handoff.md`, `candidate/index.html.artifact.json` and `WORK_INDEX.md`. Provider README/manifest retain independent `NOT RUN` wording because Provider self-QA stops at its own boundary. This closure does not select/adopt the candidate, finalize a selected-design manifest, modify S1/S2, authorize production or prove native WeChat/real Provider/device/field behavior.

## 30. Candidate-review iteration — conventional My account center

This is the next controlling delta in the same DRA confirmation → critique → requirement change → regenerated-resource loop. It is later than Sections 6.I, 26 and 28 wherever the visible My/Favorites/Plan/Settings composition conflicts. It does not open a second request, select/adopt the candidate, rebuild the Design System, mutate S1/S2, authorize production or finalize the rolling manifest.

### 30.1 Active explicit-user requirement

- `USER-MY-ACCOUNT-CENTER-001`: redesign the My root as a conventional, calm mobile account center using the existing Soft Instruments system. The reference to JD/Taobao/Tmall means only the broadly familiar account-center information hierarchy and route behavior; do not copy their layouts, brand assets, icons, colors, promotions or commerce modules.
- The My root header contains only the page title `我的` and one conventional Tier-A Settings gear icon in the upper right. The gear owns a named 44px hit region and pushes a standalone Settings child route. Remove the subtitle `收藏、计划与显示偏好` and remove the flat peer `我的 / 收藏 / 计划 / 设置` tabs entirely, including large-text fallbacks or hidden off-screen remnants.
- The root contains a concise login/profile row and a small number of grouped routine rows. It does not show a Favorite count, Favorite row, Favorite list, standalone My/Favorites page or duplicate saved-place cards. The underlying favorite relationship remains unchanged and is browsed through the Map Finder `想去` partition; Spot Detail still owns the Favorite toggle and failure rollback/preservation.
- Keep Plan as an understated list row/summary that pushes a standalone Plan child route. Keep Settings as its own page for objective preferences, display/accessibility and the sole observation-mode enter/exit control. Back from Plan or Settings restores the My root's useful scroll position and logical opener focus. No child route may create a second favorite, plan, notification or display-mode store.
- Reuse the shared `NotificationComponent` for My/Plan/Settings stale/provider/sync feedback. Since the duplicate My/Favorites page is removed, demonstrate the family through a meaningful Plan sync/dynamic state or equivalent existing account-child owner rather than leaving U32 reuse only in reviewer controls.

The supplied screenshot is defect-location evidence only, SHA-256 `0D05FE15AA6029338F6F8AE0300A15F68DA4E5727B8B225A4FDC693A2DC59740`. Browser crop, current tab geometry and rough spacing are not visual authority. Exact type, spacing, colors, radii, icon grammar, row/card treatment, motion and mode values continue to come only from `target.system.wechat-miniapp-soft-instruments-2026-08-05`.

### 30.2 Required resource structure, routes and locators

Keep one self-contained comprehensive `index.html`, current-snapshot `README.md`/`resource-manifest.json`, and byte-identical `brand-spec.md`. Work in project `starward-miniapp-v2-drift-correction-2026-08-20`, conversation `61006884-d0d8-48d2-bc4c-f0136e8ade3b`, exact binding `user:soft-instruments`. Immediately before execution rediscover live provider capability and use the highest authoritatively ranked eligible model plus highest supported reasoning effort.

Current candidate routes must include `my` root, a Plan child route and a Settings child route. Use current stable locators at least for `my-account-center`, `my-account-header`, `my-settings-action`, `my-profile-summary`, `my-grouped-entry-list`, `my-plan-entry`, `my-plan`, `my-settings`, `observation-mode-entry`, and the child Back actions. Removed locators/compositions `my-route-tabs`, My `favorite-list`, visible My Favorite count/row and the old My subtitle must resolve zero current elements. Finder `wanted` content and Detail Favorite locators remain current.

Starting from 96 rows, add exactly one covered U33 row and change no prior disposition. The next rolling manifest must contain 97 unique dispositions: 73 covered, 1 covered-active-remainder, 3 partial, 1 excluded, 19 inactive-superseded, 0 decision-required and 78 active. Update existing MY-001 locators away from the removed My/Favorites surface to Finder `想去` plus Spot Detail Favorite; retain MY-002/MY-003 through the Plan child route and retain `USER-OBSERVATION-MODE-SETTINGS-001` through the standalone Settings route.

### 30.3 Provider and outer current-byte QA

Provider self-QA and later independent QA on retrieved exact bytes must establish:

1. At 320×800, 375×900 and 430×932 in normal and large text, the My root shows a clear title-only account header, concise profile/login summary, usable Plan row and conventional Settings gear. It has no old subtitle, peer route tabs, Favorite count/row/list/page content, copied commerce module, horizontal overflow or visible vertical scrollbar chrome.
2. The gear has a named 44px target and opens the standalone Settings route. The Plan row has a named 44px target and opens the standalone Plan route. Back, keyboard/accessibility activation and browser/system history return to the exact My root with useful scroll and logical opener focus; rapid activation leaves one route/panel, not pseudo-tab ghosts.
3. Settings contains exactly one observation-mode entry. It changes the existing mode without leaving Settings; observation uses only the closed black/warm-red roles, exit restores the exact prior day/night mode/context, and Spot Night still has zero mode-entry control.
4. Finder `想去` still shows the saved formal spots and Spot Detail still owns one Favorite icon state. Dynamic failure preserves that relationship. No My-side duplicate or second favorite store is introduced.
5. Plan retains recoverable MY-002/MY-003 behavior and uses the existing shared Notification family for its stale/provider/sync state or acknowledgement. There is still one actual Notification renderer and no reintroduced page-local banner.
6. Existing U24–U32 SourceLift, Finder, Conditions, Detail, Spot Night, scrollbar, selection-star and Notification journeys remain clean in day/night/observation and reduced motion. JSON/scripts parse; 97 counts/locators/hashes reconcile; no external runtime, duplicate ID, removed My locator, unnamed action, open layer, ghost or console warning/error remains.

Provider success is not independent QA. Retrieve every canonical file byte-exact, preserve the unchanged design-system binding, and repeat the route/state/mode/accessibility journeys before marking U33 candidate-covered. The result remains an unselected rolling review snapshot; selection-time S1/S2 reconciliation and final selected-design manifest/preflight remain deferred.

## 31. U33 execution and current-byte QA qualification

Section 30 was executed in the existing Open Design project `starward-miniapp-v2-drift-correction-2026-08-20`, conversation `61006884-d0d8-48d2-bc4c-f0136e8ade3b`, with exact `user:soft-instruments` binding and digest `5dd2e7acf43973793a8ae70bd0db8266c7253f27ebdeb6d944657b83e3a855e6`. Live provider discovery selected requested/effective `codex / gpt-5.6-sol / xhigh`. Run `08dc6555-0032-4350-a8fc-e03b7104da1f` ended `succeeded`, exit `0`, `endedWithUnfinishedWork=false`.

The four provider/repository canonical files were retrieved byte-exact:

- `candidate/index.html`: `9F7E60C1233D76D9A00800D594AF273CC9ECC5F537840DDC4E72A407286E5E31`.
- `candidate/README.md`: `DD6699CFC4D28EC88AD82B473B196F7911244C70652ACE4D8DB4FE8B04F40409`.
- `candidate/resource-manifest.json`: `754AE81EE957EA672AD9199C1CDEA09737A74AC00632AD8A8E675A92BAC2582F`.
- `candidate/brand-spec.md`: `C1552347FD06724A45B12ACB51032A8619A94F9B3B6AA36361A824A184E6DFA1`, byte-identical to the prior binding.

The final rolling manifest contains exactly 97 unique dispositions: 73 covered, 1 covered-active-remainder, 3 partial, 1 excluded, 19 inactive-superseded, 0 decision-required and 78 active. U33 is the sole new row and is `covered`; all U1–U32 dispositions remain unchanged. MY-001 now locates Finder Wanted plus Detail Favorite; MY-002/MY-003 locate the Plan child; U30 locates standalone Settings; U32 locates Plan/Settings Notification reuse.

Provider current-byte Browser QA established 36 responsive My combinations: 320×800, 375×900 and 430×932 × day/night/observation × normal/large × normal/candidate-reduced. Old subtitle, peer tabs and My Favorite elements resolve zero; the gear target is 44px, Plan entry is 60px, horizontal overflow/duplicate runtime IDs/unnamed visible actions/visible vertical scrollbar chrome are zero. Plan and Settings are standalone routes; explicit, system-history and keyboard Back restore exact My root scroll and logical opener focus. Settings owns exactly one observation entry, Spot Night owns zero, Finder Wanted and Detail Favorite remain, and Plan inline plus Settings floating feedback actually reuse the shared Notification renderer. U24–U32 regressions passed on the same index bytes; Provider reported zero application console warnings/errors and zero external runtime dependency.

The repository outer workflow confirmed all four canonical byte identities, parsed JSON and both inline scripts, reconciled the 97-row ledger/locators and hashes, checked removed My strings/locators, reviewed Context/authority boundaries, and visually inspected the Provider final browser screenshots plus structured result. The outer Browser then rejected the user's local `file://` candidate under URL policy and explicitly prohibited workaround or alternate browser surfaces. Accordingly this snapshot is marked `candidate-covered / provider-current-byte-browser-QA-passed / outer-static-evidence-reviewed`, but it does **not** claim U33 independent browser re-execution passed. A permitted same-byte browser or native entry must supply that proof before formal selection if the selection workflow requires it.

These results remain an unselected rolling review snapshot. They do not select/adopt the candidate, finalize a selected-design manifest, modify S1/S2, authorize production or prove native WeChat, real Provider, device or field behavior.
