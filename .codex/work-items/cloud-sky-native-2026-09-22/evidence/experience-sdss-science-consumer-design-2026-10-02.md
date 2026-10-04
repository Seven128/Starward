# Science optical normal-consumer design — bounded read-only note

2026-10-02. Recommendations to the root agent, not adoption decisions. No
production, governing PLAN/Context, publication/registry, contract or asset change;
no GPU, HTTP, IDE, device, watch, tests, acquisition or installation. The new
shared opt-in receipt mechanism is read directly; its independent development
closure is owned elsewhere. This note does not enable normal science rendering
or adopt the candidate's color, PSF, detail, publication or native resource budget.

## Minimum responsibilities

1. **Existing frame owner:** `skySdssOpticalFrame` retains exact ready primary and
   parent objects/descriptors. Primary can be MEDIUM while requested DETAIL fails,
   or a retained finer field while zooming out. Map the actual primary to the GPU
   `fine` slot and the actual parent to `coarse`; never map slots from requested
   level names. Each registration uses its own exact asset and the complete common
   science publication with the same `exactSkyObservationFrame(data, frameAt)`.
   Reuse `registerSkyScienceOpticalField`; no rounded catalog/old horizontal center.
2. **Scene owner:** one explicit science-capable port bound to this same surface
   and frame; construct the pair, submit once, decide whole-cutout spectrum from
   qualification, preserve later HiPS/foreground draws, then snapshot contribution
   after successful `finish`. Broad legacy `SkyRenderSurface` callers should not
   acquire a mandatory new method or be cast into the prototype capability.
3. **Completion/presentation owner:** one immutable discriminated optical snapshot
   and one live-source helper shared by status, cue/source consumers and modal.
   Preserve actual native/Canvas generation and completed frame/time identity.
   Do not reconstruct completed provenance from the latest loader envelope.

The science port must be explicitly supplied only under an intentional opt-in
publication and resource policy. Method presence on `SkyGpuRenderer` is not an
enable switch. Current page `createContext` has no contribution budget, the normal
hook call has no science hash, and Scene explicitly denies science in the v1 path;
those defaults must remain disabled while the candidate is unpublished/unadopted.

## Whole-cutout policy for the next explicit consumer

Selection is fixed before optical HiPS and later foreground. It is independent of
final photo credit, and applies to the entire selected cutout, not to per-ray W3
holes. Existing optional WIDE_FIELD_W3 panorama is a separate historical layer;
existing OPTICAL HiPS remains after cutouts at its current quality/order/opacity.

| Actual science attempt | Minimum selection result | Completion/provenance |
|---|---|---|
| `qualification.any === has` | Select optical; withhold selected W3 cutout even if fine is valid black. Fine-first shader semantics keep independent coarse exterior. | Credit only actual positive surviving fields; black-only remains valid data with no photo credit. |
| Fine registration/upload fails, coarse qualifies | Coarse survives. Its HAS selects optical. Failure remains retryable. | Actual coarse field/publication; no requested-fine relabeling. |
| `any === empty`, complete probe, every field expected by this exact ready envelope registered/prepared | Whole W3 alternative may draw under its own registration/currentness. No local optical/W3 mixing. | W3's own completed identity if drawn. Awaited or unready requested levels are not the ready pair. |
| Explicitly no successful optical group submission, including no ready group or whole draw unavailable | Independent whole W3 alternative is permitted by the separately confirmed unavailable policy. This is not a qualification/absence certificate. | W3 keeps its own registration, source and lifetime; optical remains unavailable/retryable. |
| A group successfully submitted but `any === unknown`, or its probe was denied/failed | UNKNOWN never licenses W3 over this submitted group. Preserve background/catalog/retry; no spectral backfill. | No optical photo claim; independently valid sky/catalog output remains. |
| Optical selected, later layer/navigation removes photo | Keep the earlier spectral choice. | Remove only optical photo credit; never redraw W3 after completion. |
| Normal finish/context fails | No successful new scene/source snapshot. | Existing failure/invalidation clears presentation; retry under new live ownership. |

