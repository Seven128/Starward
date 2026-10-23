# R25 actual phone memory observations — independent review

Reviewed 2026-10-22. This was a read-only review of local originals, the actual candidate sources, strict receipt validators, bundle fingerprints and three saved phone frames. No device, service, IDE, build or Git operation was performed. Only this review document was written. Private identifiers, addresses, raw logs and screenshots remain with the existing private evidence owner.

## Conclusion

**The ordinary-preview route has now produced useful source-bound object-lifetime data in the full-sky workload, and scoped Android logs have identified a subsequent V8 out-of-memory abort.** This is materially more detailed than a process-memory curve: selected GPU upload objects were collected while particular older stellar-transform arrays remained observable. It supports investigating the latter objects' outer owners instead of treating all memory growth as retained upload buffers.

The route is **qualified for that successful Play/Pause sample**, not as a complete retention diagnosis or a crash-resistant memory recorder. The second run crashed before its 90-second memory export, so it supplies no second lifetime receipt and no exit/retirement result. The business retaining root, whole-heap coverage, observer cost and sustained product correctness remain unresolved. Neither the first successful export nor the OS crash classification completes the user's memory requirement or the full Goal.

## Identity and actual workload

All four supplied JSON files passed their current strict validators. The first terminal receipt also matched its exact metrics receipt. Recomputed binding-input SHA-256 matched source `d42ea5e8b885927e00ac0ee71df78267d87dd4719b17fd0a7d9b005191cea9b4`, generation 28. Seven affected prepared feature files matched their manifest hashes. Both the frozen project and the phone-prepared project fingerprinted to `c7ebcfd83650572dec468e1ce9e5b481b1abb237ab06b1e73aa9d1d6b3c8eea7`, matching the completed build manifest. These local checks do not read the phone's entire installed bundle.

The reviewer viewed the saved r24/WeakRef-capability frame, the first run's paused full-sky frame and the second run's playing frame. They visibly show the r24 diagnostic label/available capability, 264.4-degree view with landscape masking, and the expected playing/paused controls. This is inspection of those frames, not a continuous video or smoothness verdict.

Both metrics files report actual 264.3550889449854-degree FOV, 8,404 BSC rows, 2,842 loaded SAO rows and 105 selected tiles. First-window Scene finishes/accepted copies were 262/262, second-window 66/66; BSC and SAO submissions and accepted consumers were nonzero. This establishes nonempty work but not complete SAO tile coverage. The protocol's mode is `DAY`; it must not be silently relabelled as a different product mode.

The metrics clocks cover **14,022 ms** and **12,544 ms** respectively after their configured 1-second delay. A nominal 15-second export timer is not a 15-second denominator. The first memory receipt covers a different, longer window; its quantities must not be divided by either short metrics window to derive rates or per-frame memory.

## First run: actual lifetime information

The memory receipt is 18,439 compact UTF-8 bytes and 34,928 bytes in pretty-printed local storage. It has seven real checkpoints at 1, 5,076, 15,093, 30,100, 60,063, 70,066 and 90,009 ms. Play was marked at 1 ms, Pause at 60,061 ms, and seal at 90,011 ms. The terminal receipt records one successful guarded Pause. Thus the sample contains about 60.06 seconds of Play and 29.95 seconds after Pause, rather than merely a 90-second deadline.

There are zero rejected tracks, reference errors, omitted checkpoints/events, counter overflows, invalid/backwards/out-of-range clock reads. Effective clock resolution remains unknown; these are wall-elapsed intervals, not calibrated monotonic or CPU time.

| Construction site | Hook calls before Pause | Accumulated quantity | Initial cohort at final checkpoint | Final rolling cohort at Pause → end |
| --- | ---: | ---: | --- | --- |
| Each of the four stellar transform arrays | 40,362 | 7,321,146 array slots | 32 alive / 0 collected; 1,461 slots; age about 89.97 s | 32 alive / 0 collected → 23 alive / 9 collected |
| GPU upload typed view | 3,436 | 419,856,216 byteLength | 0 alive / 32 collected; 3,910,656 byteLength | 0 alive / 32 collected → unchanged |
| GPU upload backing buffer | 3,436 | 419,856,216 byteLength | 0 alive / 32 collected; 3,910,656 byteLength | 0 alive / 32 collected → unchanged |

