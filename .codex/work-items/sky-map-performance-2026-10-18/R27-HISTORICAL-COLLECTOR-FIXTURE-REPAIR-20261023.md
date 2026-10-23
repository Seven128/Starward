# R27 historical collector fixture repair — 2026-10-23

## Scope and result

The two historical fixture import failures are repaired at their test owners. Only `scripts/r17-a-correlation.test.mjs` and `scripts/r17-ruler-entry.test.mjs` were edited for this repair. The targeted run passed 18 tests with 0 failures and 0 skips; no native device, service, frozen source/build, instrumentation, collector or production code was changed by this work.

The preceding broad collector run reported 88 passes, 2 import failures and 1 skip. Its two failures did not execute their behavior assertions: one read CRLF templates directly into an LF-sensitive transform, and the other applied the retired r5 page transform to the current r6+ single-writer implementation. This repair does not reinterpret that previous broad run as passing. The root agent owns the combined R27 verification result.

## Correct owners

`r17-a-correlation.test.mjs` now reads its three actual templates through one LF-normalizing test reader, matching the existing builder read boundary. The actual correlation transform, strict compiler options, clock/epoch behavior, Page callback receiver/result/duplicate behavior, bounded ring, strict schema and collector dependency/idempotency assertions are unchanged.

`r17-ruler-entry.test.mjs` now separates the historical V1 receipt contract from current component behavior:

- Historical checks execute the existing `addR17RulerEntryClock` output and original V1 recorder. Immediate wide-time admission before the 1 s measurement arm, disabled Play collection, clock discontinuity/unavailability, 128-event ring, 32 KiB export, immutable seal, strict privacy/window/schema checks and the original collector's 424/200/409 behavior remain actual runtime checks.
- Actual current page/native/layout checks execute the existing `addR17RulerEntryV2` transform, use the V2 recorder binding and validate against `r17-normal-input-protocol.mjs`, as the current builder already does. They preserve the original native callback receiver/options, stale revision rejection, sealed/inactive observation windows, one bounded measurement retry carrying its old window, same-batch projection, product commands continuing after diagnostic retirement, hide/unmount guards and original surface `finish` execution.
- The current component fixture now supplies the actual transformed native-position module to the existing production test harness. It checks the resulting native offset and alignment admission, preserves non-input programmatic scroll behavior, and checks that the V2 observer issues no retired diagnostic-only initial-offset query or declarative-scroll event. Restoring those retired operations solely to satisfy r5 source-shape assertions would conflict with the current single-writer owner.
- The full normal-Play fixture is retained on the current V2 path. Its guarded actual Play, 15 s metrics, 20 s Pause, hide, retry and historical A1 interpretation checks all passed. No original ruler test was deleted or skipped (12 before and after).

The existing `r17-normal-input.test.mjs` already tests current V2 source, actual offset admission, replacement-window guards, manual-input semantics, legacy V1 acceptance and complete normal Play. This repair reuses the same source owner rather than introducing another transform or reconstructing the retired r5 production snapshot. The older V1 validator still rejects an actual V2 receipt, while the current dispatcher accepts the actual V1 receipt. The test explicitly asserts those version boundaries. Runtime and controls from the historical clock path are byte-equal to the current V2 clock path, so the real dependency typecheck covers both shared owners.

## Verification

Executed from `D:/dev/Starward` with PowerShell 7:

```text
node --test .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-a-correlation.test.mjs .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-ruler-entry.test.mjs
```

Exit 0, 18 tests / 18 pass / 0 fail / 0 skip, 13,631.5992 ms. This includes strict compilation against the actual current Mini Program dependencies with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` enabled, and the full normal baseline behavior fixture.

After adding the explicit byte-equality assertions for the shared runtime/controls, only that affected typecheck was repeated:

```text
node --test --test-name-pattern "current V2 transforms" .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-ruler-entry.test.mjs
```

Exit 0, 1 selected test / 1 pass / 0 fail / 0 skip, 12,354.6637 ms. These checks are not additive test counts. No UI suite or device acceptance is claimed by them.

Final source SHA256:

| File | SHA256 |
| --- | --- |
| `scripts/r17-a-correlation.test.mjs` | `966844cab7760c371b8be3553399f8b3ae88a182c19732355b8393c20f031645` |
| `scripts/r17-ruler-entry.test.mjs` | `59e24de7238fcfb18e0d9f31f02f415dca3aa122c1689047ab4b7de407d7d34f` |

## Limits

This closes the two test setup failures. It supplies no new phone observation, heap evidence, live collector admission, UI conformance or OOM root-cause result. The gen8 scan/binding requirement and all remaining Goal obligations remain with the root handoff.
