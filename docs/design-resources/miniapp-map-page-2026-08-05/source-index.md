# 《今晚去观星》微信小程序地图页设计资源 Source Index

Status: task-local candidate source index; not selected, not Design Authority, not Product Surface, and not production acceptance.

Goal thread: `019fd140-810a-74b0-82c3-64d63c9e8440`

Authoring date: `2026-08-05`

## 1. Scope ceiling and intent

- Intent: `handoff`, with a mandatory human review checkpoint after the minimum-sufficient design resources are complete and before any formal handoff manifest/text is authored. The current checkpoint does not pre-select the candidate.
- Platform: WeChat Mini Program.
- Ceiling: one page — the default map page and every material map-page state/control needed to review that page honestly.
- In scope:
  - Mini Program shell context needed to judge the map page: capsule/safe-area clearance and the proposed three-item global bottom navigation.
  - Default map, search, markers/clusters, selected spot card, first-level filters, secondary filter sheet, layer selector/legend, locate/manual-region path, route overview/degradation, and map restoration semantics.
  - Day, night, and observation-red visual modes over the same task state.
  - Loading, empty/no-results, partial, stale, offline, error, permission-denied, route-unavailable, layer-unavailable, closed/restricted/insufficient-data, pressed/focus/disabled, enlarged-text, and reduced-motion consequences where they materially affect this page.
- Necessary surrounding context:
  - The selected spot card opens the independent spot detail page; returning restores the exact map context.
  - External navigation is a handoff after route/target review, never in-Mini-Program turn-by-turn navigation.
  - Night and My are shown only as global navigation context, not designed as pages here.
- Explicit exclusions:
  - Spot detail content, Night page, My page, favorites page, articles, sky map, observation field page, operations/admin, login, contribution, payment, comments, multi-point itinerary, complete AR, production media, and runtime code.
  - Product-Surface adoption, Screen Contract creation, Context changes, `DESIGN.md` changes, framework bootstrap, API/runtime implementation, formal selected-source handoff, and production/WeChat-device acceptance.
  - Native App tokens, React Native visuals, inactive App/Admin targets, and legacy `docs/design-system/**` exports.

### 1.1 User clarification — DRA minimum-sufficient resource set

The user clarified that “minimum-sufficient” must be interpreted for a map page scheduled for greenfield implementation and later formal handoff, not merely for choosing a visual direction. In Design Resource Authoring, “smallest” limits artifact count and surrounding scope; it never reduces material information granularity. Therefore the resource set must expose every material in-scope page, component/control, state, responsive, interaction, motion, focus and accessibility decision needed to avoid downstream invention, while grouping facts into as few non-duplicative artifacts as possible.

The existing responsive interactive prototype remains the canonical page/behavior resource because it already exposes:

- the complete map-page composition and proposed Mini Program shell context;
- concrete search, chip, filter, layer, locate, marker, cluster, card, favorite, route and navigation controls;
- 20 named page scenarios, including failure, degradation, privacy and restoration consequences;
- day, night and observation-red conditions over preserved task state;
- enlarged text, reduced motion and embedded page-level rationale.

It is not presumed sufficient merely because these controls appear. A default/reachable page frame does not by itself cover anatomy, exact dimensions, all variants, pressed/focus/disabled feedback, motion, responsive rules, gesture ownership or accessibility. Those uncovered items require grouped supplemental resources. The selected minimum set is therefore the prototype plus a responsive page-anatomy board, one grouped component/control atlas and one interaction/motion/focus/accessibility study. A separate 20-scenario atlas is unnecessary because those page-level scenarios are already explicitly reachable in the prototype; their component-level consequences belong in the grouped atlas.

The formal atomic Expected Fact Universe, canonical acquisition and handoff index are intentionally deferred until explicit selection. Handoff may index and validate design facts already present in selected resources; it must not invent missing design decisions. The current task stops for human review immediately before that formal handoff step.

Authoring-history note: expanded-suite run `b34b3eab-79c9-4fa2-b84b-c95f08e9cf5d` was started under an over-decomposed six-view interpretation and canceled. Its partial gallery artifact is superseded and is not part of the selected minimum set. Touch-target repair run `8ba8629c-dd84-4b67-9a3c-266323dc6f31` was also canceled without artifacts after native conversation recovery resumed that stale suite instruction instead of the bounded repair prompt.

## 2. Input identity and role inventory

