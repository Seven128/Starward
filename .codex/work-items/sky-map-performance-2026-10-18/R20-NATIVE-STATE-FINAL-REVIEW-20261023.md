# R20 native App F05/F06 final independent review

Date: 2026-10-23 (Asia/Shanghai). Reviewer: fresh `r20_native_final_review`; production fixes remain authored by the implementation agent/root. The reviewer changed only two test files and this record.

## Scope and result

The reviewed F05/F06 source changes have no remaining blocking finding in the inspected startup, device-fix acquisition, save/cancel and profile-switch recovery boundaries. This is local behavior/source evidence, not native device acceptance, full preference correctness, or full Goal completion.

Reviewed authority: current AGENTS.md; `project_context/global.md`; the native profile in DESIGN.md; `project_context/areas/main/screen-contracts/mobile.md` and `mobile/core-journeys.md`; the mobile-shell-and-preferences requirements, controls, obligations, acceptance and risks in `docs/source-plan.md`; `.codex/skills/uiux_design/SKILL.md` and its React Native contract. Current global scope supersedes historical accessibility expansion requirements.

## Independent findings and resolution

1. Profile switch rejection must stay inside the dialog with the previous preset and a retry. Root added caught rejection, a per-opening selection token and pending single flight. Added actual `MobileShellScreen` + Zustand consumer tests for close/reopen with both late success and late failure: the old completion neither closes the reopened dialog nor changes its pending/error ownership. Durable commands still settle in order, and a new successful choice closes only its own dialog. Same-opening repeated clicks remain one write.
2. The installed `expo-location@57.0.5` watch implementation registers position/error callbacks before awaiting native registration; rejection has no callback cleanup. Its `remove()` path invokes native `removeWatchAsync` without awaiting its Promise. Consequently the earlier adapter's returned-handle discipline could not establish cleanup for all failed registrations/removals.
3. Root replaced that watch path with the installed public `getCurrentPositionAsync` API. A single acquisition owner spans both service preflight and the native Promise. Logical readers can detach independently; when all leave after native dispatch, the native owner remains until settlement. Reopening joins the same in-flight request. The adapter does not attach a new native Promise handler for every logical reader, retain aborted reader callbacks, invoke last-known-position fallback, invent coordinates, or replace the original sample time/accuracy.

The installed Android implementation calls `getCurrentLocation(request, null)` and exposes no cancellation token to JS. At Balanced accuracy, its configured maximum update age derives from the library's existing 3000 ms interval. iOS uses `CLLocationManager.requestLocation`. These are actual platform samples with provenance, not a guarantee that sampling started at the UI click. The adapter keeps that provenance unchanged; no new freshness threshold was invented. The public one-shot is the suitable existing capability for this one-result flow. Newer documentation's Location(next) is not present in the installed package and was not adopted. Official API reference: [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/); the installed source, rather than the site's newer package recommendation, controls this version assessment.

## Local checks

From `apps/mobile`:

```text
node ../../tools/run-node.cjs --bin vitest vitest run src/native/permissions/foreground-location-gateway.test.ts src/shell/shell-startup.integration.test.tsx
Test Files 2 passed (2)
Tests 13 passed (13)
```

The reviewer added three cases: two profile late-settlement variants and one final-reader cancellation followed by late native rejection/recovery. The latter also checks removal of the exact AbortSignal listener. The full two-file run passed after the final gateway replacement. Targeted `git diff --check` also passed. The root owns broader native checks/typecheck; this record does not relabel their results as reviewer-run evidence.

The component harness mounts the real RuntimeRoot/MobileShellScreen/store using DOM substitutions for React Native primitives and controlled Expo/storage boundaries. It proves callback/state wiring and visible text/state in that harness, not Android/iOS pixels, native Back, permission sheets, sensors, OS request retirement or hardware resource release.

## Reviewed production identities

SHA-256:

- `apps/mobile/src/native/permissions/foreground-location-gateway.ts`: `5e90ebaa9ce59e8c3b4e00cfddfc71bccd226d093d5e43ef2a2e7c08bf980490`
- `apps/mobile/src/shell/MobileShellScreen.tsx`: `9d145066298288d7285fbd2dec5bd925df6a5966157d4fb3a90f700261dd0f31`
- `apps/mobile/src/state/shell-store.ts`: `b1cad7cda01c485e44fc621697632759c8107589e2b8afa81176728b8348e187`
- `apps/mobile/src/shell/RuntimeRoot.tsx`: `fca86f81488be75b9bc370cc5a7ff4a7218b454cc6af67fbd60c0e79d909cb5a`

## Retained obligations

F07 cross-consumer DecisionContext propagation, preference runtime bounded projection/payload-sensitive idempotency and other preserved Goal work remain outside this review. Native permission refusal/settings recovery, real location/age/precision, actual persistence/restart and OS resource behavior retain target-runtime acceptance. Cancellation here means logical detachment; it does not claim cancellation of the underlying OS request. A pending OS request remains single owned work until it settles, with manual location still available. No DevTools, phone, ADB, service, build, dependency installation or other conversation's resources were used.

## Root implementation and integration record

The implementation also separates hydrationState/error/in-flight from save state, starts hydration at RuntimeRoot, merges untouched fields/per-profile identities after late reads, and retries failed SQLite/runtime initialization. Serialized durable writes preserve order. Device fixes carry coordinate system, sample time, accuracy and mock status; old missing metadata remains unknown. The profile-switch dialog catches rejected persistence, preserves the active preset and offers a visible retry.

The implementation agent ran two meaningful hydration regressions against the previous behavior: early destination save suppressed hydration, and a late read overwrote a newer manual choice. Both failed before and passed after. The earlier independent reviewer reproduced the actual profile-dialog rejection as one failed assertion plus an unhandled disk_full rejection; root's fix passed that test and the new reviewer's close/reopen variants. The SDK watch path was then replaced based on installed-source evidence, so its earlier removal-handle tests are superseded, not claimed as final one-shot validation.

Root's final production-code `npm run test:mobile:fast` passed typecheck and 25 files/67 tests at 20:43; log `tmp/r20-native-final-fast.log`. The reviewer subsequently added one late-rejection regression and ran the two affected files, 13/13 above. This is the full run plus a later focused check, not a claimed single 68-test rerun. No Mini Program bundle or native binary was built. New type/behavior evidence does not close real SQLite restart, native hardware, F07, or bounded preference projection/idempotency obligations.