The four array rows agree at every checkpoint. At end, each rolling array cohort has 955 slots in live witnesses and 8,796 in collected witnesses. Tracking stops on Pause; allocation totals, selected counts and evictions are unchanged afterward. Consequently the Pause-to-end rolling comparison concerns the same fixed witnesses. During active tracking, rolling membership changes and such count differences do not describe the same cohort.

The initial upload cohort was already collected at the 5,076-ms checkpoint. This directly establishes that the real phone can clear these weak targets and that collection is observable through this route. It does not establish release of GL/native buffers, all upload objects, all separately escaped children, or the entire JS heap.

Important sampling limits:

- The initial stellar cohort totals only 1,461 slots, less than one 8,404-element BSC array. It therefore does not contain that large BSC array. Its continued liveness cannot be generalized to all BSC/SAO history. Current hook owners and the workload are consistent with initial small SAO-tile arrays.
- Each stellar total is consistent with 651 batches of 62 transforms and 11,246 slots per batch (`8,404 + 2,842`). This arithmetic is not an exported per-object BSC/tile label and cannot recover labels absent from the receipt.
- First 32 plus every 16th later allocation is deterministic sampling. The final GPU rolling cohort totals `32 × 1,152` bytes, showing slot selection bias. There is no justified population survival percentage, retained-byte estimate or statistical extrapolation.
- Array slots are not heap bytes. The typed view and its backing refer to overlapping storage, so their byteLength totals must not be added. Accumulated byteLength describes allocation traffic at this site, not a peak or retained heap size.
- An alive WeakRef witness has not established who retains it or that it is leaking. Collection observed in some witnesses does not prove every collectible target has already been processed by GC. The probe's own WeakRef creation/dereference can affect within-job liveness and adds overhead; the phone cost has not been measured separately.

## Second run: real OOM, missing lifetime export

The second metrics receipt is valid and demonstrates full-sky work before the failure. The private collector contains only the first lifetime receipt; there is no exported second lifetime sample. The adapter holds checkpoints in memory until the finite export, so those unexported values are unavailable after process death. Do not reconstruct them from the first run, treat their absence as zero retention, or call this a successful page retirement.

The saved Android exit record reports `APP CRASH(NATIVE)`, status 6, at **2026-10-22 00:23:05.773**. Its reported PSS/RSS are approximately **2.2 GB / 2.5 GB**; these are rounded OS record values, not exact simultaneous heap measurements or quantities to add to V8 bytes.

The scoped fatal log records SIGABRT on `JSRuntimeLooper`. All 13 V8 fatal log lines have the same PID/TID as that signal record. The V8 message supplies more specific evidence than Android's native-exit category:

- Scavenge: `1360.2 (1407.2) → 1353.3 (1406.8) MB`, 76.81 ms, allocation failure.
- Mark-Compact: `1365.1 (1410.9) → 1348.8 (1401.2) MB`, 2303.75 ms, allocation failure.
- The fatal handler reports process out of memory immediately afterward.

Values above retain the engine log's units and used/capacity notation. They establish V8 exhaustion and substantial GC work on that recorded logic-runtime thread. They do not identify the responsible business retaining root, establish that the observed stellar arrays account for that heap, or prove a native allocator leak merely because Android classified the abort as native.

The crash PID equals the earlier MemoryInfra producer's recorded PID. That earlier target record contains PID/name/activity but no OS process start-time; do not promote PID equality into a complete process-instance or isolate identity proof. Prior runtime/profiler/candidate burden remains a relevant confounder. The already-reviewed MemoryInfra GC observations belong to a renderer provider; stable renderer values cannot negate this logic-thread fatal evidence, and the lifetime receipt contains no isolate ID joining its witnesses to the fatal heap.

## What may be carried into the performance skill

The method may now describe **validated actual-source WeakRef lifetime observation through the existing ordinary-preview collector**, alongside target-bound MemoryInfra categories and scoped exit/fatal evidence. It must retain the six-site/sample limitation, wall-clock/quantity semantics, actual lifecycle checkpoints, same-byte export retries and local-only evidence boundary. It must distinguish the application recorder from Perfetto: they are complementary routes, not two names for one tool.

