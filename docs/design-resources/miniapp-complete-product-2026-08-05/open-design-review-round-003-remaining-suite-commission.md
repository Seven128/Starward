# Open Design Review Round 003 — Remaining Full-Suite Commission

Intent: `selected-source-preparation`. Update the remaining cross-product resources after Round 002 so the complete twelve-resource Mini Program suite expresses one coherent final candidate. This run does not itself publish the formal handoff or modify either proposal.

## Mandatory inputs

Read completely before editing:

1. `finalization-directive-2026-08-06.md`;
2. `review-delta-002-spot-detail-night-merge.md`;
3. `review-delta-003-my-profile-content-import.md`;
4. `review-delta-004-map-filter-entry-flat-options.md`;
5. `../miniapp-map-page-2026-08-05/review-delta-001-filter-hierarchy.md`;
6. `open-design-review-round-002-commission.md`;
7. the current Round-002 versions of APP-01 through APP-04 and MAP-01 through MAP-04;
8. the current APP-05 through APP-08 resources;
9. bound design system `user:soft-instruments`.

The current APP-01 through APP-04 and MAP-01 through MAP-04 are the cross-resource reference for this run. Do not edit them. Edit only the four resources below plus Open Design-owned artifact metadata.

## Files owned by this run

- APP-05 `shared-component-control-atlas.html`
- APP-06 `cross-app-interaction-motion-accessibility.html`
- APP-07 `responsive-mode-state-matrix.html`
- APP-08 `semantic-asset-atlas.html`

## Required revisions

### APP-05 — shared component/control atlas

- Global bottom navigation has exactly two destinations, `地图 / 我的`; Night is never a first-level destination.
- Spot segmented control order is exactly `概览 / 攻略 / 场地 / 夜空`.
- Add/replace grouped component studies for:
  - representative real-photo gallery at the beginning of Overview, with source/license/non-exact-place labelling;
  - Guide card with an image region and loading/error/unavailable states;
  - `今晚推荐观测目标` row with several illustrative target states and honest unavailable/estimated treatment;
  - four equal-width My tabs without visible native scrollbar at default width, and a 2×2 reflow under enlarged-text pressure;
  - personal homepage link list/editor with platform-neutral icon, copy fallback, validation, visibility and removal confirmation;
  - external-post import source/link/ownership/parser/manual fallback/editable draft/spot association/new-spot proposal states;
  - explicit map `筛选` entry with selected count and all 27 MAP-R01 terminal options in always-visible grouped layouts, without disclosure/dropdown controls.
- Preserve existing useful component families and state/anatomy precision; do not delete unrelated coverage.

### APP-06 — cross-app interaction, motion and accessibility

- Replace three-destination navigation/restoration with the two-destination global shell and embedded `Spot > 夜空` return semantics.
- Include representative-gallery and guide-image load/error/credit behavior; photos remain authentic, unthemeable media inside observation-controlled black/warm-red chrome.
- Specify target-row focus, selection, stale/unavailable and screen-reader announcements.
- Fix My tab interaction: roving/selected focus as appropriate, no native scrollbar, exact focus restoration, enlarged-text 2×2 reading order.
- Add runnable or explicitly stateful labs for homepage-link add/edit/validate/copy/remove and import parse success/partial/unsupported/expired/private/rate/network/manual fallback/draft recovery/spot proposal.
- Replace the old accordion/disclosure filter lab with all options immediately visible. Preserve draft/apply/reset/cancel, single/multi selection, `全部无光害` exclusivity, empty result, focus trap/return and reduced motion.
- Preserve favorite rollback, media upload, moderation, offline and other unrelated laboratories.

### APP-07 — responsive/mode/state matrix

- Replace the standalone Night family with `观星点详情 > 夜空`; show exactly two global destinations.
- Add representative Spot, My/link/import and flat-filter specimens.
- Prove 320 / 375 / 430 CSS-pixel behavior plus enlarged text:
  - My tabs have no visible native horizontal scrollbar and reflow 2×2 when required;
  - the full flat filter Sheet uses one vertical scroll owner, no document-level horizontal overflow and keeps all terminal options reachable;
  - real photos preserve aspect ratio/crop/credit and do not force page overflow;
  - link/import forms keep labels, error text and 44px targets readable.
- Preserve day/night/observation color-mode, state, freshness, permission and offline matrices.

### APP-08 — semantic asset atlas

- Reconcile all global-nav examples to two destinations and all Night references to embedded Spot Night.
- Add semantic photographic-media policy with the three Round-002 Wikimedia Commons CC0 sources, their exact credit/license strings and the persistent `实拍代表媒体 · 非本点位现场` label.
- Distinguish authentic photographic pixels from Tier-B illustration; photos are not recolored and do not alter Tier-A/Tier-B authored-asset counts.
- Add neutral external-link icon usage for Xiaohongshu/Weibo/Channels/other platforms without reproducing logos or implying API entitlement.
- Add import/source/ownership/status icon semantics without decorative provider marks.
- Keep Tier-A and Tier-B counts, existing required subjects, variants, source identities and use/do-not-use guidance internally coherent.

## Mandatory cross-resource invariants

- `gpt-5.6-sol`, reasoning `xhigh`, session mode `design`, design system `user:soft-instruments`.
- Do not edit APP-01–04, MAP-01–04, the original proposals, Context, `DESIGN.md`, production code or tests.
- No standalone Night route, current/manual ordinary-place Night entry, three-item bottom nav, ambiguous `更多` filter entry, per-criterion dropdown/accordion, or visible native My-tab scrollbar remains.
- Exact MAP-R01 labels, group order, single/multi selection and draft/apply/cancel/reset meaning stay synchronized across APP-05–07 and all four map resources.
- No invented platform API, provider logo, exact-place photograph claim, exact astronomy truth or hidden automatic point creation.
- All final HTML is self-contained: no external script, stylesheet, font or image runtime dependency.
- All visible controls are at least 44×44 CSS pixels; state is not color-only; focus/reading order and reduced motion remain explicit.
- Observation-controlled UI stays black/warm-red; authentic photographs are an explicitly bounded unthemeable-media exception, never transformed by a whole-screen filter.

## Run completion report

Report, for each of the four files: byte count, SHA-256, modified/not-modified status, duplicate ID check, JS parse/runtime/console status, external dependency check, 320/375/430 document overflow result, sub-44px target result, exact changed requirement coverage and any remaining limitation. Provider self-check is not final selection or production acceptance.
