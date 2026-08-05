# Future WeChat Miniapp Development, Test, And Acceptance Environment Context

This root-owned, on-demand verification Context is the single durable owner for the future WeChat miniapp environment topology, path reservations, isolation boundaries, evidence-promotion rules, bootstrap decisions, and stable routing to its selected visual target. It does not define miniapp product behavior, a Product Surface, a Screen Contract, visual token values, an implementation workspace, or proof that any runtime exists; `DESIGN.md` owns the independently selected design target and exact values.

## Reservation Status And Scope

**设计权威已选定、运行环境仍仅预留：当前仓库不存在小程序 workspace、产品面、可运行命令、CI lane 或已接受运行证据。**

- At this Context revision, `apps/wechat-miniapp/` is a local empty directory with no tracked files or child `package.json`. The root `apps/*` npm glob makes a future package discoverable only after one is intentionally created; it does not make the empty directory a registered npm workspace. The root lockfile and `npm query .workspace` currently contain no miniapp package.
- No miniapp source, generated runtime token output, private project config, acceptance code, acceptance report, platform tool, npm build/test command, WeChat DevTools project, AppID/key binding, CI job, Product Surface, Screen Contract, Source Pack, or accepted runtime evidence currently exists. The sole exception is the adopted visual-system target and its project-owned authority verification described below; neither is a runtime capability.
- `docs/source-plan.md#non-goal.mini-program-full-parity` and `docs/source-plan.md#quality-release-observability.requirement.platform-extension-boundary` remain upstream product-scope constraints: a future miniapp is limited to later sharing, lightweight query, invitation, and acquisition responsibilities, does not require full APP parity, and cannot prove APP completion. This Context neither expands nor implements that product scope.
- Root `DESIGN.md` now owns `target.system.wechat-miniapp-soft-instruments-2026-08-05` as an independent Mini Program profile. It was authored from the indexed Mini Program brief/references and does not use Mobile/App/Admin targets, App YAML values, `packages/ui-system/**`, or legacy `docs/design-*` exports as inputs. No Mini Program runtime projection exists; future product/surface applicability must still be resolved without borrowing another subproject's resources.
- A reserved path is not evidence that its directory, owner, command, runtime, CI lane, or acceptance carrier exists. Current implementation navigation remains in `project_context/areas/main/implementation-index.md`, which intentionally must not list these reservations as current code.

## Selected Mini Program Design Authority

- Stable target: `target.system.wechat-miniapp-soft-instruments-2026-08-05`.
- Canonical owner and anchor: `DESIGN.md#wechat-mini-program--soft-instruments-v1`; root `DESIGN.md` remains the single authored exact-value source.
- Selected source snapshot: `docs/design-resources/miniapp-design-system-2026-08-05/candidate-design-brief.md` SHA-256 `ab1faeb96a3e52125b19fdf8f224caf6cee0db79cf16a9a12f86c5af49991745`; source index SHA-256 `80cb69b9501b556ca8c186c770e5257ee5136e031e52ce54c42d7298eba3e3f7`.
- Provider/editable upstream: Open Design `0.16.1`, `user:soft-instruments`, project `ds-soft-instruments`; the provider body digest matches the selected source. Project files, not provider state, are canonical.
- Coverage: independent day/night/observation roles, card/elevation grammar, Tier-A functional and selective Tier-B 3D icons, `rpx` layout/spacing, component states, motion, accessibility, asset/performance posture, and cold-start red continuity.
- Boundary: this target does not define destinations, page responsibilities, information hierarchy, account/auth, API/service reuse, framework, package architecture, route ownership, runtime behavior, or acceptance journeys. It cannot be treated as full App parity or as proof that a Mini Program exists.
- Dependency direction: a future Mini Program package and its single generated token adapter consume the named `DESIGN.md` profile. They cannot import the App runtime token module, originate visual values, or edit the selected source snapshot in place.

## Ownership And Dependency Direction

