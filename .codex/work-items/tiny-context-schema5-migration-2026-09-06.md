# Tiny Context 0.12.0 / schema 5 migration

Task-local migration record, not durable Context or product acceptance.

The pre-migration user changes were committed on main as `a83ee5b`. The upgrade follows the installed 0.12.0 README and migrations/README.md. Relevant prior Starward tasks were idle/not running; Node 24.16.0 was used because the default shell PATH selected WeChat DevTools' Node 16.

## Migration and preservation

- Official upgrade completed with `--sessions-stopped`, preserving the original default body set during software migration. The subsequent authorized Context reorganization deliberately makes only global.md default; detailed product facts move to product-profile.md and architecture/Area/verification remain on demand.
- The 10 modified-asset warnings were byte-identical to the installed 0.11.0 package, with no project customization. Original bytes were preserved under ignored tmp/ty-context/manual-retirement before explicit retirement. Official backup: tmp/ty-context/upgrade-backups/657376ad-a181-4640-8a09-86c1f5629736.json. Git preserves the full original tracked state.
- Retired package Skills, worker profile, Hooks, managed rules and old CI/Make integration were removed by the official migration. Project-owned Make and CI now validate Context with the pinned local package; project tests remain independent.
- Removed the 0.11.0 postinstall overlay, its proof-command wrapper, old .long-task author/rebind scripts and three obsolete compiler-dependent resource generators. Their generated selected resource bytes remain intact.
- Removed 15 byte-identical draft copies, totaling 19,636,604 bytes. Their selected-handoff counterparts remain. No current selected resource or adopted visual value was deleted. Remaining references to deleted paths are historical baseline/Contract provenance; the current task source index was refreshed.
- Existing resource-inspector and verifier files remain standalone project consumers, not replacement Tiny Context compilers or acceptance authorities. Historical Contracts and source notes remain readable data. No new handoff or symbolic expansion was invented.
- Preserved 32 code-owner maintenance concerns from old modularity configuration as on-demand architecture rationale, without retaining a line-count gate.
- Reconciled the stale Taroify requirement with the already-selected bounded Taro/Starward substrate. Updated retired workflow language and corresponding project-owned digest bindings after inspecting changes; visual token values remain unchanged.
- Android diagnostic checkpoint identity now derives from actual source bytes rather than retired Git workflow state, while the existing verifier still binds production/APK, design, device and verifier inputs.
- npm also reconciled the existing miniapp-api astronomy-core workspace dependency into package-lock.json. No application package version changed.

## Current-candidate verification

- `make validate-context`, `make context-doctor`: passed; schema 5, one default body file, 2,323 bytes.
- `ty-context upgrade --check`: no migration pending (sync-only).
- `npm ls project-tiny-context-harness --depth=0`: 0.12.0.
- `npm run design:system:verify`: passed.
- `npm run design:targets:verify`: passed, retained 14 target files / 95 control identities.
- `npm run test:miniapp:design-bindings`: passed, both resource packages and bounded production probes.
- `npm run test:miniapp:workflow`: 76 passed. Corrected an existing stale palette expectation against the already-selected Field Signal DESIGN values.
- `npm run test:verification:fast`: 64 passed, including source-change/missing-source diagnostic identity regression without Git workflow state.
- `git diff --check`: passed. Product code under apps/packages/workers has no migration-attributable changes.

Engineering/architecture review and Context drift review found the changed ownership and entrypoints consistent with the new package boundary. These checks establish migration/tooling/resource integrity, not product runtime acceptance. No Android/WeChat physical-device journey, deployment, public release or remote CI run was performed. Start a fresh host task/session for later development so previously loaded old workflow instructions are not reused.

Context: updated product-profile, routing, architecture maintenance and verification ownership for schema 5.
