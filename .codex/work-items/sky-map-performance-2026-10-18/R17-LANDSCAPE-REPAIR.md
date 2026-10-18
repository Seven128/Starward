# R17 landscape drag and below-ground cue

2026-10-18 implementation evidence. Scope: `sky-manual-view`, the shared `sky-landscape` lighting shader, and one focused manual-view regression. The existing page gesture transaction, browsing camera, source alpha/masks, renderer and single accepted-frame writer are reused. No phone, DevTools, service, design resource, catalogue or public Context was changed by this work.

## Result and mechanism

The existing +12° centre/horizon crossing was already continuous; this repair does not attribute every reported phone transition issue to a horizon discontinuity. The numerical baseline from `SKY-DRAG-BASELINE.json` is retained. Starting at −78° with a 45° view exposed a separate defect: the horizon solver clamped camera pitch to −90° even as the finger continued, and a new gesture there entered the pre-existing near-pole free-rotation branch.

The horizon solver now retains the inverse-sine branch identified by the **original grabbed ray's north component**, and allows camera pitch to continue through either pole. Pitch is an internal rotation parameter; real object altitude remains bounded and unchanged. Selecting the nearest inverse root for each new finger position would create another branch jump when the grabbed ray itself starts beyond the pole, so the regression includes that case. Every move still derives from the gesture-start basis; reversal returns the original basis, and lifting/re-grabbing after the crossing gives the same vertical result. The existing local `screen`, wide-view and near-pole free rotation rules remain, including usable horizontal movement at a pole. The existing fixed-roll closest solution for geometrically impossible off-axis tracking remains; no new FOV threshold or gesture state owner was added.

The shared ordinary-mode landscape cue now contributes a muted grey after the existing fade instead of being almost lost at 18% alpha. Its source RGB is weighted by that same view-opacity curve, so it enters continuously without peaking brighter midway through the fade. The original grey blend starts only below the normal horizon-centred view. Both photographic and procedural shaders use this shared function. Source alpha, geometric mask, same-frame label/pick occlusion and opacity curve remain unchanged; ordinary night horizon material and the red-light path retain their prior pixels. The cue is illustrative, with no claim of measured local terrain.

## Verification

The new pole regression failed against the original production code at y=417: the grabbed ray no longer followed the continuing finger. After the repair, all 13 manual-view tests passed. A single related batch then passed **114/114** checks across `sky-manual-view`, actual page gesture handlers, `sky-browsing-camera`, `sky-landscape`, `sky-landscape-mask`, `sky-full-sphere` and `sky-viewport`. These cover existing screen/orbit behavior, repeated/rolled/wide pans, reverse/re-grab, pinch/follow/cancel, lifecycle/time-generation isolation, painted alpha, labels and real below-horizon pickability. No mirrored implementation test or unrelated suite was added.

The repeatable [software probe](scripts/probe-sky-landscape.mjs) compares baseline commit `a36aebf8b29da9e6054dc5ecda8c564c7d921291` with the two changed production owners. It bundles the actual GPU renderer, shader and CPU geometry/visibility owners into the existing Playwright/SwiftShader diagnostic carrier; it creates no local server. The actual admitted Stara Lesna overview PNG and its exact decoded alpha were checked against the existing manifest hashes before use. Its source, credit, license and output/source hashes are retained in [results](../../../output/playwright/r17-landscape-v2/results.json).

| Software comparison | Baseline | Candidate |
| --- | --- | --- |
| −78° pole path, maximum grabbed-ray error | 317.070685 px | 1.04e−10 px |
| Same pole path, maximum one-pixel axis step | 0.054013452° | 0.054013452° |
| +12° horizon and −65° rolled path | continuous, valid | same measured steps/errors, valid |
| Both materials, normal night horizon | reference | 0 changed pixels |
| Both materials, below-ground red path | reference | 0 changed pixels |
| Both materials, −45° centre on ordinary sky RGB | 14 / 18 / 26 | 26 / 30 / 38 |
| Same centre on black: grey contribution | 7 / 7 / 7 | 19 / 19 / 19 |
| Same centre, effective opacity | 0.18 | 0.18 |
| Same centre, behind-ground pick visibility | true | true |
| All GPU handles after each of 32 passes | 0 | 0 |

The black/white compositing countercheck showed unchanged effective transmittance: procedural pixels were exact; panorama differed in 2,820 RGB channel samples by at most one RGBA8 byte from independent blend rounding. Both use the same source-alpha hash and shader alpha. The software output images were actually viewed; the previously nearly lost horizon silhouette is now distinguishable against the background. Relevant images: [before](../../../output/playwright/r17-landscape-v2/baseline-panorama-below-45.png), [candidate](../../../output/playwright/r17-landscape-v2/candidate-panorama-below-45.png).

Reproduce the bounded probe with a **new** owned output directory:

```powershell
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/scripts/probe-sky-landscape.mjs output/playwright/r17-landscape-new
```

## Remaining acceptance

This is software geometry and real shader composition evidence, not WEAPP/native/mobile performance or physical touch acceptance. The main task must compare the coherent new phone candidate with the retained phone baseline through sky → horizon → below-ground/backside → reverse, release/re-grab and applicable pinch/follow/cancel paths. Confirm the grey remains distinguishable at normal device brightness and the normal night horizon stays dark; preserve real stars/labels/picking. Broader R17 time/performance work, independent review and all inherited Goal obligations remain with their existing owners. This local repair does not mark R17 or the Goal complete.
