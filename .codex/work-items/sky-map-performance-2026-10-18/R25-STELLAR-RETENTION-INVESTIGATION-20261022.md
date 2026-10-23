# R25 stellar-array lifetime investigation

2026-10-22. Independent source and saved-evidence analysis, followed by one parent-authorized local ownership experiment. No phone, IDE, service, build, Git operation or production/frozen-source edit was performed. The new experiment script and this report are task-local; its result remains in the existing private evidence owner.

## Decision

The first r24/gen28 full-sky receipt supplies useful, source-bound object-lifetime evidence. It distinguishes actually collected upload objects from still-observed stellar-array witnesses. **It does not yet identify an unintended retaining root or justify a stellar-cache rewrite.** The fixed first cohort covers small SAO tile arrays, not BSC's 8,404-slot array. The current SAO WeakMap replaces each tile's transform; a targeted experiment confirms that this actual owner plus the actual observer can release replaced arrays in local Node, while correctly detecting deliberate strong retention.

The next target question is the lifetime of an old aggregate/frame and its outer owner, together with the unobserved logic-VM collection behavior. The second phone run's native crash interrupted the planned exit observation. It must remain failed/incomplete; process death is not object reclamation evidence. Do not restart a stress loop merely to obtain another weak-reference table.

## Independently read first receipt

The private `baseline-r25-1-hz1xe0.json` is 34,928 B on disk, 18,439 B compact UTF-8, SHA-256 `030ebd021f01ddfca0891a0877634d5542edc12a2a4223958d198be23cb2138e`. It passes the current strict validator and binds generation 28 to source `d42ea5e8b885927e00ac0ee71df78267d87dd4719b17fd0a7d9b005191cea9b4`. Parent-owned screenshots and the associated normal receipt establish the 264.355° landscape scene with 8,404 BSC and 2,842 loaded SAO rows; they do not establish all selected SAO tiles loaded.

Observed events are Play at 1 ms and Pause at 60,061 ms. The final liveness checkpoint is 90,009 ms and seal is 90,011 ms. There are no clock errors, reference errors, rejected tracks, counter overflow or omitted checkpoints/events. This file contains no hide, scope-end or retirement event.

| Actual checkpoint | Transform creations per one of the four sites | Cumulative slots per site | First cohort | Recent cohort |
| --- | ---: | ---: | --- | --- |
| 5,076 ms | 4,340 | 787,220 | 32 alive, 0 collected | 32 alive, 0 collected |
| 15,093 ms | 13,578 | 2,462,874 | 32 alive, 0 collected | 32 alive, 0 collected |
| 30,100 ms | 25,172 | 4,565,876 | 32 alive, 0 collected | 32 alive, 0 collected |
| Paused, 60,063 ms | 40,362 | 7,321,146 | 32 alive, 0 collected | 32 alive, 0 collected |
| Drain, 70,066 ms | 40,362 | 7,321,146 | 32 alive, 0 collected | 32 alive, 0 collected |
| End, 90,009 ms | 40,362 | 7,321,146 | 32 alive, 0 collected | 23 alive, 9 collected |

All four stellar sites have matching counts and outcomes. Their first cohort totals **1,461 array slots**; its objects are about 89,968–89,969 ms old at the final checkpoint. The final recent cohort has 955 live slots and 8,796 collected slots. Array slots are not heap bytes. Alive means the sampled object still dereferenced at that check; it does not establish who retains it or whether an applicable full collection occurred.

GPU upload view and backing each have 3,436 construction observations and cumulative `byteLength` 419,856,216. The view and backing describe overlapping storage and cannot be added. The first 32 of each were all collected by 5,076 ms; the final recent 32 were all collected by the paused and end checks. This rules out indefinite retention of those particular JS view/backing objects in the sampled window, not GL buffer retention, driver memory or every upload object.

The observer created 10,696 WeakRefs during the run while retaining at most 64 witnesses per site. Bounded stored state does not make its creation/clock/checkpoint overhead zero. No matched phone overhead comparison has qualified it as negligible, and the normal native crash must not be attributed to or excluded from instrumentation solely by the storage cap.

## Sampling interpretation that affects the next action

