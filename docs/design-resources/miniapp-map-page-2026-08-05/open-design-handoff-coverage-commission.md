# Open Design Commission — 地图页最小充分、handoff 前评审资源

Status: task-local commission; candidate remains unselected and is not Product Surface, Design Authority, production code or acceptance.

## Outcome and stop point

Complete the **minimum-sufficient design-resource set for a greenfield implementation handoff**, then stop before creating any formal handoff manifest/text. “Minimum” limits artifact count and surrounding product scope; it must not reduce material information granularity.

The existing `index.html` is the canonical responsive interactive high-fidelity page prototype. Keep it and create only three non-duplicative supplemental resources:

1. `page-anatomy.html`
2. `component-control-atlas.html`
3. `interaction-motion-accessibility.html`

Do **not** create a review gallery, separate state atlas, low-fidelity alternative, Figma copy, handoff document, manifest, implementation code or additional product page. The 20 page-level scenarios already reachable in `index.html` remain canonical; supplemental resources must reference them without duplicating twenty full page frames.

Read `source-index.md`, `open-design-commission.md`, the current `index.html` and the bound `user:soft-instruments` design system before editing. Preserve every product/privacy/degradation fact in those sources.

## Bounded repair to the canonical prototype

Independent browser QA at the 375 CSS-px / 750rpx reference width found actionable Mini Program targets below the bound design system's `88rpx` minimum:

- `.chip`: `36px`, and `40px` under `.large-text`;
- `.filter-option`: `40px`;
- `.inline-link`: `32px`;
- `.secondary-action`: `32px`, with the route action only about `34px` wide.

Repair `index.html` so every visible actionable Mini Program control has at least a `44px × 44px` target at the 375px reference width. Text-only `.inline-link` and `.secondary-action` need a 44px minimum width as well as height. Preserve horizontal chip scrolling and compact composition. The inner search input is already owned by its 44px-high wrapping `<label class="search-field">`; preserve that relationship rather than forcing the inner input itself to 44px.

Do not otherwise change the prototype. Preserve all 20 scenarios, exact day/night/observation-red values, selected marker/card/route synchronization, route-unavailable non-route metrics and hidden SVG path, favorite `Set` persistence, overlay focus return, enlarged text, reduced motion, Tier-A icons, zero external dependencies and all unselected/sample-data labels.

## Resource 1 — `page-anatomy.html`

Create a self-contained visual specification board that closes page-structure and responsive gaps without becoming a second page direction.

Required visible content:

- side-by-side `320 / 375 / 430 CSS-px` map-page frames using the same candidate composition and sample facts;
- exact WeChat safe-top/capsule clearance, page header, map viewport, search/chip stack, marker layer, floating controls, selected card and solid bottom navigation boundaries;
- annotated insets, gaps, card radius/padding, `44px / 88rpx` touch-target envelope, map/card/navigation coexistence and large-text pressure behavior;
- z-order/layer stack: base map simulation, business overlays, markers/clusters, controls, state banner, selected card, sheets/dialogs, toast and global navigation;
- gesture ownership zones: map pan/pinch, horizontal chip scroll, sheet handle/scroll, card controls and navigation;
- responsive rules at 320/375/430, including what scrolls, wraps, remains fixed, never overlaps and preserves safe areas;
- restoration callout for center, zoom, loaded viewport, filters, layer, selected spot, card and search draft;
- a compact day/night/observation comparison proving identical hierarchy and state with exact mode token values;
- persistent labels that this is an unselected candidate, simulated map and sample data.

Use visual measurements, callouts, diagrams and real component fragments. Do not substitute a prose-only document.

## Resource 2 — `component-control-atlas.html`

Create one grouped, self-contained component/control workbench. For every group, make anatomy, dimensions, token lineage, typography, Tier-A icon posture, default/variant/state behavior, copy, action, feedback, focus/accessibility name, motion and design-system mapping directly inspectable. Consolidate ordinary controls into families; do not create one file per control.

Required groups and states:

