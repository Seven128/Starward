# Verification Context: main

2026-10-31用户最新规则：已编写的项目自有测试代码全部退役；微信原生迁移期间不得新增、恢复或改名重建单元、集成、合同、E2E测试及专用夹具/模拟器/测试脚本。旧“复用/适配/补写测试”指令被此规则覆盖。代码质量约束、真实业务的参数/权限/完整性校验保持；使用类型检查、编译、既有资源/发布保护和必要真实运行观察，不以空测试或模拟结果声明通过。历史报告/原始采集可在原条件内作为证据，不能冒当前测试覆盖。

This on-demand Context is the entry point for Starward verification. It records the shortest recovery path and routes specialized development, acceptance/runtime, and Android/native detail to registered on-demand verification Context; it is not a test report or a second definition of product acceptance.

## Owner

- Owning area: main.

## Verification Routing

- npm run context:sync refreshes package-managed Tiny Context surfaces after package/config changes.
- npm run context:validate checks Context graph structure and recoverability.
- npm run context:doctor checks installation health and reports advisory Context footprint findings.
- `make validate-context` runs the repository-owned Context recoverability check; `make context-doctor` checks installation structure.
- Development feedback, warm-session ownership, Fast Refresh, changed-boundary routing, and repair cadence live in `project_context/areas/main/verification/development-loop.md`.
- Design/authority checks, formal browser/API acceptance, persistence/readback, failure/counterfactual boundaries, and target-runtime interpretation live in `project_context/areas/main/verification/acceptance-runtime.md`.
- Android toolchain, Release APK, device/shard/checkpoint, Gradle/CMake/cache, and expensive-session rules live in `project_context/areas/main/verification/android-native.md`.
- Mini Program physical-phone `Development Device Feedback` and `Settled-Candidate Device Verification`, including USB/ADB, official preview/remote-debug boundaries, privacy/scoped operations and their distinct evidence limits, live in `project_context/areas/main/verification/wechat-device.md`; neither channel reuses the React Native APK runner, and development feedback never becomes acceptance.
- WeChat Mini Program environment/owned paths, isolation boundaries, current design-profile boundaries, three-tier feedback strength, and deterministic → warm WEAPP/DevTools → targeted physical development feedback → clean/fixed-candidate DevTools/device evidence promotion live in the root-owned on-demand `project_context/development-workflow.md`; its Product/Screen Contract lives in `screen-contracts/wechat-miniapp.md`. Neither Context nor a command's existence is an acceptance result.
- Remote staging/production, domain and filing bindings, CI/CD promotion, production secrets, migration, backup/restore, rollback and operational checks live in the root-owned on-demand `project_context/deployment.md`. Verification may qualify a candidate, but only attributable deployment and platform receipts establish remote or public-release state.
- Current implementation entry points for those paths live in `project_context/areas/main/implementation-index.md`; code is the current implementation truth, while these verification Context files own repeatable intended boundaries.

## Required Preparation

- Use Node.js 24+ and the installed pinned CLI. Install dependencies only when missing or changed; reading Context needs no installation.

## User-Journey Verification

- **Choose by outcome and risk.** Derive checks from user goals and Screen Contracts. Prioritize complete critical journeys and uncertain shared boundaries; choose representative inputs and relevant failure/recovery cases. Avoid testing every combination or repeatedly proving the same rule. Unexercised required journeys remain work even when existing tests pass.
- **Own usable test conditions.** Within authorization, recover task-owned services and prepare isolated data, roles, content and real media bytes using existing tools and domain owners. Preserve user data. Test records can exercise publication rules without claiming real-world verification; seed or administrative setup establishes preconditions, not proof of the user action.
- **Verify the effect.** Exercise actual product entrypoints and observe the applicable rendered result, state transition and durable write/readback. Expectations come from requirements. A check must reject missing effects, stale results or wrong identities; a click, successful response, screenshot or green test count alone does not establish the user outcome.
- **Verify design conformance.** UI acceptance must compare the actual target runtime strictly with current adopted resources under matching conditions, following [design comparison requirements](../../context-maintenance.md#mini-program-page-design-resources) for the Mini Program. Functional success does not establish visual or interaction fidelity; repair deviations and repeat affected comparisons before passing.
- **Spend verification effort where it adds evidence.** Use focused owner-level checks for logic and faithful runtime journeys for integration; use target devices where platform behavior matters. Reuse evidence whose relevant inputs and requirements remain valid. Investigate causal failures, batch related fixes and broader builds, and rerun affected layers when changes or unresolved risks justify them. Follow existing runtime acceptance requirements without inventing additional gates or frameworks.
- **Keep gaps specific.** Controlled functional tests, actual platform/device behavior and external service/deployment readiness prove different things. Substitute uncontrollable dependencies only at existing adapter boundaries. Scope unavailable prerequisites to the affected checks and continue the rest; empty test data or recoverable local services are preparation work. Record remaining coverage in the existing plan or ledger, without adding routine reports.

## Test Design And Maintenance

Test authoring requires explicit user authorization under [Development execution](../../../AGENTS.md#development-execution). Only then read [starward-write-tests](../../../.codex/skills/starward-write-tests/SKILL.md) for test design, implementation, regression counterchecks and E2E evidence. Running existing checks, required runtime verification and minimal adaptations that preserve existing coverage do not invoke that Skill.

When existing checks fail, distinguish product defects from harness failures or outdated contracts. Preserve the intended behavior assertions; do not restore obsolete production structure or weaken assertions merely to satisfy a fixture. A fixture redesign that expands test infrastructure follows the authoring authorization rule.

## Universal Evidence Boundary

- Cross-product check selection and completion decisions follow [Project-local Implementation Decisions](../../../AGENTS.md#project-local-implementation-decisions): trace changed responsibilities, sample meaningful implementation differences, and expand on findings. Reuse existing evidence and targeted checks; no per-page scenario catalogue, additional report or quality score is required. UI output, business outcomes and architecture effects need observations at their respective owners, not a common source-marker proxy.
- Automated test entrypoints, including the old root `npm test`, were retired on 2026-10-31. Use the current package scripts for Context, types, build and resource/release validation; actual product acceptance remains a separately observed result. A green pipeline now makes no automated product-test coverage claim.
- Do not treat static preview appearance, Context prose, or a command exit code as proof of live weather, routing, deployment, or human acceptance.
- Source extraction and runtime simulation provide bounded evidence and cannot replace required runtime acceptance.
- Do not treat a fixed user/time/place/result, process-local repository, success label/evidence card, metadata-only upload, manifest-only offline pack, declaration-only native adapter, or prewritten trace/restore report as proof that a business loop ran.
- Fixtures may isolate uncontrollable providers or device APIs in automated tests, but they must be injected behind the same production adapter and cannot replace the production route, state transition, sink write, restart readback, or failure behavior.
- For data-dependent capabilities, distinguish a controlled positive path, failure/recovery behavior, and usability in the intended delivery environment. Select checks from the promised effect, including a representative supported input whose required data is actually available; a suite containing only safe empty/fallback cases leaves the capability unverified. Inspect assertions, not just test names: suppressing the effect or keeping old content must not still establish success. Existing fixtures/provider simulations retain their limited scope; a missing live prerequisite is addressed within authorization or reported as the concrete remaining dependency, not waived because the simulated path passed.

## Expected Signals

- Tiny Context validation completes without structural errors.
- Doctor reports the installed package and managed surfaces as healthy; advisory findings must be reviewed rather than silently ignored.

## Storage Boundaries

- Do not store one-off logs, screenshots, generated reports, secrets, tokens, cookies, device identifiers, or pass/fail history in Context.
