# R17: Sky landscape, time preview and performance

Baseline: 2026-10-18, source3de3a253, existing ordinary phone generation9, authorized NIO Android wireless lane. The user authorized these repairs and updating the sole PLAN after research. EOG original acquisition is deferred; recovered runtime data remains usable. This record is evidence, not another plan or product completion.

Latest phase instruction: “你先做好方案研究和计划方案的更新，不着急做”. Only bounded research probes and task/requirement records are changed in this turn. Production implementation awaits a later explicit start.

## Confirmed time-control defect

`SkyTimeControls` maintains a civil draft. Its page callback evaluates `presentSkyTime(rawReportData, at)` before publishing a time preview. Outside the supplied report/model it returns false; digits change and “应用后更新天空” appears while the star field keeps the old instant. The ruler only interpolates supplied rows within model coverage. Supported selector times also evaluate a complete presentation in the callback and again in the page memo.

Actual phone: starting at October19 04:30 UTC+8, a day decrement changed the selector to October18 04:30 and produced that message without moving the sky. Explicit apply then changed the field and returned to the menu. The test Observation Context is now October18 04:30; no account, N05 draft, reminder or media was removed. Private recording: `C:/Users/777/AppData/Local/Temp/starward-device-feedback-t6aywi/starward-device-test-mCmFmC/recording-1792314576261.mp4`.

The phone still uses the original API8791 MEMORY_TEST service with fixture weather; this is an interaction baseline, not real-weather acceptance or evidence that restored API8794 is on the phone. The retained functional reference `cloud-sky-native-2026-09-22/references/time-controls-functional-reference-2026-10-17.png` was viewed; current adopted menu appearance remains with its existing Stitch owner. No resource was regenerated or re-adopted.

Reuse `createSkyObservationTime`, `presentSkyTime`, `buildSkyTimeModel`, `evaluateSkyTimeModel`, the service's existing Sky access checks and request/Context owners. The model already bounds interpolation to24hours/49knots with a30-minute maximum interval. `computeTargetInstant` is read-only but returns target advice only inside the committed night. It cannot supply cross-date geometry. The new geometry read must preserve original Context/observer authority and independent weather/advice/source meaning; preview must not commit the global Context or extrapolate an old polynomial.

## Landscape evidence and unresolved cause

Grey code exists: `skyLandscapeViewReveal` transitions with viewport-centre altitude across ±15°, retaining opacity0.18 below ground. Both shaders use grey RGB0.16 before source-over blending. At full reveal its contribution is only0.0288 per channel plus the background; a nonzero uniform does not establish a perceptible cue.

The page chooses screen/free versus horizon/level dragging from the accepted visible foreground at gesture start. `dragSkyView` separately selects free rotation above the observing FOV or near a pole; the level branch clamps elevation and picks inverse-sine roots relative to the starting elevation. These are continuity boundaries to examine, not a proven single cause. Preserve the local-screen versus landscape-orbit requirement and compare reversibility/hand-off before changing it.

`SKY-DRAG-BASELINE.json` adds a bounded numerical comparison. A central45° crossing from+12° passed through the horizon continuously (largest axis step about0.054° for1px), with no invalid basis; this does not support calling every horizon crossing discontinuous. Starting at−78°, the horizon branch stops at−90° despite continued finger travel, while the screen rotation crosses the pole continuously. Re-grabbing at the pole then takes the other branch under current code. This is a concrete stuck/changed-control mechanism to repair and compare; it is not yet attribution of the entire phone complaint. The grey cue remains a separate composed-visibility issue.

Phone navigation traversed sky → north horizon → the chart behind the ground. Reviewed end frames show the dark horizon and exposed stars with a subtle grey contribution. Private recordings ending1792314842723,1792314933564,1792314976845 are in the same guarded session. Full motion review and a repaired candidate comparison remain required; encoded recording cadence is not application FPS.

## Catalogue scope and measured CPU cost

