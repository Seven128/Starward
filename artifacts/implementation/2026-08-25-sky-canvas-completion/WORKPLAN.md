# Sky Canvas completion workplan

Status: active implementation index for the current Goal. This file is disposable task evidence, not Context, Design Authority, product Source, or acceptance proof.

## 1. Authority index

- `A1` product and technical solution: `docs/architecture/wechat-miniapp-product-technical-solution.md`
- `A2` human implementation handoff: `docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/implementation-handoff.md`
- `A3` machine-readable frame/component/state mapping: `docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-source/implementation-handoff-spec.json`
- `A4` selected Mini Program handoff: `docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-handoff/miniapp-sky-canvas-current.md`
- `A5` selected Operations handoff: `docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-handoff/operations-sky-canvas-current.md`
- `A6` current DRA closure: `docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/current-dra-iteration.md`
- `A7` canonical interactive resource: selected-source entries served at `http://127.0.0.1:8765/index.html`
- `A8` exact design-system authority: `DESIGN.md#wechat-mini-program--sky-canvas-v1`
- `A9` durable product/architecture/state/verification authority: `project_context/**`, especially `global.md`, `architecture.md`, `development-workflow.md`, `areas/main.md`, `screen-contracts/wechat-miniapp.md`, `screen-contracts/operations.md`, and `verification/acceptance-runtime.md`
- `A10` interaction/accessibility implementation companion: `.codex/skills/uiux_design/SKILL.md`
- `A11` current audit findings: `artifacts/design-audit/2026-08-25-sky-canvas/REPORT.md`
- `A12` current reference/implementation comparisons: `artifacts/design-audit/2026-08-25-sky-canvas/{reference,implementation,comparison}/`
- `A13` this execution index and Architecture Deliberation: this file
- `A14` final current-candidate evidence: `artifacts/implementation/2026-08-25-sky-canvas-completion/evidence/`
- `A15` user hard requirement added during execution: every user-visible capability uses production owners, real persistence, real authorization and real failure/recovery. Sample, fixture, mock, demo, process-memory success, screenshot-only branches, and hard-coded design values are forbidden in non-test success paths.

Authority precedence is `A1/A9 product + technical semantics -> A8 exact visual tokens -> A2-A6 composition/state constraints -> production owners -> current-candidate runtime evidence`. The selected handoffs are constraints, not formal exact-targets. Pixel-level implementation is therefore judged by same-state, same-viewport screenshot comparison while retaining that classification.

## 2. Architecture Deliberation

### Affected owners and current extension points

- Mini Program visual projection: `apps/wechat-miniapp/src/styles/tokens.scss`, `src/app.scss`, and mode-aware native chrome.
- Shared Mini Program UI: `src/components/**`, especially semantic assets, notification/status recovery, Finder Sheet, source-lift, marker/callout, navigation and favorite feedback.
- Mini Program route owners: Map, Spot Detail, Spot Night/Astronomy, Orientation, My, Plan, Settings and Contribution under the owners named by `A3`.
- Coordinated state/network: `src/state/app-store.ts`, `src/services/api-client.ts`, `src/hooks/use-resource-query.ts`; no page-local second domain truth.
- Domain/API truth: `packages/miniapp-contracts/**` and `workers/miniapp-api/**` through typed controllers, services, Ports/Adapters, Postgres/PostGIS repositories, Redis/cache, media object-store boundary and outbox.
- Operations: `apps/admin-web/src/app/page.tsx` and `styles.css`, consuming authenticated `/v2/admin/**` services; client state never substitutes for receipts/readback.

### Dependency, state and lifecycle boundaries

