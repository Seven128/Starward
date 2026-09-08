# Project efficiency Goal — recovery index

Latest completion: reopened R10 capabilities are implemented and actually verified. Read PROGRESS's COMPLETE header and updated FINAL-AUDIT for current disposition; older login-blocked/non-adoption conclusions are historical. Official use is documented in tools/miniapp/development-observer.md; R10-OFFICIAL-VERIFIED and R10-INTEGRATED-WORKFLOW preserve runtime and regression evidence.

User authorization (2026-09-08): implement the reviewed optimizations except design-resource-related work; create a Goal and preserve every required detail in indexed local files so compaction does not lose scope, evidence, decisions or unfinished work. Work directly on main. Do not treat the user's current design reconstruction or adopted-but-unimplemented designs as defects.

## Resume order

1. Read this INDEX, then [PLAN.md](PLAN.md) and [PROGRESS.md](PROGRESS.md). Check current Goal, git status and live collaborators before editing. Read only the owning Context/code needed for the next work item; do not reload all historical Source or logs.
2. PLAN holds the complete reviewed-item disposition, required behavior, implementation direction and verification. PROGRESS holds actual execution, file ownership, tests, failures, next actions and unresolved details. Update it at each material milestone and before compaction/end of turn.
3. The `evidence/` folder preserves exact copies of all audit reports, measurements, runnable probes and logs. [evidence-manifest.json](evidence-manifest.json) records original paths, sizes and SHA256. The copied reports' relative links were authored for their original `tmp/` locations; resolve repository links from that origin, or use PLAN's paths. Original files remain available; no audit detail is removed.
4. Baseline commit: `86101d32c7f31be69bb32756a593375df150f7f4`. Baseline branch main. Preserve unrelated `.codex/work-items/tiny-context-design-resource-recommendations-2026-09-08.md` and other users/tasks' changes.
5. [H4-R79-NOTES.md](H4-R79-NOTES.md) holds root CI/Docker/native-API implementation and checks, including post-reboot integration findings. [R2-REVIEW.md](R2-REVIEW.md) holds the independent client-cache review when present; fixes and outcomes remain linked from R2-NOTES/PROGRESS. Other item notes are named by their H/R scope.
6. [H4-R8-REVIEW.md](H4-R8-REVIEW.md) records independent CI/retry/launcher review and executable probes. [R10-OBSERVER-NOTES.md](R10-OBSERVER-NOTES.md) records the warm observer implementation, actual binding failures/fixes and routing recommendations. R10-NOTES holds first-party/tool alternative research, including the GUI's automatic URL-protocol registration to the extracted evaluation directory; do not remove that directory leaving a dangling handler.

## Frozen scope — user is actively rebuilding design resources elsewhere

Do not modify, remove, move, regenerate, compress or deduplicate `docs/design-resources/**`, `.agents/skills/starward-design-resource/**`, DESIGN.md, adopted-resource entrypoints, visual tokens/assets/media/manifests, immutable Source/census, or new-design migration requirements. Do not implement the newly adopted design or fix differences against the old production UI. Do not archive historical design-linked packages or rewrite Git history. Read these only when necessary to preserve existing authority.

The interaction implementation Skill may receive a narrow platform-routing correction; this does not authorize editing the new design-resource Skill or weakening adopted-resource reading requirements. Standard-font/200% inconsistencies and old Source provenance that overlap design documents are recorded as deferred, not silently discarded.

No production/staging deployment, upload/review/public release, purchases, remote data mutation, secret disclosure, global plugin uninstall, network-wide proxy/UAC/security changes, or broad framework migration is authorized by this optimization Goal. Local builds/tests, isolated local fixture databases and appropriate owned local runtime checks are authorized; preserve current preview/dev sessions and user work.

## Source / verification entrypoints

