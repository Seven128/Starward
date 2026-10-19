# R17 local JS retained-heap diagnosis

## Result and decision

The current production time/stellar/Scene owners **did not reproduce material growing strong JS retention** in one bounded local Node run. Across 1,800 measured unique instants after 120 warm-up frames, forced-GC retained heap was 25,060,928–26,143,488 bytes. The first measured value was 26,085,608 bytes and the last was 25,500,208 bytes. External and ArrayBuffer allocations were approximately constant. Clearing the one current publication and resetting its transition/name/readiness owners reduced retained heap to 23,182,376 bytes.

This result narrows the investigation; it does not locate or clear the phone failure. It does not measure WeChat's JS heap, execute React/Taro, draw native GL, or classify Android's `Unknown` memory. No production fix is proposed from this run. In particular, forcing GC is a local diagnostic and is not a product repair. The next decisive target evidence remains the active native GL allocation/storage and React/Taro bridge boundaries identified in [the growth diagnosis](R17-PLAY-GROWTH-DIAGNOSIS.md).

The root reports that its generation 18 counterfactual still grew substantially while only one full native copy and one Surface existed. That target result establishes that recurring full-frame copies are not necessary for the observed growth. The empty receipt exported before actual Play remains `INVALID_EMPTY_WINDOW` and is not used here as CPU or Scene proof.

## Workload and nonempty effects

The [task-local script](scripts/diagnose-sky-js-heap.mts) reuses the exact public fixture from the already completed [stellar equivalence comparison](SKY-STELLAR-INTEGRATION.md): SHA-256 `9ce8706d36586ed4c0cb5e074c6b66efa396ec634320a2c4015bfb4d255011b0`. It admits all 8,404 BSC rows through the original client and validates actual SAO publication/tile inputs through the original contracts. It uses one 10.8° view and 1× exact time steps `round(index * 1000 / 60)` milliseconds. There are 1,920 distinct instants in total, spanning approximately 32 seconds of product time. Local execution including warm-up and GC observation took 22.27 seconds; that is not device frame timing or FPS.

Every frame executes the actual `presentSkyTime`, catalogue attachment, exact BSC frame, tile selection, SAO supplement, constellation frame and full `drawSkyScene` function. There is no extracted Scene implementation or synthetic star list. Its render surface is a successful CPU port, so this measures traversal/allocation and callback consumers rather than actual rendering. Native images are absent, as in the reused CPU comparison. The latest report, supplement, snapshot and sources replace one current publication; no history array retains them. The original star-transition, ready-image and name-layout owners prepare and commit along this path.

The 1,920 frames produced:

- 753,302 actual stellar submissions, 28,770 painted BSC objects and 724,135 painted SAO objects.
- 1,920 completed Scene frames and 1,920 successful commits for both transitions and name layouts.
- At most 7,173 loaded SAO rows, 20 selected/admitted tile objects and 394 painted objects in one frame. The tile working set remained exactly 20 objects in every measured sample.

The chosen view produced **zero placed catalogue names**. Name preparation/commit therefore covers an empty catalogue-name state, and does not establish retention behavior of a populated glyph/caption workload. The script's controlled text metrics are not target glyph measurements. No real image workload exercises readiness/resource entries. Those limits are explicit, rather than empty work being counted as populated proof.

## Heap observations

Node `v24.16.0` ran with `--expose-gc`; every 100 measured frames the script samples normal allocated memory, then runs GC, yields once to the event loop, runs GC again and samples retained memory. It stores only 20 bounded numeric sample records. [The JSON evidence](R17-JS-HEAP-DIAGNOSIS.json) contains every sample, source fingerprints, counts and the exact public input binding.

| Metric | First measured sample | After 1,800 measured frames | Observation |
| --- | ---: | ---: | --- |
| GC-retained heap, bytes | 26,085,608 | 25,500,208 | Whole measured range 25,060,928–26,143,488 |
| External, bytes | 6,037,032 | 6,032,181 | No growing external allocation series |
| ArrayBuffers, bytes | 3,442,801 | 3,442,793 | Stable retained backing bytes |
| Node RSS, bytes | 406,888,448 | 404,668,416 | Whole measured range 404,668,416–408,399,872 |

Normal pre-GC heap samples ranged from 40,809,704 to 242,985,584 bytes. Substantial transient allocation is present. Forced-GC retained stability does **not** establish that WeChat's collector can drain that allocation pressure with the same timing, nor that a phone allocation/backlog problem is impossible. These samples are not cumulative allocation traffic and do not establish an allocation rate. RSS includes Node/JIT/allocator behavior and is not a direct rendering-budget measurement.

No baseline/current matrix was run: the bounded question was whether the current actual populated JS path retains every successive instant. It was unnecessary to replay the already completed equivalence comparison or re-read large source data.

## Owner interpretation

- `sky-stellar-scene.ts` has one `currentFrames` entry per weakly held scene. Transient scenes are created by the time presentation path; the returned frame's closures can refer back to its scene, but that cycle is weakly rooted in this owner. The bounded retained-heap run does not exhibit those transient keys/values accumulating strongly. `catalogs` reuses the unchanged admitted BSC publication.
- `sky-stellar-supplement-scene.ts` retains one current transform per admitted tile in a WeakMap. The diagnostic intentionally keeps its real 20-tile working set alive; changing geometry replaces each tile's value. It does not add a time key or append old transforms. The measured ArrayBuffers/retained heap do not show a growing per-instant transform history here.
- `sky-star-transition.ts` commits detached point snapshots into one replacement accepted-layer map. Its accepted data does not retain the previous preparation callback or an accepted-frame chain. The positive stellar path and successful commits exercise this responsibility.
- `sky-name-layout.ts` and `sky-ready-presentation.ts` also replace/retire accepted state, but this view has no placed catalogue names or real images; this run supplies only limited empty-state evidence for those responsibilities.
- The full Scene callback replaces one current report/supplement/snapshot. This preserves the relevant strong reference shape of page publication, but does not execute `setPresentedSkyFrame`, React hooks, the Taro reconciler, `setData`, or native acknowledgements. A framework queue/backlog remains outside this result.

The existing headless Node `gl` package is not installed. No dependency was installed and no browser/native session was opened for this check. The successful CPU surface deliberately omits native GL handles/uploads, Canvas2D captions/copies, renderer auxiliary targets, Taro data transport, network timing and image decoding. Their absence is not evidence that they are bounded on the phone.

## Reproduction and cleanup

Command from the existing workspace:

```powershell
node tools/run-node.cjs --expose-gc --import tsx .codex/work-items/sky-map-performance-2026-10-18/scripts/diagnose-sky-js-heap.mts <existing-public-sky-cpu-profile-input.json> <new-output.json>
```

The public input is the same `sky-cpu-profile-input.json` under the runtime referenced by `output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-runtime-pointer.json`. The script rejects a different hash and refuses to overwrite an output. Its checked optional argument positions 41/42 are the current `drawSkyScene` star-transition/ready-image owners. Source changes that alter that signature require adapting the task script before reuse.

The process completed with exit code 0. No service, DB, phone, DevTools entry, source publication, Drive object or production code was changed; no large source hashes or source downloads were performed. Only this task-local script and evidence files were created. R17 playback remains failed/unverified until the parent establishes the actual target behavior and cause.
