# R5 sky Canvas scheduling and lifecycle

Status: implementation and scoped source-level verification complete after the host reboot. Native WEAPP/runtime validation remains for root's serialized integration via R10. No DevTools, emulator, heavy build or old pre-reboot session was started/reused by this subtask.

## Scope and owner

- Changed only `apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx`, its existing `sky-canvas-time.test.ts`, and new adjacent `sky-canvas-lifecycle.ts` / `sky-canvas-lifecycle.test.ts`.
- Read the current project interaction Skill, Mini Program Screen/sky owner, DESIGN Full-Sky Orientation section and implementation/maintenance boundaries. The current renderer, labels, layout, palette, FOV, scene catalog, exact time selection, algorithms, data and design resources remain unchanged. No Context/PLAN/PROGRESS/package/config edits.
- `sky-canvas-lifecycle.ts` owns only native surface measurement/context lifetime, one scheduled/latest frame, one in-flight native draw, current callback generation and cleanup. The page still owns the current frame/pose/data/mode, drawing commands and product/error semantics. No second astronomy/sensor/domain store and no persistent pose history.
- The native platform selection reuses installed Taro legacy Canvas, `CanvasContext.draw(false, callback)`, selector measurement, `useReady`, `useResize`, hide/show and component cleanup. No new dependency or Canvas renderer migration.

## Implemented behavior

- Reuse one measured size and `CanvasContext` across steady pose/time/report draws. Initial mount/readiness, resize, hidden/foreground transition, conditional Canvas removal/remount, native error, measurement/draw error and retry invalidate the appropriate cached surface.
- Multiple requests pending measurement or the next native submission collapse to the latest frame; drawing waits for the current native completion before submitting its successor. No queue of stale pose frames accumulates. Old measurement/draw callbacks cannot publish into a resized, hidden, removed or unmounted owner.
- Native completion now publishes READY/UNAVAILABLE and valid dimensions. Merely queueing a draw publishes PENDING. A newer pose in the same report/time/mode may follow an already completed valid pose; superseded scenes and explicit visibility invalidations cannot publish READY. Callback absence has a bounded timeout and existing recoverable Canvas error state. Explicit error/expired/unavailable data or lost pose clears the projection; palette changes suppress the prior palette until the new draw completes.
- Raw device-motion bursts coalesce to one latest React publication per 16 ms window. Native refs, calibration, compass quality and 1.5-second sensor stale timers still consume actual raw events/timestamps. A null/denied/stale/hidden pose cancels the pending publication immediately; unmount prevents late state publication.
- Compass reason/accuracy/age presentation avoids replacing identical within-second telemetry objects; the one-second age timer is stable while telemetry is present. Quality changes remain immediate. No star/target omission, interpolation, fake heading or sensor truth change.
- Catalog/frame/star-count metadata is memoized by report and exact time instead of filtering the same star frame on every pose update.

## Post-reboot checks

- Re-read R2 note, inspected actual R5 files/diff and treated interrupted pre-reboot sessions as unverified. R2 was not repeated.
- `node --import tsx --test --test-concurrency=1` on `sky-canvas-lifecycle`, `sky-canvas-time`, `compass-lifecycle`, `sky-time-frame` and `sky-view-projection`: **34/34 passed**, ~3.2 s after root review repair, saved as `R5-focused-tests.log`.
- `npm run typecheck --workspace @starward/wechat-miniapp`: passed using the current project Node wrapper; `R5-typecheck.log`.
- `git diff --check -- apps/wechat-miniapp/src/features/sky`: passed.
- Tests exercise ready/mount measurement, exact geometry validation, latest-frame coalescing during measure/draw, 20 steady frames with 1 measurement/1 context, resize reacquisition, hidden/removed/unmounted late callbacks, duplicate callbacks, failed query/context/paint, missing-callback timeout, retry, unavailable/expired/lost-pose clearing, pose burst coalescing and immediate cancellation. Existing real 3D projection, exact sky-time and compass lifecycle tests remain passing.
- `R5-render-comparison.mts` compares the actual old `drawSkyScene` at baseline `86101d32c7f31be69bb32756a593375df150f7f4` with the current function, using the exact R2 707,203-byte Gaia2048 / 20-frame fixture envelope. **24 cases** (day/night/observation, 375x812 / 812x375, two true instants, two headings with nonzero roll) produced identical recorded native API command/data streams (127–495 calls per case), ignoring only the newly supplied completion function. Full result: `R5-render-comparison.json`.
- This establishes command/data equivalence and scheduled call counts in injected native ports. It does **not** establish phone FPS, native drawing latency, native pixel equivalence, actual callback behavior or physical pointing alignment. No performance percentage is claimed for the device.

## Root review correction

Root correctly identified that comparing every completion against the latest pose revision could keep initial/resize dimensions at zero forever when native drawing is slower than continuous pose input. Added a regression with eight native frames, three new pose samples per native completion; the original implementation fails on first visibility. The lifecycle now distinguishes same-scene pose replacement from a visibility/scene invalidation. Same report reference, exact frame time, display mode and owner may publish a completed real pose and dimensions, while an explicit null/expiry/mode barrier, resize, hide, removal or disposal still suppresses old completions. The regression also proves same-report invalidation and palette changes cannot revive the previous surface. All 34 focused tests passed. The post-correction workspace typecheck reported no R5 errors but failed at root's concurrently added R2 fixture `response-cache.test.ts:325` (missing `validAt` / widened envelope literals); root notified, R5 did not overwrite the R2 edit. The earlier pre-review R5 typecheck had passed.

Backend collaborator subsequently fixed that R2 fixture and reran the full Mini Program TypeScript graph successfully (exit 0, ~8 s). Root and this subtask were notified; that current shared typecheck validates the R5 types without another duplicate run.

## Root integration / remaining runtime check

- When the shared heavy slot is free, use the R10 exact-project/owned isolated runtime to check first render completion, Canvas retry/error recovery, steady orientation draws, hidden→shown freshness and resize/rotation measurement. In particular, verify native `draw` callback delivery with the existing CSS visibility behavior; sizes remain zero until successful drawing completes. Do not infer this from mocked callbacks or browser canvas.
- Run the shared isolated WEAPP build (`weapp-check` only, preserving `dist/weapp`) and integrated app tests once root's serialized schedule permits. Existing design migration/physical sensor/outdoor requirements stay explicitly outside this technical optimization.
- Suggested durable Context update, owned by root: add an implementation-index pointer adjacent to the existing sky/compass owner saying that `sky-canvas-lifecycle.ts` owns measured native Canvas lifetime, latest-frame scheduling and callback cleanup; source frame/pose truth remains with the existing page and compass owner. Keep timing constants and implementation details in code, not duplicated Context rules.

Primary API references read: [Taro CanvasContext draw](https://docs.taro.zone/en/docs/apis/canvas/CanvasContext), [Taro useResize](https://docs.taro.zone/docs/apis/taro.hooks/useResize), [createCanvasContext](https://docs.taro.zone/en/docs/apis/canvas/createCanvasContext). Current installed types were also inspected. R10 tool and native-session work is root-owned.

Native verification: R25-native-result.json/png and fixture builder establish real wx Canvas callbacks,hidden initial presentation,continuous pose delivery,resize280 and actual page hide/show. Artificial25 ms callback delay stresses coalescing; no FPS claim. Product ports matched exactly; initial fixture Page argument mistake is corrected only in fixture.
