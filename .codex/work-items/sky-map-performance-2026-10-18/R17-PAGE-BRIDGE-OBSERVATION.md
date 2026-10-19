# R17 Page bridge and typed GPU upload observation

Target result: generation 20 was delivered and observed with the original rendering path. [Actual target evidence](R17-PAGE-BRIDGE-RESULT.md) and its [hashed JSON](R17-PAGE-BRIDGE-RESULT.json) retain two nonempty early Play receipts, enabled-run Page acknowledgement/upload counters, memory growth with debugging disabled, and the unsuccessful guarded Pause. No repair is adopted; continuous playback/R17 acceptance remains failed/unverified. The status and checks below describe the frozen **build**, not a current claim that target observation has not happened.

Status: **BUILD_READY_PAGE_BRIDGE_OBSERVATION_TARGET_EFFECT_UNVERIFIED**. The frozen complete project is `tmp/r17-page-bridge-observation/project` (`miniprogramRoot=weapp/`). Its complete WEAPP SHA-256 is **`6cd3bdd1e5bc791ac11941a0ba40eae87f80301d694484b8297a7e06080f815a`**, 338 files and 4,980,750 B. Main package is 2,016,772 B, with 80,380 B headroom. Source is `tmp/r17-page-bridge-observation/source`. The [JSON evidence](R17-PAGE-BRIDGE-OBSERVATION.json) binds the builder, controls, pure observation owner, fixture, original pair, all preceding trial sources/bundles and final project readback.

This is the next bounded **observation**, not another rendering counterfactual or an adopted repair. The [native-copy suppression result](R17-NATIVE-COPY-SUPPRESSION-RESULT.json) retained one full-frame copy while foreground-process growth persisted; the [local JS diagnosis](R17-JS-HEAP-DIAGNOSIS.md) did not reproduce growing strong post-GC retention in its populated portable path, but omitted target GL, images and React/Taro. The parent reports that generation 19's full-copy GPU-finish trial still grew during actual playback despite a nonempty 14-second receipt (420 accepted copies/Scene frames and 2,100 GL submissions). That target result remains with its target-result owner. It is not inferred from this build.

Every declared original source input is copied from the original paired candidate **`a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf`**. The original `sky-canvas-surface.ts` is byte-identical: normal `ownedGl.flush`, every full native `drawImage`, captions, reticle and lifetime/failure rules remain. There is no `finish`, frozen/synthetic publication, `copy` compositing, clear, changed star/image population, quality reduction, explicit cadence change, new render loop or generated-JavaScript patch.

There are three modified source files and one additional task-only source file:

1. `sky-gpu-renderer.ts` imports one scalar recording function and calls it **after the original successful-returning `bufferData` invocation inside the actual `submit` owner**. It counts calls, `data.length * 4` bytes and maximum upload size. The original `new Float32Array(data)`, reusable-quad decision, GL error checks and draw path are unchanged. The recorder creates no array or payload copy. API return does not establish absence of GL errors, GPU completion, texture/TWGL allocation totals or physical memory.
2. `spot-sky-page.tsx` calls a diagnostic lifecycle hook and notifies it **after** the unchanged guarded `setTimeIntent(observationTime.play(Date.now()))`. The normal product Play button, Play guards and pause branch remain. The real `attempt.publish` and original `r17Probe.accepted(frame, paintedSkyObjectsRef.current)` remain unchanged.
3. `r17-phone-probe-controls.tsx` reuses the preceding fixed actual-Play arming and early export setup. It labels the candidate `R17 candidate/page-bridge`, reads the numeric header when the menu opens and pins a separate numeric snapshot when the export timer fires. It does not publish counters through per-frame React updates.
4. `r17-page-bridge-observer.ts` owns only scalar observations, one current scalar state and the current page wrapper lifetime. It has no raw payload, page, callback, frame or identifier history.

## Actual Taro owner and lifetime

The installed Taro packages are version **4.2.1**. In `node_modules/@tarojs/runtime/dist/runtime.esm.js`, `Current.page` is assigned the actual native Page in `onLoad`/`onShow` (lines 4189 and 4272), that Page becomes `pageElement.ctx` (line 4220), and `performUpdate` invokes `ctx.setData(normalUpdate, cb)` (line 3749). The default `proxyToRaw` hook in `node_modules/@tarojs/shared/dist/runtime-hooks.js:151` returns its argument. A bounded scan of the actual resolved React framework package found no replacement of that hook. These local implementation facts select the raw Page boundary; they do not establish actual target wrapper availability.

The Sky lifecycle captures `Taro.getCurrentInstance().page` while the Sky component renders. Attach requires that same captured Page still be the current Page. It wraps only that object's `setData`; Taro custom-wrapper updates and every other page are untouched. Mount/show attach; hide/unmount cancel diagnostic arming/timers and restore the exact original own descriptor, or remove the added own property when the method was inherited. Restoration runs only if the current method is still this wrapper, preserving a later owner's replacement. A nonwritable, accessor or otherwise unavailable method reports `A0` without changing product behavior. There is no polling, global monkeypatch, alternate Page, debug-mode change or setup flow.

Each wrapped call retains the original receiver, data object, trailing arguments, argument count, original return and thrown error. A function callback is wrapped to observe the first acknowledgement, then every invocation reaches the original callback with the original callback receiver, arguments, return and exceptions. No callback is added to a call that lacked one. Original in-flight callbacks continue to reach their original consumer after hide and can settle the same scalar state after re-show. Replacing the measurement does not create an artificial zero pending count.