- One formal spot, one Observation Context, one committed selected time, one favorite relation and one filter truth feed every consumer.
- Preview state may be transient and interruptible; domain state commits once with expected revision/idempotency and restores safely after cancel/conflict/failure.
- Orientation changes presentation only, never astronomy facts or committed time; permission/capability/quality and listener teardown remain platform-owned.
- Draft, upload, submission, moderation, canonical merge, publication assessment and publication lifecycle remain separate durable records and transactions.
- A production startup must never select fixture data after provider/storage failure. It shows attributable partial/stale/unavailable state instead.
- Real local verification data must be created through production API/UI paths into Postgres/object-store boundaries and read back after service restart. It is test-run data, not compiled fixture/sample content.
- Candidate enrichment must be achievable through the authenticated admin API itself. Route evidence and every referenced source remain owned by the same PostgreSQL transaction; direct SQL seeding, fixture imports and publication-policy bypass are forbidden for final native evidence.

### Selected design and alternatives

Selected: in-place refactor of the existing owners, central exact token projection from `A8`, one semantic-icon adapter, bounded shared Sky Canvas components for repeated stable concepts, route-local composition for one-off page structure, and existing BFF/Postgres operations services for data truth.

Settings reminder closure reuses the existing revisioned, identity-scoped `UserPreferences` contract/service/repository path and adds only two boolean intent fields. A page-local store is rejected as duplicate truth; a separate subscription aggregate is not selected because no delivery provider/receipt lifecycle is in current scope. A future WeChat subscription provider may consume these intents only after its own grant/delivery receipts exist. Existing preference records are normalized with false defaults for compatibility; writes remain expected-revision/readback mutations. The UI must distinguish saved intent from platform permission or delivery, and per-use orientation/precise-coordinate consent cannot be promoted to durable grants.

Settings account-data closure reuses the authenticated controller/service/repository identity boundary. The selected design's “下载我的数据” becomes a server-generated, versioned, identity-scoped JSON snapshot that excludes tokens, WeChat identity digests, internal media object keys and raw bytes; client-local JSON assembly is rejected as incomplete and a second truth. “删除账户” becomes an explicit-confirmation, idempotent PostgreSQL transaction that removes the external identity link, revokes sessions and deletes mutable account data before returning a receipt. Immutable moderation/revision/publication/audit evidence is retained only after unlinking it from the WeChat identity and redacting mutable current projections; pretending to hard-delete append-only evidence, silently weakening append-only triggers, or presenting local cache clearing as deletion is forbidden. A future high-volume asynchronous export/object-delivery pipeline remains allowed behind the same contract when bounded synchronous JSON no longer meets capacity needs.

Allowed alternatives remain: reuse current primitives; introduce a mature lightweight compatible dependency through an app-owned adapter after compatibility/theme/package/accessibility/exit evidence; bounded shared self-implementation; intentional non-abstraction for one-off structure. No new library is selected now because current owners cover the needed primitives and a new dependency would not solve the dominant composition/data gaps.

Build / Reuse / Buy judgment: reuse project owners and installed Taro/React/browser primitives; build the Sky Canvas-specific map/sky/time/status composition in bounded shared components; buy/add no second UI system. This preserves every materially supported allowed option while rejecting duplicate truth, unthemeable dependencies and vendor leakage into pages.

### Material alternatives rejected

- CSS-only recoloring: cannot repair page duty, first-screen hierarchy or production data/state gaps.
- Parallel `vnext` route/component/store: violates one-current-implementation and creates a second truth.
- Copying canonical HTML or screenshots into a WebView/raster: cannot satisfy native WEAPP behavior, accessibility or real data.
- Browser/H5 Mini Program clone: prohibited acceptance proxy.
- Hard-coded rich-state content or acceptance fixtures: violates `A15` and can conceal missing services/persistence.
- Client-side astronomy, safety, publication or canonical merge rules: bypasses server owners and consistency boundaries.

### Future-change challenge

A future exact-target handoff or provider/catalog revision must land through the same token/component/contract adapters without changing route responsibility or duplicating state. A second Operations role must extend RBAC/audit projections without copying decision rules into the browser.

### Technical debt and disposition

