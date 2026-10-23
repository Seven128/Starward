# R25 high-memory checkpoint and owner qualification

2026-10-22. The user required a usable route with enough detail for both performance and memory diagnosis in full-sky cloud viewing. Snapshots and function recordings are examples, not required formats. This is the next bounded qualification of the existing ordinary-preview route, after the old end-only memory export was lost in a real V8 OOM.

## Result and decision

**The current combination is qualified for targeted Sky performance and memory investigation under the observed full-sky, high-memory condition.** It produced useful application-stage data, independently saved early memory windows, and actual old-object/cache/aggregate relationships. It did not depend on the failed remote-debug connection. This establishes a usable diagnostic method; it does not establish the external retaining root, repair the V8 OOM, or pass product leak/performance acceptance.

The new decision is specific: all eight sampled tile keys had their current entry replaced 272 times during normal Play, yet their first entries and transforms survived to the end. The first sampled aggregate actually contained those eight first entries and also survived. Some other aggregates and the selected GPU upload objects were collected. The old entries therefore cannot be explained solely as the latest value of the per-tile cache. The next diagnosis belongs to obsolete aggregate/frame holders outside that latest-value cache. Do not blindly rewrite the cache, patch Taro, or request another failed heap capture.

The [implementation review](R25-CHECKPOINT-INTEGRATION-REVIEW-20261022.md) and [independent phone review](R25-CHECKPOINT-PHONE-REVIEW-20261022.md) retain their respective scopes. Earlier CPU/r7/source mapping, ordinary input association and [MemoryInfra](R25-MEMORY-INFRA-INDEPENDENT-REVIEW-20261021.md) remain valid only within their already qualified windows and isolates.

## Candidate and actual execution

- Existing checkout and branch retained; no production source change in this diagnostic batch. Frozen r24 remains byte-identical.
- New complete task candidate: `tmp/r17-normal-a1-review-r25-usb/project`, gen29; source `71e3a8c9af54c35124e1459f469d183184139522e9d608aa424c8ca5fa0153c6`; bundle `96ff37ca9d10824983b9493146ab806539c5d19e805ca7a6a252b5ed7d8ecda3`.
- 337 bundle files / 5,046,564 B; main 2,008,533 B with 88,619 B headroom; 31 source maps remain outside the phone package. Production/candidate strict typecheck, complete build, inspection and both bundle readbacks passed. Root's affected tests: 33/33; independent focused tests: 23/23, plus 30 generated-source behavior facts.
- Official Stable ordinary `auto_preview` reached terminal success. Root then viewed the actual r25 label, supported WeakRef and declared 20-second pause on the phone before binding feedback. This is not remote debugging and is not a phone-wide bundle-byte readback.
- Actual supported maximum FOV was 264.3550889449854 degrees in a 384 × 796.800048828125 logical viewport, with visible landscape silhouette. Normal metrics contained BSC 8,404 and loaded SAO 2,842 throughout; selected tile count 105 is not a claim that every selected tile loaded. The observed mode was DAY, with development/vConsole enabled. This is not a debug-disabled production benchmark.
- The existing actual product Play/Pause owner enforced the finite stop. Host screen-inspection latency did not determine Play length. No forced GC, substituted product state, profiler attachment or requested process crash was used.

## Early file persistence and lifecycle

Memory run `r25-1-1l2go1` yielded nine independent schema-valid files. All carry the same gen29/source binding; no clock error, omitted checkpoint/event, reference error, rejected track or overflow was reported. The local arrival watcher read and hashed each file while the run was still in progress, rather than reconstructing arrival from a final 90-second receipt.

| Sequence | Actual phase | Phone relative time (ms) | Host first read (UTC) |
| --- | --- | ---: | --- |
| 1 | baseline | 0 | 18:03:38.996 |
| 2 | active-5 | 5,092 | 18:03:43.961 |
| 3 | active-15 | 15,077 | 18:03:53.911 |
| 4 | paused | 20,052 | 18:03:58.912 |
| 5 | drain-10 after Pause | 30,054 | 18:04:08.901 |
| 6 | scope-ended | 71,540 | 18:04:50.306 |
| 7 | surface retirement entered | 71,544 | 18:04:50.570 |
| 8 | drain-10 after retirement | 81,546 | 18:05:00.535 |
| 9 | end | 90,005 | 18:05:08.942 |

The 5/15-second files existed before the pause and terminal deadline and contained eight tile and eight aggregate witnesses, not just an empty capability receipt. They no longer depend on the phone surviving until 90 seconds. The host collector uses immutable sequence filenames, strict validation, the existing 32-file bound and same-byte retries. This proves persistence against subsequent loss of the phone VM; it is not a host power-loss/fsync claim and does not guarantee export through every network or OS failure.

