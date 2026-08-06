# Complete Mini Program Resource Coverage and Selection

Status: task-local resource-selection decision for the pre-handoff audit candidate. It is not a formal handoff manifest and does not adopt any resource.

## 1. Minimum-sufficient interpretation

“Minimum” constrains duplicate artifact count, not UI/UX information granularity. For this greenfield Mini Program, sufficiency means that a reviewer can inspect every material page family, control family, state, branch, interaction, motion, responsive, accessibility, privacy, provenance, Demo/commercial, and degradation decision without asking implementation to invent it.

One interactive prototype cannot efficiently expose all component anatomy and all uncommon states. One static page per route would duplicate shell, modes, components, and state facts. The selected package therefore uses:

- Page-family prototypes for real hierarchy, task flow, visual fidelity, and interactive outcomes.
- One global flow/route board for topology and cross-family branches.
- One grouped shared component/control atlas for exact reusable anatomy and states.
- One grouped interaction/motion/accessibility laboratory for behavior that screenshots cannot prove.
- One responsive/mode/state matrix for cross-cutting conditions that would otherwise be sampled inconsistently.
- One semantic asset atlas for the bounded adopted icon/subject vocabulary.
- The four already-complete map resources as existing-covered inputs rather than a duplicate map regeneration.

This yields twelve review artifacts in total: four retained map resources plus eight new whole-product resources.

## 2. Selected resource set

| ID | Canonical filename | Disposition | Purpose |
| --- | --- | --- | --- |
| MAP-01 | `../miniapp-map-page-2026-08-05/index.html` | existing-covered | Interactive high-fidelity Map page, search/filter/layer/marker/card/route/permission/degradation scenarios |
| MAP-02 | `../miniapp-map-page-2026-08-05/page-anatomy.html` | existing-covered | Map anatomy, z-order, safe areas, 320/375/430, gesture ownership |
| MAP-03 | `../miniapp-map-page-2026-08-05/component-control-atlas.html` | existing-covered | Map-specific components, controls, measurements, variants, filter hierarchy |
| MAP-04 | `../miniapp-map-page-2026-08-05/interaction-motion-accessibility.html` | existing-covered | Map interaction, motion, focus, restoration, accessibility laboratory |
| APP-01 | `app-flow-and-route-map.html` | new | Whole-product IA, global shell, route topology, context propagation, user journeys, failure/recovery branches, Demo/commercial gates |
| APP-02 | `spot-detail-prototype.html` | new | Interactive high-fidelity spot shell plus Overview/Field/Sky/Guide/Photos/Source/route-facility/external-map states |
| APP-03 | `night-sky-prototype.html` | new | Interactive high-fidelity Night, professional data, target list, simplified sky map, sensor/manual, observation-red, location/date/time |
| APP-04 | `my-content-prototype.html` | new | Interactive high-fidelity My, favorites, plan, profile, settings, auth, articles, submissions/corrections/media/moderation states |
| APP-05 | `shared-component-control-atlas.html` | new | Exact non-map app-specific components/controls, dimensions, variants, copy, state feedback, mode and accessibility mapping |
| APP-06 | `cross-app-interaction-motion-accessibility.html` | new | Global navigation, drilldown/back/focus, sticky segments, shared context, date/time, sky gestures, mode transitions, forms/uploads, reduced motion |
| APP-07 | `responsive-mode-state-matrix.html` | new | 320/375/430, capsule/safe areas, enlarged text, portrait/short-height/landscape, day/night/observation, page/freshness/error/offline conditions |
| APP-08 | `semantic-asset-atlas.html` | new | Tier-A icon family and the eight allowed Tier-B subjects, exact sizes/states/modes/usage and prohibited substitutions |

All eight new resources must be self-contained HTML/CSS/JavaScript/SVG with no build step or network dependency. Open Design may use local generated media only when it is semantically required and persistently labelled; no real-place simulation is needed.

## 3. Surface-to-resource coverage

Legend: `P` primary complete specimen, `D` detailed reusable definition, `X` cross-cutting rule/state, `E` existing-covered, `—` not an owner.