At the accepted normal Play start, counters reset but `pending` survives and becomes `inheritedPending`. A late inherited acknowledgement counts among the new window's completions and retains its **full** original submission-to-callback latency, including any time before reset. These are observed callback-bearing calls, not a proven native queue or physical presentation timeline.

## Visible numeric meaning

Both the header and export status use the following compact fields. The menu is taller than the preceding diagnostic; the parent must use fresh current pixels for its controls.

| Field | Meaning |
| --- | --- |
| `A` | Current Page wrapper installed, 1 or 0 |
| `D` | Only `getAppBaseInfo().enableDebug`: `true`, `false` or `UNKNOWN`; no other returned field is retained/emitted |
| `I` | Callback-bearing requests already pending at reset |
| `S`, `C` | Calls submitted after reset; first acknowledgements observed after reset, including inherited calls |
| `F a/b` | Original invocation throws / throws before first callback; a synchronous callback throw can count both completed and failed |
| `P`, `M`, `X` | Current callback-bearing pending / maximum pending / duplicate callback invocations |
| `L total/max` | Submission-to-first-callback wall milliseconds, displayed to three decimals |
| `K total/max/fail` | Sum/max enumerable own key counts and inspection failures; no key/path retained |
| `B calls:total/max/fail` | First 16 sampling attempts only: successful UTF-8 JSON bytes total/max, serialization failures |
| `N` | Calls lacking a function callback; original arguments preserved, acknowledgement unobserved |
| `G calls:total/max` | Successfully returned actual `submit` bufferData calls and typed upload bytes total/max |

Within a reset window, tracked pending follows `P = I + S - N - C - failedBeforeCallback`, except counter saturation. All counters saturate at `Number.MAX_SAFE_INTEGER`. A duplicate callback is still forwarded but does not decrement pending twice. Serialization/key inspection errors are caught and cannot suppress the original call. Only the first 16 calls after measurement start execute `JSON.stringify`; the raw string stays local and is released. UTF-8 counting scans that string without another large allocation. Later calls only count own enumerable keys. First-16 JSON sampling adds bounded diagnostic work and cannot be interpreted as total traffic or retained heap.

`D` is read at attach and actual measurement start through the existing synchronous API when available. It is a boolean observation of that field, not attribution of memory to vConsole, remote debugging or any engine. API absence/error returns `UNKNOWN`. No setting is enabled or disabled.

## Measurement and export

The original protocol remains `starward-r17-phone-probe-v1`, `variant=candidate`, one-second arm, 45,000-ms limit and 2,048 retained samples. The bridge/upload scalar counters reset immediately after actual accepted Play; the original receipt begins after its existing one-second arm. Their windows therefore differ by that first second and must not be treated as identical counts.

Selecting a play case arms the next accepted **actual normal product Play** and opens the original time panel. It starts no timer, measurement or playback while waiting. A rejected Play or the existing pause branch does not consume arming. Fifteen wall seconds after the accepted Play, the existing receipt snapshots manually, nominally **14 active seconds** after its arm; actual elapsed time is authoritative. The numeric status is pinned at that export attempt and preserved through receipt retries. Header values read current scalars only on a menu open. No new fields are added to the collector schema; bind the receipt and visible scalar capture externally to this exact bundle and device generation.

Export stops only measurement, **never product playback**. The parent must pause promptly through the real product UI. A nonempty receipt and actual scalar screenshot are necessary before interpreting the target workload. A local fixture cannot supply those observations.

## Completed local checks and boundaries

One complete Taro WEAPP compilation succeeded, followed by `assertPhysicalDeviceBundleSafe`, all **11/11** candidate static checks, package budgets and equal compiled/project fingerprints. Final `inspect` reread all 1,564 staged source bindings, the 1,561 declared normal repository source bindings, both original paired sources/bundles/project copies, and every declared source plus bundle/project copy of the Canvas-copy, native-copy-suppression and GPU-finish trials unchanged. Original baseline remains `61b5ce1bc7f5ab1954a992c69fb2224468488ee750a3488a54832bb0dd54bef5`.

The bounded fixture executes the staged observer, actual GPU `submit` block, original product time-control Play `onClick`, original guarded page Play owner and original post-copy publication/accepted statements. It checks slow/out-of-order/duplicate callbacks; original and synchronous callback throws; receiver/argument/return preservation; carried pending; missing callbacks; first-16 UTF-8 sampling and cyclic serialization failure; exact descriptor restoration, hide/re-show and late callbacks; later replacement protection; failed upload/reusable-quad semantics; boolean/unknown debug reading; no pre-Play timer; nonempty accepted-time source flow; pinned 15-second numeric status; exact receipt retry and hide/unmount/stale-response fences.

Initial preparation exposed two fixture setup issues (the existing probe-count dependency in the extracted GPU block and a cross-VM promise-turn wait), plus a builder persistence boundary for an unbuilt fixture failure. They were repaired before the single full compilation. The retained ignored manifest records the failed preparation and resolution. No product failure or failed Taro compilation is inferred from those harness failures.

During build preparation, no phone, feedback wrapper/generation, DevTools entry, service, database, remote/Drive object, CI workflow, Git commit, ordinary source or previous trial was changed. The parent exclusively owns delivery, current pixels, actual Play/pause, receipt binding and native memory observation. Subsequent target observations are recorded only in the linked result owner above; the build checks do not establish memory improvement, continuous playback or R17 acceptance.

The frozen build needs only a readback:

```powershell
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-page-bridge-observation.mjs inspect
```

For a genuinely absent output root, the same builder supports `prepare`, then `build`, then `inspect`; existing source/bundle/project outputs are refused rather than overwritten. The authorized account service's listener is read only to derive the already-owned development bridge in memory; no concrete LAN address or raw build output is printed.