The user's correction is retained:8,404 is the BSC v3 base, not the total sky. Matching SAO v2 contains246,280 rows in826 tiles. The actual view selects/loads a subset. Catalogue total, loaded candidates and submitted/pickable objects are separate facts.

`scripts/profile-sky-time.mts` exercises current production owners with the preserved public test report, real admitted BSC and validated SAO tiles,100 distinct instants per view and90 samples after warm-up. Input is the existing `sky-cpu-profile-input.json` under the private runtime identified by `output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-runtime-pointer.json`. No new publication or private account capture.

| View | SAO tiles / maximum loaded rows | Base transform median | SAO transform median | Scene median | Total CPU median / p95 |
| --- | --- | --- | --- | --- | --- |
|45°|18 /831|3.31ms|0.24ms|4.33ms|9.37 /13.56ms|
|10.8°|24 /8,565|3.18ms|1.84ms|5.92ms|12.14 /18.94ms|

`SKY-TIME-CPU-BASELINE.json` retains complete counts and hashes. Three sampled frames per view contain actual BSC and SAO submissions/picking. This is local CPU only, without native GPU, React/Taro, textures/photos or physical FPS. The earlier base-only probe cannot represent the full workload.

Time interpolation itself costs about0.13–0.17ms median here. BSC eagerly transforms all8,404 rows per new exact scene; SAO transforms all selected tile rows before viewport projection. The painter then converts angles back to direction vectors. A useful bounded optimization question is whether current exact directions and delayed point/angle work reduce this cost while preserving identities and numerical/pixel results. Existing static topology, caches, native display RAF and single accepted-frame writer must be reused.

## Bounded mechanism trials

`SKY-TIME-WINDOW-PROBE.json` executes the existing server time-model builder for the same actual public observer outside the initial report's day. A2-knot/30-minute model was9,572bytes;5knots/2hours23,451bytes;49knots/24hours226,698bytes. Single-process build samples were roughly15/11/38ms and include different warm-up conditions, so the shorter-window timing order is not comparative evidence. All produced the requested intermediate geometry and seven planets without weather calls or Context writes. This establishes the existing geometry capability, not a new authenticated endpoint or phone latency. A smaller window trades transfer size for another ruler/adjacent-window obligation; start with existing window semantics and change only if actual network cost warrants it.

`scripts/probe-sky-vector.mts` compares the current angle round trip with exact-vector projection followed by the original angular/appearance calculation only for visible candidates. Both use the same proper motion, matrix, brightness limits, BSC and validated selected SAO. `SKY-VECTOR-RESEARCH.json` records80 instants per view (70 timed): the45° kernel median was4.43→1.74ms for up to9,235 candidates;10.8° was8.39→3.46ms for up to16,969. Each view retained roughly32,000 cumulative visible identities across those80 frames, identical angular/appearance facts, and maximum projected displacement below3.3e−12 logical pixels. The experiment runs baseline before candidate and is a local bounded signal, not a claimed production/phone speedup. No production code, lazy-frame ownership or full consumer integration was changed. Supported view-boundary cases, native composition and total costs remain the adoption gate; a candidate can still be rejected there.

## Stellarium and scope of reuse

Reused the fixed study and inspected [Web observer.c at7d45c8f](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/observer.c): its observer hash skips unchanged work and distinguishes fast/full updates. The same revision's [stars.c render_visitor](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/modules/stars.c#L645) rejects clipped tiles and excessive magnitudes before astrometry/projection; point styling follows successful projection. These mechanisms and static-versus-frame lifetimes inform this investigation; they are not evidence of WEAPP gains or the commercial mobile app's implementation.

No Stellarium source implementation, catalogue, engine replacement, GPL dependency or paid capability is adopted. Its fast update does not authorize approximate time or stale coordinates. Follow the sole PLAN's R17 module and prove the actual outputs/benefit before adopting a new geometry path. Production repairs and target acceptance remain open.
