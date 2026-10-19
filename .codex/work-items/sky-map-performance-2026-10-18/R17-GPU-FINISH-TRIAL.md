# R17 isolated GPU completion diagnosis

Target result: **GROWTH_PERSISTS_WITH_FINISH_BEFORE_REAL_FULLFRAME_COPY**, not adopted. Generation19 completed a valid 13,995ms early manual window with 420 real copies/accepted publications and no failed frames. Foreground-owner PSS rose from 2,278,729 to 2,935,934KiB before substantial swap; Unknown rose from 1,610,092 to 2,246,840KiB. The process was already warm and large. Actual normal playback was paused at 32 seconds and its preview cancelled without Apply or a newly observed crash. Later PSS includes substantial swap and cannot be called physical DRAM or JS heap. [The target result](R17-GPU-FINISH-RESULT.json) owns exact receipt/memory/media identities and limits; the following frozen build record remains reproducible. The next bounded observation measures actual Page setData acknowledgments and typed GL uploads without changing rendering.

Status: **BUILD_READY_GPU_FINISH_DIAGNOSTIC_TARGET_EFFECT_UNVERIFIED**. The complete project is `tmp/r17-gpu-finish-trial/project` (`miniprogramRoot=weapp/`). Its complete WEAPP SHA-256 is **`65d933516c269927bb2095fb3bebb3e0f6126fe737219ccdedddafcd8d6fe767`**, 338 files and 4,975,415 B. Main package is 2,016,773 B, with 80,379 B headroom. Source is `tmp/r17-gpu-finish-trial/source`. The [machine evidence](R17-GPU-FINISH-TRIAL.json) binds the builder, controls template, source manifest, original pair, preceding trials and final project readback.

This is one bounded GPU producer-backpressure experiment. The original paired candidate `a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf` supplies every declared source input; it is not derived from either the Canvas `copy` trial or the native-copy suppression trial. The [copy result](R17-CANVAS-COPY-RESULT.json), [suppression result](R17-NATIVE-COPY-SUPPRESSION-RESULT.json) and [JS heap diagnosis](R17-JS-HEAP-DIAGNOSIS.md) narrow the question but do not prove the cause. Suppression retained one surface/copy while foreground-process growth persisted; the local populated JS run did not retain a growing post-GC history, but omitted target GL, images and React/Taro. The present experiment asks whether waiting for GPU completion changes that target behavior while keeping the entire normal display and publication path.

There are exactly three source differences against the original candidate:

1. `sky-canvas-surface.ts`: each normal `present` calls `ownedGl.finish()` where it previously called `ownedGl.flush()`, **before the original full-frame `context.drawImage`**. All normal copies, original captions, reticles, allocation/lifecycle guards and failure propagation remain. A missing or throwing `finish` fails normally; there is no silent fallback to `flush`. Three saturating scalar counters record successful surface creation, returned `finish` calls and successful native full-frame copies. They retain no identifiers or frame arrays and cause no per-frame React update.
2. `r17-phone-probe-controls.tsx`: the visible label is **R17 candidate/gpu-finish**. Play-case selection arms the next accepted normal Play action and opens the original time pane through its unchanged page `onStart` callback. It starts no timer, probe or playback while waiting. Non-play cases retain immediate measurement start. One reusable export path preserves the exact serialized payload for retry, prevents concurrent exports/new starts during an export and fences stale completion. Preparation, replacement selection, hide and unmount cancel arming/timers through the diagnostic page lifetime.
3. `spot-sky-page.tsx`: a diagnostic lifecycle hook is added, and `r17GpuFinishProductPlayStarted()` is called **after** the existing guarded `setTimeIntent(observationTime.play(Date.now()))`. The normal Play button still calls the original `toggleSkyTimePlayback` owner. All its readiness/current/date/end guards and its pause branch remain. The real `attempt.publish` and `r17Probe.accepted(frame, paintedSkyObjectsRef.current)` statements are unchanged.

The single rendering variable is the completion call. The measurement-start repair is diagnostic setup and does not replace the product clock or start playback. There is no frozen screen, copy compositing, clear, quality/star/SAO/image reduction, explicit cadence change, fixed FPS cap, forced GC, second Scene or generated-JavaScript patch.

The original v1 runtime, collector route and schema are unchanged: `variant=candidate`, one-second arm, `durationLimitMs=45000`, 2,048 retained samples. After an actual normal Play action succeeds, the diagnostic exports **15,000 wall milliseconds later**. With no scheduling delay this is about **14,000 active milliseconds**, `reason=manual`; it is not a complete 45-second measurement. The receipt reports actual elapsed time. Automatic or manual export stops measurement only; **product playback continues** until the parent pauses through the real product UI. A rejected Play action or the pause branch does not consume the armed measurement.