- Current handoff preflight is stale because prior implementation edits changed `tokens.scss` and Operations `page.tsx` after feasibility digests were frozen. Do not claim formal preflight closure for the current candidate. Preserve immutable selected Source; use direct canonical resources plus fresh runtime comparisons, and report the stale feasibility binding until a separately authorized immutable handoff revision exists.
- The earlier DevTools subpackage-navigation timeout was localized and repaired in the acceptance orchestration without adding a direct-route product bypass. The current candidate completes every production-control journey with zero unexpected console errors and successful cleanup.
- A later full run exposed a distinct DevTools acknowledgement race: `switchTab` returned a page object while the observable page stack remained on the prior subpackage. The accepted repair is at most three attempts of the same idempotent tab operation with target-page observation after every attempt. Two current-candidate full runs then proved that switching directly from the formal-detail subpackage could exhaust even that bound; the production journey now presses the visible shared back control, proves Map is topmost, and only then switches Tab. Directly opening Plan/Settings/Contribution, accepting the returned object without observing the target, switching Tab while the detail subpackage remains topmost, or retrying without a fixed limit remains forbidden.
- The Map time-preview check previously triggered fixed slider value `4`; production state may legitimately start at frame `4`, making a no-change assertion nondeterministic. The selected check reads the rendered native Slider's current/min/max values and triggers a different in-range boundary value, then still requires the visible local-time projection to change. Removing the change assertion, mutating app state directly or assuming a fixture-owned initial frame is forbidden.
- Final side-by-side review found the selected Lucide back-arrow SVG's external-image stroke missing in the WEAPP renderer, leaving an empty 88rpx control on every child page. The selected repair retains the immutable Lucide SVG as provenance and consumes a source-rendered transparent PNG for day/night pixels. CSS/div/text glyph reconstruction is forbidden; native screenshots must visibly prove the arrow inside the existing accessible `SoftButton`.
- The first post-login native proof showed that selecting the day/night PNG from global store mode is not sufficient: a route may own a forced presentation theme independently of the persisted global mode, so the control remained visually empty when a dark asset was projected onto a dark route. The contextual icon owner therefore renders the two source-derived PNG variants in one bounded wrapper and lets the actual ancestor `.theme-night` / `.theme-observation` presentation select which image is visible. This keeps the selected asset pixels and one icon owner, avoids page-by-page mode props or copied rules, and follows the real rendered theme boundary. Using text/CSS-drawn arrows, hard-coding every route, or trusting store mode instead of native pixels remains forbidden.
- The resulting native element probe then established the deeper boundary: Taro's optimized `SoftButton` compile mode does not project component-valued children into the native tree, so neither the original SVG, a direct PNG nor the contextual wrapper could render inside that button. The selected repair keeps `SoftButton` as the sole accessible 88rpx action and places the non-interactive semantic source-asset wrapper as a sibling overlay inside one positioned back-control owner. This changes no hit target or navigation lifecycle, avoids broad shared-button recompilation risk, and makes native-tree presence/style part of the permanent journey check. Replacing the button, adding a second tap handler, removing accessibility labeling or weakening the visible-pixel screenshot check is forbidden.
- The final full-run comparison also exposed the Sky work surface header inside the native status-bar band: CSS `env(safe-area-inset-top)` returned only the 28rpx fallback in this WEAPP simulator, while `CustomNav` already used `getWindowInfo().statusBarHeight`. The selected design centralizes that bounded native metric in `theme/native-metrics.ts` and applies it to both `CustomNav` and `sky-mobile-header`; CSS remains the fallback when metrics are absent. Hard-coded device heights, hiding platform chrome, screenshot cropping, or leaving Astronomy/Orientation identities under the capsule are forbidden. The Spot Night journey records the computed header padding and the refreshed screenshot remains the visible proof.
- Two consecutive post-asset native collections exhausted the old two-attempt startup bound on different fully cleaned DevTools races: the first attempt had no watcher binding and the second bound correctly but timed out enabling runtime logs. Startup now permits a third clean attempt; every attempt still requires exact project binding, pinned SDK, runtime logging, initial page and complete teardown after failure. Reusing a partially initialized IDE, skipping logging/binding or unbounded retries is forbidden.
- A three-attempt diagnostic then showed all watchers and SDK bindings healthy while the runtime-log handshake alone exceeded its former 30-second budget during a newly rebuilt bundle. The handshake budget is raised to 60 seconds while keeping `App.enableLog` before initial-page acceptance; a timeout still fails the attempt. Enabling logs after the journey, omitting startup observation or treating an open automation port as readiness remains forbidden.
- Final `validate-harness` identified the new Operations browser launcher at 331 lines. The production-record preparation owner is extracted into `operations-browser-data.mjs`; the launcher retains process/database/session lifecycle while the data module retains authenticated user API creation/upload/submission. A waiver, direct SQL seed or fixture import is rejected because the split is small and preserves the production boundary.
- WeChat DevTools automation serializes one tool-owned opaque error envelope as exactly `{"type":"error","args":[{}]}` (SHA-256 `3114f3b3...f0b6`, 28 bytes). Repository history contains the same fingerprint across setup, healthy evidence and injected-fault phases, while two current full runs placed it nondeterministically in Plan and My; an isolated current Plan run emitted none and passed. Selected disposition: classify only that exact fingerprint/length/excerpt tuple as named toolchain noise, preserve and count it in evidence, and continue to fail every exception, assert, differently shaped console error or additional unknown fingerprint. Broad level/phase ignores and arbitrary allowlists are forbidden. This keeps product/runtime error detection fail-closed without letting an unstable DevTools transport envelope make identical production journeys nondeterministic. A future SDK/DevTools upgrade must revalidate or remove this exact classifier rather than widening it.
- Several route owners are large. This task extracts only stable repeated visual/state families needed for correctness; it does not perform an unrelated broad refactor.
- Existing memory adapters and deterministic weather/media fixtures remain legal only behind explicit test/development fixture mode with the permanent visible marker. Non-test startup and final evidence use Postgres/real adapters or truthful unavailable state.
- Existing audit artifacts remain evidence only. They are never copied into production.

