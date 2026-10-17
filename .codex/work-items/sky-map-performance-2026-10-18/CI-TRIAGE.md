# Shared CI first triage — 2026-10-18

Read-only product triage; no production/test edits or broad product test run. The current worktree contains unrelated Map/Sky/runtime/Skill work and was preserved.

## Bound evidence

- Both cited runs target committed revision `32ec61a4f5321e571d499be6430a09918d65242e`.
- [Product CI](https://github.com/Seven128/Starward/actions/runs/39037041147): resource preparation, locked install, production dependency audit and 5 resource tests passed. Deployment owner tests: 248 total, 228 passed, 20 failed. Subsequent release checks/builds were skipped.
- [Context structure](https://github.com/Seven128/Starward/actions/runs/39037041164): Context structural validation passed. Shared test step: 36 total, 34 passed, 2 failed.
- Current Windows worktree rerun of exactly the shared 36-test step also reports 34 pass / 2 fail (433.7 ms). This does not claim the unexecuted release/product suite is green.
- Raw gh CLI logs and current TAP are ignored under this task's `tmp/`; no credentials were exported. Historical 1,824/52 figures are not a current result.

## Product failure mechanism and owner

All 20 failures are ENOENT during fixture setup, before the asserted product behavior. They come from three deployment-owner test files reading ignored, historical local output directories:

- `promote-release-candidate.test.mjs` (6) and `recover-database.test.mjs` (9): `output/sky-static-owner-independent-1002-r4/normal-store/prepared-inventory.json`, associated publication/source directories.
- `sky-static-consumer.test.mjs` (5): `output/sky-offline-source-backup-1006-e2-r1/result.json`, associated backup directory.

Git ignore confirms these output paths are not clone inputs. This is a shared deployment test-fixture portability defect introduced by borrowing local Sky evidence, not evidence of a runtime Sky renderer bug or a deployment behavior failure. The relevant existing owner is `project_context/deployment/pipeline-and-host.md`; the deterministic CI suite cannot depend on one developer's acceptance artifacts.

Smallest coherent repair: a shared deployment test fixture builder, used by these three files, which produces two distinct valid PNG payloads, sealed source publications and inherited managed delivery using existing `writeSkyStaticBundle`, artifact/inventory and backup owners. Preserve positive nonempty byte readback, publication/revision identity, authentication, old URL preservation, ordering/lease disposal, and rejection-before-side-effect assertions. Derive exact counts and bytes from controlled fixture declarations; do not keep historical magic 6838 bytes, skip these tests, download the old output, or weaken production validation. No change to astronomy imagery/data, production backup/recovery semantics or pipeline sequencing is indicated by these failures.

## Context/shared test failures

1. `workflow-conformance.test.mjs:215`, “dynamic runtime selectors use native ids instead of omitted data attributes”: `features/sky/sky-menu.tsx` currently renders dynamic `data-od-id={id}` in `SkyMenuAction`. This conflicts with the existing Taro native-ID selector contract. Minimal repair is the component's native `id={id}` binding, after checking selector consumers; retain the shared guard. This is a small actual platform integration discrepancy, not justification for expanding Sky internal behavior work.
2. `workflow-conformance.test.mjs:1152`, “native safe-area chrome and transient observation mode preserve DESIGN authority”: test still demands `sky-orientation-back-layer` and `data-od-id=sky-orientation-back` in the page, while current adopted navigation is `SkyNavigationMenu` / `SkyMenuAction id=sky-return` and the page owns `NativeBackBoundary`. This is a stale source fixture. Update only the obsolete wiring checks to current responsible components, retaining native safe-area bindings and actual navigation behavior tests. Because this monolithic assertion stops on its first mismatch, inspect the remaining source assertions against the current owner before claiming that changing one regexp closes it. Do not restore obsolete UI just to satisfy this fixture.

## Windows / Linux discovery gap

The three workspace test commands pass unquoted `src/**/*.test.ts` to the shared Node launcher. Node 24 itself can expand that recursive pattern; shell expansion happens first on Linux. A bounded Git Bash argv observation reproduced default Bash behavior without executing tests:

| Workspace | Native Node recursive matches | Default shell argv | Consequence |
| --- | ---: | ---: | --- |
| wechat-miniapp | 496 files | 160 concrete files | 336 root/deeper files omitted |
| miniapp-api | 222 files | 1 unchanged pattern | Node currently expands all; adding a matching one-level file could silently change this |
| miniapp-contracts | 21 files | 1 unchanged pattern | Same latent shape dependence |

Counts are file discovery at this dirty worktree, not test-case outcomes. Examples omitted by shell expansion include `src/app-config.test.ts`, `src/spot/data-source/route-context.test.ts` and `src/sky/sources/target-sources.test.ts`. The production CI failed before reaching this workspace step, so these are independently reproduced entrypoint semantics, not failures observed in that run.

Smallest repair: quote the recursive pattern in all three package scripts (JSON escaped double quotes), so Windows and POSIX pass the same literal pattern to required Node 24. No custom general test framework is necessary. Verify a representative root/one-level/deeper fixture through both command lanes plus the existing launcher suite; then run the intended current suites once and classify any real failures by owner. Do not assert the historical 52 persist.

## Minimal follow-up scope and checks

- Repair deployment shared fixture + three consumers; run those files together, then the existing 248-test deployment owner suite once.
- Repair shared selector adapter and stale navigation wiring assertions; run the existing 36 shared tests, relevant existing Sky navigation/menu test and affected type check.
- Quote three workspace script globs and establish matching discovered identities at representative depths. After those fixes, one intended integrated release-code run supplies a new current failure inventory; classify failures before expanding fixes.
- Existing skipped CI build/bundle/image checks remain unverified until their prerequisites pass. This triage did not publish, deploy, change remote refs, execute device tests, rerun N01–N06, or modify fixed plans.

## Actual failed Product test names

- `tools/deployment/promote-release-candidate.test.mjs:98:1` — actual first Sky promotion from an absent store uses sealed PNGs, one preflight and verified backup before migration
- `tools/deployment/promote-release-candidate.test.mjs:127:1` — first Sky pull, backup and migration failures release leases and never fabricate current
- `tools/deployment/promote-release-candidate.test.mjs:142:1` — serialized Sky preparation cannot suppress the release preflight or hold its lease
- `tools/deployment/promote-release-candidate.test.mjs:152:1` — prepared file damage during backup is rejected on handoff before any migration
- `tools/deployment/promote-release-candidate.test.mjs:170:1` — descriptor drift after backup cannot borrow a prior compose preflight
- `tools/deployment/promote-release-candidate.test.mjs:180:1` — descriptor loss at the end of preparation retires the newly acquired lease
- `tools/deployment/recover-database.test.mjs:200:1` — authenticated archived Sky recovery restores real PNG sources with zero original-image actions before DB recovery
- `tools/deployment/recover-database.test.mjs:222:1` — new source-capable Sky backups require authenticated identity, not rehashed or downgraded source claims
- `tools/deployment/recover-database.test.mjs:250:1` — missing or intrinsically invalid source archives fail before any restored directory or DB action
- `tools/deployment/recover-database.test.mjs:271:1` — managed Sky recovery admits original cached sources and restores every old URL before DB work without current cutover
- `tools/deployment/recover-database.test.mjs:305:1` — managed restore rejects unavailable, wrong revision or wrong publication originals before DB effects and retires its lease
- `tools/deployment/recover-database.test.mjs:316:1` — managed restore preserves occupied paths and refuses bad confirmation, conflicting modes and store/backup/link overlap
- `tools/deployment/recover-database.test.mjs:331:1` — a failed database restore keeps the valid fresh Sky preparation and never marks it runtime-applied
- `tools/deployment/recover-database.test.mjs:346:1` — backup drift while original OCI sources resolve cannot publish a managed inventory or begin DB restore
- `tools/deployment/recover-database.test.mjs:362:1` — actual recovery facade forwards the managed option and validated repository to original admission before any DB process
- `tools/deployment/sky-static-consumer.test.mjs:100:1` — archived-source release rejects unbound, self-consistently rehashed, damaged-authentication and wrong-key backups before any process
- `tools/deployment/sky-static-consumer.test.mjs:130:1` — default release uses offline-restored original sources and authenticated backup through actual preparation and byte verification
- `tools/deployment/sky-static-consumer.test.mjs:149:1` — source-capable release bounds encrypted input before reading or authenticating oversized data
- `tools/deployment/sky-static-consumer.test.mjs:159:1` — retained prior-image release after failed verification keeps restored old URLs and reuses sources with a fresh authenticated backup
- `tools/deployment/sky-static-consumer.test.mjs:199:1` — offline-restored preview publishes current only after real static verification and preserves it through failed prior-image selection
