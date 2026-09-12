# Development quality and implementation-drift work item

## Second revision — completed, supersedes the earlier completion claim

The user authorized implementation of the GPT-6 review corrections. The first revision below is historical: its 141 green tests prove record rules, not that the drift workflow works.

- Reproduced during review: four files in the historical candidate manifest have changed, yet v1 can return `passed`; a reviewed interaction with missing evidence is rejected as an invalid record.
- Preserve collector `collected` semantics. Make the review helper optional and usable without a successful DevTools run, screenshots, fixed dimensions or extra architecture report.
- Separate record structure, integrity of explicitly bound files, applicability to current source, and the reviewer's actual conclusions. No generated aggregate product pass. A historical review stays historical; partial or failed evidence remains recordable.
- Strengthen actual decision points in existing owners: inspect reference and output together, independent review at high-impact reuse/delivery, changed-path checks, reconsider approach if observed differences do not shrink. No mandatory reports for ordinary work.
- Validate with a real adopted-resource/runtime-image comparison and one existing real product/architecture boundary plus a negative probe. Record actual inputs, results, limitations and next actions in a task-local case note. Do not repair all photographed defects or imply current phone acceptance.
- Implemented: optional claim-scoped notes with separate integrity/applicability/reviewer conclusions; `inspect` never produces product acceptance. No successful DevTools, screenshots, five dimensions or extra architecture report prerequisite. Collector success remains `collected`; its real outcome function is tested.
- Actual case results and limits: [revision-cases.md](revision-cases.md). Independent actual-image review found a historical composition mismatch and downscaled evidence limits; a production time-response callback regression detects an in-memory removal of its ownership guard. Neither case establishes complete product or phone correctness.
- Actual CLI record: [visual-review.json](visual-review.json). Inspection retained failed/unverified findings, reported unchanged bound artifacts but a different recorded source candidate, and explicitly did not assess product acceptance.
- Verification: workflow 137/137, production callback tests 4/4, Context validation and diff checks passed. Existing fast-check AppID/log blocker remains; no new full DevTools or physical-device acceptance was run. Final diff contains only this task's process/tool/test changes. No production implementation, Tiny Context framework/managed block/manifest, AppID/config or unrelated logs were changed.

## Objective

Improve Starward's development and acceptance process so that design fidelity, product behavior, and technical architecture are supported by evidence that can actually disprove a wrong implementation. Do this without changing the Tiny Context framework/schema and without creating a page-by-page checklist or a second quality system.

The shared reasoning chain is:

`current authority -> judgeable result / preconditions / invariants -> responsible owner and consumers -> representative real-runtime closure -> impact-based regression -> completion claim bounded by evidence`

For every material obligation, answer:

1. What must be true?
2. Who is responsible for ensuring it?
3. What evidence would fail if it were wrong?

## Authorized scope and boundaries

- Modify project development skills, development-workflow Context, acceptance/evidence tooling, reports, and related tests.
- Make targeted updates to an existing Context owner only when a durable conflict, new confirmed decision, or stale fact would change implementation.
- Do not redesign Tiny Context, its schema, manifest, or the whole Context tree.
- Do not create a second quality framework, fixed requirement matrix, per-page acceptance catalogue, historical hash gate, or mandatory handoff bureaucracy.
- This work item does not authorize a full repair of all UI/product defects shown in the user's phone photos. Use them as escaped-defect cases; make only a minimal product-code change if it is required to prove the new mechanism.
- Work in the repository's current main checkout. Preserve unrelated user changes. Check Git status before editing and before delivery.
- Documentation, a registered command, a screenshot on disk, a green source probe, or a historical run does not by itself complete this goal.

## Stable rules to implement

### Authority before implementation

- Resolve the current owner, adopted resource, consumers, and scope before implementing.
- Treat an implementation mismatch, a source conflict, a new user decision, and a verified platform limitation as different cases.
- Do not let an implementer or reviewer replace the current product decision with personal convention.

### Responsibility before code

- Put a shared product fact or interaction in the module that can truly guarantee it.
- Prevent independently editable duplicate sources of truth.
- Do not interpret this as putting all state in one global store; drafts, previews, committed domain state, and provider state may have different legitimate owners.

### Representative closure before expansion

