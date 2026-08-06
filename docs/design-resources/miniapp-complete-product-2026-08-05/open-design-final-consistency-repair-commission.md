# Open Design final consistency repair commission

## Purpose

Perform one bounded final repair on the already-generated complete-product suite. The accepted product meaning is unchanged. This pass only removes three cross-resource inconsistencies found by independent review after Round 003.

Use the existing Open Design project and conversation:

- project: `starward-miniapp-complete-product-2026-08-05`
- conversation: `92c8ae92-241e-492a-95f7-d0666ce30e3d`
- design system: `user:soft-instruments`
- agent/model/reasoning: `codex` / `gpt-5.6-sol` / `xhigh`
- mode: design

Read completely before editing:

- `C:/Dev/Starward/DESIGN.md`
- `C:/Dev/Starward/docs/design-resources/miniapp-complete-product-2026-08-05/finalization-directive-2026-08-06.md`
- all four accepted delta files in this complete-product directory and the map directory
- the current APP-01 through APP-08 resources
- the current MAP-01 through MAP-04 resources
- both current V2 plan candidates in `C:/Users/777/Downloads/`

## Allowed files

Only the following provider-managed HTML resources and their Open Design-maintained artifact metadata may change:

- `app-flow-and-route-map.html`
- `spot-detail-prototype.html`
- `night-sky-prototype.html`
- `my-content-prototype.html`
- `shared-component-control-atlas.html`
- `cross-app-interaction-motion-accessibility.html`

Do not modify APP-07, APP-08, any map resource, either plan, `DESIGN.md`, `project_context/**`, production code, tests, repository indexes, or any handoff resource.

## Required repairs

### 1. APP-01 segment-order wording

The Spot segment order is already correct in the route table: `概览 / 攻略 / 场地 / 夜空`. Replace the stale APP-02 coverage-summary wording `概览/场地/夜空/攻略` with that same fixed order. Do not change route ownership or route counts.

### 2. Recommended-target example coherence

The accepted requirement names five examples for the `今晚推荐观测目标` row: `猎户座`, `木星`, `金星`, `流星雨`, `双星伴月`. These are examples, not a claim that any target is visible tonight.

Make the following resources coherent:

- APP-02: the visible recommended-target row contains all five examples, each with an explicit computed/estimated/unavailable/data-insufficient posture and the existing `spot_id + local date/time + timezone` caveat.
- APP-03: its target catalogue makes all five examples inspectable, while retaining existing targets and the persistent sample/non-precision warning. Do not fabricate astronomy results.
- APP-05: the reusable recommended-target component study contains all five explicit rows rather than mentioning `金星` only inside another row's prose.
- APP-06: the interaction laboratory contains all five explicit options and keeps selection/freshness/focus behavior unchanged.

Do not delete the existing galaxy, seasonal-triangle, Saturn, Moon, or other legitimate prototype examples. This repair adds coherent coverage; it does not redefine the target algorithm.

### 3. APP-04 My-home product surface

The My home correctly removed the old observation-plan summary card and official-example-article card, but it currently inserts a replacement in-device card named `首页精简说明`. Remove that explanatory card from the product-phone surface. If the removal needs to remain documented, place it only in review chrome/annotation outside the simulated product viewport. Keep the top-level `计划` tab and the article/guide system elsewhere exactly as designed.

## Preservation requirements

- Global navigation remains exactly `地图 / 我的`; Night remains owned by a formal Spot detail and required `spot_id`.
- APP-02 order remains `概览 / 攻略 / 场地 / 夜空`; overview begins with the real-photo representative gallery and Guide keeps its image area.
- APP-04 retains four equal tabs without a native scrollbar and 2x2 enlarged-text reflow.
- Profile links, import-source/rights, manual fallback, editable draft, formal-Spot association/new-Spot proposal, moderation, focus restoration, and capability gates remain intact.
- MAP-R01/R02, all 27 terminal labels, the explicit `筛选` entry and flat/no-dropdown behavior remain unchanged.
- Existing real-photo pixels, credits, licenses, sources, design tokens, observation-palette rules and no-external-runtime-dependency rule remain intact.

## Verification and completion report

After edits, independently verify all six allowed resources at 320, 375 and 430 CSS px, plus the affected enlarged-text states. Report:

- bytes and SHA-256 for every changed file;
- HTML/runtime/console status;
- duplicate IDs, external runtime dependencies, horizontal overflow and visible targets below 44x44;
- exact presence of the five recommended-target example names in APP-02/03/05/06;
- absence of `概览/场地/夜空/攻略` in APP-01;
- absence of the `首页精简说明` card from APP-04's product viewport;
- preservation of the critical flows listed above.

Do not generate a handoff and do not stop with unfinished work.
