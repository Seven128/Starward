# Shared qualification / photo receipt boundary — narrow read-only review

2026-10-02. Reviewed the current renderer, level-selection shader, texture owner, Canvas lifecycle and the closed task-only FBO feasibility/closure notes. No production, asset, contract, governing document or normal consumer adoption change. No new product/runtime execution, GPU/device, installation, source acquisition or repeated test; byte estimates below are arithmetic only. Recommendations are decisions for root to record/adopt with the owner, not already implemented capabilities.

## Minimal semantics worth committing before implementation

Keep texture preparation, fragment qualification and photo contribution independent:

1. Preserve the existing independently prepared/submitted flags. They describe actual slots and draws, never photo credit.
2. Qualification is `HAS | EMPTY | UNKNOWN`, per **selected** fine and coarse slot; group qualification is derived from both. `HAS` means at least one actual framebuffer fragment selected that slot under the same complete-four-texel, fine-first rule. `EMPTY` requires a successful complete-domain probe/reduction of the actual prepared inputs returning no selected fragments. Invalid parameters, skipped/unsubmitted draw, shader/setup/readback failure, over-budget probe or incomplete coverage yield `UNKNOWN`; a failing native upload is not a scientific-absence certificate.
3. Photo is `POSITIVE | UNKNOWN`, per selected slot. `POSITIVE` means a positive weighted `maxRGB * opacity` signal survived the represented successful later draws and actual finish/navigation clear. RGBA8 zero remains `UNKNOWN`, since the closed experiment observed positive mathematical residual quantizing to zero. No generic `NONE` is added merely because the signal reads zero. Eligibility EMPTY may independently rule out a qualified selected sample, without reinterpreting a zero photo channel as a measurement of mathematical absence.
4. Exact immutable source identity stays at the publication/frame owner; the GPU receipt binds actual image objects/registrations/prepared windows and one renderer frame/group token. Scene joins them to the already admitted full publication and exact actual descriptors. The renderer should not parse source catalogs/hashes or copy publication metadata.

Use a successful probe's **binary qualification channels** separately from photo intensity. A useful four-channel layout is fine photo / coarse photo / selected-fine qualification / selected-coarse qualification. Each qualification channel is initially 0 or 1 with blending disabled; later alpha replay touches only photo channels. `any HAS` is the OR of the two independently reduced qualification maxima, and `any EMPTY` requires both EMPTY. The experiment's fine/any maxima cannot infer whether a black coarse exterior was selected when fine also exists; that layout is insufficient for per-level participating diagnostics. This shared probe change needs no new source PNG or metadata publication contract.

Qualification is pre-foreground target-spectrum information, deliberately unaffected by later occlusion/navigation. Photo is a completed-frame fact. In particular, valid fine black yields fine HAS / fine photo UNKNOWN and continues blocking coarse there; it cannot authorize W3 backfill. Subsequent occlusion does not retroactively turn a valid optical sample into missing science. Whole-cutout optical/W3 fallback remains a separate selection-owner decision; do not choose it from completed photo zero/UNKNOWN.

## Two phases, one bounded owner

A small explicit group ticket is clearer than a mutable public result object. Suggested shape, not an adopted API:

- `artworkLevels` retains existing flags, returns immutable immediate qualification plus an opaque group ticket when probing was enabled.
- A renderer-owned completed-result lookup accepts that ticket **after successful finish**, yielding immutable per-slot photo results and the same frame token/actual image identities. Pending, retired, foreign or failed tickets cannot yield completed credit. The private table is bounded by the enabled group limit and cleared/retired on begin, resize/context replacement/dispose.
- Ordinary consumers without the opt-in capability allocate no auxiliary resources. Do not change the broad `SkyRenderSurface.finish(): void` contract or enable normal v2 merely to acquire this private receipt.

Future CPU W3 selection needs qualification before later drawing, so immediate eligibility MAX/readback and finished photo MAX/readback can imply **two synchronous one-pixel reads per group**. One-pixel size is not proof of a cheap synchronization. Make this real mechanism/cost explicit; lazily reducing only at finish cannot silently satisfy an earlier CPU spectrum decision. No extra native frame, source query or bitmap decode belongs to this boundary.

`finish()` must flush buffered points/lines, perform actual native-navigation clear and all final signal work, check ordinary GL/context success, and only then make completed tickets readable. The Canvas lifecycle's successful completion gate remains responsible for publishing the same scene/visibility/Canvas generation. A new request or newer query result does not relabel old completed pixels; a retired native image cannot retain current source credit. The independently fixed page status/cue gates must remain the currentness consumer.

## Real framebuffer cost and deterministic refusal

The closed 96×128 experiment measured 49,152 steady signal bytes plus 16,388 bytes of all MAX levels; it did not establish a small ROI, high-DPR budget or native performance. Narrow-TAN conservative bounds can return null/full viewport.

Plan storage from the **actual** `gl.drawingBufferWidth` and `gl.drawingBufferHeight`, not logical size times a presumed DPR. Validate finite positive safe integers; check WebGL texture/viewport limits before allocation. For a full buffer of `N` pixels, one RGBA8 signal is `4*N` bytes. Repeated MAX levels use `ceil(width/2) * ceil(height/2) * 4` until 1×1; compute the actual sum rather than relying on the asymptotic N/3. Add all live group buffers, scratch, texture/FBO/program/buffer objects and source-window coexistence to a separate auxiliary ledger.

