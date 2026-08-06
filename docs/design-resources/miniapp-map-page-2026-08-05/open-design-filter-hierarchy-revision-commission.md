# Open Design revision commission · MAP-R01

## Mission

Revise the existing Mini Program map-page candidate in place so the complete retained four-resource suite expresses `review-delta-001-filter-hierarchy.md`. This is a review iteration, not a final selection or implementation handoff.

Use only `gpt-5.6-sol` with `xhigh` reasoning and the already bound Open Design design system `user:soft-instruments`. Preserve the project identity `starward-miniapp-map-page-2026-08-05` and all unaffected product/design behavior.

## Files that must be revised

Edit exactly these four existing generated resources:

1. `index.html`
2. `page-anatomy.html`
3. `component-control-atlas.html`
4. `interaction-motion-accessibility.html`

Do not create or edit a handoff, manifest, gallery, extra prototype, low-fidelity duplicate, design-system file, product proposal, technical proposal, Context, production code or test.

## Required source reading

Before editing, read completely:

- `review-delta-001-filter-hierarchy.md` — controlling pending change for this revision.
- `source-index.md` — original product/technical/design-system constraints and prior review record.
- `open-design-handoff-coverage-commission.md` — retained four-resource responsibilities and original coverage.
- `open-design-precision-repair-commission.md`, `open-design-overflow-repair-commission.md`, and `open-design-scrollbar-polish-commission.md` — fixes that must not regress.
- the current four HTML resources — editable baseline and only candidate family.

The delta overrides the original filter taxonomy only in its explicitly named scope. It does not authorize global text replacement or any other product change.

## One shared filter model

Implement one consistent, data-driven filter taxonomy in every interactive resource and derive all filter labels, selection summaries and counts from it. Do not maintain a second hard-coded copy that can drift.

Required structure and exact visible order:

```text
观星条件
  光害等级
    2级以下
    3级以下
    4级以下
    5级以下
    6级以下
  遮挡
    遮挡面积 50% 以下
    遮挡面积 30% 以下
    无遮挡
  光害方向
    全部无光害
    西边无光害
    东北无光害

观测点
  驾车时间
    2小时内
    4小时内
    6小时内
  行程信息
    驾车直达
    公共交通
    不要徒步
    不要登山
  海拔
    1000米以下
    2000米以下
    3000米以下
    4000米以下
    6000米以下

场地信息
  有停车
  有厕所
  可充电
  能露营
```

Selection rules for this candidate:

- single-choice and deselectable within `光害等级`、`遮挡`、`光害方向`、`驾车时间`、`海拔`;
- multi-select within `行程信息` and `场地信息`;
- `全部无光害` excludes the directional alternatives;
- only terminal values count as active filters;
- only one expandable criterion is open at a time across the Sheet; selected values survive collapse and stay visible in the parent summary;
- expansion does not commit or request data;
- Apply commits the current draft once; close/back/cancel discards the draft; Reset clears the draft and awaits Apply.

## Per-resource obligations

### `index.html`

- Replace the current flat filter Sheet with the exact three-group hierarchy and working disclosure controls.
- Make every first-level disclosure actually open/close its own inline second-level region. Expose `aria-expanded`, `aria-controls`, readable selected summaries and selected terminal states.
- Use a stable Sheet draft separate from committed filter state. Exercise Apply, Reset, close/cancel, reopen, visual-mode change and detail-return restoration without losing committed values or leaking cancelled drafts.
- The selected count counts terminal criteria. Quick filter chips outside the Sheet must reflect the new categories/active values rather than the retired filter-parent labels.
- Applying a changed filter set produces an honest local review consequence without pretending a live service: preserve the existing sample-data label and distinguish filtered no-results from data empty/degraded states.
- Preserve all 20 existing page scenarios, search, layers, location, markers/clusters, card, favorite, route, navigation, mode switching, reduced motion and large-text behavior.
- Do not globally remove map-card tonight status, spot light-pollution summary, driving-time metrics or the independent layer Sheet.