No science intent/disabled capability is distinct from an active science attempt;
ordinary v1/W3 compatibility continues. The root confirmed the above whole
unavailable fallback in its 2026-10-02 task message: **known no successful optical
submission** permits independent W3, while submitted UNKNOWN does not. Implement
this as a separate unavailable policy, not an EMPTY rewrite. Probe/readback failure
after successful ordinary submission is not the no-submission branch. This note
records the root's finite policy for implementation; it does not claim the normal
consumer is adopted/enabled or supersede the unique governing PLAN.

Current shared capture reports selected fine/coarse qualification of the **actual
prepared draw**. A present expected field that fails registration/preparation is
not proved empty in its original domain: `coarsePrepared`/`finePrepared` must guard
whole EMPTY permission. A successful HAS from independent coarse still suffices
for optical selection. In particular fine=false/coarse=true/any=empty cannot
certify that the failed fine input was genuinely empty. This is a consumer
integration responsibility, not a new claim that shared software closure failed.

## Small immutable completion API

An implementable shape, names illustrative:

```ts
type CompletedOptical =
  | { readonly kind: "legacy";
      readonly reference: string; readonly publicationHash: string;
      readonly field: SkySdssOpticalField }
  | { readonly kind: "science";
      readonly reference: string; readonly publicationHash: string;
      readonly sciencePublication: SdssScienceOpticalManifest;
      readonly receipt: SkyArtworkLevelsContribution;
      readonly participatingFields: readonly (
        SkySdssScienceOpticalField & { readonly slot: "fine" | "coarse" }
      )[] };
type SceneSources = {
  readonly optical: CompletedOptical | null;
  readonly deepSkyImage: object | null; // existing independent W3 owner
  readonly cutoutSelection: "optical" | "infrared" | "none" | "unknown";
};
```

Freeze outer snapshot, field array and each field wrapper; reuse already admitted
immutable descriptor/publication references. Science fields enter the array only
when the corresponding actual prepared slot has `photo === positive` in a
`completed` receipt and its native handle is current. Both slots may participate;
their common publication supports one attribution, but neither descriptor can be
discarded in favor of the last/newest fine image. Empty array/UNKNOWN remains an
honest completion observation, not proof of no scientific data or an image error.

Do not retain the draw object or renderer getter as React's source object. Read
the exact draw once after same-frame `finish`; getters retire at `begin`, reset,
resize/dispose/context loss. A copied immutable observation is historical
provenance; current presentation must separately require completed same scene,
visible positive-size Canvas, matching Canvas/native generation, and each field's
`skyNativeImageIsCurrent`. One retired field does not erase an independent live
positive coarse field. Latest query/hash/loader failure alone must not relabel
the legitimately displayed old completion. Lifecycle invalidation still revokes
its current source credit immediately.

Recommended helpers beside the completion owner:

- `completedScienceOptical(frame, draw, receipt)` maps exact slots to descriptors;
  it cannot infer positive from submitted, prepared, hull or requested level.
- `liveCompletedOptical(snapshot, visibilityAndGeneration)` returns live positive
  participating fields/common identity, or no current photo. Legacy preserves its
  current old drawing/provenance semantics without declaring joint-area alpha.
- `sameOpticalInput(a, b)` compares format discriminant, exact immutable publication
  and actual asset identities plus image/ref/hash/field/level/parent; no per-frame
  deep stringify or bitmap-only identity shortcut.

Publish/stage the immutable completion together with the picking/view snapshot
under the Canvas lifecycle's accepted completion fence; do not publish a new source
from an expired completion merely because its paint callback ran. Current Scene is
synchronous, but its new source contract should preserve that gate explicitly.

## All affected consumers and the aid gap

| Current entry | Necessary migration |
|---|---|
| `sky-scene-render.ts:36,189,215,243,247,481–492` | Replace science's impossible single object with completion union; leave v1 passes; one group, fixed W3 choice, HiPS unchanged; source only after successful finish. Terrain hull remains v1 compatibility, not science credit. |
| `spot-sky-page.tsx:174,1276,1412–1439` | Separate queued ready frame from completed source. Remove science primary/coarse spread flattening; completion equality includes all actual fields/receipt/selection and native generation. |
| `spot-sky-page.tsx:1474` | Compare science publication/asset/capability identity in `sameScene`, in addition to both native images and current ordinary scene invariants. |
| `spot-sky-page.tsx:2610–2627`, selection owner `:27` | One live-source helper for status and provenance. CREDIT requires a live positive field for science; black/UNKNOWN is not FAILED. Latest publication match only qualifies retained-current update/refresh text, not attribution. A semantic `photoPresented` Boolean input can replace the single-image status input while retaining legacy behavior. |
| `spot-sky-page.tsx:3421–3424,3517–3527` | Optical modal hash comes from live completed common identity matching selected object; W3 hash stays independent. Existing optical route/cache/hash support is reused. Never pin latest query's hash to old pixels. |
| `sky-scene-render.ts:388` and page `:2734` | Must share one actual aid decision; see below. Native retirement cannot keep suppressing a DOM aid. |
| Scene painted objects and page `:2941–2951` | Keep factual catalog/time/view/terrain picking identity. Missing/black/unknown photo must not remove an independently visible catalog object. |

