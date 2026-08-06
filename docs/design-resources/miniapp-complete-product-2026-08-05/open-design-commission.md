# Open Design Commission — 《今晚去观星》微信小程序全产品资源套件

Read and obey the project-bound design system `user:soft-instruments` before creating any style-bearing output. Its provider `DESIGN.md` is the exact visual source. Do not use the native Starward App system, inactive App/Admin targets, legacy exports, generic UI kits, remembered templates, or an improvised local token set.

Read `source-index.md` and `resource-coverage-and-selection.md` completely. They define product/technical scope, exact resource ownership, existing-covered Map artifacts, unresolved assumptions, and the pre-handoff stopping boundary. They are commission context, not a second design system.

## 1. Deliverable boundary

Create exactly these eight new self-contained review resources in the bounded Open Design project:

1. `app-flow-and-route-map.html`
2. `spot-detail-prototype.html`
3. `night-sky-prototype.html`
4. `my-content-prototype.html`
5. `shared-component-control-atlas.html`
6. `cross-app-interaction-motion-accessibility.html`
7. `responsive-mode-state-matrix.html`
8. `semantic-asset-atlas.html`

Do not recreate the four Map resources. Treat their exact current repository files and Source Index as existing-covered upstream inputs. Refer to their patterns and exact filter hierarchy where cross-app consistency requires it, but do not edit them in this run.

Do not create README prose, implementation handoff text, formal selected-source manifest, production code, Figma copy, screenshot pack, native app design, or admin-console design. The eight HTML resources themselves are the requested Open Design outputs.

Every file must:

- Preview directly with no build step.
- Use only inline/local HTML, CSS, JavaScript, and SVG; no remote font, script, stylesheet, API, tile, photo, or network dependency.
- Be clearly labelled `设计候选 · 示例数据 · 未选定` and avoid implying production/provider/legal acceptance.
- Use calm Chinese product copy, not raw implementation enums or error codes.
- Provide compact in-artifact navigation or inspection controls appropriate to its role.
- Preserve the exact day/night/observation system, dimensions, motion posture, and bounded semantic asset vocabulary.
- Expose assumptions/decision-required items at the point where a reviewer could otherwise mistake them for adopted truth.
- Sanity-check itself for syntax, overflow, duplicate IDs, broken controls, external requests, and observation-palette leakage before completion.

Primary generation model requested by the user: `gpt-5.6-sol`, reasoning `xhigh` (the highest reasoning option exposed by this Open Design installation). Session mode: design. Agent: Codex.

## 2. Shared product and visual invariants

- Fixed global destinations are `夜空 — 地图 — 我的`; Map is the proposed default and visually dominant central destination. It remains an unselected Product Surface candidate.
- Core task is find spot → decide tonight → inspect route/field/safety → external navigation → Night/sky map → manual observation mode.
- Spot/detail Night and top-level Night share one selected place/date/time/timezone context.
- Tonight states are `推荐 / 可考虑 / 不建议 / 数据不足`. Hard blockers cannot be averaged away.
- Missing is not zero. Estimated/sample/partial/stale/expired/unavailable data is explicit. Expired data cannot retain `推荐`.
- Data source/update/confidence/coverage remains discoverable; advanced evidence does not overwhelm the first-layer decision.
- Location permission is point-of-use; manual location remains available. No continuous location by default.
- Coordinates can be exact/approximate/restricted/hidden; navigation respects the state.
- Route handoff is external. Never depict in-Mini-Program turn-by-turn navigation or fabricate a route.
- Observation mode is manual, black + warm red only, low motion, no white/cool controlled UI or whole-screen filter, and warns before unthemeable vendor/system surfaces.
- Demo and commercial use the same base semantics. Commercial features are visibly gated variants, not silently present in Demo.
- `750rpx` reference, `8rpx` step, `32rpx` inset, `24rpx` compact inset, `40rpx` section gap, `24rpx` grid gap, `28rpx` card padding, `88rpx/44px` minimum hit target.
- Day canvas/surface/primary: `#F5F8FC / #FFFFFF / #1769D2`.
- Night canvas/surface/primary: `#050A14 / #0B1626 / #5AA7FF`.
- Observation canvas/surface/primary: `#000000 / #0B0101 / #FF514A`.
- Press start `<=100ms`; release/cancel `120ms`; state `160ms`; sheet `220ms`; mode `240ms`; reduced motion `0–100ms`.
- No glass/blur, broad glow, particles, spectacle gradients, whole-control pressed scaling, or decorative Tier-B inflation.

