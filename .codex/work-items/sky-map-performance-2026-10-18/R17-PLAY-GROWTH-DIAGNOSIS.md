# R17 playback growth — historical diagnostic proposal

This copy-suppression proposal has been executed and superseded as a next action. Its result is retained in [copy suppression](R17-NATIVE-COPY-SUPPRESSION-RESULT.json). Later [GPU finish](R17-GPU-FINISH-RESULT.json), [Page/GL observation](R17-PAGE-BRIDGE-RESULT.md) and [CPU/page-only](R17-CPU-PAGE-ONLY-RESULT.md) results narrow the remaining boundary. [HANDOFF](HANDOFF.md) owns the current action; the proposal below is historical reasoning, not a competing plan.

Read-only source diagnosis, 2026-10-18. This note proposes an isolated diagnostic; it does not identify the cause or approve a production change. The root owns all device operations, builds and services. No product code, data, process or device was changed for this diagnosis.

## Decision

The next single-variable trial should suppress **only recurring completed WebGL-to-display full-frame `drawImage` calls** at `apps/wechat-miniapp/src/features/sky/sky-canvas-surface.ts:161`. Allow the first copy to establish a recognisable frozen frame. Keep the real 1× clock, complete Scene/GL rendering, existing captions/reticle calls, and the same React/Taro publication work. Label the entire build **“no full-frame copy / frozen-image diagnostic / synthetic publication”**. This is a counterfactual used to locate retention, never a working renderer or an R17 acceptance sample.

Do not simultaneously change Canvas dimensions, DPR, the framebuffer preservation option, catalogue/SAO content, tick scheduling, VBO upload, contribution receipts, Taro state frequency or frame acceptance logic. Revert the failed `globalCompositeOperation="copy"` experiment in this new trial so only the one native image-copy operation differs from the original source. Reusing the same diagnostic harness is appropriate; reusing the failed composite-operation change as a second variable is not.

The page must still execute its normal publication callback so this comparison retains the expensive React/Taro path. However those are **synthetic state publications**, not real image presentation: skip `r17Probe.accepted()` entirely so `acceptedCopies=0` and accepted-time events are zero. Keep the diagnostic identity explicit in the visible label and external source/bundle hash evidence. Its time-labelled state, picks and source readbacks are not displayed-frame evidence. Avoid Apply/picking/source actions during the trial. This minimal trial needs no collector schema change; optional extra numeric counters below are a subsequent instrumentation choice if the single boundary remains unresolved.

If PSS growth collapses while real time intents, completed GL draws, resource activity and Taro updates remain active, the full-frame copy path is implicated. This does not distinguish retained source snapshots, display commands, implementation buffers or a platform fault. If growth continues comparably, that full-frame copy is not necessary for the observed growth; the result does not establish a JavaScript leak. Captions still use Canvas2D, and native GL uploads plus Taro remain active.

## Current evidence and its limits

The existing [phone comparison](R17-PHONE-COMPARISON.md) already records common baseline/candidate playback exits. The root supplied this fourth, failed isolated copy-operation run:

| Playback observation | Total PSS, KiB | Native Heap PSS, KiB | GL mtrack, KiB | EGL mtrack, KiB |
| --- | ---: | ---: | ---: | ---: |
| about 2 s | 1,021,898 | 106,847 | 8,552 | 89,132 |
| about 24 s | 1,898,755 | 137,215 | 8,416 | 89,132 |
| about 46 s | 2,233,229 | 153,023 | 8,416 | 89,132 |
| about 66.5 s | Mini Program no longer foreground | — | — | — |

The last visible product time was approximately `04:30:56` at about 56 seconds. The attempted pause was rejected by the foreground guard; no input was sent. The root's newest allowlisted exit record is reason 2/status 6, with exact process association still unresolved. Do not relabel that as a proven OOM exit or a graphics exception.