**The receipt alone cannot close same-frame aid fading.** Canvas catalog discs are
drawn before terrain/finish, while DOM names currently derive from completed photo.
The latest API exposes immediate qualification and final photo, but no pre-aid
photo decision. Final photo cannot decide an earlier actual draw, and HAS cannot
stand for a readable photo because valid black is HAS. Reusing prior completion
without exact camera/frame ownership would invent current coverage.

An optional bounded development staging proposal is to keep science Canvas and
DOM catalog aids under the same conservative unknown-readability decision while
source/status/modal use final actual positive credit. This is not adopted here,
does not deliver the promised bidirectional aid fading, and cannot narrow that
final requirement. To deliver fading, add one same-frame **pre-aid photo
decision** responsibility, record that decision for both Canvas and DOM, and still
track subsequent actual aid/terrain/navigation draws for final photo credit. The
root must select/validate that mechanism; this note neither implements it nor
pretends a final Boolean solves the causal ordering. Legacy aid behavior remains.

Normal page opt-in, implementation of the explicit whole unavailable policy,
same-frame aid fading, source quality
adoption and actual WEAPP/native aggregate resource/experience acceptance remain
open. No old test or GPU/geometry evidence was replayed for this design note.

## Direct-source bindings of this read

All paths below are under `apps/wechat-miniapp/src/features/sky/`; SHA256:

| File | SHA256 |
|---|---|
| sky-scene-render.ts | 9d4343b3f3fae121ee4fc2b244112ad8cf7d886c949ffbf869746535f9a1e4f7 |
| sky-sdss-optical-frame.ts | 1d9b99447b47c21311797bf22bf9d712862bfd5c9ac5fd41c0e323e08e7f5422 |
| sky-sdss-science-registration.ts | e7dbc10a42b059100dce3dcf448ef7c1ebcb16504fc8205e6137dab0c0503cea |
| sky-artwork-level-composition.ts | a9b3bbe88d1aaef9c6faf6a5065ee14868b376e0ca8765d5726f9af760e31b7c |
| sky-gpu-artwork-contributions.ts | 87467f231b709599befc57113e30d4c69c3d34d8782a95c1ecdeb2505b61c4dc |
| sky-gpu-renderer.ts | 45421d09a212aac3d4704afa266250221a6e4b954407c9e8994097d96762d7ff |
| sky-canvas-lifecycle.ts | cef71b3d63e387a1b218c102fa4000fce6790ac1007d724caf6c5a873e0fac8c |
| spot-sky-page.tsx | f2005524cac532ab8af8d1fde65815ec7cfcf243abe305ae85b27b470e0831f3 |
| sky-sdss-optical-selection.ts | 259e0e85510c979b6b5400a7e8adfb18d90a108c40136e74befd7cd9a6f55521 |
| sky-deep-auxiliary-visibility.ts | ac0c001e18e0f466c2b67ca78d08ffa723ad0ae2f07fdddfca2ede84422fb568 |
| use-sky-sdss-optical.ts | 6a9be6b649d0d04d115039532f9a6028e3fcbad1e52bdaa92e6a568601ce12f2 |
| sky-artwork-loader.ts | 8160d556e166465ff3bf1a43445019a59bd915b2a0385b35952375a855bba4b0 |

Earlier bounded notes are historical constraints, not a replacement for these
current source reads: `experience-sdss-science-normal-consumer-boundary-2026-10-02.md`,
`experience-sdss-science-registration-retirement-independent-review-2026-10-02.md`,
`experience-shared-contribution-receipt-boundary-review-2026-10-02.md`. No governing
documents were edited.