For scale only, 390×844 logical at an exact DPR3 would be 1170×2532 backing pixels: **11,849,760 B** for one signal, plus **3,953,752 B** for the retained complete 12-level MAX chain, totaling **15,803,512 B** for one group/reduction. Multiple simultaneous group signals grow linearly. This arithmetic is not a measured native allocation. Existing 16MiB source-texture allocation pressure protects the active image working set and is neither an auxiliary cap nor total memory certification.

Recommended boundary: explicit probe opt-in with a caller-owned `auxiliaryBytesLimit` and `maxGroups`; no enabled default before that policy is recorded. Refuse before allocation when exact planned live/transient cost or hardware limits exceed them; mark only the refused receipt UNKNOWN and preserve ordinary drawing. The limit is a new explicit resource policy to justify with the owning caller, not a number supplied by the feasibility test. Do not downsample the qualification domain and still label EMPTY. A later exact MAX streaming optimization may lower scratch cost, but it needs its own mechanism evidence; no unverified smaller-ROI certificate is assumed.

Prefer exact-size reuse within the same live renderer generation, retire old size-dependent resources on resize and release failed allocations immediately. Warm reuse cannot reuse old signal content: every new group/frame initializes a fresh zeroed qualification/photo state. Allocation/setup failure latches the optional probe capability for that renderer or requires one explicit retry/reset; do not try compile/allocate again for every camera tick.

## Actual later draw replay and multiple groups

The renderer already owns `submit`, all shader programs/uniform inputs, prepared windows and the actual VBO upload. Keep signal replay inside that owner rather than copying the task's global GL taps into production. Replay immediately while the exact successful program/uniforms/geometry are available. A recorded VBO pointer at finish is insufficient because later `bufferData` overwrites the buffer.

For each existing group, a subsequent successful draw attenuates its photo channels by that draw's actual **destination RGB blend factor**: ONE preserves additive light; ONE_MINUS_SRC_ALPHA multiplies by real shader alpha. Preserve qualification channels with color mask. Unsupported equations/factors/masks invalidate only the affected photo interpretation as UNKNOWN; no guessed alpha/terrain silhouette supplies a replacement. Reductions and signal passes themselves must never recurse as ordinary occluders.

A later normal level group is itself a real potential occluder for earlier group signals. First account for that new draw on each earlier signal using its actual selected maxRGB alpha, then initialize the new group's own signal. A valid-black new group has alpha zero and does not erase earlier groups, even though it is eligible. Rejecting a new group's probe for resource limits does not authorize ignoring its successful ordinary draw when maintaining earlier signals. Keep independent per-group identity, domain, failure and result; merging unrelated groups into one signal silently loses provenance.

Texture pins cover actual initial qualification/signal capture. `textures.finish()` retires unused textures; source-window changes can replace/delete an earlier sampler even when its image identity is pinned. Do not retain a historical sampler pointer for deferred replay after another group changes that window. Once an earlier signal has been materialized, later occluder replay uses the later actual program/inputs and does not need to reread the earlier image. Source image retirement before final receipt publication still invalidates that source ownership.

## Failure and GL-state ownership

Probe-only failures must not turn a still-valid ordinary frame into a false photo or fabricated EMPTY. Return UNKNOWN/reason, dispose partial FBO/texture/program/buffer allocations, restore all touched framebuffer/viewport/scissor/program/buffer/attributes/sampler bindings/blend/color-mask state and preserve independently working groups. Restoration failure or lost context invalidates the entire frame instead.

Do not swallow a pre-existing normal-draw `getError()` merely because the probe is optional. Check the ordinary draw's error boundary before entering optional work; a normal failure/context loss follows the existing thrown-frame-failure lifecycle. An isolated probe operation error can be consumed and classified only when its origin is known; it cannot hide an ordinary failure that `finish()` would otherwise detect. Probe compile/FBO/limit rejection never calls image-upload failure for a valid source bitmap.

Normal `finish()` failure or context loss publishes **no new completed receipts**. All pending tickets become retired/unavailable; disposal releases auxiliary objects with the renderer. Optional probe failure alone may still allow catalog, legacy imagery and recovery UI to complete. The distinction requires actual startup/allocation/compile/readback/context-loss failure checks before enabling a normal consumer; the task's one null-FBO cleanup was not that complete recovery proof.

UNKNOWN must remain visible as uncertainty in developer diagnostics; it cannot unlock spectral fallback or invent current-photo credit. Source availability/loaded-publication attribution can remain independently accessible, explicitly distinguished from a verified current-frame contribution. Normal completed source labels, optical/W3 selection, cues and picking migration still need their own consumer evidence and target acceptance.

Relevant entries: `sky-gpu-renderer.ts:495/549/650/1000/1074`, `sky-artwork-level-composition.ts:21/46`, `sky-gpu-textures.ts:42/142/149`, `sky-canvas-lifecycle.ts:80/88/105`, and `experience-contribution-fbo-development-closure-2026-10-02.md`. This note does not claim the suggested API, cap or recovery policy has been adopted or tested.