### Forbidden shortcuts

- no second token/icon/store/repository/page tree;
- no page-level copied color/spacing constants where `tokens.scss` owns the role;
- no screenshot-only conditional rendering or hidden QA route;
- no fixture/sample/mock/demo success path in production startup;
- no process-local state as proof of persistence;
- no direct provider/database call from Mini Program pages;
- no long-lived admin token in the browser bundle;
- no optimistic success without receipt plus readback;
- no client-composed account export, local-only account deletion, session-preserving deletion or deletion of append-only governance evidence;
- no fabricated heading, weather, safety, route, publication or completeness result;
- no disabled scrolling to hide scrollbar chrome;
- no deletion/reversion of unrelated dirty worktree changes.

### Engineering-quality attributes

- Correctness/invariants: preserve the formal-spot, Observation Context, safety-first, three-axis contribution and review/merge/publication separation invariants; require real positive, negative, conflict and restart-readback paths.
- Maintainability/changeability: exact roles stay centralized; stable repeated components have one owner; route composition remains local; no duplicate rules or parallel implementation.
- Reliability/resource lifecycle: abort/supersession, orientation listener, map request, upload session, outbox and process teardown are explicit and tested.
- Concurrency/consistency: mutations use expected revision plus idempotency; merge/publication remain transactional and fail closed; readback proves the committed revision.
- Performance/capacity/cost: no unmeasured performance claim. Preserve viewport-bounded MapScene, local scrub preview, release-only commit and bounded canvas projection; measure only when claiming a budget.
- Security/privacy/safety: contributor isolation, admin RBAC, redacted audit, EXIF sanitation, precise-location minimization and no raw orientation persistence remain mandatory.
- Compatibility/rollout: WEAPP base library/project config, 320/375/390/430 widths, day/night/observation, large text and reduced motion remain supported; import remains absent while gated off.
- Operability/observability/testability: request/context/revision/receipt/audit identities and truthful state are observable; deterministic fixtures remain isolated; final checks run on one unchanged candidate.

