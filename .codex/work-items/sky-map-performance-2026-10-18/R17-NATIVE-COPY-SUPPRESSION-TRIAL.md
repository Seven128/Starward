# R17 isolated native-copy suppression diagnosis

Status: **TARGET_GROWTH_PERSISTS_WITH_FULLFRAME_COPY_SUPPRESSED**. [Generation18 result](R17-NATIVE-COPY-SUPPRESSION-RESULT.json) confirms one Surface and one actual copy, with suppressed presents increasing from139 to1,154 around actual1x playback/pause. The Activity-bound foreground process still grew from1,123,896 to2,290,620KiB PSS, mainly Unknown/Private Other. Thus repeated fullframe copies are not necessary for the observed growth; the allocator remains unknown. Its15-second auto-export occurred before actualPlay and is explicitly INVALID_EMPTY_WINDOW, excluded from CPU/Scene evidence. This is not a product fix, CPU comparison or accepted-frame/time evidence.

The complete project is `tmp/r17-native-copy-suppression-trial/project`, with `miniprogramRoot=weapp/`. Its complete WEAPP SHA-256 is `837404e3e5af4f7d86ff8652354d9746ea95d9c60b65039048aad75550532ad9`: 338 files, 4,974,888 B total; main package 2,016,773 B with 80,379 B headroom. Source is `tmp/r17-native-copy-suppression-trial/source`. [Machine evidence](R17-NATIVE-COPY-SUPPRESSION-TRIAL.json) binds the source manifest, builder, controls template, original pair and complete project readback.

The input is the **original paired candidate** `a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf`, not the preceding Canvas `copy` trial. Its original baseline remains `61b5ce1bc7f5ab1954a992c69fb2224468488ee750a3488a54832bb0dd54bef5`. All 1,563 declared candidate inputs were copied into a new ignored source tree; only dependency junction targets were reused. The original pair's declared sources, both compiled bundles and both complete project copies, plus the 1,561 normal repository inputs, were read back unchanged before and after the build. Original source/bundle/cache trees remain in place. No wrapper, feedback generation, DevTools entry, service, database, Drive resource, ordinary source or generated production bundle was changed by this builder.

Final bounded readback also checked every declared preceding `copy` trial source and both of its compiled/project bundles unchanged at `1d63353782af185908cf6e5ddaf86f98ca7747528e29ad78f2ba8e0d3e82d056`.

There are exactly three source differences against that original candidate:

1. `sky-canvas-surface.ts` retains the first **successful** native full-frame `drawImage` on each newly created surface, then skips only that operation for subsequent presents on that same surface. A failing first copy remains eligible to retry. Existing surface validation, GL rendering and `ownedGl.flush()` remain; all captions and reticles still paint. No clear, extra backing resize, Canvas/image allocation, quality reduction, render-cadence change or new render loop was added in `present`. Three cumulative scalar counters saturate at `Number.MAX_SAFE_INTEGER`; they retain no surface IDs or frame arrays.
2. `spot-sky-page.tsx` preserves the real `attempt.publish` call and all following React/Taro updates, but entirely omits `r17Probe.accepted(...)`, including after the initial actual copy. It calls a diagnostic lifecycle hook with the page lifetime. The ordinary page source is unchanged.
3. `r17-phone-probe-controls.tsx` is explicitly headed **冻结画面诊断 / synthetic**. It adds one bounded 15-second automatic export and a reusable export path which preserves the exact payload for retry. The menu unmounts when opening the time panel, so the one timer belongs to the page's diagnostic module, with cancellation on page hide/unmount, prepare or a replacement start. It does not add a per-frame React update or interval.

The original runtime, collector route and v1 schema are unchanged. Every receipt still declares `variant=candidate` and `durationLimitMs=45000`; bind it externally to this exact bundle and current phone generation. The timer runs **15,000 ms after the start action**, including the existing 1,000 ms arm delay. With no scheduling delay, its early snapshot therefore has about **14,000 ms active elapsed**, with `reason=manual`. It is not a completed 45-second measurement. The actual elapsed value is exported; delayed native scheduling can change it. The automatic snapshot stops **measurement only**. It does **not** pause product playback; the parent must pause promptly through the actual time UI.

The control's export status shows:

```text
synthetic S<surfaces> C<actualCopies> X<suppressedCopies> 已导出 <runId>；<elapsed>ms/manual
```

`S` is cumulative successfully created surfaces, `C` successful actual full-frame native copies and `X` skipped subsequent full-frame native copies. Header counts read current scalars; export status pins their snapshot to the cached payload. These counters are intentionally outside the unchanged collector schema and must be retained via the parent's actual control capture. Stable S/C with increasing X distinguishes suppression on a retained surface from repeated creation and first copying. Receipt `sceneFinishes`, GL submissions and `publishAccepted` CPU calls can establish that work continued, while `acceptedCopies` and `time.accepted.events` must both remain **zero**. Synthetic publication metadata can advance while the full-frame image remains frozen; it cannot certify visible current time, picking, image fidelity or ordinary product behavior. Captions/reticles and native updates remain deliberately active, so this experiment does not isolate those potential retention mechanisms.

The complete Taro WEAPP source build passed, `assertPhysicalDeviceBundleSafe` passed, all 11 `inspectCandidate` checks passed, package budgets passed and both compiled/project fingerprints matched. The builder reran a bounded fixture against the exact staged owners to verify:

- first successful copy per surface, failed-first-copy retry, subsequent suppression and original invalidation guards;
- continuing GL flush, caption and reticle operations without per-present allocation or resize;
- executing the staged completion statements through the original real `attempt.publish`, with no accepted-probe invocation and zero accepted-copy/time counters;
- one automatic early/manual export at 15 seconds, original 45-second limit, exact-body retry, no duplicate concurrent export, replacement-start handling and page hide/unmount cancellation.

These checks establish JS/control-flow boundaries only. Native memory, target appearance, successful delivery and the experiment's causal result remain unverified. No broad product test suite or additional renderer was used for this diagnostic.

The first build invocation failed during existing configuration validation because the initially chosen isolated slot exceeded the established 31-character limit; no compiled output was produced. The slot was shortened to `r17-copy-suppression` without changing staged source behavior. The failed redacted log is retained as `tmp/r17-native-copy-suppression-trial/preflight-slot-failure-redacted.log`; the manifest records its hash, previous builder identity and scoped pre-build harness repair. One complete build then succeeded; no generated JavaScript was patched.

Reproducible entrypoints, for a new absent diagnostic output root:

```powershell
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-native-copy-suppression-trial.mjs prepare
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-native-copy-suppression-trial.mjs build
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-native-copy-suppression-trial.mjs inspect
```

The retained completed staging needs only `inspect` for readback. `prepare` refuses an existing root/evidence file and `build` refuses existing bundle/project output. The authorized physical-LAN listener on 8791 is read only to derive the existing bridge origin on 8795 in memory; concrete addresses are not printed or stored in text evidence, and build logs redact them. No phone/wrapper selection command is provided here because that responsibility remains with the parent owner.