From the first to third memory observation, total PSS grows by 1,211,331 KiB while recorded Native Heap PSS grows by 46,176 KiB and GL/EGL accounting is approximately flat. This rules out **those recorded categories explaining the full increase**. It does not classify the residual as V8/JS, rule out driver/native allocations, or establish which sorted Appbrand slot owns the current Mini Program. The root is extending `scripts/r17-sky-memory.mjs` with exact resumed-activity process binding and additional allowlisted memory partitions. Do not infer heap ownership from `Private Other` or `Unknown` alone.

Changing only the compositing operation did not prevent the exit or memory growth. That rejects it as a sufficient repair on this run. It does **not** remove `drawImage` itself, WebGL snapshot transfer, caption drawing or all Canvas-native retention from consideration.

## Owners inspected

### Diagnostic retention is bounded in the inspected code

- `scripts/r17-phone-probe-runtime.ts:4,28–46` limits each numeric sample array and distinct-instant Set to 2,048 values. There are nine CPU sample series, three timing sample series and four instant Sets; none stores Scene data, native images or complete frames. `:54–55` bounds public identifier Sets to eight strings each. The retained numeric payload is far smaller than the observed GiB growth, although runtime overhead is not measured here.
- Its per-attempt table is a `WeakMap<object, number>` at `:24,75,98`; it is not a strong-key frame history. `latestIntent` is one numeric record. Scene completion at `:107–121` reads only scalar facts and bounded identifiers. Accepted-frame inspection at `:123–137` iterates objects but does not retain them.
- `snapshot()` at `:139–150` first stops measurement and only then copies/sorts the bounded numeric arrays. Earlier crashes occurred before export, so export serialization is not necessary for those failures. The 45-second deadline stops the probe, not the product's Play operation.
- `apps/wechat-miniapp/src/services/acceptance-diagnostics.ts:41,58–69` replaces one scene inspection; `:100–108` keeps 80 stored request-diagnostic rows. The probe builder removes `MINIAPP_ACCEPTANCE_DIAGNOSTICS` and device-diagnostic environment flags before building at `scripts/build-r17-phone-probe.mjs:173–176`. Native error deduplication uses a WeakSet in `services/runtime-error.ts:3`; it does not retain original errors in a strong table.

These are source bounds, not a measured JS-heap result. They do not certify the whole runtime, DevTools instrumentation or framework internals.

### Real playback drives React and native bridge work

- `sky-observation-time.ts:29–35,62–78` replaces one state and one elapsed-time anchor; it does not keep one state per instant.
- `spot-sky-page.tsx:1967–1971` schedules the current 16 ms time intent loop with cleanup. `:2472–2476` calls the time owner and `setTimeIntent`. Each distinct instant invalidates `presentSkyTime` at `:1928–1929`, the report/frame and `draw` dependencies at `:2311`, and the drawing effect at `:2373–2378`.
- After actual presentation, `:1657` replaces one painted-object ref. `:1680–1720` replaces `presentedSkyFrame`; moving `frameAt` makes the previous state distinct. Camera and other UI setters follow at `:1722–1723`. This causes allocation and rendering activity; these replacements alone are not evidence of indefinite retention.
- The installed Taro implementation `node_modules/@tarojs/runtime/dist/runtime.esm.js:3640–3644,3659–3676` stores pending payloads until its scheduled update drains them. At `:3698–3749`, it clears `pendingUpdate` and can submit later updates before the previous native `setData` callback acknowledges. Custom-wrapper and page calls are separate at `:3740,3749`. Backlog and acknowledgement cadence therefore need measurement; source inspection does not prove either a growing backlog or a leak.
- Taro's development performance recorder is conditional on `options.debug` at `:3572–3585`, removes its timestamp on completion, and logs only under that condition. No application `options.debug` assignment was found in the affected source search. This is not a reason to log full setData objects.

### Native Canvas identity is intended to be stable

- `spot-sky-page.tsx:1491–1529` creates the offscreen Canvas/renderer only in the lifecycle's `createContext` port, and increments `canvasGenerationRef`. Release disposes the renderer and both backing stores at `:1531–1543`.
- `sky-canvas-lifecycle.ts:128–133,187–217` owns one latest request/context/size and a busy writer; `:245–249` replaces latest rather than queueing every frame. It creates a context when absent, not every normal tick.
- `sky-canvas-surface.ts:109–115` initializes the display/offscreen backing stores and requests `preserveDrawingBuffer:true`. `:123–127` checks identity/size. Per-frame `present` at `:156–161` flushes GL and calls a full-size native `drawImage`; no application CPU readback, image encoding or explicit new Canvas occurs there. Caption glyph measurements/draws follow at `:162–203`.