### Context Delta

`Context Delta: required and updated`. The canonical physical workspace and formal snapshot root now record `E:\Dev\Starward` and `E:\Dev\.starward-tmp\run-<id>`. Architecture Context records the plan's server-owned route-origin Observation Context, snapshot v2 binding, v1 read compatibility and the prohibition on client-authored coordinate truth. It now also records Settings reminder intent in the existing revisioned `UserPreferences` owner, the exact nearby-location preference mapping and the prohibition on presenting per-use orientation/coordinate consent as a global grant. No new UI authority or parallel data owner was introduced.

## 3. Implementation packages

### P0-1 shared Sky Canvas projection

- Reconcile all 18 day/night/observation roles and compact-choice roles from `A8` into the single token projection.
- Normalize page canvas, paper/surface, deep navy, path green, lunar gold, risk coral, type roles, 8/16/24/32rpx rhythm, 8/16/24/32rpx radii, 48rpx sheet corner and 88rpx hit regions.
- Reuse semantic icons/assets; do not draw replacement icon art in page CSS.
- Acceptance: design-system checks, no hard-coded conflicting roles in affected pages, no observation-mode role leak.

### P0-2 Plan Detail

- Existing plan is the primary frame: night identity, primary/backup window, departure/checklist progress and route nodes.
- Empty state may create a plan, but cannot redefine the existing-plan route as a creation form.
- Keep server plan persistence/revision/conflict/readback and recoverable dynamic condition failures.
- Acceptance: real plan created through production API/UI, service restart, existing-plan cold start and 390x844 comparison to `06-plan-detail.png`.

### P0-3 Astronomy and Orientation

- Astronomy first screen: sky/arc work object, selected local time, conclusion plus main/backup windows, one shared scrubber, aligned condition bands, targets and source/completeness.
- Remove the first-screen tab/dashboard dominance; professional data remains progressive disclosure.
- Orientation: sparse real SkyScene field, horizon/azimuth/altitude, inherited targets, concise status and recovery panel, accessible object list; sensor-follow-only and no fabricated heading.
- Acceptance: same Observation Context across summary/sky/bands/targets/orientation; permission/calibration/ready/denied/unavailable/stale cleanup; no fixture fallback.

### P1-1 Map, Finder and Spot Detail

- Map canvas remains dominant; Search + wrap-safe compact quick filters; one physical map; project markers/callout and observing-condition bar.
- Fix all 320/375/390/430 clipping. Result selects map/callout first; whole callout enters Detail.
- Detail matches dusk/night hierarchy while keeping server safety, route, source and favorite consistency.
- Acceptance: clean closed -> quick -> peek -> expanded -> result -> callout -> detail cold-start journey plus selected-time analysis journey.

### P1-2 My, Settings and Contribution

- My: account hero, one Settings gear, current plan card and concise grouped entries, no duplicate favorites.
- Settings: design hierarchy for mode, permissions/privacy, reminders and data; observation mode is owned only here.
- Contribution: three kinds, progressive form, real durable draft, rights/media sanitation, upload resume/expiry/cleanup, submit/review and separate submission/merge/publication axes.
- Acceptance: real Postgres-backed draft/upload/submit/readback and restart flow; no current location request for existing-spot report; gated Import remains absent.

### P1-3 Operations production chain

- Match the seven 1440px selected frames and responsive 820px layout through the existing authenticated owner shell.
- Build a reproducible local audit-data preparation path that invokes production APIs/services and writes Postgres/object-store/outbox records; it must not compile or expose a fixture success path.
- Exercise Queue -> Case -> Media -> Merge Preview/Commit -> Assessment -> Publish/Suspend/Unpublish -> Replace/Retire -> Audit with actor, reason, expected revisions, idempotency, receipt, audit ID, recovery point and readback.
- Acceptance: restart services and recapture all seven rich states; conflicts, blockers and failed writes preserve input and deny by default.

