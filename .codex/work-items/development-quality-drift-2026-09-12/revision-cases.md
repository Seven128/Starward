# Second revision: actual cases and limits

This is a task-local investigation record, not another product authority or mandatory report template. The task changes development rules and evidence tooling; it does not repair or accept the whole product.

## 1. Visual case: historical astronomy composition

Current sources actually inspected: `DESIGN.md` §5A/§6.11, `docs/design-resources/wechat-miniapp/map/ADOPTED.md`, adopted spot-information README, and `reference/astronomy-shared.jpg`. The later local revision does not replace this astronomy composition or three-action scope. Exact bound paths and hashes are in [visual-review.json](visual-review.json).

Both the main reviewer and independent `/root/visual_review` actually viewed the adopted JPG and `artifacts/miniapp/native/runs/wechat-devtools-2026-09-12T11-45-44-210Z-f418ed5b/01-map-cold-start-location-fallback-spot-panel-astronomy-section.png`. The independent reviewer received the authorities, artifacts and comparison scope before any author findings.

Observed mismatch: the reference has clearly separated full-width white rounded date/ruler, moon and weather modules; the moon module also has a pale inner data area. The historical runtime date/ruler region is a continuous gray field with materially weaker module boundaries and hierarchy. This is a scoped historical **failed** comparison, not a generated pass from successful screenshot collection. The runtime retains the main content groups and action order/color families; these visible elements do not cancel the mismatch.

Evidence limitation: the reference actually encodes 390×843 and runtime PNG only 192×413, despite session metadata logical 390×844 / DPR3 / iPhone 12/13 (Pro) / SDK3.17.1. The comparison supports coarse composition, not exact typography, color, radius, image clarity, hit regions, motion or device correctness. Date, moon phase, data and native system chrome differences are excluded. A short pale-blue mark beside chapter navigation is visible, but its owner is unknown; a residual handle is a hypothesis, not an established cause. The current requirement remains that the header/handle scrolls away with the document, not that it becomes fixed.

Decision produced by review: do not reuse this historical capture as a fidelity baseline or current acceptance. In the separately scoped product repair, acquire an unscaled current-candidate capture at the corresponding viewport/state/scroll position, inspect module hierarchy and the mark's actual owner, repair confirmed differences and compare again. Observe continuous scroll/drag and press/cancel/action sequences independently. No such current runtime or phone repair/acceptance was performed in this task.

## 2. Product/architecture case: stale time responses cannot overwrite another selection

Current owners: `project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md` and `project_context/architecture/runtime-and-domain.md`. A committed ObservationContext owns the selected time and derived facts; changing the selected point/context must prevent earlier requests from overwriting the new state or surfacing stale failure notifications. Preview and committed state remain distinct responsibilities.

Actual production path inspected: `commitMapTime` in `apps/wechat-miniapp/src/pages/map/index.tsx`, shared by map-layer and spot-panel time commit consumers. Its response guard checks selected point, reset version, request generation and active context identity/revision/fingerprint before committing a response or showing an error.

Executed `apps/wechat-miniapp/src/pages/map/time-context-race.test.ts`: it extracts and runs the actual production callback through TypeScript AST/transpilation, using controlled asynchronous API and state ports. It checks late success and late error after point, reset, revision and selection-generation changes; current success, same-turn duplicate requests and actionable current failure are also checked.

Added a bounded negative probe: replace only the extracted ownership guard with `() => true` in memory, leaving production source untouched. The same `assertNoStaleEffects` assertion now fails for both stale success and stale failure after point replacement. The mutation test passes only when those assertion failures are observed. This shows the regression detects the protection it claims to test, rather than checking that a guard string exists.

Result: **4/4 tests passed**, including eight late-response combinations and both mutation branches. No production fix was required for this tested rule. This establishes the frontend callback's behavior with controlled ports, not live BFF/persistence, a mounted React lifecycle, actual WEAPP gestures or all architecture correctness. Existing consumers share this callback, but their complete rendered interaction paths were not exercised here.

## 3. Optional notes helper: negative behavior and actual CLI result

The first revision's review check could return `passed` when four source files recorded in the historical session had changed. It also rejected reviewed-but-unverified interaction evidence as an invalid record, and required successful DevTools/screenshots/fixed dimensions for unrelated claims.

The revised helper is optional. It accepts explicit scope, references, optional evidence/session and claim-specific observations, including failures and missing observations with next actions. No fixed dimension matrix, screenshot prerequisite or separate architecture report. `inspect` returns separate record validity, bound-file integrity, recorded-source applicability and reviewer observations. It does not certify product acceptance or freshness of a full candidate. Matching recorded files still leaves full applicability undetermined because new files, build closure and environment are not verified.

Actual CLI trial used the historical artifacts above. `prepare` created notes; actual visual findings were entered; `inspect` exited 0 and reported:

- `record_validity: valid`, `review_state: reviewed`;
- `bound_inputs.state: unchanged`;
- `candidate_applicability.state: different`, with changed paths `apps/wechat-miniapp/src/pages/map/time-context-race.test.ts`, `package.json`, `project_context/areas/main/implementation-index.md`, `tools/miniapp/run-wechat-devtools-session.mjs`;
- retained `failed` composition and `unverified` interaction observations and their next actions;
- `product_acceptance: not_assessed_by_tool`, with no aggregate `passed` status.

These changed paths differ from the earlier probe because this revision changed the business test and removed the policy-string workflow test. The source distinction is intentional; the historical session itself was not overwritten.

Nine helper regressions cover session-free notes, all verdicts, failed collection, changed candidate source, changed reference/output, added unrecorded source, overwritten session, invalid reviewer/citations/actions and explicit non-DESIGN authorities. The collector test executes its real result function; policy-string assertions added by the first revision were removed. Collector success remains `collected`, with only automated collection assertions `passed` and product review unverified. Existing failure/cleanup exits remain failures.

## Verification and remaining limits

- `npm run test:miniapp:workflow`: **137/137 passed** after the second-revision code and rule changes.
- `node --import tsx --test apps/wechat-miniapp/src/pages/map/time-context-race.test.ts`: **4/4 passed**.
- Node syntax checks on the helper and runner passed.
- `node_modules/.bin/ty-context.cmd validate-context` passed (structure/paths, not factual correctness).
- `git diff --check` passed (only LF/CRLF warnings).
- Actual optional CLI preparation and inspection behaved as above; no native runtime/device acceptance was claimed.
- Earlier `check:miniapp:fast` remains blocked by pre-existing AppID-shaped content in 16 tracked temporary build logs; no AppID/config/log changes were authorized or made. Missing Python `yaml` still prevents the generic Skill Creator quick validator; the repository's actual Skill structure/reference tests passed. No extra validator dependency or lint configuration was introduced.

The Tiny Context framework, managed contract and manifest were not changed. Durable workflow decisions remain in existing project owners; this file and the detailed review are optional task-local records. Skill guidance influenced representative actual-output comparison, independent review and scoped reporting, not a new page-specific checklist or approval workflow.