- Before broadly copying a new shared UI implementation, cross-module path, or technical approach, prove one independently reviewable real-runtime slice or business chain.
- Block propagation for shared/route-setting/high-impact errors. Independent local discrepancies may be repaired in parallel or batched, but may not be hidden by the final pass state.
- A representative UI slice should cover the real composition and relevant states, not merely prove that a click changes a class.
- A representative business chain should cross the real boundaries that the claim depends on; local tests then cover combinations efficiently.

### Evidence must match the claim

- Design/visual: compare actual WEAPP output with the current adopted reference under comparable state, viewport, scroll, and platform conditions.
- Interaction: observe the actual press, drag, scroll, interruption, animation, and recovery sequence; a final screenshot is insufficient.
- Product behavior: test preconditions, state transitions, final business results, invariants, identity/permission, duplicate submission, timeout uncertainty, failure recovery, re-entry, and retired paths when applicable.
- Architecture: inspect real dependencies, data reads/writes, production call paths, and claimed effects such as caching, cancellation, degradation, cleanup, performance, or cost.
- Source strings, selector counts, class/text/hash changes, mocked success, and screenshot creation only prove those narrow facts.
- Static dependency checks and representative runtime integration complement one another; do not lock down implementation details that are not durable architectural responsibilities.

### Evidence-state semantics

Keep these meanings distinct in the existing result/report mechanism:

- `captured`: an artifact was collected.
- `reviewed`: the artifact/result was actually evaluated against its current authority.
- `passed`: the applicable comparison or behavioral expectation was evaluated and satisfied.
- `failed` / `drift`: a material mismatch was found.
- `unverified` / `not-comparable`: the required conclusion could not be established.

Never infer `reviewed` or `passed` from `captured`. Do not report overall completion while an applicable required dimension remains unverified. One item may support several conclusions, but every conclusion must identify the evidence it actually uses.

### Baselines and independent review

- Keep initial design-conformance references separate from later regression baselines. Never promote an unreviewed current implementation screenshot into a correctness baseline.
- Use an independent/fresh-context review before a high-impact shared implementation is broadly reused and before a large candidate is delivered. First provide current requirements, adopted references, actual output, and runtime conditions—not the author's completion narrative.
- Independent review may identify mismatch or ambiguity; it may not rewrite product intent from convention.

### Escaped defects and regression strength

- Requirement misunderstanding or conflict -> repair the existing owner/scope.
- Duplicated responsibility -> repair the implementation boundary and affected consumers.
- Correct requirement but wrong implementation -> repair the responsible module and add a focused regression.
- A check passed while the defect escaped -> repair the assertion/evidence method.
- Only a reusable cross-domain process gap belongs in a general skill.
- Test expectations must come from current requirements rather than the implementation. For high-impact rules and escaped defects, prefer a regression that fails before the fix or a bounded protection-removal/mutation check proving that the assertion detects the intended error. Do not require expensive whole-repository mutation testing.
- Check both directions: requirement -> implementation coverage, and change -> affected consumers/regressions.

### Cost boundary

- Allocate verification by risk and changed boundaries; do not turn a local repair into an unsupported full-repository audit.
- Use a representative end-to-end path to prove module integration and local tests for rule combinations.
- Use physical-device evidence for risks such as DPR/raster sharpness, native map behavior, gestures, safe areas, permissions, and device-specific rendering—not as a duplicate of all pure business tests.

## Three correctness domains

| Domain | Current authority | What must be shown |
| --- | --- | --- |
| Design and interaction | `DESIGN.md`, affected Screen Contract, current adopted resources | Actual layout/composition and relevant visual/gesture/animation states in WEAPP; physical device where platform-specific |
| Product logic | User task, business rules, state transitions, shared product owner | Required outcome and invariants across success, failure, interruption, identity, persistence/re-entry, and removal of old behavior as applicable |
| Technical architecture | Responsibility, data ownership, dependency direction, boundary and quality targets | The real owner enforces the rule; production calls cross intended boundaries; claimed lifecycle/runtime effects actually occur |

## Confirmed repository findings and corrections