One creation path does not prove one actual runtime identity. Count it; do not introduce resizing or re-creation as a speculative repair.

### Stable GL handles do not imply stable storage allocations

- `sky-gpu-renderer.ts:449–457` owns renderer program/buffer arrays and a reusable JS `vertices` array. `:518–539` allocates programs/VBOs and registers them immediately. `:617–620` uploads then truncates `vertices`; dispose retires all registered handles at `:501–516`.
- `:572–584` calls `new Float32Array(data)` and `gl.bufferData(..., DYNAMIC_DRAW)` for each non-reusable submission. That is a real per-submit backing-storage replacement even with a stable VBO handle. It needs count/byte evidence, not an assumed leak. Shader/program identities and `screenQuad` are reused under their existing conditions (`:460–465,552–570`).
- `sky-gpu-textures.ts:27–35,73–75` caches by decoded image identity. New upload is at `:102–109`; cropped uploads/copies create/delete temporary FBO/texture handles at `:117–146`. `finish()` retires unused frame entries at `:194–198`. Time does not appear as its cache key. Repeated image identities or changed crop windows can still create upload traffic and must be counted before claiming stable residency.
- `sky-gpu-artwork-contributions.ts:133–155` owns a target pool/scratch chain with explicit logical byte accounting. `begin()` clears frame entries (`:407–417`), `finish()` trims unused targets (`:621–637`); the 1×1 readback is four bytes at `:381`. There is no full-frame JS readback in this owner.
- A specific potentially recurring storage boundary exists even with stable target handles: `signalStorage` at `:335–342` redefines a non-RGBA target with `texImage2D`; backdrop capture at `:442–448` can redefine the same target to RGB when the default framebuffer reports no alpha. `withBackdropSnapshot` returns the lease to the pool (`:455–456`), and a later signal can reuse it (`:470–477`). This is conditional on actual `ALPHA_BITS`, demand and call ordering. **No evidence currently proves that this path is active during the failing phone run.** The ordinary page supplies automatic contribution groups from prepared regions/target optical content at `spot-sky-page.tsx:1577–1579`; it may be zero for the selected view.

## Small passive counters for the isolated trial

If the first counterfactual remains ambiguous, keep numeric totals/maxima and one current owner generation; do not retain native handles, frames, payloads, screenshots or resource URLs in diagnostics. Existing positive time/Scene/GL counters plus the isolated source binding support the first trial. These additional counters resolve the named competing mechanisms without a speculative monitoring framework.

| Boundary | Minimal counters/facts | Exact source insertion owner |
| --- | --- | --- |
| Surface identity/copy | surface create/dispose; current generation; backing width/height/DPR; copy attempted/completed/suppressed; captions drawn | `spot-sky-page.tsx:1491,1531`; `sky-canvas-surface.ts:109–115,156–161` |
| GPU normal submission | bufferData calls/cumulative bytes/largest bytes; program/VBO create/delete totals | `sky-gpu-renderer.ts:518–539,584,501–516` |
| Image/texture churn | image decode create/release; texture create/delete/upload/crop-copy totals; current/high-water logical resident bytes | `sky-artwork-request.ts:70` and existing bitmap/file release owner; `sky-gpu-textures.ts:30,103,109,120–146,149–150` |
| Auxiliary allocations | active groups; pool/scratch counts and current/high-water bytes; full-size texImage/copyTexImage redefinitions with numeric dimensions; observed alpha bits | `sky-gpu-artwork-contributions.ts:309–342,442–448,407–417,621–637` |
| Taro bridge | page setData submitted/acknowledged/thrown; current/max pending callbacks; max acknowledgement latency; cumulative/max changed-key count | task-only wrapper of the current Sky page's `setData`, installed once and restored on cleanup |