- `project_context/global.md`: sole default body; keep that model. `project_context/context.toml` routes on-demand Context.
- `project_context/architecture.md`, `architecture/runtime-and-domain.md`, `architecture/maintenance-boundaries.md`: module owners, cache/decision/publication rules, smallest coherent extraction.
- `project_context/context-maintenance.md`; `development-workflow.md` and children; `areas/main/verification.md` and relevant children: paths, lifecycle, evidence boundaries.
- Skills already read: `.codex/skills/uiux_design/SKILL.md`; global `C:/Users/777/.codex/skills/.system/skill-creator/SKILL.md`; global openai-docs. Before UI motion work read the applicable current Screen/Design contract without initiating design migration. Before device work apply project device Skill.
- Audit reports: `evidence/project-efficiency-review-2026-09-08.md` (including the user's design-reconstruction correction) and `evidence/performance-review-2026-09-08.md`.
- Runtime baseline: `evidence/perf-audit-20260908.{mts,json}`, benchmark/build/test logs. The .mts imports are repository-root-relative from its original tmp location; copy to a task-owned runtime location with resolved imports or execute original `tmp/perf-audit-20260908.mts` after checking identity.
- Harness baseline: `evidence/harness-audit-{stats,links}.{mjs,json}`. Never dump their huge source inputs; use bounded searches and summarized output.

## Local runtime facts

Default PATH resolves `node` to WeChat DevTools Node 16.13.1; npm comes from nvm Node24. Use `C:/Users/777/AppData/Local/nvm/v24.16.0/node.exe` or prepend that directory to the current process PATH. Do not globally overwrite the user's environment. Node >=24 is the project contract.

For WEAPP inspection use `MINIAPP_ISOLATED_CHECK_BUILD=1` and a non-watch build to `apps/wechat-miniapp/dist/weapp-check`; no fixture/diagnostic modes. Ordinary `dist/weapp` is reserved for the user's current preview. Existing prebundle/persistent production cache choices have correctness reasons; do not blindly enable them.

## Completion

User steering added during implementation: research current WeChat Mini Program and agent development/testing best practices, explicitly discover official/third-party MCP or equivalent capabilities, compare against existing Computer Use-heavy workflow, and implement a better path if justified. This is additive item R10 in PLAN and research/implementation notes go in R10-NOTES.md. Original optimizations and design freeze remain in force.

Every in-scope PLAN item must have a supported final disposition: implemented and verified, or evidence-backed no-change decision with reason; an externally blocked implementation stays outstanding and is reported honestly. Deferred design items remain explicitly excluded. Re-review dependency/state ownership, all affected consumers and failure/cancel/cleanup paths. Report actual performance delta on comparable data, tests and unverified runtime scope. Mark Goal complete only when all authorized work is complete; an index or green unit tests alone are not completion.

Runtime continuation evidence: R25-native-fixture.mjs + R25-native-result.json/png own R2/R5 native API checks; R10-warm-native.json/png own real observer native layout/screenshot timings. See newest PROGRESS before historical process records.

## Final disposition
[FINAL-AUDIT.md](FINAL-AUDIT.md) is the requirement-by-requirement final review,capability selection,verification limits,incidents and retained resources. FINAL-ARTIFACT-AUDIT.json binds preserved evidence and APK/native sources. FINAL-WORKFLOW.log and FINAL-R4-POSTGIS.log are final affected/live-database checks. The newest FINAL STATE in PROGRESS supersedes historical pending ledger rows without deleting their evidence.


## User-requested reopening
[REOPENED-GOAL.md](REOPENED-GOAL.md) preserves the restored full objective. Read the REOPENED header in PROGRESS before earlier FINAL conclusions; unresolved R10 capability work is active again.

[R10-OFFICIAL-VERIFIED.md](R10-OFFICIAL-VERIFIED.md) records successful user login and actual first-party native click/input/console/network/screenshot results. Read the CURRENT header in PROGRESS first; historical login blocking is resolved, integration remains outstanding.