The remaining decision is why the selected older stellar objects remain observable and what fills the fatal logic heap. A bounded owner-lifecycle/control observation or a useful retaining graph could answer that question; a snapshot format is not mandatory by itself. Do not repeat the unchanged 90-second pressure run to obtain the missing receipt. Before another risky run, reassess how its already-completed observation window is preserved before the known failure boundary. That would be a capture improvement still requiring validation, not a capability established by this review.

## Reproducible original identities

All originals are under the existing private `device-resume` owner, in `collector` or `r24-independent-20261021/performance-alternatives`. Only hashes and non-sensitive derived scalars are recorded here.

| Local original | Bytes | SHA-256 |
| --- | ---: | --- |
| `baseline-r25-1-hz1xe0.json` | 34,928 | `030ebd021f01ddfca0891a0877634d5542edc12a2a4223958d198be23cb2138e` |
| `baseline-r17-1-rabtbaij77.json` | 52,120 | `eb6dcf48de5a6941ca31ee7651b64c6ce84e83e91d0e7ef4249b9071842ee7c9` |
| `baseline-r17-1-rabtbaij77-terminal.json` | 1,580 | `357ee4ed7b3210e2ad14ec7085a9f980192475843a36165b7f2161ba6fe08196` |
| `baseline-r17-2-hcf0utwzcp.json` | 52,044 | `baa2d4c715326c689b77e6f5815215b4d13e9de978c92392c3da38ce9288468a` |
| `r25-second-run-exit-info.private.txt` | 5,677 | `a7d1ae13dfa5813c8e51ac0118859ff5a7f3a5d5d69982dd4e52756d7d77fcaa` |
| `r25-target-native-crash.private.txt` | 179 | `8a47ab640088eeb0ac48ee64c19f33100f2b707548716318fd712053eaa9c121` |
| `r25-target-native-errors.private.txt` | 1,163 | `f68becb002dade554a54859da3095334d0e308c8d3328c01e325a370f2827e4e` |

Related scope: [candidate integration review](R25-MEMORY-INTEGRATION-REVIEW-20261022.md), [MemoryInfra provider review](R25-MEMORY-INFRA-INDEPENDENT-REVIEW-20261021.md), and the current [performance method](../../skills/starward-miniapp-development/references/performance-investigation.md).

## Independent addendum — actual retirement window, 2026-10-22

A separate reviewer examined the later recovered-run originals, the candidate's actual retirement call site and the saved return-to-Map frame. This addendum does not change the preceding first-run result or repair the second run's missing export. No phone, service, IDE, build or product operation was performed for this review.

The three new receipts all pass their current strict validators. The terminal matches its exact normal metrics receipt, and all three bind generation 28 to the unchanged source `d42ea5e8b885927e00ac0ee71df78267d87dd4719b17fd0a7d9b005191cea9b4`. The memory receipt is **26,095 compact UTF-8 bytes**, 49,527 bytes in local storage. It contains ten actual checkpoints and no omitted events/checkpoints, reference errors, rejected tracks, clock errors or counter overflow. Its actual timing is:

| Event / checkpoint | Relative wall time |
| --- | ---: |
| Play | 0 ms |
| Pause | 34,014 ms |
| Input scope ended | 64,145 ms |
| Surface retirement boundary | 64,149 ms |
| Post-retirement drain check | 74,149 ms |
| Final liveness check | 90,002 ms |
| Seal | 90,004 ms |

Thus the observed Play lasted about **34.014 seconds**, and the final check occurred **25.853 seconds after the surface retirement boundary**. The six-second recording request is not the Play duration. The terminal's later guarded Pause attempt is false, with no guard pause success; that is compatible with the earlier real Pause already recorded by the time-state observer. It must not be relabelled as another successful automatic 60-second Pause.

The new metrics interval is 14,015 ms, with 256 Scene finishes and accepted copies, actual BSC/SAO submissions and accepted objects, 8,404 BSC rows and 2,842 loaded SAO rows, and a fixed 264.3550889449854-degree FOV. It reports `DAY` and `enableDebug=true`. These conditions remain an instrumented ordinary preview, not an uninstrumented production or complete-SAO qualification. Its short metrics interval is not a denominator for the longer memory observation.