1. `AGENTS.md` already requires inspection of owners/consumers/state/data/dependencies, use of adopted resources, actual WEAPP comparison, requirement-derived tests, and honest reporting. The main gap is operational enforcement and evidence closure, not absence of synonymous principles.
2. `project_context/context-maintenance.md` lines 28-36 and `project_context/development-workflow/authority-and-scope.md` lines 15-17 already require actual adopted-resource inspection and real WEAPP comparison.
3. `tools/miniapp/verify-ui-contracts.mjs` primarily checks source markers and explicitly says source checks do not establish runtime behavior.
4. The current official DevTools journey can pass on selector/class/text/hash changes and captured screenshots without a required design-fidelity judgment. Existing artifacts demonstrate that `passed` can coexist with obvious visual drift. Capture must not imply review/pass.
5. Commit `cb6a30d2` changed roughly 435 files with about `+47,610/-4,894`. This does not prove a single cause, but it increases the cost of detecting drift late and supports representative closure before wide expansion.
6. The normal marker asset is approximately 32x36 pixels and the selected asset 40x45, rendered at similar declared dimensions. Hash/recolor checks prove deterministic generation, not high-density phone sharpness.
7. Current notification implementation is bottom-positioned; only certain success notices auto-dismiss after roughly 6000 ms; favorite failure copy is verbose. The user's desired transient notice is concise, top-positioned, and about three seconds. Before changing the durable shared rule, reconcile whether an operation with sufficient visible state needs an additional toast and where persistent recovery information belongs.
8. Important correction: `DESIGN.md` lines 749-752 and 897-901 require the Spot Panel handle/header band to scroll with the retained document and never remain fixed/sticky. Static photos cannot establish that it should be fixed. Reproduce the sequence and distinguish normal scrolling-away from a coordinate/scroll-owner defect or a newly confirmed design change.
9. The large translucent map rectangle may be related to a polygon/layer fixture projection, but this is an unverified hypothesis and must not be recorded as the root cause without reproduction.
10. Current adopted images and runtime captures visibly differ, but an artifact's existence is not evidence that it was reviewed.

## Source and evidence index

### Governing sources

- `E:\Dev\Starward\AGENTS.md`
- `E:\Dev\Starward\DESIGN.md` — especially the adopted-resource entry, section 6.11, shared motion/feedback, and lines 749-752, 897-901, 1049-1055.
- `E:\Dev\Starward\project_context\global.md`
- `E:\Dev\Starward\project_context\context.toml`
- `E:\Dev\Starward\project_context\context-maintenance.md`
- `E:\Dev\Starward\project_context\development-workflow.md`
- `E:\Dev\Starward\project_context\development-workflow\authority-and-scope.md`
- `E:\Dev\Starward\project_context\development-workflow\candidate-acceptance.md`
- `E:\Dev\Starward\project_context\development-workflow\development-feedback.md`
- `E:\Dev\Starward\project_context\development-workflow\change-admission.md`
- Mini Program Screen Contract root and affected `map-and-finder`, `spot-and-sky`, `shared-state-and-recovery`, and `information-design` owners; resolve exact current paths through `context.toml`/`rg`.

### Adopted design sources

- `E:\Dev\Starward\docs\design-resources\wechat-miniapp\map\ADOPTED.md`
- `E:\Dev\Starward\docs\design-resources\wechat-miniapp\map\adopted\spot-information\reference\small.jpg`
- `...\medium.jpg`, `...\astronomy.jpg`, and `...\favorite-active.jpg`
- Current astronomy composition used in the second revision: `E:\Dev\Starward\docs\design-resources\wechat-miniapp\map\adopted\spot-information\reference\astronomy-shared.jpg`; resolve current adoption precedence before using any older listed resource.

### Project skills

- `E:\Dev\Starward\.codex\skills\uiux_design\SKILL.md`
- `E:\Dev\Starward\.codex\skills\starward-wechat-device-verification\SKILL.md`
- Search for an existing general development/verification owner before adding a new skill.

### Tooling and tests