The actual menu and cached export status show:

```text
R17 candidate/gpu-finish · S<surfaces> F<returnedFinishes> C<actualCopies>
candidate/gpu-finish S… F… C… 已导出 <runId>；<elapsed>ms/manual
```

These cumulative scalar counts are outside the unchanged receipt schema. Header counts read the current scalars; export status pins their snapshot to the cached payload. `F` records API return, not independent confirmation of driver compliance or physical scanout. Unlike the preceding suppression trial, target receipts must contain **real nonzero accepted copies and accepted-time events** before being interpreted as a playback workload. Bind each receipt and scalar capture externally to this exact bundle and phone generation; the protocol variant alone cannot identify it.

The [WebGL 1.0 specification](https://registry.khronos.org/webgl/specs/latest/1.0/#5.14.11) lists both methods. Khronos's primary [finish reference](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/es2.0/glFinish.xml) describes waiting for previous GL commands to complete; its [flush reference](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/es2.0/glFlush.xml) permits return before that completion. This is the reason for the counterfactual. It does not establish availability, correctness, cost or memory behavior in the current WeChat native implementation. The direct WeChat documentation page was inaccessible through the web reader; no target-support claim is inferred from that failure or from standard TypeScript declarations. The existing performance owner discourages blocking completion as a general measurement technique; this task-only causal diagnostic is not adoption of blocking synchronization in production.

The builder copied all 1,563 declared candidate inputs into a new ignored source tree, reusing only dependency junction targets. It read back the 1,561 normal repository inputs, both original paired sources/bundles/project copies and all declared sources plus bundle/project copies of both earlier trials unchanged before and after the complete build. Their bundle identities remain:

| Retained source | Complete WEAPP SHA-256 |
| --- | --- |
| Original baseline | `61b5ce1bc7f5ab1954a992c69fb2224468488ee750a3488a54832bb0dd54bef5` |
| Original candidate | `a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf` |
| Canvas copy trial | `1d63353782af185908cf6e5ddaf86f98ca7747528e29ad78f2ba8e0d3e82d056` |
| Native-copy suppression trial | `837404e3e5af4f7d86ff8652354d9746ea95d9c60b65039048aad75550532ad9` |

Before the build, a bounded JS fixture executed the exact staged surface, diagnostic controls, unchanged product `SkyTimeControls` Play `onClick`, original page Play callback and original post-copy completion statements. It passed the following material checks:

- Every normal present completes `finish → original native copy → captions → reticle`; missing/throwing finish has no flush fallback, copy retry remains normal, invalidation precedes both calls and no per-present Canvas/image allocation or resize is added.
- The actual product Play callback retains its guards and pause behavior. Waiting 20 seconds after selecting a play case starts no timers or export. A valid actual Play starts the original product owner, then arms the probe; repeated notification does not restart it.
- Ten copied frames reach both real publication and accepted measurement with ten distinct accepted instants in this fixture. A failed finish reaches neither. This is a source-flow fixture with fake native ports, not target-frame or full-scene equivalence evidence.
- The automatic snapshot fires once, 15 seconds after accepted actual Play, retains the original 45-second protocol limit, reports 14 active seconds/manual in the deterministic clock, and never pauses product playback. Retry bodies match byte-for-byte; concurrent export/start, replacement, hide/unmount and stale response behavior are guarded.

One complete Taro WEAPP build then passed, with `assertPhysicalDeviceBundleSafe`, all 11 `inspectCandidate` checks, package budgets and identical compiled/project fingerprints. Final `inspect` repeated source/bundle readback and the bounded fixtures. No service, database, Drive object, CI workflow, phone, feedback wrapper/generation, DevTools entry, ordinary source or production bundle was changed by this builder. The parent exclusively owns delivery, actual playback/pause, rendered output and native-memory observation. No product repair or R17 acceptance is established here.

Reproduction for an absent output root:

```powershell
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-gpu-finish-trial.mjs prepare
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-gpu-finish-trial.mjs build
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-gpu-finish-trial.mjs inspect
```

The existing completed staging needs only `inspect`. Preparation refuses existing output/evidence; build refuses an existing bundle/project. The authorized account service's physical listener is read only to derive the already-owned development bridge in memory; concrete addresses and raw build output are not printed. This ready project is now frozen for the parent's one bounded target experiment.