## 3. APP-01 — app-flow-and-route-map.html

Create an interactive/inspectable whole-product flow and route board, not a generic sitemap poster.

It must include:

- Global shell and route topology for every user-facing census row in `source-index.md §5`.
- Primary route tree, main package/subpackages, modal/sheet/common states, and origin/return ownership.
- The twelve flows listed in `resource-coverage-and-selection.md §4`, with branch points and recovery.
- Context payloads: selected spot, place, local date/time/timezone, target, mode, map restoration, auth return, draft submission/upload.
- Demo versus commercial gates and guest versus signed-in paths.
- Permission, offline/stale/partial, provider degradation, coordinate restriction/closure, upload/moderation, and external-vendor branches.
- Supporting admin boundary as a neutral dependency strip only; do not style an admin product.
- A coverage locator linking each route/flow to APP-02/03/04 and cross-cutting resources.

Use the adopted system visually, but prioritize topology clarity. Nodes must retain readable text at 320–430 review widths through an intentional overview/detail mechanism; do not shrink the whole board into illegibility.

## 4. APP-02 — spot-detail-prototype.html

Create a responsive, interactive, high-fidelity Spot family prototype.

Required structure:

- Mini Program/capsule-safe shell, fixed spot header, favorite/address/navigation, sticky `概览 / 场地 / 夜空 / 攻略`.
- Overview, Field, Sky, Guides as full segment specimens; Photos, Source, route/facility detail, article preview, and external-map chooser as reachable drilldowns/sheets.
- Stable scroll restoration, first-load per segment, independent error/retry, and date/time dynamic refresh without static-field reset.

Required visible states/interactions:

- All four TonightDecision states, hard blocker, confidence, best window, source/update.
- Route ready/cached/straight-line fallback/restricted/unavailable; facilities available/unavailable/unknown/seasonal.
- Closed/suspended/approximate/restricted spot; stale/partial/expired/sample/estimated states.
- Representative media with persistent example/pending/error/empty source posture.
- Favorite touch-down/cancel/commit, optimistic result, failure rollback.
- External-map chooser; observation-mode warning before vendor/system handoff.
- Day/night/observation consequences, reduced motion, enlarged text, 320/375/430 widths.

Do not duplicate the Map page, turn-by-turn navigation, or professional sky-map surface. Cross-link the selected spot/date/time to Night and describe preservation.

## 5. APP-03 — night-sky-prototype.html

Create a responsive, interactive, high-fidelity Night/astronomy prototype with internally consistent sample values.

Required reachable views:

- Night home.
- Location/date/time selector.
- Professional detail.
- Targets list.
- Simplified sky map.
- Sensor/manual-direction states.
- Observation-red mode.

Required behavior:

- Switch current/spot/manual place, accept/deny permission, change date/time, show timezone/cross-midnight ownership, and update every dependent specimen coherently.
- Expose all four decision states and best-window/reason/risk/source/update.
- Professional hourly matrix includes units, selected hour, legend, missing cell, partial hours, stale/unavailable/estimated/sample states.
- Target list includes search/filter/selected target, direction/altitude/window/difficulty and non-fabricated precision.
- Sky map includes direction ring, horizon, principal constellation lines, bright stars, planets, Moon, Milky Way center/region, selected target, legend, time slider, step/current-time, and textual summary.
- Sensor states: calibrated, low precision, unavailable, manual; no sensor is required to complete the task.
- Observation mode: manual enter/exit, essential-only information, offline/update age, weather-change alert, keep-awake notice, no auto media, external-vendor warning, black/warm-red closure.
- Day/night/observation preserve the same place/date/time/target. Reduced motion and enlarged text are inspectable.

This is not AR, a complete catalogue, a realtime forecast, or astronomical accuracy proof. Label every sample accordingly.

## 6. APP-04 — my-content-prototype.html

Create a responsive, interactive, high-fidelity My/user/content prototype.

Required reachable views:

- My home/profile in guest and signed-in states.
- Favorites list with sorting, medium spot cards, dynamic-summary failure, remove rollback.
- Lightweight observation plan and reminder/subscription state.
- Settings root plus modes, units, location/permissions, data source/update, notifications, privacy, cache, data/account, about/protocol/feedback.
- WeChat login rationale, consent, cancel/failure/success, originating-action resume.
- Article detail and source/verification labels.
- Submission hub/record and spot/correction/field report/article forms.
- Media choose/upload/progress/failure/retry/remove/reorder/caption/source/rights/EXIF GPS removal/moderation.
- Exact moderation-state progression and rejection/edit/resubmit/appeal where allowed.
- Destructive cache/account/data confirmation, progress, success, failure recovery.