The terminal normal-product receipt independently records actual Play at 1 ms, Pause attempt at 20,053 ms with true result, and Pause success at 20,055 ms. Root viewed the paused time control, closed it, used the product exit control, and viewed the returned Map. The retirement hook executes at entry to teardown, not after all native cleanup. The final observation is 18,461 ms after that entry; it is not a native cleanup-complete receipt.

## Useful memory relationships

At 5,092 ms each sampled tile already had 69 observed writes / 68 replacements. At 15,077 ms the values were 205/204, and at Pause 273/272. Every sampled first entry was different from the last entry observed during tracking. All eight keys, first entries, first transforms, and last-observed entries/transforms remained alive through the end.

Aggregate 1 contains first-entry membership IDs `[1,2,3,4,5,6,7,8]`, from the actual `spans` passed by the resolver. Aggregates 1, 2, 4, 6 and 7 were alive at 5 seconds and at the end; 3, 5 and 8 had already collected by 5 seconds. This is actual object identity/lifetime information, not a process-size correlation. Membership follows the resolver's real strong fields/closures; it does not provide the unknown outside root that retains aggregate 1.

The four stellar array sites each observed 16,926 allocations / 3,070,158 cumulative array slots. Each first cohort remained 32/32 alive. Each recent cohort changed from 32 alive at Pause to 24 alive / 8 collected at the first drain, and remained there. GPU view/backing sites each observed 1,436 allocations and 175,487,952 cumulative byteLength; these overlapping quantities must not be summed. Their first cohorts collected by 5 seconds and recent cohorts collected by the first drain.

The six-site observer created 4,586 WeakRefs cumulatively; the owner observer created 4,384, with at most 384 and 48 retained weak witnesses respectively. The observation has overhead. Initial/recent deterministic samples are not a population estimate, the first stellar cohort is not a BSC sample, array slots are not heap bytes, and collected upload buffers do not establish GL/native release. Tracking stops at Pause: `latestObservedEntry` describes the last observed write, not every cache write that might occur later.

## Performance and process context

The source-bound normal record `r17-1-8ckw6j5rsp` covers 14,042 actual ms and contains 254 Scene finishes, 254 accepted copies and zero failed frames. Stage data are nonempty: aggregate synchronous draw subtotal 10,044 ms, stellar traversal known subtotal 5,701 ms, renderer-submit known subtotal 2,618 ms. Traversal/submit nest inside draw and have below-resolution unknown calls; do not add the totals or rename them CPU/GPU time. Reuse prior mapped CPU/allocation evidence where function attribution is needed. This diagnostic run is not a before/after speed comparison.

The before-preview, before-play and after-exit records identify the same Android PID and `/proc` start ticks. Ordinary preview did not establish a fresh process. The record named before-play was actually taken on Map before Sky preparation. Its meminfo window to after-exit spans 281,230 ms, including navigation, loading, preparation, Play, waiting and return—not only 20 seconds of Play.

| Android reported field | Map before Sky preparation (KiB) | Map after exit (KiB) |
| --- | ---: | ---: |
| TOTAL PSS | 2,085,400 | 2,863,108 |
| TOTAL RSS | 2,396,440 | 1,591,080 |
| TOTAL SWAP PSS | 34 | 1,537,330 |

These are process accounting fields under substantial memory/swap pressure, not JS heap or resident-byte growth attributable to this Play. The route exported all nine points and the normal metrics/terminal under this condition. No new crash was observed during this bounded trial. Prior confirmed V8 OOM and unresolved memory growth remain failures requiring repair.

## Local preservation and next boundary

The existing private evidence root holds `r25-checkpoint-originals`: 50 original files / 13,272,660 B, copied and SHA-256 read back, including both device-session captures/metadata, 11 collector files, arrival journal, process samples and source/candidate bindings. Arrival records retain each receipt hash. Sequence 2 SHA-256 is `327f5bc31eb2ab0064e7f4a7d973f6c1ad0b6c14fd0377e55dcd3c35c3ac1b0f`; sequence 3 is `a863f60e6292836e1f0e072d220d6c5e23c1950d51a4166db916378d81f00265`; sequence 9 is `0946a80ef43db20bcacd2d7d88dee09120f8e12065e113717ec33ea52dab227d`.

The preceding 32 completed collector files were first copied and hash-verified, then moved by exact paths into private `r25-streaming-before-collector`, with a relocation manifest. The collector limit was not increased and no original was discarded. No data was uploaded, no commit/push was performed, and original account services, pairing and VPN/TUN were preserved.

Stop general tool selection and unchanged long pressure windows. Reuse this now-qualified combination for the next specific outer aggregate-holder question, then verify a repair under matched conditions. Complete Goal and both product priorities remain open; tool qualification is not their acceptance.
