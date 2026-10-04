# SDSS science frame handoff — independent development review

2026-10-02; reviewer `/root/sphere_grid`. No production changes, network requests, HTTP injection, GPU rendering, service/IDE/native execution or new imagery. This review covers a metadata handoff and a deliberate rejection boundary. It does not adopt science PNG drawing, the normal pair/group consumer, image quality or target-runtime acceptance.

## Result and exact source scope

No material defect found within the inspected/observed handoff scope. The real science publication retains the actual ready fine/parent descriptors and its common scientific mother. The complete scene rejects that envelope from the legacy independent opacity passes and leaves independent W3 recovery usable. Removing that one guard causes premature science drawing/source-credit calls. The three historical opaque-fixture failures reproduce identically with and without this guard; the repaired real panorama fixtures preserve true opaque, viewport and coarse-source assertions and add the required faded foreground case.

Actual execution/source admission and after-readback are in `output/sdss-science-frame-independent-1002-r3/`. The source graph has 79 emitted-runtime-import source files / 151 edges; all relative and non-builtin imports resolve to actual files, with no ignored unresolved imports. The complete input inventory has 298 before/after byte/hash records, including the actual writer manifest/three PNGs, 201 preserved old assets and the six reserved modifications. These all remain exact. The page is an AST input, not a complete React/Taro page execution. The compiler/tsx tooling dependency graph is not claimed as product execution.

| Actual owner / inspected regression | SHA-256 |
| --- | --- |
| `sky-sdss-optical-frame.ts` (3,286 B) | `1d9b99447b47c21311797bf22bf9d712862bfd5c9ac5fd41c0e323e08e7f5422` |
| `spot-sky-page.tsx` (207,714 B) | `960b9e0ae7c0a2ac6b69fdada5feb104d06acd63cc4b6b7d168c130492fa42ad` |
| `sky-scene-render.ts` (28,109 B) | `9d4343b3f3fae121ee4fc2b244112ad8cf7d886c949ffbf869746535f9a1e4f7` |
| `sky-sdss-optical-frame.test.ts` | `ab4bc336fd45ac4058ec81132ef57ff53013c3255f3746d61bf1555f9e83d29a` |
| repaired `sky-sdss-optical-scene.test.ts` | `23d4c709ecd0dfa407eea69e69c17f368a58a1f6b79db1d3f423bb36beed8d65` |
| `sky-sdss-optical-page.test.ts` | `8bd93833dec4bc734d40d78f395083a5477fa29a761bb8a64beb52629c0587f1` |

All source paths above are under `apps/wechat-miniapp/src/features/sky/`. The author's `current-source-snapshot-bindings.json` is an execution-after current-source qualification, not evidence of an author before/after freeze. This independent run has its own admitted inputs and full after readback. It does not upgrade previous Hook r4 or transport/frame sources to this page hash.

## Actual frame and page observations

The test input is the already admitted real writer publication `34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0`, manifest byte SHA `3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5`. All three complete PNG byte/hash descriptors are read back (949,846 B total). Native image values here are explicit structural sentinels; these observations do not prove new decode or image-to-byte acquisition.

Calling the actual helper verifies identity rather than assigning the requested level: a DETAIL image must have the exact publication DETAIL descriptor; the valid MEDIUM parent retains its own descriptor/field. Both carry the common master RGB and master availability identities, `joint-area-alpha`, CRPIX 256.5 and the publication's crop/geometry/recipe metadata. The outer frame and parent are frozen. Missing image/level/publication, a requested/foreign fine descriptor, and a copied fine descriptor are rejected. A foreign copied parent descriptor removes the parent without erasing valid fine data. A coarse-only result retains its MEDIUM descriptor and own field. The real legacy publication still produces the legacy JPEG frame without science discriminator/asset semantics.

The actual unique `canvasLifecycle.request` object's `sdssOpticalImage` initializer is AST-extracted and evaluated. It hands off the helper's full actual science publication and fine/parent asset identities for model browsing; OBSERVATION or absent canvas data yields null. Static inspection of the enclosing effect confirms renderedAsset, renderedLevel, coarser and publication dependencies are present. Existing sameScene fields, nativeImageGeneration gating, completed-source callback and completed modal pin remain in their actual owners. Parent-only completion spreads the actual parent fields into the completed frame; it does not mutate the queued envelope. The new helper trusts transport admission and the native loader's descriptor association; it is not an additional external wire validator or bitmap lifetime owner.

## Complete scene and useful mutation