| Surface family | MAP | APP-01 | APP-02 | APP-03 | APP-04 | APP-05 | APP-06 | APP-07 | APP-08 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Global shell/nav/context | E | P | X | X | X | D | P | X | D |
| Map/search/filter/layer/card/route | E | X | X | X | X | X | X | X | X |
| Spot shell/Overview | X | X | P | — | X | D | X | X | D |
| Spot Field | X | X | P | — | — | D | X | X | D |
| Spot Sky/Guide/Photos/Source | X | X | P | X | X | D | X | X | D |
| Night home/context picker | X | X | X | P | X | D | X | X | D |
| Professional astronomy data | — | X | X | P | — | D | X | X | D |
| Target list/sky map/sensor | — | X | X | P | — | D | P | X | D |
| Observation-red mode | X | X | X | P | X | D | P | P | D |
| My/profile/favorites/plan | X | X | X | X | P | D | X | X | D |
| Settings/auth/permissions/privacy | X | X | — | X | P | D | P | X | D |
| Article/gallery | — | X | X | — | P | D | X | X | D |
| Submission/correction/media/moderation | — | X | X | — | P | D | P | X | D |
| Common loading/empty/partial/stale/offline/error | E | X | P | P | P | D | X | P | — |
| Demo/commercial gating | E | P | X | X | P | D | X | X | — |

## 4. Flow and branch coverage

APP-01 must explicitly show these journeys and branch points:

1. Map browse → spot selection → detail → tonight/field evidence → external navigation → return restoration.
2. Map ordinary-place search → move region → `查看此处夜空` → Night with manual place context.
3. Spot detail → Night carrying spot/date/time → target → sky map → observation mode → safe exit.
4. Bottom-nav Night → location permission accepted/denied/manual → date/time → pro data/sky map.
5. Favorite from map/detail → My favorites → sort/open/unfavorite failure rollback.
6. Guest browse → identity-required action → WeChat login cancel/fail/succeed → resume action.
7. Article/guide → related spot → detail; source and verification remain visible.
8. Commercial submission/correction → draft → media upload → submit → moderation states → edit/resubmit/appeal where allowed.
9. Reminder subscription → explanation → WeChat subscription accepted/declined/expired → settings.
10. Partial/stale/offline/provider-degraded data → usable cache/limitations/retry without losing context.
11. Restricted/approximate/closed spot → withheld navigation, safe explanation, alternate action.
12. Mode switch day/night/observation → preserve route/context/safe work; warn before unthemeable external surface.

## 5. Prototype specimen obligations

### APP-02 Spot detail

Reachable specimens:

- Overview default, recommendation/consider/not-recommended/data-insufficient, hard blocker, stale/partial/expired.
- Field arrival/parking/facilities/environment/safety; unknown/seasonal/restricted/closed.
- Sky summary and shared-context link to Night.
- Guides with official/verified/user provenance; article drilldown placeholder.
- Photos/gallery with authentic-placeholder/example/pending/error/empty.
- Source/provenance detail.
- Route/facility detail and cached-route/straight-line/restricted states.
- Favorite optimistic success/failure rollback.
- Segment first-load/independent-error/retry and scroll restoration.
- External-map chooser and observation-vendor warning.

### APP-03 Night/sky

Reachable specimens:

- Current/spot/manual location, permission denied, date/time/timezone/cross-midnight.
- Night conclusion and best window in all four decision states.
- Professional hourly matrix: ready, missing cell, partial hours, stale, unavailable, estimated/sample.
- Target list/search/filter/selected target.
- Sky map with time scrubber, target selection, sensor calibrated/low precision/unavailable/manual.
- Observation-red enter/exit, offline cache/update age, weather-change alert, keep-awake, vendor warning.
- Reduced motion and enlarged text.

### APP-04 My/content

Reachable specimens:

- My/profile guest and signed-in, Demo and commercial sections.
- Favorites sort, card density, dynamic-summary failure, optimistic removal rollback.
- Lightweight plan and reminder state.
- Settings root and every named settings family.
- Permission state and system-settings/manual fallback.
- Login value/cancel/failure/success/resume.
- Article detail and source labels.
- Submission hub and exact moderation state progression.
- Spot/correction/field report/article form, validation, draft, coordinate sensitivity, source/rights.
- Media choose/upload/progress/failure/retry/remove/reorder/EXIF GPS notice/moderation.
- Destructive cache/account/data actions and recovery.