| Input | Identity | Role in this commission |
| --- | --- | --- |
| Mini Program visual authority | `DESIGN.md#wechat-mini-program--soft-instruments-v1`, repository SHA-256 `45ddfecf8ad3c9da7edc94312f15d3684d513603b5f317a91ade1de264e4ceb0` | `exact-target` for the scoped Mini Program visual system only |
| Selected Mini Program source | `docs/design-resources/miniapp-design-system-2026-08-05/candidate-design-brief.md`, SHA-256 `ab1faeb96a3e52125b19fdf8f224caf6cee0db79cf16a9a12f86c5af49991745` | `exact-target` as interpreted and adopted by root `DESIGN.md` |
| Selected Mini Program source index | `docs/design-resources/miniapp-design-system-2026-08-05/source-index.md`, SHA-256 `80cb69b9501b556ca8c186c770e5257ee5136e031e52ce54c42d7298eba3e3f7` | background/provenance; references remain inspiration |
| Product plan | `C:/Users/777/Downloads/今晚去观星_微信小程序产品方案_Demo基线与商用增强版.md`, SHA-256 `641f11b9bc000278040d35cc895fbbf5b45f85194e4566e0b9f05081ebbe0bf2` | `constraint` for task-local product meaning; not durable project Context |
| Technical plan | `C:/Users/777/Downloads/今晚去观星_微信小程序技术架构与技术实现方案_Demo基线与商用增强版_V1.0.md`, SHA-256 `7d48822a49a2fd1e93344f1fe31d9b144f4d0c79d9e42c47435e16faf220f122` | `constraint` for visible technical states and feasibility; not visual authority |
| Project Context | `project_context/global.md`, `architecture.md`, `context.toml`, `areas/main.md`, `development-workflow.md`, and current Surface/Screen Contract routing | `constraint` for authority, privacy, truthfulness, state and no-full-App-parity boundaries |
| Existing native App/UI resources | current App system, React Native routes and inactive legacy targets | `not-needed` and explicitly excluded as Mini Program visual input |

No user-supplied reference image is an exact page target. The eight Mini Program reference images remain inspiration only under the selected design-system adoption.

## 3. Authority and conflict handling

1. Product/safety/privacy meaning from explicit user materials and owning project Context outranks a visual artifact.
2. `DESIGN.md#wechat-mini-program--soft-instruments-v1` owns exact visual tokens, modes, spacing, typography, component appearance, motion posture, asset posture, and Mini Program-specific accessibility values.
3. The product plan owns the requested candidate page structure within this task, while the technical plan supplies feasibility/state consequences. Technical text explicitly yields to the product plan on product conflicts.
4. Current durable Context still states that no Mini Program Product Surface or Screen Contract has been adopted and that a Mini Program cannot replace the native App's completion. Therefore the candidate must visibly remain unselected and task-local.
5. Where the product plan's automatic location request conflicts with the stronger project point-of-use/minimum-permission posture, the candidate first renders a usable default region and asks for location only through a clear `使用当前位置` action. It also includes the denial/manual-city path. This is an explicit safety/privacy preservation, not a silent product rewrite.
6. The product plan asks for a semi-transparent map search field. The design-system prohibition on broad glass/blur is preserved by using a sufficiently opaque solid surface with restrained translucency only if contrast remains valid; no backdrop blur or glass panel.

## 4. Stable user task and page hierarchy

Primary question: `今晚从哪里出发去哪个可达、可信、风险可接受的观星点？`

Decision order:

1. See the map and usable region even without location permission.
2. Search/browse/filter nearby or chosen-region spots.
3. Compare marker/cluster and concise card facts.
4. Select one spot; keep marker, card, route and later detail context synchronized.
5. Inspect route/facility/risk/freshness at the level needed to choose the next action.
6. Open spot detail for full evidence or request an external-navigation handoff only after the target is clear.

Map-page region order:

1. Mode-correct canvas and WeChat safe top/capsule clearance.
2. Compact search field: `想去哪里看星星？`, clear action, and search-state entry.
3. First-level filter chips; active selection remains visible and is not encoded by color alone.
4. Full map canvas with light custom business overlays.
5. Solid floating map controls: locate/manual region, layer selector, and reset/refresh only when justified.
6. Marker/cluster layer with selected/closed/restricted/insufficient-data semantics.
7. Selected spot compact card or compact sheet above global navigation.
8. Proposed global navigation context: `夜空 — 地图 — 我的`, with the center Map item visually dominant and selected using icon, label, fill/weight/indicator rather than color alone.

## 5. Product requirements indexed for the map page

### 5.1 Default and permission

- The map is the proposed default Mini Program entry.
- The page remains usable without location permission and falls back to the Demo trial region plus manual city/region search.
- No continuous location by default.
- Preserve and restore center, zoom, filters, selected spot, layer, loaded viewport, and card/scroll state.
- A permission denial explains what remains available and offers `选择城市` plus a safe retry/settings route only when useful.
- Precise user coordinates never appear in ordinary telemetry or in the candidate content.