- This file is the unique source of truth for the cross-layer miniapp environment and evidence topology while the implementation is absent. `project_context/context.toml`, `project_context/global.md`, `project_context/architecture.md`, and the main verification index only route readers here; they do not duplicate its rules.
- Existing `project_context/areas/main/verification/development-loop.md`, `acceptance-runtime.md`, and `android-native.md` continue to own the current React Native/Web/Android paths. Their current commands, ports, artifacts, design targets, and acceptance results must not be projected onto the future miniapp.
- When a real miniapp package exists, its source, runner, acceptance harness, and selected service adapters must consume this topology. Implementation code, generated config, CI, or reports must not become a reverse authority that silently changes it.
- Do not create a `wechat-miniapp` Area or `project_context/workspaces/wechat-miniapp/**` mirror while no Context-bearing implementation workspace exists. A later workspace-local Context is justified only by actual durable workspace facts; the root file remains the owner of repository-crossing promotion and isolation rules.

## Four-Layer Environment Topology

### 1. Development

- Use the cheapest faithful feedback path first: changed-module type/unit/contract checks, then a future same-source H5/browser renderer with hot update when the selected framework provides one. A separately maintained browser imitation of the miniapp is forbidden.
- Use future weapp/WeChat DevTools development feedback when a change touches WeChat components or APIs, routing, permissions, storage, lifecycle, package configuration, or other behavior the H5 renderer cannot faithfully exercise. This is still development feedback, not acceptance.
- Every development session uses disposable API, data, file, outbox, Provider-ledger, session, and output roots plus one bounded process/port owner. A warm process is reusable only inside its identified session and never becomes acceptance evidence.
- Development can prove only fast local feedback for the exercised renderer and inputs. It cannot produce a browser, DevTools, device, release, or product-acceptance conclusion.

### 2. Deterministic Test

- Unit, domain, contract, adapter, state-machine, and component tests use deterministic fixtures and a run-unique writable root. Uncontrollable platform or Provider behavior is injected behind the same future production boundary rather than replaced with a second implementation.
- Real paid Providers, production accounts/data, irreversible external side effects, shared mutable services, and nondeterministic clock/network/location dependencies are forbidden. Success, error, timeout, permission denial, network failure, retry/idempotency, recovery, cancellation, and cleanup are exercised where applicable.
- These checks can establish deterministic semantics and failure behavior inside their declared harness. They cannot prove a WeChat renderer, DevTools runtime, permission prompt, map/location integration, device lifecycle, or packaged build.

### 3. Browser / Tool Acceptance

- First freeze a settled candidate and build its future H5 acceptance projection into an isolated `%TEMP%/starward-miniapp-h5-*` environment. Run the complete applicable portable journey against isolated API/data/state; a development watch session or partial smoke run is not formal browser acceptance.
- Only after the deterministic and full browser checks for that candidate are green and no relevant input is stale, generate the settled weapp output and import/copy it into a run-unique `%TEMP%/starward-miniapp-devtools-*` project for WeChat DevTools acceptance. Collect all tool-side findings, return to the fast loop, batch repairs, rerun affected cheap checks and the complete applicable browser journey, and rebuild/import weapp only after the repaired candidate is settled.
- A settled browser build plus isolated API/data can prove only the portable journey actually observed in the browser. It cannot prove WeChat component/API semantics, package limits, permissions, storage, lifecycle, DevTools import/build, or a real device.
- A settled weapp build plus WeChat DevTools can prove only the exact tool-side WeChat runtime behavior actually observed for the bound candidate, tool version, project configuration, fixtures, and environment. It cannot inherit unobserved browser claims or prove representative-device behavior.

### 4. Representative-Device Acceptance

- Produce a device-acceptance preview or experience build from one settled candidate in the dedicated device environment. Every selected representative device must use the same exact device-lane build identity; this does not permit reuse of the DevTools lane's AppID/key, writable state, secrets, or project directory.
- Verify the selected permissions and denial paths, network profiles and recovery, location behavior and privacy, map behavior, cold start, warm start, foreground/background and termination/relaunch lifecycle, storage/readback where applicable, cleanup, and measured performance on the declared device population.
- Device model/OS, WeChat version, base-library version, network/location conditions, sample population, workload, metrics, budgets, comparators, and tolerances remain decision-required. No performance or capacity claim exists until a project-owned measurement binds all of them.
- Device-specific conclusions cannot be inferred from Browser or DevTools results. Results from one device, OS, WeChat version, permission state, or network profile cannot be generalized to an undeclared population.

## Candidate Promotion, Freshness, And Cost Control

