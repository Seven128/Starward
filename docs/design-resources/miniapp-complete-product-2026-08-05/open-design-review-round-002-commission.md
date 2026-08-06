# Open Design Review Round 002 Commission

Intent: `exploration` within an ongoing pre-handoff audit loop. Revise the existing minimum-sufficient resources; do not create a second resource suite, formal handoff, implementation, design system, gallery-only summary or production claim.

## Mandatory inputs

Read completely before editing:

1. `C:/Dev/Starward/docs/design-resources/miniapp-complete-product-2026-08-05/review-delta-002-spot-detail-night-merge.md`
2. `C:/Dev/Starward/docs/design-resources/miniapp-complete-product-2026-08-05/review-delta-003-my-profile-content-import.md`
3. `C:/Dev/Starward/docs/design-resources/miniapp-map-page-2026-08-05/review-delta-001-filter-hierarchy.md`
4. `C:/Dev/Starward/docs/design-resources/miniapp-complete-product-2026-08-05/review-delta-004-map-filter-entry-flat-options.md`
5. The project-local `source-index.md`, `resource-coverage-and-selection.md` and existing HTML resources.
6. Bound design system `user:soft-instruments`; do not substitute or restate a generic system.

The original product and technical proposals are background product/technical Source and must remain unedited. The new delta files override them only for the named pending candidate conditions.

## Required resource revisions

Complete-product project:

- APP-01 `app-flow-and-route-map.html`: two-item `地图 / 我的` global navigation; no standalone Night route; ordinary place no longer enters Night; all spot-night drilldowns return to the same detail SkyContext; include external profile-link and external-post import journeys.
- APP-02 `spot-detail-prototype.html`: segment order `概览 / 攻略 / 场地 / 夜空`; overview begins with a real-photo representative-media gallery; Guide cards have image regions; Night includes a `今晚推荐观测目标` row; no action or copy enters a top-level Night page.
- APP-03 `night-sky-prototype.html`: keep the filename for stable resource identity, but make the product surface explicitly `观星点详情 > 夜空`; require `spot_id`; remove current/manual place selection and bottom-nav entry; keep professional data, targets, sky map, sensor/manual direction, date/time, observation-red, offline/freshness and safe-return detail.
- APP-04 `my-content-prototype.html`: repair the four-tab control with no native scrollbar; remove only the My-home plan card and official-example-article card; preserve Plan and article systems elsewhere; add profile-link editing and complete external-post import/edit/spot-association-or-proposal flow with honest capability/error states.
- APP-05 `shared-component-control-atlas.html`: revise global bottom nav; spot segments; representative photo gallery; guide-with-image; recommended-target row; no-scroll My tablist; profile-link editor/list; import-source/link/ownership/parser/draft/spot-association components.
- APP-06 `cross-app-interaction-motion-accessibility.html`: revise navigation/restoration; embedded spot-night drilldown; gallery/guide image behavior; My tab focus/scroll; link editing; import progress/failure/manual fallback/draft recovery; revise the filter laboratory from disclosure controls to always-visible grouped labels while preserving draft/apply/cancel/reset; keep existing favorite/upload/moderation/offline laboratories coherent.
- APP-07 `responsive-mode-state-matrix.html`: replace the standalone Night page family with `Spot Night`; update two-item bottom nav; show representative Spot/My/import/filter specimens; prove My tabs have no native horizontal scrollbar and the complete flat filter Sheet has no horizontal overflow at 320/375/430 and enlarged text; preserve day/night/observation, state and freshness matrices.
- APP-08 `semantic-asset-atlas.html`: keep Tier-A/Tier-B counts coherent; add photo/media provenance and external-platform neutral-link usage without fabricating provider logos; explain observation handling for controllable UI around photos and the unthemeable-photo boundary.

Map project:

- MAP-01 `index.html`: two-item `地图 / 我的` bottom navigation; remove top-level Night; ordinary POI search moves the map and offers nearby spot selection/add-spot proposal, not `查看此处夜空`; replace the ambiguous `更多` filter entry with an explicit Tier-A icon + `筛选` + selected-count control; keep quick summaries; render all MAP-R01 terminal options immediately in grouped flat layouts with no accordion/dropdown/chevron; preserve draft/apply/reset/cancel and 20 page scenarios.
- MAP-02 `page-anatomy.html`: update bottom-nav anatomy, ordinary-place branch, explicit filter entry, flat Sheet layout and scroll ownership while preserving 320/375/430, safe areas, z-order and gesture ownership.
- MAP-03 `component-control-atlas.html`: update bottom-nav variants, ordinary-place search action, explicit filter entry and grouped always-visible option anatomy; preserve all exact MAP-R01 labels, state geometry and minimum targets.
- MAP-04 `interaction-motion-accessibility.html`: update nav/focus/restoration and ordinary-place flow; remove disclosure/expanded state from filter labs; preserve filter draft/apply/reset/cancel, terminal selection, motion and accessibility labs.

## Real-photo sources

Use actual photographic pixels from these source pages, embedded locally or as data URIs so the final HTML has no runtime external dependency. Do not synthesize or redraw the photographs.

- `https://commons.wikimedia.org/wiki/File:Orion_constellation.jpg` — Taavi Niittee — CC0 1.0.
- `https://commons.wikimedia.org/wiki/File:Milky_Way_Night_Sky_(Unsplash).jpg` — Guillaume guillaume — CC0 1.0.
- `https://commons.wikimedia.org/wiki/File:Star_trails_(33247004142).jpg` — hannahisabelnic — CC0 1.0.

Show source/credit/license and `实拍代表媒体 · 非本点位现场` in the UI. If a download cannot be verified, do not replace it with generated pixels; keep an explicit unavailable photo state and report the limitation.

## Non-negotiable checks

- `gpt-5.6-sol` with `xhigh`; session mode `design`; bound designSystemId remains `user:soft-instruments`.
- No edits outside the explicitly named HTML resources and provider artifact metadata automatically owned by Open Design.
- No original-plan, Context, `DESIGN.md`, Contract, production-code or test edits.
- No external script/style/font/image dependency in final HTML; real photos must be embedded.
- No provider logos, fabricated API entitlement, exact-place claim, invented astronomy truth or hidden automatic spot creation.
- No visible native scrollbar on the My four-tab control; no document-level horizontal overflow.
- The map exposes a literal `筛选` entry with current selected count; the filter Sheet shows all 27 terminal labels without accordion/dropdown controls.
- All visible interactive targets are at least 44×44 CSS pixels, with valid focus, selected/expanded/error semantics and non-color cues.
- Observation-controlled surfaces remain black/warm-red; photographs keep authentic pixels and are explicitly treated as unthemeable media, not recolored by a whole-screen filter.
- MAP-R01 exact filter taxonomy and interactions do not regress.

## Audit output

For every changed file report exact byte count, SHA-256, runtime/console status, duplicate IDs, external dependencies, document overflow at 320/375/430, sub-44px targets, and the exact requirement checks above. These are candidate sanity checks, not selection, handoff readiness or production acceptance.