### 5.2 Search

- Placeholder/copy: `想去哪里看星星？`
- Supports registered stargazing spots, cities/districts/regions, ordinary places such as parks/reservoirs/camps, addresses and familiar names.
- Results are grouped into `观星点`, `普通地点`, and `历史搜索`.
- A registered spot opens its spot context; an ordinary place moves the map and offers `查看此处夜空`; it does not become a formal spot.
- Include recent search, quick clear, loading, no results, offline/cache-only, and provider-degraded consequences.

### 5.3 Markers and clusters

- Express `cluster | spot` from the first design, even if Demo has only 20–50 curated spots.
- A spot marker can communicate: formal spot, product light-pollution estimate, selected, favorite, temporarily closed, road abnormal, insufficient data, approximate/restricted location.
- Low zoom clusters; higher zoom progressively reveals spots.
- Avoid simultaneous excess text/facility icons on the map.
- Selection uses shape/scale/label/border as well as color.
- Sensitive or high-risk coordinates may be approximate, restricted or hidden; do not draw an exact navigation target until the owning rule permits it.

### 5.4 Selected spot card

Material fields:

- Name.
- Light-pollution estimate with explicit estimate/provenance posture; exact Bortle mapping remains decision-required.
- Tonight state: `推荐 / 可考虑 / 不建议 / 数据不足`.
- Distance plus estimated drive time; keep values and units semantically separate.
- Three to five most important facilities such as parking, toilet, platform, charging, foreground or camping, with non-color availability/unknown semantics.
- Representative place-media region or an explicit `实景待补 / 示例` state; never an unlabeled invented real location image.
- Data update/freshness when the conclusion is shown.
- `查看详情` as the principal card action. The full spot detail is out of scope.

Returning from detail must retain center, zoom, filters, selected spot and loaded markers. No detached second map state is allowed.

### 5.5 Filters — review delta 001

The prior quick-filter taxonomy is superseded for the filter sheet and every representation of that affected control. The independent map-layer term `今晚可考虑` and related spot-card recommendation wording remain valid; this is not a global terminology replacement.

The exact review hierarchy is:

- `观星条件`
  - `光害等级`: `2级以下`, `3级以下`, `4级以下`, `5级以下`, `6级以下`
  - `遮挡`: `遮挡面积 50% 以下`, `遮挡面积 30% 以下`, `无遮挡`
  - `光害方向`: `全部无光害`, `西边无光害`, `东北无光害`
- `观测点`
  - `驾车时间`: `2小时内`, `4小时内`, `6小时内`
  - `行程信息`: `驾车直达`, `公共交通`, `不要徒步`, `不要登山`
  - `海拔`: `1000米以下`, `2000米以下`, `3000米以下`, `4000米以下`, `6000米以下`
- `场地信息`: `有停车`, `有厕所`, `可充电`, `能露营`

This is a three-group, six-expandable-parent, twenty-seven-terminal model. `场地信息` is a flat terminal group, not a seventh parent. The review candidate uses one expanded parent at a time, persistent collapsed summaries, a draft filter session distinct from committed map filters, `应用筛选` as the only commit, close/back/cancel as discard, and `重置` as draft-only until apply. Quick summaries expose committed `光害等级`, `驾车时间`, `场地信息` and the total terminal count.

Pending review assumptions, not adopted product truth:

- `光害等级`, `遮挡`, `光害方向`, `驾车时间` and `海拔` are single-select and deselectable.
- `行程信息` and `场地信息` are multi-select.
- `全部无光害` is mutually exclusive with directional choices.
- Exact boundary semantics, obstruction calculation, directional reference frame, data provenance, API enum/query mapping and empty-result behavior remain decision-required before selection and formal handoff.

The exact user delta and Open Design commission are preserved in `review-delta-001-filter-hierarchy.md` and `open-design-filter-hierarchy-revision-commission.md` beside this index. The original product and technical plans are intentionally unchanged at this audit checkpoint.

### 5.6 Layers

Candidate layers:

- Standard map.
- Light-pollution estimate.
- Favorite spots.
- Tonight-recommended spots.
- Satellite-cloud or terrain aid is optional and must not be implied available in Demo.

Every active data layer exposes legend, source class, data date/update time, precision/estimate explanation and unavailable/degraded state. The Demo light-pollution layer is a trial-region simplified grid/polygon or heat layer, shown only at suitable zoom and with bounded on-screen geometry. A layer failure hides the layer but keeps the last spot-level estimate and clearly labels the layer unavailable.