1. Develop and repair with deterministic checks plus the cheapest faithful hot renderer. Coalesce one coherent change batch before promotion.
2. Freeze one candidate identity covering all acceptance-relevant source, dependency lock, build/config, fixture/data contract, asset, API contract, and runner inputs. The exact fingerprint implementation is decision-required until a runner exists.
3. Run deterministic checks, then one complete applicable H5 browser acceptance pass for that settled candidate.
4. If the candidate remains settled, generate/import weapp once and run the complete applicable WeChat DevTools acceptance pass. A failed tool pass is a collection point for batched repair, not a rebuild trigger per finding.
5. After Browser and DevTools obligations are fresh, generate the dedicated device preview/experience build and run the declared representative-device matrix with the same exact device-lane build.
6. A relevant candidate, environment, fixture, API, toolchain, AppID/config, or build-input change invalidates every dependent downstream result. A platform-only change need not rerun an unaffected browser result only when the future runner proves the browser fingerprint unchanged; DevTools and device obligations remain mandatory for that platform boundary.
7. Test-only reports, screenshots, logs, and other excluded non-production outputs must not force a package rebuild, but they also never make evidence fresh. Exact production/build and evidence-freshness input sets must be declared separately when commands are implemented.
8. Do not package after each edit, after each hypothesis, or merely because another cheap check ran. Package only at a stable promotion boundary or when a defect can be reproduced only in the packaged/tool/device boundary.
9. Record build, import, startup, exercise, and teardown durations only in disposable run output. The topology is cost-ordered, but it makes no claim that H5, weapp packaging, DevTools, or device verification currently takes any particular time or is globally optimal without measurement.

Formal acceptance for a future target is the conjunction of fresh, applicable observations from their own layers on the bound candidate. Missing product journeys, commands, environments, tools, devices, or external confirmation remain `unverified` or `decision-required`; no weaker layer upgrades the claim.

## Reserved Paths

| Path | Reservation and current status | Future ownership and persistence rule |
| --- | --- | --- |
| `apps/wechat-miniapp/**` | Reserved source/workspace root; a local empty directory exists, but there is no tracked package or implementation. | Future miniapp runtime source only after explicit bootstrap. Its existence must not imply a Surface, an additional/implemented design target, runnable package, or acceptance. |
| `apps/wechat-miniapp/dist/**` | Reserved, currently absent generated-output root. | Generated only, never durable Context or tracked source. Future outputs must be partitioned by environment and candidate/run identity so no layer shares a writable output directory. |
| `apps/wechat-miniapp/project.private.config.json` | Reserved, currently absent local private WeChat project configuration. | Machine-local only. An exact ignore rule must be installed before first creation; it must never be committed, copied into reports, or treated as shared configuration authority. |
| `tests/acceptance/miniapp/**` | Reserved, currently absent acceptance-code root. | Future trackable scenario/runner code only after real product and runtime owners exist. Code presence cannot prove a run passed. |
| `tests/acceptance/playwright-report/miniapp/**` | Reserved, currently absent generated acceptance-report root. | Run-specific generated output only; never committed or promoted into Context. Retention/redaction remains decision-required. |
| `tools/miniapp/**` | Reserved, currently absent platform-runner/tool root. | Future trackable orchestration, health, fingerprint, import, process, and cleanup code. No executable command or capability is registered now. |
| `%TEMP%/starward-miniapp-h5-*` | Reserved; no repository-owned active H5 acceptance environment or registered capability exists. Unattributed/empty local matches may exist and are not reusable evidence. | One run-unique disposable root containing only that lane's build, API/data/files/outbox/ledger/session state and reports as applicable. |
| `%TEMP%/starward-miniapp-devtools-*` | Reserved, currently absent WeChat DevTools temporary project. | One run-unique disposable import/project root; never reuse an unknown, stale, or another lane's project/private config. |
| Repository-external absolute paths for preview QR codes, upload private keys, AppID/key material, and other secrets | Exact paths and values are intentionally absent and must not be recorded in Context. | Inject through a future approved local/CI secret mechanism. Never place secret values, QR artifacts, cookies, tokens, precise device identifiers, or complete sensitive fields in source, logs, reports, or Context. |

Additional future run roots may use `%TEMP%/starward-miniapp-dev-*`, `%TEMP%/starward-miniapp-test-*`, and `%TEMP%/starward-miniapp-device-*`. They are logical reservations, not existing directories or commands. Every `*` resolves to an unambiguous run identity; exact naming and retention remain decision-required.