For the setData observer, preserve original `this`, original arguments, return value, exceptions and callback invocation; invoke the original callback exactly once. Do not turn it into a batching/throttling fix. Do not retain the `data` object or its values in any diagnostic array, stringify every payload, or log keys/contents. A page-only wrapper is explicitly page-only: installed Taro can use custom-wrapper setData as well. If the relevant view uses them, either count their existing submission owner in the isolated Taro runtime or report that coverage gap; do not claim complete bridge observation from page counters alone.

Use the existing lifecycle generation and resource owners to count actual creates/disposals. Avoid patching every WebGL method or proxying native Canvas objects merely to count calls. Direct numeric increments in these task-isolated source owners add less uncertainty. `bufferData` cumulative bytes are traffic, not live memory; byte counters and resident logical budgets must remain distinct.

## Bounded early receipt and observation

The earliest previous last-observation point was 21 seconds; another 45-second in-memory-only receipt risks losing the only useful counters. The root selected **one automatic snapshot/export 15 seconds after the diagnostic Start control**, followed promptly by Play pause through the current real UI. Keep the original `durationLimitMs:45000` declaration, `reason:"manual"` and actual elapsed time; the shorter manual snapshot is not a new product playback deadline. The root should take exact-current-process memory observations before Play, while running and after the actual pause. Do not wait for an exit to terminate the sample, and do not force-stop WeChat.

Reuse the existing task request path, byte ceiling, fixed allowlist and durable acknowledgement mechanism. `r17-phone-probe-runtime.ts:139–150` already creates an early `reason:"manual"` snapshot with actual elapsed time; the current v1 validator accepts early elapsed values. The controls already use a no-auth, no-cookie request and acknowledge `stored:true` at `scripts/r17-phone-probe-controls.tsx:26–34`. Move/reuse that export helper for a single deadline; do not add per-frame network work, persistent storage or repeated exports.

Use the existing v1 collector unchanged for this first isolated trial, with external hash binding and explicit nonacceptance classification. It rejects extra keys by design; do not add optional counters to a v1 payload. If later source instrumentation needs new fields, give that small diagnostic an exact allowlist rather than making the current validator permissive. Preserve all earlier receipts unchanged. If a second receipt is useful, give it a distinct checkpoint identity; the existing collector rejects different bytes under the same run identity. One early receipt is sufficient for this boundary if it has positive real time/Scene work.

Export completion stops only probe recording, as today. Product Play must be separately paused by the actual owner/UI, and the paused/fixed recovery must be observed. Export failure must remain visible as failure and must not trigger a repeated uncontrolled playback attempt. Retain the ordinary pre-trial/paused state; do not Apply a diagnostic instant to Context.

## Interpretation and stopping rule

1. **Changing surface generations/dimensions:** fix or explain lifecycle churn before attributing growth to snapshots. The current trial cannot answer a stable-surface question if it silently re-creates the surface.
2. **Growth collapses only with full-frame copy suppressed, other counted owners remain active:** investigate that native copy boundary next. Do not adopt the frozen output as a product repair, and do not report passing rendered-time acceptance.
3. **Growth persists with copy suppressed:** inspect the measured GL storage/upload totals and native/Taro pending activity. A flat handle count alone is insufficient; full-size storage redefinitions and bufferData are separate counters.
4. **No growing allocation activity but large residual anonymous/private memory:** preserve that unresolved boundary. The installed `Taro.Performance` type exposes performance entries and observers, not JS heap byte totals (`apps/wechat-miniapp/node_modules/@tarojs/taro/types/api/base/performance.d.ts`). `onMemoryWarning` is a warning level, not a JS-heap measurement. A genuine target-runtime JS heap profile would require a supported, separately scoped observation; H5 `performance.memory`, simulator heaps, Android private partitions, or a new remote-debug connection must not be silently substituted.

Do not run the whole camera/time matrix again for this diagnosis. Stop after a useful positive receipt and bounded current-process comparison. That evidence should select the next responsible boundary or invalidate the trial; it does not complete the still-failed R17 playback obligation.