## 6. Shared component atlas obligations

APP-05 owns exact reusable definitions for all twenty families in `source-index.md §9`. Each family must expose:

- Anatomy and semantic slots.
- Exact or design-token-derived geometry and spacing.
- Default, pressed, focus-visible, disabled, loading, selected, error, and relevant lifecycle variants.
- Day, night, and observation disposition (`N/A` when deliberately forbidden).
- Minimum hit region and enlarged-text behavior.
- Accessible name/read order and non-color cues.
- Which page prototypes instantiate it.
- Whether the value is exact authority, product constraint, coherent candidate assumption, or decision-required.

The atlas cannot replace a component with prose only when its geometry/state is visually material.

## 7. Cross-cutting interaction obligations

APP-06 must include runnable or inspectable laboratories for:

- Global tab switch and detail return restoration.
- Sticky segment scroll/focus ownership and interrupted load/retry.
- Touch-down → drag-away/cancel → valid release → disabled-before-release.
- Favorite optimistic change and rollback.
- Location/date/time edit → dependent refresh with static-content stability.
- Time slider scrubbing, step/current-time, sensor/manual retargeting.
- Observation enter/exit, reduced motion, external-vendor warning.
- Bottom sheet/dialog interrupt/retarget, focus trap and focus return.
- Settings/form validation, unsaved change, destructive confirmation.
- Media upload session, retry/remove/reorder, background/foreground/resume consequence.
- Submission/moderation state transition and edit/resubmit.
- Offline → reconnect/background refresh without geometry/focus loss.

## 8. Cross-cutting matrix obligations

APP-07 must make the following combinations inspectable without claiming exhaustive production proof:

- Widths 320/375/430 for the global shell and representative Map/Spot/Night/My/content/form pages.
- WeChat capsule/top safe area and bottom safe area.
- Default and enlarged Chinese text.
- Portrait, short-height, and the supported/constrained landscape posture for sky map/data/observation.
- Day/night/observation mode with same selected context.
- INITIAL/LOADING/READY/EMPTY/PARTIAL/STALE/ERROR/PERMISSION_DENIED.
- FRESH/STALE_USABLE/PARTIAL/EXPIRED/UNAVAILABLE/ESTIMATED/SAMPLE_DATA.
- Offline/cache-only, provider degraded, restricted coordinate, closed spot, upload pending/failure, moderation pending/rejected.
- Scroll ownership, sticky regions, bottom actions, and no document-level horizontal overflow.

## 9. Asset atlas obligations

APP-08 must define one coherent semantic family, not an illustration moodboard:

- Tier-A icons grouped by navigation, map/search/filter, facility/route, weather/astronomy, content/media, account/settings, feedback/status.
- Default/selected/pressed/disabled/alert and day/night/observation consequences.
- Optical box, stroke/fill posture, minimum glyph and hit geometry, alignment and badge rules.
- The only Tier-B subjects: four-point star, five-point star, tent, telescope, binoculars, camera, backpack, neutral avatar.
- Allowed use, scale tiers, empty/onboarding/feature contexts, mode treatment, and cases where Tier-B is forbidden.
- No broad glow, particles, unrelated 3D object vocabulary, real-place photography, provider logo fabrication, or cool/white observation asset.

## 10. Resources considered but not selected

| Considered resource | Disposition | Reason |
| --- | --- | --- |
| One screenshot per route/state | not-needed | Duplicate shell and tokens; weak on behavior and shared component truth |
| One monolithic all-app prototype only | insufficient alone | Cannot expose every component/state/measurement/accessibility fact without becoming unreadable |
| Separate low-fi wireframe for every page | not-needed | APP-01 topology plus annotated high-fidelity prototypes cover hierarchy without a competing fidelity representation |
| Standalone page-anatomy board per non-map page | grouped | APP-07 carries representative anatomy and responsive rules; unique page hierarchy stays in prototypes |
| Separate state atlas for each page | grouped | APP-07 and APP-05 centralize shared state consequences; prototypes instantiate page-unique ones |
| Figma duplicate | not-needed before selection | No collaboration/library requirement justifies a second representation at this audit checkpoint |
| Production photo pack | unavailable/not-needed | No licensed exact spot media supplied; use persistent, honest placeholders/examples |
| Full 3D illustration pack | prohibited | Adopted asset vocabulary is bounded and product is data-first |
| Operations/admin high-fidelity UI | deferred, separate authority required | Mini Program DS is not a desktop admin authority |
| Formal handoff text/manifest | explicitly deferred | User requested every Open Design resource except handoff, then an audit pause |