## Isolation And Resource-Lifecycle Invariants

- Development, Deterministic Test, Browser Acceptance, DevTools Acceptance, and Device Acceptance never share a writable database, file root, outbox, Provider ledger, session secret, AppID/key, port, process owner, mutable cache, or generated-output directory. A layer for which AppID/key is not applicable records that boundary as N/A instead of borrowing another layer's credentials.
- Each layer has a distinct environment identity and run namespace. Immutable source and read-only fixtures may be shared only by exact digest; each writable consumer receives an isolated copy or isolated service namespace.
- A run owns its exact child-process tree, ports, temporary roots, emulator/tool/device session, and report output. Startup fails closed on an unknown listener, mismatched owner, stale descriptor, dirty non-resettable state, missing secret binding, or ambiguous project identity.
- Success, failure, timeout, cancellation, and tool interruption all execute bounded teardown. Cleanup may remove only explicitly resolved run-owned temporary paths and processes; it must not broadly delete repository roots, shared caches, another run, another environment, or user data. Interrupted leftovers are disposable and cannot be reused without exact owner/fingerprint validation.
- Provider/API calls use lane-specific adapters, credentials, quota ledgers, idempotency identities, and writable state. Deterministic Test always uses isolated substitutes; any real sandbox/free Provider in other layers requires explicit authorization, provenance, cost and side-effect policy. Production credentials, paid traffic, public redistribution, and irreversible actions are not implied.
- Private config, secrets, QR codes, generated bundles, screenshots, traces, raw logs, device identifiers, and run reports are runtime artifacts, not durable facts. Context may name their approved class or reserved location but never embeds their contents or a historical pass/fail result.
- Precise location, permission state, account/session identity, and device metadata are minimized and redacted in reports. The future acceptance owner must define retention and deletion before representative-device evidence is collected.

## Failure And Recovery Ownership

The following responsibilities are mandatory before the corresponding future carrier can be considered runnable; the paths are reserved and the carriers are currently absent.

| Boundary | Future owner | Required behavior |
| --- | --- | --- |
| User-visible miniapp runtime | `apps/wechat-miniapp/**` runtime owner | Distinguish loading/empty/stale/degraded/error/success; own permission request and denial, network/tool/API timeout presentation, retry/cancel, lifecycle restoration, local-state recovery, and user-visible cleanup result. |
| Environment and platform runner | `tools/miniapp/**` runner owner | Allocate and verify run identity, ports, processes, temp roots, environment config and candidate fingerprint; enforce startup health, timeouts, cancellation, complete child-process teardown, and scoped cleanup. |
| Acceptance scenarios and reports | `tests/acceptance/miniapp/**` acceptance owner | Establish/reset deterministic state, exercise positive and negative journeys, bind observations to candidate/environment/tool/device identity, assert recovery and cleanup, redact outputs, and place only disposable reports under the reserved report root. |
| API and Provider behavior | Explicitly selected service/adapter owner; path and reuse of any current service are decision-required | Own request timeout, retry/backoff, idempotency/conflict, Provider degradation, outbox/ledger consistency, cost/quota enforcement, and restart readback. Until bound, Provider-backed success and recovery are unverified. |
| Representative-device session | Future device-acceptance runner plus named human/device operator | Prepare the declared device/network/permission states, verify the exact device-lane build, perform lifecycle transitions, record bounded observations, and revoke/clean local credentials and artifacts after the run. |

An app-level error label does not prove the adapter timed out or recovered; a runner exit code does not prove cleanup; an API receipt does not prove the UI handled it. Each owner must expose the furthest independently failing boundary it claims.

## Decision-Required Before Bootstrap Or Acceptance