The stellar creation counts are exactly 70, 219, 406 and 651 groups of 62; slots per such group are exactly 11,246 = 8,404 + 2,842. Together with the actual call order, this is consistent with one BSC transform and 61 loaded SAO tile transforms per geometry preparation. It is a source-and-count inference, not a newly exported tile-object identity.

One BSC transform alone has 8,404 slots. The entire first cohort has 1,461, so **none of those first 32 witnesses can be the BSC array**. The supplement hook resolves before the later BSC consumers, explaining this first-cohort bias. Do not label this table “all old BSC and SAO arrays retained.”

The recent policy selects every 16th post-first allocation, not a random sample. A repeated 62-call batch and stride 16 share a factor of two. GPU recent witnesses total 36,864 = 32 × 1,152 bytes in this run, showing a repeated small-upload-slot bias. These are fixed object witnesses, not representative retained-byte percentages. The first cohort is comparable across all checks; recent membership changes during active tracking, and is comparable as one set only after Pause stopped new tracks.

## Actual ownership traced

| Owner and source | Confirmed current responsibility | What remains unresolved |
| --- | --- | --- |
| `sky-stellar-transform.ts:15` | Each factory invocation owns four arrays. Returned accessors and projection traversal close over those arrays. | An array witness gives no edge back to its live transform/aggregate holder. |
| `sky-stellar-supplement-scene.ts:21,42,56,58,82` | A WeakMap has one `TileTransform` per tile object; a changed geometry overwrites that tile's value. Each resolved aggregate strongly owns its span array, whose entries strongly own their transform and tile. | A retained old aggregate can keep an old transform even after the WeakMap has been overwritten. Tile identity/current-entry relation is not in the phone receipt. |
| `sky-stellar-scene.ts:38,119,128` | BSC deletes/replaces the current value under a weak scene key. The 8,404-row transform is not in the first cohort. | An externally retained scene/frame can keep its derived arrays. No runtime root is identified here. |
| `use-sky-stellar-supplement.ts:59,60` | The hook holds the current loaded state and a memoized resolved aggregate. `sky-stellar-tile-loader.ts:22,26,85` holds the bounded view and clears loaded/published state on dispose. | React's current/alternate or retained callbacks may outlive an apparent source slot; source cardinality alone cannot certify collection. |
| `spot-sky-page.tsx:1616,1903,2554` and `sky-canvas-lifecycle.ts:131,223` | Accepted state retains a supplement/frame; the lifecycle has a latest snapshot plus its in-flight completion. Publication replaces rather than appends. | The current target has no native callback/React retaining graph. These source bounds do not clear a host queue. |
| `spot-sky-page.tsx:2190,2199`, `hooks/use-resource-query.ts:70`, `services/query-client.ts:18` | Fine-target Query is disabled during ordinary Play, while already-created inactive Queries can retain options/query functions for the default 30 minutes. | A page-created query closure could retain a render environment in the target compiler/runtime. This is a concrete competing boundary, not a proven edge to the first SAO aggregate or a per-frame Query-growth finding. |
| `spot-sky-page.tsx:2240,2735` | The Play interval holds the start render's `advanceSkyTime` callback until effect cleanup on Pause. | Shared closure-context retention is runtime-dependent. Its existence is not proof that it holds stellar arrays; after Pause, full collection is still unobserved. |
| `services/sky-catalog-api.ts:28`, `sky-public-image-runtime.ts:120`, `sao-catalog-client.ts` | This SAO path parses JSON from the encoded-file owner; the client has no parsed tile history cache. The admission sets and originating-publication map use weak keys. | Encoded bytes, decoded tile objects, current transforms and any host callback retention are different lifetimes. |

The prior [r7 allocation/source attribution](R17-NORMAL-R7-ALLOCATION-RESULT.md) and [r22 source audit](R22-SKY-RETENTION-OWNER-AUDIT-20261021.md) remain useful. Their source bounds and prior whole-Scene Node result are not repeated as phone acceptance. None of the inspected owners appends old transforms to an explicit strong history Map; this is not a whole-program proof that no strong history exists elsewhere.

## One finite real-owner mechanism experiment