### `page-anatomy.html`

- Update all 320/375/430 phone frames and annotations that show filter chips or filter-sheet pressure. Remove retired filter-taxonomy labels from those regions.
- Add a compact but explicit Sheet anatomy showing section heading, expandable parent, inline child region, selected summary, terminal target, selection count, Reset/Apply and owned vertical scrolling.
- Specify large-text wrapping, 88rpx targets, safe-area/capsule, z-order, map-versus-Sheet gesture ownership, sticky actions and no document-level horizontal overflow.
- Keep existing page anatomy, map/card/navigation relationships and exact three-mode token board.

### `component-control-atlas.html`

- Replace the current group 02 filter specimen with a complete inspectable hierarchy, not a representative subset.
- Show at least: collapsed parent; expanded parent; selected single-choice child; selected multi-choice children; focused parent; disabled/unavailable terminal example; selection summary; count; Reset; Apply; cancel/close semantics; large-text behavior.
- Every one of the 27 requested visible terminal labels must be present in one canonical full inventory. A duplicated state specimen is allowed only when explicitly annotated and derived from that same model rather than becoming another label source. All values must remain reachable at 320/375/430.
- Parent and child targets are at least 44 CSS px; no whole-control pressed scale; long tags wrap inside their owned grid/row rather than clipping. Any horizontal quick strip remains truly scrollable with suppressed native scrollbar chrome and keyboard/pointer/touch reachability.
- Preserve the other eleven component groups and all exact design-system mode tokens.

### `interaction-motion-accessibility.html`

- Extend the filter flow and state lab to cover: open → expand parent → choose/change/deselect child → collapse with summary → switch parent → multi-select → Reset draft → Cancel discard → Apply commit → reopen restoration.
- Distinguish presentation `expandedCriterion`, `draftFilters` and committed `filters`; Apply is the only commit/request boundary.
- Demonstrate press-in, valid release, drag-away/cancel, disable-before-release, rapid retap without duplicate commit, focus entry/return and screen-reader expanded/selected/value semantics.
- Specify one scroll owner at a time: Sheet content owns vertical scroll, expandable rows own taps, map keeps pan/pinch outside the active overlay, and sticky actions remain reachable.
- Preserve mode/state continuity, 220ms interruptible Sheet behavior, 160ms content swap, reduced-motion substitution and all existing map/card/route/search/detail-return invariants.

## Visual and semantic constraints

- Use the exact independent Mini Program day/night/observation token tables already present. Observation remains black/warm-red only; no whole-screen filter.
- Keep the native Mini Program Chinese font stack, quiet solid surfaces, no broad blur, no Tier-B decoration, no extra dominant primary action and no nested elevation.
- Use user-facing language. Light-pollution levels are `产品估算等级`; never claim measured Bortle truth. Obstruction percentage and directional light pollution remain candidate semantics; do not invent an algorithm, source or precision.
- The filter Sheet may state a concise estimate/source limitation, but must not turn into a technical specification panel.
- No external script/style/font/image/network dependency and no realistic coordinates.

## Self-check before finishing

1. Confirm only the four commissioned HTML files changed.
2. Confirm all group/parent/child labels and order match the delta.
3. Confirm the old group names `今晚条件`、`到达与设施`、`辅助图层` do not remain inside the filter Sheet or filter specimens.
4. Confirm old parent labels `今晚可考虑`、`光害较低`、`适合摄影` do not remain as filter parents, while legitimate map-card/layer meanings are preserved.
5. Exercise Apply/Cancel/Reset/reopen, single/multi selection, one-open-parent behavior, count and summaries.
6. Inspect 320/375/430, large text, day/night/observation and reduced motion for clipping, scroll ownership, 44px targets and focus.
7. Confirm no console/runtime error, external reference, whole-control pressed scale, duplicate DOM ID or invented real data.

Finish only when the complete four-resource suite is internally consistent and ready for another human audit. Do not write a handoff or call the candidate selected.