- Exact miniapp product responsibilities, user journeys, account/auth boundaries, Product Surface, Screen Contract, and surface-specific accessibility/interaction ownership. The visual authority is selected, but it does not decide these product facts; existing App/Admin surfaces and assets are not defaults.
- Framework and package architecture; Node/npm requirements; package name; workspace/lockfile registration; H5/weapp targets; dependency and base-library versions; source/config/output layout; supported operating systems.
- Whether the selected framework produces a faithful same-source H5 renderer. If not, the browser lane must be narrowed or replaced explicitly rather than implemented as a detached imitation.
- Build, dev, deterministic-test, browser-acceptance, DevTools-acceptance, preview/experience, upload, cleanup, and verification commands; exact input fingerprints; exit/failure contracts; port allocation and process-ownership protocol.
- WeChat DevTools version and installation path, CLI versus GUI/import automation, base-library version, simulator/device profiles, login/session handling, project configuration, and supported package/subpackage limits.
- Environment-specific AppIDs, keys, project config, upload identity, preview/experience channel, repository-external absolute secret/QR locations, rotation/revocation, CI secret mechanism, and redaction policy. No lane may reuse another lane's AppID/key.
- API/service ownership and whether any existing Starward API/contracts are reusable; endpoint/schema/version compatibility; fixture catalog; database/file/outbox/Provider-ledger layout; reset/readback/idempotency rules; Provider provenance, cost, quota, and failure-injection mechanism.
- Exact browser, DevTools, and device acceptance journeys and negative cases; cold/warm/background/foreground/termination transitions; permission, network, location, map, storage, and cleanup assertions; observation/comparator policy.
- Representative device/OS/WeChat-version population, selection rationale, network and location profiles, performance/capacity workload, metrics, sample count, baseline/budget, comparator/tolerance, and owner of any required human confirmation.
- CI lane, runner OS/image, tool installation/licensing/login feasibility, parallelism and mutable-resource allocation, artifact/report retention, redaction, failure diagnostics, and promotion policy. There is no current miniapp CI lane.

## Future Bootstrap Admission

Before the reservation can be converted into current capability:

1. Define and update the owning product/surface Context for the selected miniapp responsibilities, then consume `target.system.wechat-miniapp-soft-instruments-2026-08-05` without borrowing App/Admin design artifacts or inventing another visual authority.
2. Create a real package manifest and intentionally register the workspace, dependency locks, versions, commands, and implementation owner; then update the implementation index from code truth.
3. Install exact ignore rules before generating `dist/**`, `project.private.config.json`, QR/secret material, temporary projects, or reports. Confirm all secret and sensitive-artifact paths resolve outside the repository where required.
4. Implement the isolated runner, health/fingerprint protocol, deterministic reset, failure/recovery seams, teardown, and scoped cleanup before registering a CI or acceptance lane.
5. Bind every environment to distinct mutable resources and credentials, then prove the promotion/staleness rules with project-owned checks. Only actual runnable commands may be added to verification Context.
6. Update this Context and its triggers whenever a reservation becomes current, a command/version/path/owner changes, or a new evidence boundary is adopted. Do not create a ghost Area merely because the source directory was bootstrapped.

## Design Rationale And Alternatives

- A root, on-demand Context keeps the absent cross-workspace capability discoverable without inflating the default Area or pretending a workspace exists. Placing these facts in the current Mobile development loop would wrongly inherit Expo/Android commands and evidence; scattering them across architecture and verification files would create duplicate truth.
- The cost-ordered ladder preserves fast feedback while retaining platform-specific proof. Always packaging after each edit wastes an unmeasured expensive boundary; browser-only acceptance misses WeChat semantics; DevTools-only acceptance slows portable repairs and still misses real-device behavior; shared mutable environments destroy attribution and recovery confidence.
- A plausible future challenge is adding a second miniapp target or CI-hosted DevTools lane. It lands as another isolated environment binding and promotion obligation here, with workspace-local detail only if durable facts warrant it; it must not duplicate product truth or reverse the dependency into current App/Admin owners.
- No numeric speed, reliability, capacity, or compatibility improvement is claimed. Future optimization requires measured workload, environment, baseline/budget, comparator/tolerance, and a project-owned measurement.

## Repository Verification Boundary

- `npm run context:validate`, `make validate-context`, `make validate-harness`, `npm run context:doctor`, and the package-managed source-parity check can validate Context structure, routing, installation health, and applicable source-workspace parity.
- Repository review must confirm the root workspace query and lockfile still omit miniapp, reserved implementation/test/tool/report paths remain absent or intentionally untracked, the implementation index does not list them as current, the selected visual target remains rooted only in `DESIGN.md`, and no miniapp Area, Source Pack, Product Surface, runnable runtime command, CI lane, or accepted runtime evidence was created.
- These checks do not build, test, run, or accept a miniapp. No command named in this section is a miniapp capability.
