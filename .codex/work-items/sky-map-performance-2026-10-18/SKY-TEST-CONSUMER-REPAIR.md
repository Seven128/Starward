# Sky test consumer repair — 2026-10-18

## Scope and result

Updated the 20 failed Sky/related service test files selected from `tmp/miniapp-failure-details.json`. No production Sky code, Context, design resources, plans, device/IDE state, API implementation or Git refs were changed by this repair. Existing changes in other Sky test files were preserved.

The final targeted run, from `apps/wechat-miniapp` using the existing Node wrapper and `--import tsx --test` with those 20 paths, completed **174/174 passing, zero skips/cancellations**. No force-exit flag was used for this result. Mini Program `npm run typecheck` also passed; the 20-file `git diff --check` passed.

- Final output: `tmp/sky-consumer-repair-final.log`; SHA-256 `d85d58e4bc7f6b25fcbff29c41dc96708491b6b9c3c10482a58b31ae45d93670`.
- Type output: `tmp/sky-consumer-repair-types.log`.
- Scoped review diff: `tmp/sky-consumer-repair.diff`.

This is current deterministic consumer evidence. It does not establish a green full suite, native rendering, physical performance, or completion of Sky's separate internal task. The pre-existing skipped scientific publication test is outside this batch and remains unresolved.

## Current owners retained

- Calibration's 42 common failures came from extracting deleted modal buttons/headings. The 2026-10-17 adopted contract replaces that modal with `SkyBrowseControl`. Its actual toggle/calibration callbacks now run in the test. Frozen scope, stale callbacks, replacement edits, Context locks and cancellation remain exercised against the actual `finishSkyCalibration`/disclosure owners; those commands are explicitly described as owner commands, not nonexistent buttons. Completion returns to the expanded menu. Switching from calibration to manual cancels and preserves the painted basis, as the adopted contract requires.
- Civil date input now converts through real `skyCivilInstant` and invokes the page's current `commitInstant`, shared with the ruler. Context ownership, request serialization, hide/selection retirement, late success/failure and recovered Context identity assertions remain. Date recovery checks the actual route validity gate and return-before-controls boundary; the six-field control uses the requested instant and real timezone formatting. Removed calendar-choice declarations are not restored.
- Location/track tests now supply the actual accepted frame and browsing-camera owner. They retain the exact preview instant and do not silently commit/cancel it while the adopted expanded menu returns. Session cleanup follows the actual orientation Settings navigation ref; the removed display Settings ref is no longer asserted.
- Recovery retry stays owned by the live lookup. Return is exercised through the current shared menu and actual blackout transition, including recreated Map, legacy entry stack and fallback. The recovery panel's nonexistent `onBack` prop is not fabricated.
- Current `carriedReport`, surface invalidation, ready-image and zoom bindings are explicit. The publication loader admits the real `skyNativeImageLevels` helper; the mutation loader admits the real ready-artwork adapter. Both loaders retain unknown-import rejection. Catalog dialog traversal includes its actual `priority` ReactNode slot.
- Display tests select values on both sides of the adopted eligibility boundary: magnitude 6.5 disappears at the ordinary wide-view floor while remaining visible locally; the legacy v1 admitted catalog uses magnitude 4.8 rather than an illegal >5 value for the twilight exclusion test. Constellation scale 17.5° exercises genuine half-target × half-readiness behavior under the current 10–25° curve. These remain display adaptation tests, not scientific visibility claims.
- The actual manifest URL function is in `services/sky-catalog-api.ts` (not `api-client.ts` or `sky-celestial-client.ts`). Immutable URL and forged publication assertions now read that owner. App startup cleanup binds current native error/rejection hooks and verifies each real reporting code, cancellation filtering, independent cache initialization and native chrome initialization.

## Infrared fallback/readiness decision

The failed offscreen-optical case used one compositor stub that always returned the optical empty preparation result, including when the actual Scene submitted independent W3. It also created a fresh readiness owner while expecting an already displayed W3 image's immediate source credit.

The repaired test separates the exact optical and W3 compositor inputs. It executes the real shared readiness adapter and Scene completion:

- Exact optical fields receive the actual empty qualification/contribution path; no optical participating image or false source credit appears.
- Newly prepared W3 passes through **0 → 0.5 → 1** display weights. Zero preparation has no W3 source credit; positive displayed weights identify the actual W3 image, with no image failure.
- A later empty optical frame retains the settled W3 weight of **1** and its source identity without restarting animation.

These results match the owning contract's shared readiness, zero-contribution credit rule and independent spectral fallback. No product bug was established in this bounded case, and no production change was made. Actual native compositor output, download timing, device continuity and complete family verification remain outside this deterministic repair; this result does not close those separate obligations.
