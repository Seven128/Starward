# Verification Context: main

## Owner

- Owning area: main.

## Verification Paths

- npm run context:sync refreshes package-managed Tiny Context surfaces after package/config changes.
- npm run context:validate checks Context graph structure and recoverability.
- npm run context:doctor checks installation health and reports advisory Context footprint findings.
- npx --yes @google/design.md lint DESIGN.md checks the authored visual-system document structure.
- python C:/Users/777/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/uiux_design checks the project interaction Skill structure and metadata.
- npx --yes impeccable detect docs/design-system/brand.html performs an auxiliary visual-design scan when the CLI can inspect the static page.

## Required Preparation

- Run npm install from the repository root before Tiny Context commands.
- Network access may be required the first time the Google design.md or Impeccable CLIs are resolved through npx.

## Expected Signals

- Tiny Context validation completes without structural errors.
- Doctor reports the installed package and managed surfaces as healthy; advisory findings must be reviewed rather than silently ignored.
- Design lint completes without schema/structure errors.
- Project interaction Skill validation completes without frontmatter, naming, or resource errors; its authority statement keeps DESIGN.md/Source Plan/Context upstream.
- Imported brand, light-kit, and dark-kit HTML files can resolve their local font and supporting artifact paths.
- Every Outcome acceptance run uses at least two materially different inputs through production entry points and proves the result changes with those inputs.
- Stateful and artifact-producing flows prove the applicable database/file/object/native sink write and read it back from a fresh service instance, process, or app restart; in-memory continuity is insufficient.
- Native and external boundaries expose an invocation/result seam so automated tests can substitute an isolated adapter, while the production runtime either invokes the real adapter or presents an explicit unavailable/degraded state.
- Success, failure/timeout/permission denial, duplicate/idempotent retry, and conflict behavior are observed where applicable. Removing the write, adapter call, restart readback, or input dependency must make the owning Outcome Check fail.

## Acceptable Warnings

- Impeccable findings are review signals, not a Tiny Context gate.
- Static Open Design kits are reference surfaces and cannot by themselves prove production application behavior.
- Until production UI exists, prose and Skill validation cannot prove interruption, velocity handoff, haptics, system-gesture competition, reduced motion, frame pacing, or red-light luminance; those require automated state checks and representative real-device evidence.
- Representative outdoor/device validation and China production promotion may remain future external gates for the current owner-only personal trial. This postpones only the external evidence; it does not waive production-path integration, local persistence, adapter invocation, honest degradation, emulator tests, or counterfactual machine evidence.

## Excluded Dead Ends

- Do not treat static preview appearance, Context prose, or a command exit code as proof of live weather, routing, deployment, or human acceptance.
- Do not treat a fixed user/time/place/result, process-local repository, success label/evidence card, metadata-only upload, manifest-only offline pack, declaration-only native adapter, or prewritten trace/restore report as proof that a business loop ran.
- Fixtures may isolate uncontrollable providers or device APIs in automated tests, but they must be injected behind the same production adapter and cannot replace the production route, state transition, sink write, restart readback, or failure behavior.

## Forbidden Content

- Do not store one-off logs, screenshots, generated reports, secrets, tokens, cookies, device identifiers, or pass/fail history in Context.