Parent explicitly requested a test of whether replacement plus the observer can itself retain the old arrays. [The task script](scripts/r25-stellar-owner-weakref.mts) transpiles the **complete current transform and supplement resolver modules** in memory, adding only the same four array observation calls. All geometry/projection/appearance helpers and the current observer are real implementations. It validates 32 actual SAO files against their published size, hash and contracts, totaling 1,085 stars, and evaluates exactly three contract-valid instants A → B → C one second apart. It reads the real point/direction/transmission consumers, producing 3,255 point visits. It does not run the full Scene or native graphics.

The test deliberately retains A's aggregate as a positive control while B and C replace the same tile keys. After yielding between jobs and local forced GC:

1. **A aggregate held:** A's first 32 arrays at each site remain alive. B and C aggregate WeakRefs are cleared; recent witnesses include two collected B transforms and two live C transforms still owned by the strongly held tile keys.
2. **A aggregate released, tile keys held:** all 32 first-A arrays at each site are collected. The two selected latest-C arrays remain alive through the tile-key → current WeakMap value path.
3. **Tile keys released:** all four recent witnesses are collected too.

All assertions passed on Node `v24.19.0`, in one three-frame experiment. Result SHA-256: `73ee2be5dc3a05392e0f8386580ca57bff525b8413f97fefed7cbbbbd45e3f8e`; exact inputs, source hashes, counts and scalar receipt remain in private `performance-alternatives/r25-stellar-owner-weakref.private.json`. The real SAO contract admission is exercised directly; this experiment does not register the file objects through the client's private admission WeakSet or exercise draw-reuse qualification, which is independent of the unconditional `transformed.set(tile, cached)` lifetime being tested.

This provides a discriminating local result: the resolver's replacement behavior and the observer do not inherently form an old-array retaining chain, and the observer correctly distinguishes a deliberate aggregate root from its removal. It does **not** run React/Taro, reproduce phone GC scheduling, inspect all V8 objects, explain the device's native crash or rule out target-specific retention. Forced GC is confined to this local experiment and is not a proposed product fix.

## Second-run crash and remaining decision

The parent-owned second run did not reach the requested retirement observation. At this review's read, the saved Android exit-info contained `APP CRASH(NATIVE)`, status 6, approximately 2.2 GB PSS and 2.5 GB RSS; the scoped 179-byte crash log identified fatal signal 6 and `JSRuntimeLooper` but did not itself contain an allocation cause. The second nominal 15-second workload receipt actually measures 12,544 ms; its missing 90-second memory receipt remains unavailable.

Root evidence addendum after this review: a second, bounded read of the same PID's main/system error buffers saved `r25-target-native-errors.private.txt` (1,163 B). Its matching PID/TID reports V8 allocation failure, a 2303.75 ms Mark-Compact from 1365.1 to 1348.8 MB, then process out of memory. This establishes V8 exhaustion on the named logical thread, without identifying the retaining business root. The recorded PID matches the earlier MemoryInfra target; no independent OS start-time/VM identity was retained, so it is not a fresh-process qualification. See [the complete phone result](R25-MEMORY-PHONE-RESULT-20261022.md).

Remaining explanations for the observed array survival are an old aggregate/frame held by an outer page/query/callback owner, collection not yet covering that particular first-run cohort, and a target/host-specific retaining behavior. The later fatal GC/OOM is no longer merely unspecified native pressure, but it is not a retaining graph for the sampled arrays. The known latest-per-tile cache can explain latest transforms while tile keys live; it cannot by itself explain an arbitrarily growing series under one stable key.

Reuse the current evidence before new pressure. If a later authorized, recovered run can safely observe actual retirement with the existing bounded observer, compare the same already-selected cohort after real owner retirement; do not count process disappearance as collected objects. If old arrays still survive and the result changes the repair choice, the narrow missing association is the initial aggregate/tile/current-entry relationship: weak witnesses for the specific old aggregate and tile, plus a scalar indication that the tile's current transform was actually replaced. That association can distinguish a legitimate latest cache from an external old-frame holder. It is not a reason to build a general profiler, change all Query GC policies, clear user caches, resume gen24, or rewrite arrays based solely on an alive count.

No production repair is justified by this review alone. The tool route now has useful object-level information, while whole-module memory safety and real exit collection remain unverified/failed. The later root addendum identifies V8 OOM; its underlying retention cause remains unresolved.
