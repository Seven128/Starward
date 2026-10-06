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
- WeChat Mini Program environment/owned paths, isolation boundaries, current design-profile boundaries, three-tier feedback strength, and deterministic → warm WEAPP/DevTools → targeted physical development feedback → clean/fixed-candidate DevTools/device evidence promotion live in the root-owned on-demand `project_context/development-workflow.md`; its Product/Screen Contract lives in `screen-contracts/wechat-miniapp.md`. Neither Context nor a command's existence is an acceptance result.
- Remote staging/production, domain and filing bindings, CI/CD promotion, production secrets, migration, backup/restore, rollback and operational checks live in the root-owned on-demand `project_context/deployment.md`. Verification may qualify a candidate, but only attributable deployment and platform receipts establish remote or public-release state.
- Current implementation entry points for those paths live in `project_context/areas/main/implementation-index.md`; code is the current implementation truth, while these verification Context files own repeatable intended boundaries.

## Required Preparation

- Use Node.js 24+ and the installed pinned CLI. Install dependencies only when missing or changed; reading Context needs no installation.

## User-Journey Verification

- Apply this approach throughout the requested product scope. Derive checks from what users need to accomplish and the governing Screen Contracts; prioritize complete supported success paths, then relevant failure, cancellation and recovery behavior. Unexercised required journeys remain work even when current unit tests pass or no new code defect has been found.
- Own the test prerequisites within authorization: recover task-owned services and prepare isolated data, account roles, content and usable media. Reuse existing setup tools, APIs and domain owners. An empty test database or stopped local service is a setup task, not an external blocker. Protect user data and unrelated environments; test records may satisfy publication rules inside the isolated environment without claiming real-world verification or permission.
- Enter the actual product flow and observe its visible result, requests and applicable durable writes/readback. Administrative setup or seed data establishes preconditions; it cannot stand in for the user action being tested or prewrite its expected result. Use real media bytes when testing loading/export, and follow the owning runtime's isolation and evidence requirements.
- Separate controlled functional evidence from actual platform, device, supplier and deployment evidence. Fixtures use the existing adapter boundaries. If a real prerequisite cannot be supplied, identify the exact affected checks and continue independent journeys or supported layers; do not generalize that gap into a whole-module or whole-goal blocker. Controlled success does not close the external evidence gap.
- Fix observed discrepancies and rerun affected checks; reuse unchanged valid evidence and batch broader acceptance at useful milestones. Keep coverage and remaining obligations in the task's existing plan or ledger. This approach requires no new generic framework, mandatory report or per-action approval process.

## Universal Evidence Boundary

- Cross-product check selection and completion decisions follow [Project-local Implementation Decisions](../../../AGENTS.md#project-local-implementation-decisions): trace changed responsibilities, sample meaningful implementation differences, and expand on findings. Reuse existing evidence and targeted checks; no per-page scenario catalogue, additional report or quality score is required. UI output, business outcomes and architecture effects need observations at their respective owners, not a common source-marker proxy.
- The repository-root `npm test` currently validates Context only. Product code uses the owning workspace tests and applicable runtime checks; neither the root alias nor a single workspace test proves the full product.
- Do not treat static preview appearance, Context prose, or a command exit code as proof of live weather, routing, deployment, or human acceptance.
- Do not treat a fixed user/time/place/result, process-local repository, success label/evidence card, metadata-only upload, manifest-only offline pack, declaration-only native adapter, or prewritten trace/restore report as proof that a business loop ran.
- Fixtures may isolate uncontrollable providers or device APIs in automated tests, but they must be injected behind the same production adapter and cannot replace the production route, state transition, sink write, restart readback, or failure behavior.
- For data-dependent capabilities, distinguish a controlled positive path, failure/recovery behavior, and usability in the intended delivery environment. Select checks from the promised effect, including a representative supported input whose required data is actually available; a suite containing only safe empty/fallback cases leaves the capability unverified. Inspect assertions, not just test names: suppressing the effect or keeping old content must not still establish success. Existing fixtures/provider simulations retain their limited scope; a missing live prerequisite is addressed within authorization or reported as the concrete remaining dependency, not waived because the simulated path passed.

## Expected Signals

- Tiny Context validation completes without structural errors.
- Doctor reports the installed package and managed surfaces as healthy; advisory findings must be reviewed rather than silently ignored.

## Storage Boundaries

- Do not store one-off logs, screenshots, generated reports, secrets, tokens, cookies, device identifiers, or pass/fail history in Context.
