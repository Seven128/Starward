# H1 / H2 / H3 implementation notes

Task-local record for the authorized non-design efficiency Goal. Root owns PLAN/PROGRESS. No commit was created. Do not treat this file as durable Context or product acceptance.

## H1 — Current canonical workspace boundary

- Inspected package callers, the native runner, its direct tests, current workflow Context and retained verifier callers. The registered `test:miniapp:native` command executes the current runner from the canonical repository. The frozen verifier is a retained diagnostic, not a supported snapshot-materialization caller. Current candidate-acceptance Context already forbids copied production roots.
- `run-wechat-devtools-session.mjs` now admits only the physical canonical Windows workspace through exported `verifyWechatWorkspaceLocation`. Removed the retired `isolated_harness_snapshot` admission path and its unreachable preliminary registration session. The report uses `project_session.workspace_location`; the unused `snapshot_registration` field is removed. No current non-historical consumer of those fields was found.
- Both workspace and child-temp checks now run before creating the run directory, publishing a collecting receipt, preparing infrastructure, building or stopping/starting DevTools. TEMP validation retains directory/realpath checks and rejects both the candidate tree and reserved `E:\Dev\.starward-tmp` run tree. Child TEMP/TMP override remains local to the spawned environment and does not mutate the parent.
- Windows path normalization uses `path.win32.resolve` so the same Windows boundary tests are meaningful in Linux CI. Case/trailing separators/extended Windows physical prefixes normalize; aliases, redirected canonical roots, sibling checkouts, worktrees and the former `ty-context-*` snapshot shape reject.
- Candidate/bundle fingerprints, private/public configuration ownership/restoration, fresh setup/evidence sessions, watcher classification, same-byte config refresh, SDK checks, protocol deadlines, runtime-event policy and complete existing cleanup remain in their existing owner. This is a dead-path retirement, not a new verification protocol or new snapshot tool.
- Corrected the stale snapshot wording in acceptance-runtime, candidate-acceptance and implementation-index. Other historical Source, frozen diagnostics and design resources are untouched.

## H2 — Skill routing and existing authorization

- Read the global skill-creator guidance. No invocation policy or `agents/openai.yaml` was changed.
- Interaction Skill chooses Native versus Mini Program before Source expansion. Native planned work still reads the relevant Outcome and obligations; Mini Program work starts at the current Screen/adopted-resource owner and follows relevant Source keys when implicated. All adopted-resource, gesture, accessibility and upstream-authority rules remain.
- Release Skill description excludes ordinary local compilation/watch builds. The body routes local build, release bundle/preview/upload and backend deployment separately; the deployment runbook is now read by relevant operation/section rather than preloaded for every build. It accepts explicit operation/target authorization already established in the conversation while retaining target/environment identity, independent external operations and owner lock/rollback boundaries.
- Device Skill permits relevant repairs within an already authorized implementation task. Verification-only requests still do not authorize product edits. Permitted existing login/session capabilities can be reused; physical scan/trust/rotation, unavailable login capabilities, MFA and platform approvals retain their real manual boundaries.
- Removed `requiredMeanings` and cross-Skill prohibited-word matches from `project-skills.test.mjs`; they checked prose rather than routing. Existing metadata, UI prompt identity and live required-reference checks remain. No new test asserts the edited wording.

Manual routing review (no external execution, not an independent model forward test):

| Request | Result from current instructions |
| --- | --- |
| Compile/watch the local Mini Program | Package/Taro config and applicable development/path owner; no release runbook preload |
| Fix a Mini Program interaction | Current Mini Program Screen, adopted resource and target DESIGN profile; no unrelated native plan preload |
| Implement a planned native App Outcome | Relevant native Source Outcome and linked obligations remain required |
| Continue the already authorized staging operation for the same target | Reuse conversation authorization; revalidate candidate/owner prerequisites; no repeated authorization question |
| Release with an unresolved environment or target | Resolve the missing external choice before mutation; no inferred upload/public-release authority |
| Repair a finding during an authorized implementation/device-feedback task | Repair within scope; refresh invalidates previous generation/session evidence |
| Report findings from a verification-only request | Report behavior; no implied product-code edit |
| Official preview reaches a different phone/account | Existing manual preview/scan and explicit generation-binding confirmation remain |

## H3 — Bounded discovery

- Added one short `Bounded Discovery` section at the existing context-maintenance owner and linked it from the implementation index. It uses explicit current-owner directories, filename search and bounded content output, expanding to callers/dependencies and exact historical sections only when implicated.
- It does not relocate or delete old Source, `.long-task`, work items, diagnostics or design resources, and explicitly preserves confirmed Source/adopted-resource obligations. `global.md` remains the only default body; no manifest/default/agent/hook/plugin changes.

## Actual checks

- Node 24.16.0: `node --test tools/miniapp/run-wechat-devtools-session.test.mjs tools/miniapp/project-skills.test.mjs` passed **15/15** after final direct-test edits (about 3.06 seconds reported by the test runner). Includes three new real-function workspace/temp/environment groups plus the existing protocol, watcher, official CLI, page-selection and readiness cases.
- Read-only invocation of the actual current-host `verifyWechatWorkspaceLocation()` and `verifyWechatProcessEnvironment()` both passed; only status and path digests were emitted. No full native collector, build, infrastructure startup or DevTools lifecycle action was invoked.
- `npm run context:validate` passed. `ty-context context list --default` returned only `project_context/global.md`. These are structure/default checks, not proof of factual or runtime correctness.
- Existing-directory `rg --files tools/miniapp -g '*session*'` and bounded symbol searches found the current runner/tests/owners without historical output. New Context local links and `bounded-discovery` heading were checked. No stale current `isolated_harness_snapshot`/old function references remain in the changed skills/Context/current runner.
- Global `quick_validate.py` could not start because PyYAML is absent in system Python, bundled Python and the existing dark-sky venv. No dependency was installed or global environment changed. A read-only Node check using the already installed YAML parser validated all three updated Skills' real YAML frontmatter, allowed metadata keys, name/description bounds, scaffold absence and relative Markdown file links. Do not label the Python validator as passed.
- Scoped `git diff --check` passed; Git only warned about the existing LF-to-CRLF checkout policy for `.mjs` files.

## Integration / remaining verification

- Root owns `workflow-conformance.test.mjs`; it must replace/remove the old snapshot function/constant/registration literals and order assertions. New current names are `verifyWechatWorkspaceLocation`, `verifyWechatProcessEnvironment`, `wechatReservedRunTempRoot` and `project_session.workspace_location`. Root was notified of the exact dependency before editing that suite.
- Full formal DevTools journeys were not rerun: the user has an active preview/development context and this task preserves it. The changed path validation was exercised with mocks and the real host; existing lifecycle code was reviewed and its direct tests passed. Do not claim fresh device/tool product acceptance or an FPS/startup-time gain.
- Independent Skill forward-testing was not run while all four agent slots were occupied. The table above is a manual routing review, not observed execution by another model.
- D1/D2/design-resource reconstruction remains deferred exactly as PLAN requires. No visual contract, asset, design-resource Skill, adopted entrypoint or immutable Source was edited.