### 5.7 Route and navigation

- Mini Program page may show distance, estimated driving time, optional walking tail, route overview, last-road/parking note, and the selected external-map target.
- The Mini Program does not implement turn-by-turn navigation.
- Route failure shows cached route when valid, or straight-line distance explicitly labelled `非路线距离`, plus `路线待刷新`; it must never draw a fabricated route.
- The external-navigation handoff must identify the destination, warn before any unthemeable vendor/system surface in observation mode, and provide cancel/return.
- Complex multi-point trip planning and collaborative route sorting are excluded.

## 6. Visible state model

Page-level technical states that must have an honest visual consequence:

- `INITIAL`
- `LOADING`
- `READY`
- `EMPTY`
- `PARTIAL`
- `STALE`
- `ERROR`
- `PERMISSION_DENIED`

Additional map-page scenarios:

- offline/cache-only;
- search no-results;
- map search provider degraded;
- route unavailable;
- light-pollution layer unavailable;
- spot closed/suspended;
- data insufficient/expired;
- sensitive approximate coordinate;
- selected marker/card synchronization;
- returning from detail with restored map state;
- enlarged Chinese text;
- reduced motion;
- disabled/loading/pressed/focus states for controls.

State rules:

- `PARTIAL` and `STALE` preserve usable facts and name what is missing/old.
- Missing is never rendered as zero or realistic fallback data.
- Dynamic failure never hides already available static spot/field information.
- Beyond hard expiry, the UI cannot continue to label a spot `推荐`.
- Any sample values carry a persistent `示例数据` label; no animation pretends freshness.

Core enums to represent without exposing implementation names to ordinary users:

- Spot: draft/published/suspended/closed/archived.
- Facility: available/unavailable/unknown/seasonal.
- Freshness: fresh/stale usable/partial/expired/unavailable/estimated/sample data.
- Tonight: recommended/consider/not recommended/insufficient data.
- Coordinate visibility: exact/approximate/restricted/hidden.

## 7. Technical feasibility constraints with visible impact

- Client direction: Taro + React + TypeScript; actual map via WeChat native map component behind `MapViewAdapter`. The resource remains implementation-independent and must not simulate an embedded WebView as the proposed production map.
- Viewport request key: `bbox + zoom + selectedDate + filters + layerVersion`.
- Pan-end requests debounce around 200–350ms, query a buffered viewport, cancel the previous request, and return clusters at low zoom/spots at high zoom. The design must not show a spinner on every pan frame.
- Map scene BFF returns markers/clusters, compact summaries and `dataState`; one page-level aggregated request is the target posture, excluding base-map requests.
- State owners: server data cache/query owns map scene; task-local page state owns viewport, filters, selected spot, theme, date/time, last manual location and card state. Do not create duplicate spot truth in several visual panels.
- Cached map state restores immediately; background refresh may then mark content stale/updated without moving controls or clearing the current selection.
- Lightweight markers, bounded overlay geometry, stable card skeleton, canceled requests on exit and lazy/non-blocking media are performance postures only. The candidate cannot claim the `<3s` Demo target or any WeChat-device performance result.
- The artifact must work without external map tiles, fonts or network calls. A stylized inline SVG/CSS map is an explicitly labelled design simulation, not a real map or coordinate truth.

Relevant response/error conditions:

- `LOCATION_PERMISSION_DENIED`
- `INVALID_COORDINATE_SYSTEM`
- `SPOT_NOT_FOUND`
- `SPOT_COORDINATE_RESTRICTED`
- `ROUTE_UNAVAILABLE`
- `DECISION_BLOCKED`
- `INSUFFICIENT_DATA`
- `RATE_LIMITED`
- `BUDGET_GUARD_TRIGGERED`
- `PROVIDER_DEGRADED`

The candidate uses user language, not raw error codes.

## 8. Exact Mini Program design-system constraints

The provider must consume `user:soft-instruments`; do not restate or override its entire token source. The following page-specific anchors are mandatory:

- Geometry: `750rpx` reference canvas, `8rpx` base step, `32rpx` page inset, `24rpx` compact inset, `40rpx` section gap, `24rpx` card/grid gap, `28rpx` card padding.
- Hit area: at least `88rpx × 88rpx`; visible functional glyph `40rpx` in the Tier-A optical grid.
- Card: `radius-md` (`28rpx`), `1rpx` border, no nested elevation.
- Search/map controls: solid or sufficiently opaque surfaces; no broad glass blur.
- Typography: native Mini Program Chinese stack; critical copy reflows; values/units are separate spans.
- Functional map/search/filter/layer/location/navigation icons are Tier A only: rounded outline, `3rpx` stroke, round caps/joins, no 3D/gloss/shadow/texture.
- Tier-B 3D subjects are not required for this map page. Do not add a telescope/star object merely as decoration.
- Day, night and observation expose the same information/component grammar and keep the selected map state.
- Observation is a closed black/warm-red condition for all controllable surfaces, icons, focus, status, loading/error, map overlays, transitions and authored media. No white/blue/green/cyan/violet/yellow/neutral-gray pixels in those controlled layers; no whole-screen filter.
- Destination canvas is applied before a mode transition. If the previous field session ended in observation mode, the design posture bootstraps black/red until deliberate exit.
- One local decision layer has at most one dominant primary action. One row has at most one persistent trailing action.
- Press-in begins same frame and completes within `100ms`; release/cancel is `120ms`; state swap `160ms`; compact sheet `220ms`; mode transition `240ms`; reduced motion is immediate or `≤100ms` opacity only.
- No bounce, ambient particles, idle floating, large parallax, decorative glow or motion-gated input.
- Normal text contrast targets `4.5:1`; large text/essential boundaries `3:1`; state is never color-only.
- Bottom navigation is solid, reserves safe area, has icon + label, and remains only a review candidate until a Product Surface is adopted.

## 9. Review content and sample-data discipline

Use stable, obviously illustrative Chinese copy so visual quality can be judged without inventing product truth:

- Persistent page-level label: `演示区域 · 示例数据`.
- Illustrative spot: `示例·海湾观星点` or another clearly prefixed non-authoritative name.
- Tonight state example: `可考虑` with a stated update time and `产品计算 / 示例` source label.
- Route example may use plausible distance/time only when the entire card is visibly labelled example data.
- Light-pollution wording: `较低 · 产品估算`; do not imply a final Bortle mapping.
- Media region: labelled placeholder such as `实景待补` or generated non-locational visual explicitly marked `示例`, never a borrowed or purported real-place photograph.
- Map legal area: a clearly labelled provider/审图号 placeholder for review; do not invent a real approval number or provider entitlement.

## 10. Interaction invariants

- Map pan/pinch remains owned by the map except on explicit overlay handles/controls.
- Marker tap commits selection once; marker, card and route summary display the same selected spot.
- A map movement does not silently clear filters or selected spot; if the selected spot exits the viewport, provide an explicit recenter/clear behavior.
- Search/filter/layer sheets contain focus/read order, return focus to the trigger, and have close/cancel paths.
- Press feedback begins on touch-down; drag-away/cancel/disable does not commit.
- A compact sheet is interruptible and retargets from its live position; reduced motion replaces large translation with immediate/short-fade state change.
- Mode changes preserve route, map center, zoom, filters, selection, search draft and pending safe work.
- Haptics are optional and absent from the browser candidate unless explicitly simulated as a labelled annotation; they are never required for understanding.

## 11. Resource selection dispositions

| Considered resource | Disposition | Reason |
| --- | --- | --- |
| Responsive interactive high-fidelity map-page prototype | `selected` / `existing-covered` | Canonical whole-page composition and behavior surface; explicitly covers 20 page-level scenarios, three visual modes, reduced motion, enlarged text and core control flows |
| Visual review gallery | `not-needed` | Navigation convenience adds no design fact; direct resource links are sufficient |
| Annotated page-anatomy and responsive board | `selected` / `new-resource-needed` | The prototype does not explicitly annotate 320/375/430 layout rules, safe-area/capsule clearance, z-order, map/card/navigation coexistence, geometry pressure or gesture ownership |
| Page-specific component and control atlas | `selected` / `new-resource-needed` | Development needs explicit anatomy, dimensions, 88rpx targets, variants, defaults, pressed/focus/disabled feedback, copy, accessibility naming and design-system mapping beyond default page appearances |
| Marker, cluster, route, layer and selected-card variants | `selected`, grouped inside the component atlas | These unique map-native controls carry independent semantic, geometry, privacy and interaction requirements |
| Complete 20-scenario visual state atlas | `not-needed` as a separate resource | All 20 page-level scenarios are explicitly reachable in the prototype; component-level state consequences are grouped in the component atlas |
| Three-mode condition study | `selected`, embedded across the prototype and supplemental boards | Day, night and observation red must preserve semantics and selected state while exposing exact token/contrast consequences |
| Interaction/motion/focus/accessibility study | `selected` / `new-resource-needed` | The prototype demonstrates outcomes but does not fully specify gesture ownership, touch-down/cancel, sheet interruption, focus/read order, restoration, motion timings, reduced-motion substitution and non-color cues |
| Low-fidelity structural view | `not-needed` as a separate resource | The page-anatomy board can carry the hierarchy/z-order view without creating a competing fidelity representation |
| Standalone Tier-B 3D asset generation | `not-needed` | The map page is functional/data-first and should not receive decorative 3D subjects |
| Real place photography | `unavailable` for this candidate | No licensed exact place media was supplied; use an explicit placeholder/example state |
| Figma/native collaborative copy | `not-needed` | No team collaboration/native-library requirement was stated; it would create a second representation before selection |
| Derived review PNGs | `not-needed` | Browser-rendered inspection is sufficient; static captures would lose interaction and create duplicate review sources |
| Formal selected Web/App handoff manifest or text supplement | `deferred-by-review-checkpoint` | The overall intent is handoff, but the user explicitly requires review and selection before this text/index is authored |