Required variants:

- Demo official/whitelist posture versus commercial UGC/identity/reminder/personalization posture.
- Guest browse versus gated identity action.
- Permission denied/manual alternative.
- Empty/loading/partial/stale/offline/error.
- Day/night and only observation-safe settings/return surfaces; do not open bright media automatically in observation.
- Enlarged text, 320/375/430.

Do not create public comments/ratings, payment, complex collaboration, or admin moderation UI.

## 7. APP-05 — shared-component-control-atlas.html

Create a rigorous visual component/control atlas for every non-map family in `source-index.md §9`.

Each family must show:

- Anatomy labels and semantic slots.
- Exact token-based dimensions, padding, gaps, radius, typography, icon box, and 44px minimum hit region.
- Default/pressed/focus-visible/selected/disabled/loading/error and relevant semantic lifecycle variants.
- Day/night/observation treatment or explicit observation N/A.
- Enlarged-text and narrow-width behavior.
- Accessible name/read order and non-color cues.
- Owning prototype/page locators.
- Value provenance: exact Design Authority, product constraint, coherent candidate assumption, or decision-required.

Mandatory families are the twenty numbered groups in the Source Index. Use rendered controls, not prose-only cards, for geometry/state-bearing items. Reuse the established Map component grammar where the same family crosses Map and detail; do not fork tokens or rename the user’s exact filter taxonomy.

## 8. APP-06 — cross-app-interaction-motion-accessibility.html

Create a runnable interaction laboratory for every item in `resource-coverage-and-selection.md §7`.

For each lab show:

- Starting state, gesture/action owner, touch-down feedback, commit boundary, cancel/interruption, resulting state, focus/read-order consequence, motion timing/easing, reduced-motion substitute, and accessibility announcement/label.
- State/event log so reviewers can distinguish attempted action from committed action.
- Day/night/observation consequence when material.

Do not treat animation annotations as enough when a small local interaction can demonstrate the behavior. Do not require haptics for meaning.

## 9. APP-07 — responsive-mode-state-matrix.html

Create a compact but complete visual matrix for `resource-coverage-and-selection.md §8`.

It must:

- Use representative real page fragments from Global/Map/Spot/Night/My/Article/Form, not generic rectangles.
- Show 320/375/430 widths, capsule/top safe area, bottom safe area, default/enlarged text, portrait/short-height and explicit landscape support/constraint.
- Show same selected context across day/night/observation.
- Render the eight page states and seven freshness states with honest differentiated consequences.
- Include offline/provider degraded/restricted/closed/upload/moderation states.
- Annotate scroll ownership, sticky regions, bottom action behavior, wrapping/truncation rules, and minimum hit sizes.
- Have no document-level horizontal overflow; horizontal data/chip regions must expose intentional scroll ownership and reachable last items.

## 10. APP-08 — semantic-asset-atlas.html

Create a coherent semantic icon/asset atlas, not an illustration exploration.

Required:

- Tier-A icons for global nav; map/search/filter; route/facility; weather/astronomy; content/media; account/settings; feedback/status.
- Optical box, stroke/fill posture, baseline/alignment, sizes, hit boxes, selected/pressed/disabled/alert states, and day/night/observation versions.
- Exactly the eight allowed Tier-B subjects: four-point star, five-point star, tent, telescope, binoculars, camera, backpack, neutral avatar.
- For each Tier-B subject: allowed semantic purpose, size tiers, background/surface rules, empty/onboarding/feature use, and where it is forbidden.
- Observation assets use only black/warm-red authored pixels. No cool/white variant.

No additional decorative object, particle field, broad glow, copied logo, invented provider mark, real-place photograph, or generic 3D pack.

## 11. Cross-resource consistency checks

Before reporting completion, check all eight files together against the existing Map four-resource suite:

- Same global navigation labels/order/selected semantics.
- Same exact mode colors, spacing/hit/motion anchors, icon posture, and sample/unselected labelling.
- Same filter hierarchy wherever referenced.
- Same TonightDecision, freshness, facility, coordinate, route, source, moderation, and error language.
- Same selected spot/place/date/time/target ownership.
- Same external navigation and observation-vendor boundary.
- Same Demo/commercial and guest/auth gating.
- No one-off local tokens, conflicting values, duplicated sources of truth, or hidden unresolved assumption.

Report the exact created filenames, artifact byte sizes, and any unresolved limitation. Do not claim handoff readiness or adoption. Stop after the eight resources are complete and checked.