### What retirement actually establishes

The reviewer viewed saved `screen-1319b780-d753-47d4-8c2b-02b5099782bd.png`: it shows the Mini Program's Map tab and the isolated test place panel, rather than Sky or the WeChat launcher. This directly supports successful return to Map in that saved frame.

The candidate's `sky-canvas-surface.ts:130–160` places `r17NormalSurfaceRetired()` immediately after `disposed = true`, **before** the native teardown steps and their separate finished receipt. The memory adapter marks its `retire` event through that function. Therefore the new memory event proves that the surface entered retirement; it does not itself prove successful context loss, zeroed canvas dimensions or complete native/GPU release. No post-teardown finished receipt was supplied as part of this addendum. The later object observations remain valid observations after that retirement boundary, with the saved Map frame providing separate navigation evidence.

All four stellar-array sites agree. Each records 26,660 allocations and cumulative 4,835,780 slots before Pause. Their allocation/selection/eviction totals stay unchanged afterward, so the later rolling-cohort comparisons concern the same sampled objects:

| Cohort at each stellar-array site | Pause | Retirement boundary | 10-second retirement drain | Final check |
| --- | --- | --- | --- | --- |
| Fixed first 32 | 32 alive / 0 collected | 32 / 0 | 32 / 0 | 32 / 0 |
| Final rolling 32 | 24 alive / 8 collected | 24 / 8 | 20 / 12 | 20 / 12 |

The first cohort still totals only 1,461 slots, excluding the 8,404-slot BSC array. At the final check its age is about 89.952 seconds. The rolling cohort's final live quantity is 827 slots and collected quantity 8,924 slots. These are actual sampled-object facts, not retained heap bytes or population percentages.

GPU view and backing each record 2,284 constructions and cumulative byteLength 279,092,292, referring to overlapping storage. Both initial and final rolling cohorts are already fully collected at Pause and remain so afterward. This is JS object collection, not evidence that the corresponding GL/driver allocations are fully released. The first stellar cohort's survival after navigation still does not identify its retaining owner, establish an applicable full GC for those objects or by itself prove a leak.

### Process and footprint limits

Both saved meminfo headers match the private pre-run target's PID and process name. The later `r25-retirement-instance-readback.private.json` has the same PID, `/proc/.../stat` startTicks and activity as the pre-run binding, and records `sameAsBefore=true`. The reviewer compared these saved values; it did not re-query the device. This is stronger saved process-instance continuity than the earlier PID-only comparison, but it still does not supply a V8 isolate ID or whole-heap attribution.

The two meminfo samples report PSS **971,430 → 2,095,725 KiB** and RSS **1,261,640 → 2,393,400 KiB**. Their device Uptime and Realtime headers are **861,862 ms apart**, about 14 minutes 22 seconds. That interval includes preparation and other activity outside the 34-second Play. It is not a continuous growth trace, an exit-only delta or a per-frame allocation rate; none of those interpretations is justified. The higher later footprint and surviving witnesses leave the memory problem open.

This run adds a useful qualified **Play/Pause → retirement-boundary → later weak-liveness** observation and a saved successful Map return. It does not establish complete native cleanup, sustained memory safety, a repaired OOM or crash-resistant export. Preserve the source/sample/clock limitations and investigate the old aggregate/tile/current-cache relation or another observation that identifies the actual outer holder.

| Added local original | Bytes | SHA-256 |
| --- | ---: | --- |
| `baseline-r25-1-1tnmz6u.json` | 49,527 | `f4e09a3f3fb4722afd2bc7eb4984a7b8ef6cf017466b8c52ec996e32f34413ba` |
| `baseline-r17-1-i90z4s1bbu.json` | 52,154 | `9fe7c15d0901cbcd3f534309ce21d9daf6f48912a702afd6e2643957d46172e5` |
| `baseline-r17-1-i90z4s1bbu-terminal.json` | 1,581 | `32280897d2f15864b3186c5c191033d28c312fdfe451f6c9adf3a909f711fd4d` |
| `r25-retirement-instance-readback.private.json` | 185 | `82d6c68df53d840a3725bbd4f9a7d51ac0cbfccc5cc6f03341652797b36e0c88` |