## 12. Provider capability and binding checkpoint

- Provider: Open Design `0.16.1`, packaged Windows daemon, `http://127.0.0.1:7456`.
- Health: available.
- Available generation agent: Codex CLI `0.144.5`, authenticated.
- User-selected generation model: `gpt-5.6-sol` with `xhigh` reasoning. Open Design exposes no `max` reasoning option for this agent, so `xhigh` is the highest available provider setting.
- Open Design functional skills: none currently listed.
- Open Design plugins: none currently listed.
- Open Design design templates: none currently listed.
- Selected capability: repeated Open Design agent runs against one bounded project; request one canonical responsive interactive HTML prototype plus only the three grouped supplemental resources needed to close uncovered implementation-handoff information, with no build or network dependency.
- Design system: `user:soft-instruments`, published/editable, bound upstream project `ds-soft-instruments`.
- Structured read verification: provider `DESIGN.md` returned `28427` UTF-8 bytes with SHA-256 `ab1faeb96a3e52125b19fdf8f224caf6cee0db79cf16a9a12f86c5af49991745`, exactly matching the selected repository source.
- Project reuse decision: do not generate the page inside `ds-soft-instruments`, because that workspace owns design-system authoring. Create one bounded page project with the same design-system binding and verify `designSystemId` before the run.

## 13. Review promise and non-claims

Review promise: render every selected resource, confirm none is corrupt and scope remains one map page, exercise the prototype's local mode/state/overlay controls, inspect 320/375/430 behavior, verify every declared component/state/interaction coverage item is explicit in at least one resource, check for obvious console/runtime failures, verify the observation condition does not introduce obvious non-red controlled Mini Program UI, cross-check shared values across resources, and preserve exact provider/project/run/file identities.

This task does not claim:

- adopted Product Surface or selected page design;
- production Mini Program implementation;
- real provider data, real location, licensed imagery or map entitlement;
- WeChat native map, permission, lifecycle, package, performance, accessibility or device conformance;
- implementation-ready formal selected-source closure;
- native App completion or parity.

## 14. Context and reconciliation status

- `Context Delta: none` — no durable product responsibility is changed by generating an unselected resource.
- Candidate decision delta stays task-local until the user explicitly selects or rejects it.
- No proposal, Context, `DESIGN.md`, Contract, production code or test is reconciled during generation.

## 15. Generated candidate, repair history and review checkpoint

### 15.1 Canonical Open Design identity

- Open Design project: `starward-miniapp-map-page-2026-08-05`.
- Canonical generation conversation: `7157bf68-abf8-48c7-9481-b0d9ba5186fc`.
- Precision/repair conversation: `37c11529-9de5-4c4b-8f74-dd5152263492`.
- Every retained generation or repair run used `gpt-5.6-sol` with `xhigh` reasoning and the bound design system `user:soft-instruments`; `xhigh` is the highest reasoning option exposed by this Open Design installation.
- Main four-resource generation run: `0d12bcc6-93d9-41fe-b13a-d7fca5442d55`, terminal `succeeded`.
- Cross-resource precision repair run: `b277a26a-6f3c-462e-b6f9-3edf96dcd0ef`, terminal `succeeded`, exit code `0`, no unfinished work; only the three commissioned supplemental resources changed.
- Narrow-screen chip overflow repair run: `d3d58f9a-6434-4ac2-8885-020f9fc1db61`, terminal `succeeded`, exit code `0`, no unfinished work; only `component-control-atlas.html` changed.
- Native-scrollbar visual polish run: `36a4b7d7-538d-4d65-869e-6703b2b09e11`, terminal `succeeded`, exit code `0`, no unfinished work, artifact count `1`; only `component-control-atlas.html` changed.
- Filter-hierarchy four-resource revision run: `8f1eec5f-419b-4a92-b91b-bec1b7e1bec6`, conversation `37c11529-9de5-4c4b-8f74-dd5152263492`, terminal `succeeded`, exit code `0`, no unfinished work, artifact count `4`; it revised only the retained four HTML resources against `user:soft-instruments`.
- Final stale-summary repair run: `4b97c29d-9c18-487a-81f4-61a5837c4d52`, the same repair conversation, terminal `succeeded`, exit code `0`, no unfinished work, artifact count `1`; it changed only `interaction-motion-accessibility.html` and removed the obsolete affected quick-filter phrase `今晚推荐` from that resource.
- Canceled over-decomposition run `b34b3eab-79c9-4fa2-b84b-c95f08e9cf5d` produced a gallery concept that was deleted and is not part of the candidate. Canceled stale repair run `8ba8629c-dd84-4b67-9a3c-266323dc6f31` retained no artifact. Neither canceled run contributes any review fact.
- Stable preview discovery endpoint: `/api/projects/starward-miniapp-map-page-2026-08-05/preview-url`. The returned tokenized preview root is runtime-ephemeral and intentionally not treated as a durable locator.

