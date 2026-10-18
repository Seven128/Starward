# R17 stellar exact-vector integration

The full BSC/SAO candidate is implemented at the existing exact-frame and Scene owners. This is local CPU/correctness evidence; target-device rendering, response latency and physical performance remain with the integrated R17 candidate and its phone evidence.

## Adopted implementation

- `stellar-vectors` exposes the original exact proper-motion ray and angular conversion separately. The original normalization, Julian-year input, ENU matrix and `atan2` formulas are unchanged.
- `sky-stellar-transform` is the shared BSC/SAO current-frame transform. Brightness eligibility precedes a conservative vector viewport test. Only surviving rays need angular positions and prepared display directions. Final visibility and coordinates still use the original angular projector, including its original edge tolerance; the vector test never paints or grants picking by itself.
- Already prepared original directions take the ordinary projector directly during camera changes. BSC and SAO batch their scan at the frame/tile owner, avoiding per-row span/accessor overhead. The initial trial's small camera penalty was removed before adoption.
- BSC fast preparation is bound to the transport owner's admitted, frozen publication. Other controlled/unadmitted local models retain the original eager path. Both frame families retain the complete `points` array for existing list consumers; `pointCount` avoids expanding it for mere availability/count checks. Existing controlled frames without optional accessors retain the original rendering fallback.
- The current BSC frame remains weakly owned by its scene. SAO retains only its existing current transform per tile. There is no day/history/view cache, extra request, reduced catalogue, approximate time, frame-rate cap or renderer.
- The page's availability check uses `pointCount` before legacy `points`; `sky-scene-frame-facts` reads the complete count through the same narrow path. The explicit object-list consumer continues to receive every original point when requested.

## Full-path comparison

[SKY-STELLAR-CPU-COMPARISON.json](SKY-STELLAR-CPU-COMPARISON.json) binds the public input SHA-256, five preserved baseline owner fingerprints, seven candidate owner fingerprints, complete stage samples and consumer traces. The baseline owners were captured before edits in an external task cache. `scripts/compare-sky-stellar.mts` loads baseline and candidate together and alternates their execution order within each sample.

Both paths use the same admitted 8,404-row BSC publication, actual validated SAO v2 tiles, exact current geometry, constellation frame, view, brightness and original display/picking rules. SAO v2 contains 246,280 published rows; it is not loaded in full per frame. The narrow time-change case covers 100 distinct exact instants, up to 24 selected tiles and 8,565 loaded SAO rows. The warm-camera case deliberately retains its ready tile set while still measuring selection; tile arrival/network latency is outside this CPU comparison.

| View | Workload | Baseline median / p95 | Candidate median / p95 |
| --- | --- | --- | --- |
| 45° | Cold CPU preparation | 28.65 / 41.16 ms | 23.41 / 36.42 ms |
| 45° | Exact time change | 8.27 / 12.44 ms | 6.12 / 11.26 ms |
| 45° | Same-time camera reuse | 1.52 / 2.10 ms | 1.51 / 1.76 ms |
| 10.8° | Cold CPU preparation | 52.47 / 59.16 ms | 47.61 / 54.61 ms |
| 10.8° | Exact time change | 11.50 / 17.81 ms | 7.91 / 12.15 ms |
| 10.8° | Same-time camera reuse | 2.16 / 4.55 ms | 2.05 / 3.92 ms |

Cold preparation has 20 frames per view, of which 15 are timed; time/camera phases have 100 frames, of which 95 are timed. Cold CPU includes in-memory JSON decoding/admission and render-model construction. It excludes file/network I/O. The `draw` stage includes work deferred from the old eager resolver and can therefore increase; adoption uses total preparation/draw cost. The bounded run supports a net time-change improvement without a material warm-camera regression. Its small-sample p95 values do not establish production/device percentiles.

Across 440 frames, actual stellar submissions, accepted objects, names, catalogue/picking identity and source completion receipts compare recursively. Six final-frame checks also compare the complete legacy BSC/SAO angular arrays. All references, ordering, numerical values and other facts are identical: maximum numerical difference is **0**. These are real populated submissions and picks, including SAO, rather than an empty-frame hash comparison. No photos/textures are supplied by this CPU fixture, so image participation and native composition are not claimed.

## Behavior checks and remaining evidence

The focused combined check passed **89/89**, covering stellar publication admission, full-sphere BSC/SAO painting/picking, appearance/twilight, transitions, accepted names/frame facts, tile-owner recovery, the continuous Canvas-time consumers, and the existing all-BSC proper-motion/hemisphere/pole oracle. New regressions establish lazy count/status reads, exact-time tile regrouping, full legacy point retention and conservative rejection at the 0.05° minimum, wide views, offset centers, poles and clipping edges.

Command: `node tools/run-node.cjs --import tsx --test` with `sky-view-projection`, `sky-full-sphere`, `sky-scene-frame-facts`, `stellar-catalog-client`, `sky-star-appearance`, `sky-star-transition`, `sky-object-picking`, `sky-named-star-labels`, `sky-canvas-time`, `sky-stellar-supplement-owner`, and astronomy-core `stellar-vectors` test files. Astronomy-core typecheck and whitespace validation of changed production owners passed. Integrated Mini Program type/build/package checks, independent review and matched Android motion/performance acceptance remain with the parent R17 delivery; this module does not certify them.