The actual complete scene module and its actual dependencies execute with a controlled catalog/time/direction and a proxy surface whose artwork callback records submitted identity, composite and opacity. This observes real scene control flow and source callbacks; it is not a pixel or GPU contribution measurement.

For the real science frame, current source submits only the independent W3 sentinel (`infrared-cutout`, opacity .58), reports optical source null, reports the exact W3 object, no optical failure and one finish. With the single exact guard removed, the same full scene submits MEDIUM then DETAIL as `optical-cutout` opacity 1, reports the exact DETAIL sentinel as optical source and suppresses W3. The mutation text is saved and is actually compiled/executed. Thus the source/opacity rejection has a real effect; retaining metadata alone cannot authorize the old passes. A real legacy envelope still submits its parent then fine and reports the fine optical identity under current source.

This controlled source callback is not proof of native/GPU visible radiance. Four-neighbor availability, same-mother replacement, actual shared contribution, failure fallback and corresponding normal painted source remain the next consumer responsibilities; this review does not re-run or replace the existing opt-in pair evidence.

## Historical opaque failures and repaired semantics

The actual author's pre-repair scene test bytes and log are preserved, and the actual pre-repair scene owner is byte-exact current source. The science-specific fixture is omitted from the legacy comparison because its function is tested independently above; no legacy assertion is removed or changed by the review.

The same 12 original legacy cases are executed against current and single-guard-removed scene owners. Both produce the same nine passes and exactly the same three failures, including error contents:

1. Fully covered M51 fixture credits the fine optical field instead of null.
2. Narrow viewport fixture credits W3 instead of null.
3. Fine-covered/wider-exposed fixture credits fine instead of coarse.

The old procedural/near-horizon setups no longer establish full opacity after the adopted view fade. This is independent of the new science guard. The current repaired fixtures use real panorama masks in the unfaded region: the fully opaque case centers at altitude 20°, and viewport/coarse cases at 29.92° with the source alpha cutoff at 30°. They still cover failed foreground recovery, image edges outside the narrow viewport and the wider optical field's actual identity. The additional altitude 8° case asserts an actual opacity strictly between zero and one and retains the optical source behind it. All 13 repaired legacy cases pass with either guard version. `legacy-fixture-comparisons.json` preserves all outcomes/errors.

## Review-harness failures retained

Independent r1 failed with an extra fourth fixture failure before it saved the full comparison. Scene and fixture had been compiled into separate VM realms, so Node strict deep comparison rejected plain source objects with identical fields but different prototypes. This is a review-harness error, not a product defect. The failed script and `failed.json` remain immutable in `output/sdss-science-frame-independent-1002-r1/`.

The one unchanged existing offscreen fixture is separately replayed with actual scene/dependencies and unchanged assertions in `output/sdss-science-frame-realm-diagnosis-1002-r1/`: separate realms fail with `Values have same structure but are not reference-equal`; the shared realm passes. Result SHA `d9b521595ce14f8000d82829a48c2412e2e55cc79964eb64c1ca6a2e24d35bf1`. The normal review r2 repairs only the VM realm and saves observation records before post-oracles. r3 repeats this same bounded owner path only to close the complete runtime-source graph/before-after inventory; its result and observations are exact r2. No product or fixture assertions were weakened.

## Frozen artifacts and remaining acceptance

- Independent script `scripts/experience-sdss-science-frame-independent-2026-10-02.mts`: SHA `ef15670b01bf435193e794a91f42db3caf12c03d783bfd77d2cb9aca39d2dee2`.
- r3 `result.json` (2,177 B): SHA `561f94d6437cfbd2f709ec613804da42badf35bb5f2a2204814663ddcb0d8e70`.
- r3 `binding.json` (116,079 B): SHA `b6861f2221d4730d684ba3817c294537c637d454db6f880dc52a93060f1f33d4`.
- r3 `actual-owner-runtime-source-graph.json`: SHA `ad27be965a658ad6e4996d42f1b6f688a425633dd80749ad8c9f9b9dcdba2282`.
- r3 `legacy-fixture-comparisons.json`: SHA `fb5c29cb67e78ade03a0887f3f75113d7ca17bfce2c2e7d6e4d0b182719a46d1`.
- r3 `scene-observations.json`: SHA `498d86c510965a5936d438c0703288492cf158ba294db26968ca5ebf5eaa7f8e`.

Source qualification and metadata rejection are development evidence. Ordinary science group drawing/credit, real pixel composition, native/WebGL/WEAPP execution, physical memory and final image quality remain open. There was no new HTTP/GPU/native/phone execution, budget change, scientific processing, download or publication. Brown/color/PSF/finite footprint limitations are unchanged.