### 15.2 Retained minimum-sufficient resource set

| Canonical Open Design artifact | Role | UTF-8 bytes | SHA-256 |
| --- | --- | ---: | --- |
| `index.html` | Responsive interactive high-fidelity map-page prototype; 20 page-level scenarios and core flows | 75985 | `58775ED37ACDD7B5E56D96CF1299ADD42AA8FEB18FA9569F04E8A9F8116E745F` |
| `page-anatomy.html` | Annotated page anatomy, z-order, safe-area and 320/375/430 responsive board, including the revised filter-sheet anatomy | 39644 | `12C7E1F54FE28992C95C38752D51B391EC707A7045D315B0D75F65A29C4E9F3B` |
| `component-control-atlas.html` | Twelve page-specific component/control groups, including all hierarchy, variants, measurements and mode consequences | 59969 | `939502E4383B0515CC564E2C25775340116F93B2F6A38AE3027B24C946074FF8` |
| `interaction-motion-accessibility.html` | Eight interaction, motion, focus, restoration, lifecycle and accessibility sections, with runnable filter draft/commit/cancel behavior | 58820 | `512675134320375895FF62220243B674F4A0119E798199AAF3A177316F17729C` |

All four repository snapshots are byte-identical to their canonical Open Design provider artifacts; the hashes above identify both copies.

### 15.3 Independent current-candidate audit

- Loaded all four final artifacts through the Open Design preview with no console/runtime error and no duplicate DOM IDs.
- Verified the exact same three groups, six expandable parents and ordered twenty-seven unique terminal labels across all four resources; no affected old filter-sheet taxonomy remains.
- Exercised the revised prototype with single-select, multi-select, mutually exclusive `全部无光害`, one-expanded-parent behavior, committed versus draft state, reset-without-commit, cancel/close discard, apply commit, summary persistence and the explicit filtered-empty example.
- Verified the interaction laboratory's touch-cancel, disable-before-release, valid release, sheet interrupt/retarget and filter apply/cancel/reset event counts; no cancellation path commits draft filters.
- Verified revised quick summaries, wrapped long obstruction labels and scroll ownership at 320, 375 and 430 CSS pixels. The final interaction quick strip contains exactly `光害等级 · 4级以下`, `驾车时间 · 2小时内`, `有停车`, `更多 · 3`, remains horizontally scrollable, and has 44-pixel items without document-level overflow.
- Independent final QA found and then eliminated one stale static `今晚推荐` quick-summary fallback in the interaction resource. The post-repair browser audit found the obsolete exact phrase absent and all four final console logs empty.
- Exercised all 20 prototype scenarios and verified distinct visible consequences, including partial, stale, offline, permission denied, route unavailable, layer unavailable, sensitive approximate location, closed, loading, empty, error, commercial and enlarged-text cases.
- Verified day, night and observation-red exact token values across all four artifacts; mode switching retains current selection and relevant local state. Observation uses authored black/red surfaces rather than a whole-screen filter.
- Verified the component atlas contains all 12 commissioned groups, the interaction board contains all 8 commissioned sections, and the anatomy board exposes the 320/375/430 frames, safe-area/capsule, layer order and responsive notes.
- Checked 320, 375 and 430 CSS-pixel viewports: no document-level horizontal overflow; critical interactive targets remain at least 44 CSS pixels; enlarged Chinese text keeps the card usable through bounded internal scrolling.
- Exercised marker/card/route synchronization, search focus return, route-failure non-route distance, detail round-trip restoration, touch cancel/disable behavior, interruptible sheet retargeting and reduced-motion substitution (`0.08s`).
- The first independent atlas audit found that later filter chips were clipped by `overflow: hidden`. The repair changed the owning chip row to real horizontal scrolling without wrapping or document overflow, and the last chip was reached and activated at every tested width.
- A subsequent visual audit found a Windows-native scrollbar on that valid scroll owner. The final polish retained keyboard/pointer/touch scrolling while suppressing the scrollbar chrome with both Firefox and WebKit declarations; the first and last chips remain reachable.
- Verified one dominant primary action in the card action layer (`查看详情`), a distinct secondary recenter action (`回到点位`), no whole-control pressed scaling, no external scripts/styles/network dependency, no realistic coordinates and no invented provider entitlement or approval number.

