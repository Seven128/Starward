# Verification Context: main

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
- WeChat Mini Program environment/owned paths, isolation boundaries, selected-visual-target routing, three-tier feedback strength, and deterministic → warm WEAPP/DevTools → targeted physical development feedback → clean/fixed-candidate DevTools/device evidence promotion live in the root-owned on-demand `project_context/development-workflow.md`; its Product/Screen Contract lives in `screen-contracts/wechat-miniapp.md`. Neither Context nor a command's existence is an acceptance result.
- Remote staging/production, domain and filing bindings, CI/CD promotion, production secrets, migration, backup/restore, rollback and operational checks live in the root-owned on-demand `project_context/deployment.md`. Verification may qualify a candidate, but only attributable deployment and platform receipts establish remote or public-release state.
- Current implementation entry points for those paths live in `project_context/areas/main/implementation-index.md`; code is the current implementation truth, while these verification Context files own repeatable intended boundaries.

## Required Preparation

- Use Node.js 24+ and the installed pinned CLI. Install dependencies only when missing or changed; reading Context needs no installation.

## Universal Evidence Boundary

- The repository-root `npm test` currently validates Context only. Product code uses the owning workspace tests and applicable runtime checks; neither the root alias nor a single workspace test proves the full product.
- Do not treat static preview appearance, Context prose, or a command exit code as proof of live weather, routing, deployment, or human acceptance.
- Do not treat a fixed user/time/place/result, process-local repository, success label/evidence card, metadata-only upload, manifest-only offline pack, declaration-only native adapter, or prewritten trace/restore report as proof that a business loop ran.
- Fixtures may isolate uncontrollable providers or device APIs in automated tests, but they must be injected behind the same production adapter and cannot replace the production route, state transition, sink write, restart readback, or failure behavior.

## Expected Signals

- Tiny Context validation completes without structural errors.
- Doctor reports the installed package and managed surfaces as healthy; advisory findings must be reviewed rather than silently ignored.

## Storage Boundaries

- Do not store one-off logs, screenshots, generated reports, secrets, tokens, cookies, device identifiers, or pass/fail history in Context.