## 4. Current-candidate verification matrix

- Mini Program 12 frames: Map/Finder, Spot Detail, Astronomy, Orientation, My, Plan Detail, Settings, Profile Import gated, Contribution Intake, Contribution Form, Upload Recovery, Review History.
- Operations 7 frames: Queue, Case, Media, Merge, Publication, Replacement, Audit.
- Compare each frame at the same viewport, mode, route, data/auth/permission and interaction state. Save reference, implementation and side-by-side evidence under `A14`.
- Every QA iteration opens the source and implementation together, records P0/P1/P2 findings, fixes them, recaptures the changed frame and repeats until project-root `design-qa.md` says exactly `final result: passed` or the remaining external boundary is explicitly blocked.
- Required fidelity passes: typography, spacing/layout rhythm, colors/tokens, image/asset quality, copy/content, icons, states/interactions, responsiveness and accessibility.
- Mini Program final checks: changed-module tests, `check:miniapp:fast`, production WEAPP build, isolated current WeChat DevTools cold starts and fault journeys.
- Operations/API final checks: contracts/API tests and integration, admin build, authenticated real-API browser journeys, DB/object/read-model restart readback and console review.
- Context/authority checks: design lint/system/bindings, both handoff preflights (currently expected to expose stale feasibility digests until an authorized new immutable handoff exists), `make validate-context`, `make validate-harness`, Context drift review and final diff review.

## 5. Current blockers and qualifications

- Mini Program formal handoff preflight currently fails only at feasibility source digest `source.miniapp.tokens`: expected `5e11c083fc2ce19bbd905eb742f07a36dc763cdb0988d8c3d58cb7e1fc40add5`, current `337096210e1a6cfa3a68e8db14893c350a344c85eba4724c0e70517f5e85e286`.
- Operations formal handoff preflight currently fails only at feasibility source digest `source.operations.platform`: expected `e6b03df4260f175565a41f3df287e0bc4a2daec3c9e487a753ba479a7d7adbc4`, current `2fcb45020926aee1118a1ce5ff731f15db4447b751a916c4f1ab698e08c411ee`.
- These stale technical-source bindings cannot be edited in the immutable selected handoff during ordinary implementation. They block a claim that the old formal preflight is current; they do not authorize ignoring the readable canonical design resources or fresh production/runtime QA.
- Representative physical-device sensor feel, outdoor luminance and platform-specific performance remain external evidence if no declared device lane is available. They cannot inherit a pass from DevTools.
- The last pre-arrow candidate `6430124f148f63dd78e514cec2f41782d20dc83a64b75b6e2335166c238cb6e3` passed the isolated production `complete-current` native run: 9/9 journeys, zero unknown console errors, zero exceptions and cleanup passed. Evidence: `artifacts/miniapp/native/runs/wechat-devtools-2026-08-26T16-22-52-854Z-029a3b9e/session.json`. Because the native back-arrow asset changed afterward, this result is historical support only and cannot accept the final candidate.
- Final native recapture is complete after official CLI QR login. Child-route native probes and screenshots prove the source-derived PNG arrow is visible, the Sky header records a 47px native status-bar inset, and the unchanged final candidate `a587d41aca2997cc1019c7b9ad8441f21c4e05750b69843a601b45c402e7e961` passes all 9 production journeys with zero fixtures, zero unexpected console errors, zero exceptions and complete durable-runtime cleanup.
- The current visual audit is `artifacts/design-audit/2026-08-25-sky-canvas/REPORT.md`; all 12 Mini Program frames (including gated absence) and all 7 Operations frames have same-frame comparisons. The selected handoffs are implementation constraints, not pixel-exact targets, so real platform chrome, map tiles and truthful dynamic service data are reported rather than hidden.
- Remaining external/unverified conditions are real-device orientation/haptics/outdoor luminance and a native screenshot of interrupted media upload recovery. The implementation/test state machines exist, but these conditions do not inherit a pass from static or DevTools evidence.