This is browser-rendered design-resource evidence, not proof of WeChat native-map behavior, real-device safe areas, permission APIs, lifecycle integration, haptics, package performance, accessibility services or production data correctness.

### 15.4 Mandatory pause before handoff

The map-page minimum-sufficient design resources are generated, repaired, snapshotted and independently audited. Work stops here for user review. No formal selected-source handoff manifest/text supplement, adoption record, other page resource, production implementation or source-plan reconciliation has been authored. Any later handoff must use the user-reviewed resource versions and must not silently substitute a newer Open Design artifact.

The review checkpoint includes the task-local delta and commission files but excludes a handoff supplement. The original product plan, technical plan, `DESIGN.md`, `project_context/**`, production code and Product Surface remain untouched until the user reviews this candidate and explicitly authorizes the next reconciliation step.

## 16. Final map selection and flattened filter revision — supersedes §15.4

The owner completed the map review and authorized the full DRA close. The pause, expandable-parent model and earlier hashes in §15 are historical. The final page uses grouped, always-visible options rather than dropdowns, accordions or one-expanded-parent interaction.

Final filter contract:

- Entry: explicit Tier-A filter icon + `筛选` + applied-count feedback. The earlier `更多 · 3 +` behavior was functionally bound to the correct dialog; the defect was discoverability/copy, not the event target.
- `观星条件`:
  - `光害等级` single-select: `2级以下`、`3级以下`、`4级以下`、`5级以下`、`6级以下`。
  - `遮挡` single-select: `遮挡面积 50% 以下`、`遮挡面积 30% 以下`、`无遮挡`。
  - `光害方向` single-select: `全部无光害`、`西边无光害`、`东北无光害`。
- `观测点`:
  - `驾车时间` single-select: `2小时内`、`4小时内`、`6小时内`。
  - `行程信息` multi-select: `驾车直达`、`公共交通`、`不要徒步`、`不要登山`。
  - `海拔` single-select: `1000米以下`、`2000米以下`、`3000米以下`、`4000米以下`、`6000米以下`。
- `场地信息` multi-select: `有停车`、`有厕所`、`可充电`、`能露营`。
- All 27 terminal options remain visible within their grouped sheet; long labels wrap cleanly. Draft state is isolated until Apply; Cancel discards it; Reset clears it; empty-result feedback is explicit.

Final Open Design identities:

| ID | Managed file | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| MAP-01 | `index.html` | 78,167 | `F079FA7D4FF5277E89EE2FA75413CF9471D52D2BD64DA2793D9F6908293D32D2` |
| MAP-02 | `page-anatomy.html` | 42,860 | `CA8F635966A7827CF914985132D13B52857D36E25529C70559A42E4BBDE12F9F` |
| MAP-03 | `component-control-atlas.html` | 60,577 | `27A25286F48D8A8746F98849CB8FA602A0D18610D6AE24B1E88090C90CC14CC0` |
| MAP-04 | `interaction-motion-accessibility.html` | 59,563 | `60263D4D398299CCDECDA8AA2E81AB2C511082D01F3AD23B6B6D51DFD95ED198` |

All four contain the same exact 27 option labels and the explicit filter entry; static scanning finds no dropdown/accordion/`aria-expanded` residue. Live QA at 320/375/430 px verified no document overflow, duplicate IDs, external dependencies, broken images, visible sub-44px targets or console errors, plus Cancel/Apply/Reset state semantics.

The selected copies are `../miniapp-selected-source-2026-08-06-v1/artifacts/map-01-page-prototype.html` through `map-04-interaction-motion-accessibility.html`. They are included in the published formal handoff at `../miniapp-selected-handoff-2026-08-06/miniapp-complete-product-selected-v1.md`. Product and technical proposal reconciliation is complete in the two V2.0 files indexed by `../miniapp-selected-source-2026-08-06-v1/proposal-reconciliation-index.md`.