- `E:\Dev\Starward\tools\miniapp\verify-ui-contracts.mjs`
- `E:\Dev\Starward\tools\miniapp\workflow-conformance.test.mjs`
- Formal native/DevTools runners, journeys, evidence/report schema, and tests under `E:\Dev\Starward\tools\miniapp\`; locate actual owners with `rg` before editing.
- `E:\Dev\Starward\package.json` and workspace package scripts.

### Escaped-defect implementation examples

- `E:\Dev\Starward\apps\wechat-miniapp\src\components\notification.tsx`
- `E:\Dev\Starward\apps\wechat-miniapp\src\components\notification.scss`
- `E:\Dev\Starward\apps\wechat-miniapp\src\hooks\use-favorite-mutation.ts`
- `E:\Dev\Starward\apps\wechat-miniapp\src\pages\map\map-markers.ts`
- `E:\Dev\Starward\apps\wechat-miniapp\src\pages\map\index.scss`
- `E:\Dev\Starward\apps\wechat-miniapp\src\assets\icons\formal-spot-marker*.png`

### Historical/investigation evidence only

- `E:\Dev\Starward\artifacts\miniapp\native\runs\wechat-devtools-2026-09-12T11-45-44-210Z-f418ed5b\session.json` and its screenshots.
- User phone photos:
  - `C:\Users\777\AppData\Local\Temp\codex-clipboard-6c2409ee-a645-4173-8df4-ab6764d8b1bf.jpg`
  - `C:\Users\777\AppData\Local\Temp\codex-clipboard-5bb95ba7-2f2e-4978-ae3c-c315d549972c.jpg`
  - `C:\Users\777\AppData\Local\Temp\codex-clipboard-6e745330-05ad-4b4b-81a0-0e7d1fbc5c55.jpg`
  - `C:\Users\777\AppData\Local\Temp\codex-clipboard-805febd3-2164-4cd4-b733-2819c12920d1.jpg`
  - `C:\Users\777\AppData\Local\Temp\codex-clipboard-22549363-5a1e-4b35-9fed-6a9e3493534b.jpg`
- Referenced ChatGPT conversation `6aa54a1a-8104-83ea-a57a-26e63e86bd95`, titled “评估开发质量流程”; discussion evidence, not authority.

## Execution plan

1. Recheck Git status, manifest/default Context, governing owners, actual runner/report schema, package commands, and test ownership. Map the smallest real responsibility/data flow. Search before creating.
2. Design the smallest change set: identify existing rules to reference or merge, missing executable evidence states, what automation can decide reliably, and what requires image/interaction/device review.
3. Update the existing project skill and development-workflow owner with stable rules. Make product-specific Context changes only for confirmed durable conflicts.
4. Modify the existing acceptance/evidence/report implementation so capture/review/pass/fail/unverified cannot be conflated. Bind the current authority, runtime state/conditions, and judgment to the existing flow. A report field's presence must not pretend a review occurred.
5. Add the common obligation/owner/evidence discipline for product and architecture without creating a long checklist. Use representative escaped cases to show that the new flow fails or remains unverified when direct evidence is missing.
6. Add or update focused regression tests. Run affected tests, repair failures, and rerun. Broaden to fast/workflow/native checks only when the changed boundary or a failure justifies it; an unobservable environment remains unverified, never passed.
7. Review dependency direction, ownership, duplicated documentation, stale implicated references, and Git diff. Remove only temporary files created by this work item; preserve historical evidence and user files.
8. Report changed owners, decisive tradeoffs, exact checks/results, remaining unverified visual/device scope, and existing product defects intentionally not repaired. Mark the goal complete only when all required process/tool/test work is finished.

## First revision status (historical; superseded above)

- Goal and compaction-safe work-item index created. The Tiny Context framework/schema and manifest were intentionally left unchanged; durable changes were made only in the existing project development and acceptance owners.
- Implemented the stable obligation discipline in `AGENTS.md`: current requirement/result and invariants -> responsible owner/consumers -> evidence capable of falsifying a wrong result -> representative real outcome before broad reuse.
- Updated `.codex/skills/uiux_design/SKILL.md` and `.codex/skills/starward-wechat-device-verification/SKILL.md` so capture, review, pass, fail and unverified cannot be conflated. Representative target-runtime closure is required before a shared realization path is propagated. DevTools and physical-phone evidence retain separate boundaries.
- Updated `project_context/development-workflow/authority-and-scope.md`, `candidate-acceptance.md`, and the main implementation index. A successful native run is now explicitly a collector result, not a visual/product acceptance result; formal acceptance remains the conjunction of applicable current-authority review and device evidence.
- Added `tools/miniapp/conformance-review.mjs` and `npm run miniapp:conformance-review`. `prepare` creates a new, explicitly unverified record and hash-binds the exact session, candidate, generated bundle, runtime conditions, screenshots, optional supporting check/report files, and allowed current authority files. `check` requires an identified reviewer and rejects incoherent session schemas, unreviewed/unresolved or empty all-not-applicable claims, stale session/authority/artifact/evidence hashes, unbound evidence claims, visual/interaction conclusions without a captured screenshot, architecture passes without a bound supporting check/report, and any attempt to infer physical-device conformance from DevTools. A reviewed failure is retained as valid evidence but exits nonzero; the tool validates freshness and claim shape and never performs the human/model judgment itself.
- Changed `tools/miniapp/run-wechat-devtools-session.mjs` to schema `wechat-devtools-native-session-v3`. Successful automation now emits top-level `status: collected`, `collection_status: passed`, and `product_conformance: unverified`, plus a structured next action for review. Failed assertions, drift, cleanup, or runner faults still fail closed. Journey-level `passed` remains scoped to its declared automated assertions.
- Added `tools/miniapp/conformance-review.test.mjs`, extended workflow conformance tests, and brought the interaction-design Skill under the existing project Skill structure/reference test. The new regressions prove: capture stays unverified; unreviewed records cannot pass; only coherent current-session schemas are admitted; current authority, session, candidate, bundle, screenshots and supporting reports are bound; authority/screenshot mutation invalidates review; uncaptured evidence is rejected; visual/interaction claims require bound captures; architecture claims require bound supporting evidence; DevTools cannot pass the phone dimension; known drift remains failed; implementation files cannot be substituted for product authority.

## First revision verification (historical)

- Final `npm run test:miniapp:workflow`: **141/141 passed**.
- Focused conformance/workflow/project-Skill suite after the final hardening: **38/38 passed**.
- `node --check` passed for `tools/miniapp/conformance-review.mjs` and `tools/miniapp/run-wechat-devtools-session.mjs`.
- `node_modules/.bin/ty-context.cmd validate-context` passed. It validates manifest paths and explicit controlling-source declarations, not factual correctness.
- `git diff --check` passed; only Git's existing LF-to-CRLF working-copy warnings were emitted.
- A historical schema-v2 session was admitted only as migration input through the actual npm CLI after argument hardening: `prepare` produced `unverified`, and its untouched template was rejected by `check` as unreviewed with exit code 1. The disposable trial review file was removed afterward.
- The Skill Creator Python quick validator could not start because the available Python environment lacks the `yaml` module. No dependency was installed for this documentation-only validation. The repository-owned project Skill tests, including frontmatter and live references, passed.
- ESLint was not applicable because this repository has the package but no ESLint configuration; no new lint configuration was invented for this change.

## Existing blockers and intentionally unverified scope

- `npm run check:miniapp:fast` stops at the pre-existing `check:miniapp:app-id` rule before reaching the changed workflow tests. `git grep` currently finds an AppID-shaped value in the one intended public config plus 16 tracked `tmp/*build.log` files, so the existing single-tracked-identity assertion reports `wechat_app_id_tracked_identity_ambiguous`. This work item did not modify either public or private project config and did not create those tracked logs. Fixing or removing historical logs is outside this goal and no identifier value was recorded here.
- No new full DevTools native collection was run; this process/schema change was exercised with unit/workflow tests and a historical migration trial. Consequently no current visual/product conformance claim was created.
- No physical-device acceptance was run. DPR/raster sharpness, native Map composition, safe-area/gesture behavior, and the user's photographed escaped defects remain unverified or known failed product work rather than being silently promoted by this process change.
- The notification, marker, Spot Panel, action-state/animation, astronomy container, scrubber, and large translucent rectangle defects were not repaired in this process-scoped goal. The handle rule remains the current DESIGN decision (scrolls with the document); the rectangle root cause remains an unverified hypothesis.

## First revision delivery claim (superseded)

- Required project process, Skill, evidence schema/tool, runner semantics, and regressions are implemented.
- Final diff review found only the intended 10 tracked modifications plus this index and the two new conformance-review files. No unrelated working-tree changes or leftover trial artifact were found.
- The process/tooling goal is complete. Delivery must not claim that the photographed product defects or current device acceptance are complete.