## 11. Completion condition

The suite is complete for this checkpoint only when:

1. All eight new files exist as Open Design artifacts and the four map files remain exact.
2. Every census row has an owner in this matrix and every prototype/atlas obligation is visibly present.
3. All twelve render; interactive controls work; no obvious runtime/console failure, duplicate DOM ID, external dependency, corrupt asset, or unbounded overflow remains.
4. Shared navigation, state names, modes, tokens, selected spot/SkyContext, freshness, moderation, and copy do not conflict across artifacts.
5. Observation-controlled UI remains black/warm-red and has no white/cool authored output.
6. Open Design project/conversation/run/file identities and hashes are indexed.
7. No formal handoff text, source-plan reconciliation, Context/Design Authority adoption, or production implementation has occurred.

At that point, stop for human audit.

## 12. Checkpoint result

All seven completion conditions above are satisfied on the exact current resource hashes recorded in `source-index.md` §19:

- Eight complete-product Open Design HTML resources and four map HTML resources form the selected twelve-resource audit set.
- The 43 surface/route entries, 12 journeys, 20 component families, 16 interaction labs, 211,680 responsive/mode/state dispositions, 35 Tier-A symbols, eight Tier-B subjects, 20 map scenarios and all 36 revised map-filter labels are visibly covered.
- Independent Browser checks passed 320/375/430, enlarged text, interaction/focus recovery, observation palette closure, target sizing, duplicate-ID, external-dependency, console-error and overflow checks.
- No handoff text, original-plan reconciliation, Design Authority/Context adoption or product implementation was performed.

The workflow is therefore paused at the requested human-audit boundary. Selection, requirement changes and any later handoff remain pending user review.

## 13. Final selected suite — supersedes the checkpoint result

After §12, the owner reviewed the resources, changed the map filter, spot-detail/night and My/content requirements, then explicitly authorized DRA to regenerate affected resources and continue through full selection, proposal reconciliation and handoff. The pause and “pending” statements in §§10–12 are historical.

The minimum-sufficient selected suite remains twelve resources, but the selected bytes are the final versions listed in `source-index.md` §20:

- APP-01—APP-04 own page topology, spot detail, spot-scoped Night and My/content-import flows.
- APP-05—APP-08 own shared controls, cross-app interactions, condition/state matrices and semantic/media assets.
- MAP-01—MAP-04 own the complete map-page prototype, anatomy, control states and interaction/accessibility behavior.

Final delta closure:

- MAP: Tier-A “筛选” entry with applied count; three grouped sections and 27 always-visible option labels; no dropdown/accordion; draft/apply/cancel/reset/empty semantics.
- Spot: representative real-star-photo media first in Overview; Guide second with image area; then Field and Night.
- Night: removed as a global page family and owned only by a formal spot detail with `spot_id`; tonight-target examples and astronomy/timezone/data boundaries are explicit.
- My: four equal tabs without native scrollbar, 2×2 under enlarged text; home summary/example removals are scoped; personal links and editable own-post import preserve capability, rights, spot-association/proposal and moderation boundaries.

Independent current-snapshot QA covers 12 resources × 320/375/430 px, enlarged text and the material interaction paths. It reports zero document overflow, duplicate IDs, external runtime dependencies, broken images, visible sub-44px targets and console errors. Provider generation and repair runs all reached successful terminal state on the selected bytes.

The immutable resource package is `../miniapp-selected-source-2026-08-06-v1/`. The published handoff is `../miniapp-selected-handoff-2026-08-06/miniapp-complete-product-selected-v1.md`; formal preflight passed with zero blockers. The handoff accurately treats the suite as a `reference + constraint` source and preserves production-runtime, external-platform, real-place and astronomy truth as downstream obligations rather than design claims.