1. Search trigger and full search overlay: default, pressed, focus, query/results, clear, loading, no-results and provider-degraded.
2. Quick chips and secondary filter sheet: default, selected with non-color cue, pressed, focus, disabled, apply/reset/close, selected count, large-text wrap and horizontal scroll.
3. Spot markers: normal, selected, favorite, temporarily closed, approximate/restricted and insufficient-data; include label geometry and 44px target envelope.
4. Cluster marker: count, expansion action, low/high zoom relationship and non-color focus/selected cue.
5. Floating map controls: locate/manual region, layer and refresh/reset; default, pressed, focus, active, disabled and permission consequence.
6. Selected spot card: bay/ridge normal variants plus closed, restricted and insufficient-data variants; explicit media placeholder, name, tonight state, estimate/source/freshness, values/units, facilities, favorite, route summary and detail action.
7. Route controls/summary: valid overview, cached/last valid, `非路线距离 24 km · 未绘制路线`, route unavailable, closed/restricted target and external-map warning/cancel posture.
8. Layer selector and legend: standard, light-pollution estimate, favorites, tonight recommendation, unavailable/degraded, source/date/precision and bounded overlay posture.
9. Permission and feedback family: point-of-use location sheet, denial/manual-city path, state banner, toast and recoverable action.
10. Loading/empty/error family: stable skeleton, empty/reset, error/retry, partial/stale/offline preservation and no false zero/freshness.
11. Global bottom navigation: `夜空 — 地图 — 我的`, selected/non-selected, icon+label+indicator, safe area and candidate status.
12. Tier-A map/search/filter/location/layer/route/favorite/navigation icon grid: rounded outline, round caps/joins, 20px visible glyph in a 44px target, no shadow/3D/texture.

Show relevant states in day, night and observation red. Observation-controlled surfaces must remain closed black/warm red with no accidental blue/white/cyan/green/violet/yellow/neutral-gray pixels. State must never be color-only. Normal text contrast target is 4.5:1; essential boundaries/large text target 3:1. Values and units remain separate.

## Resource 3 — `interaction-motion-accessibility.html`

Create one visual interaction specification/lab with compact runnable demonstrations, timelines and focus/gesture diagrams. It must close behavioral information not explicit in a default page frame.

Required studies:

- map pan/pinch ownership versus chips, controls, card and sheets;
- marker tap commits once and synchronizes marker, card and route target;
- search open/query/result/ordinary-place/spot/no-result/close, with focus containment and return;
- filter/layer sheet open, optional handle/scroll ownership, apply/reset/cancel and state persistence;
- location point-of-use request, denial/manual city, no repeated request and privacy copy;
- route overview, failure with no fabricated path, external-map destination warning, cancel/return and observation-mode vendor-surface warning;
- spot-detail entry and exact map restoration on return;
- day/night/observation transition preserving center, zoom, filters, layer, selection, route, search draft and pending safe work;
- press-in same-frame/`≤100ms`, release or cancel `120ms`, state swap `160ms`, compact sheet `220ms`, mode transition `240ms`, and reduced-motion immediate or `≤100ms` opacity-only substitution;
- touch-down, drag-away/cancel, disable-before-release and interruptible/retargeted sheet behavior;
- focus/read order, focus-visible, dialog/sheet containment, trigger return, accessible names, non-color cues, large Chinese text/reflow and screen-reader-equivalent state labels;
- optional haptic annotations only where understanding does not depend on haptics;
- lifecycle/resource notes that are visible to implementation reviewers: debounce after pan-end, cancel previous viewport request, preserve cache/static facts, no spinner every pan frame and cleanup on exit.

Use the same sample spot names, product labels, mode colors, motion timings and state meaning as `index.html` and `source-index.md`. This resource is a design specification, not production-runtime proof.

## Shared visual and technical constraints

- Bind to and visibly remain within `user:soft-instruments`.
- Use native Chinese system typography, 8rpx rhythm, restrained Soft Instruments surfaces and Tier-A functional icons.
- No broad glass/blur, decorative glow, 3D subject, ambient particles, bounce, idle motion or large parallax.
- All resources must be offline/self-contained HTML/CSS/JS with no external fonts, images, libraries, tiles, scripts or network calls.
- Inline SVG/CSS map geometry is explicitly simulated; no real coordinates, provider entitlement, approval number, borrowed photography or invented production data.
- Reuse exact candidate facts; do not introduce new product pages, new navigation items, new business rules or App visual tokens.
- Keep the page candidate visibly unselected and task-local.

## Provider-side checks

Before stopping:

- confirm only `index.html` plus the three named supplemental HTML files changed/appeared;
- compile every inline script;
- assert zero external `src`/`href` dependencies;
- assert the repaired prototype retains all 20 scenario options and three mode buttons;
- assert all actionable Mini Program targets except the inner input owned by `.search-field` are at least 44px × 44px at the 375px reference width;
- cross-check shared names, `24 km` non-route example, motion timings, mode token values and candidate/sample labels across resources;
- do not create or update README, source index, commission files or any handoff artifact.
