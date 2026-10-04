# Contribution FBO — independent bounded readback

2026-10-02; reviewer `/root/sphere_grid`. Controlling scope: `experience-artwork-contribution-boundary-audit-2026-10-02.md`. No production/PLAN/Context/asset changes, new GPU/browser execution, HTTP/download, IDE/watch, native or phone work. This closes independent review of one historical task-only software-WebGL1 experiment, not adoption of a source-credit implementation.

## Actual evidence and findings

The saved experiment's pixels, reductions, touched-state snapshots and resource accounting reproduce its bounded claims. There is no material discrepancy in those claims. The experiment does **not** prove exact mathematical absence, a post-saturation counterfactual color difference, generic scene coverage or normal client/page source credit. Its own helpers stop on an unhandled setup failure; graceful production fallback/context recovery has not been supplied.

Actual author result: `output/playwright/cloud-sky-contribution-fbo-1002-r1/result.json`, 51,554 B, SHA `8ebb2321834b493646eac022b1c6c2df9b7c1fccfd6283ab85a68bc81334f014`. The orchestrator/browser executed bytes match SHA `34526187e0aa02b28fe96cdd152481f52f33a00f0ccc160980207d0efa2ad1ab` / `5bd100e09b92376cf6749c1fd6a92f30a924721be73f19987a0ec07e50858089`. The original renderer plus exactly the saved 142-byte readonly shader-export delta equals the augmented renderer; no renderer function was replaced. Bundle, complete 65-file nonvirtual browser graph and all 78 input before/after receipts match their saved bindings. Six reserved files remain exact. No report producer or normal public native acquisition/lease pipeline ran.

Independent outputs:

- `output/contribution-fbo-independent-1002-r2/result.json` (15,975 B), SHA `594d77eaa8f44ee1d538157adfd5401649eb20d4e62f34e97b9dbe3129f549c1`.
- r2 `binding.json` (80,070 B), SHA `03b955a36e73bc53d78283703446a1b4ff2fae9f076ce256ad258e1146111de2`.
- `output/contribution-fbo-selection-independent-1002-r1/result.json` (6,703 B), SHA `8e2d3a628a7539c1a1881bd970b7b2131aef1c23c22e1389f1791982ee1c29f9`.
- Main readback script SHA `010d31e689d891775c829d920f18a12010231b3af79b25444b54855a3afdf6eb`; saved-selection diagnostic script SHA `7b7032c324065a780c6450173ce1af86cc613867ab86232181dae5c8109a73c0`.

## Source selection, actual identity and pixel readback

The unchanged `skyArtworkLevelsFragment` generator is independently executed with `skyRay` extracted from the frozen renderer. Its full generated GLSL equals the saved actual fragment. The candidate equals that exact source with only explicit selected-slot bookkeeping and final output substituted: R=fine maxRGB×opacity, G=coarse maxRGB×opacity, B=fine eligibility, A=any eligibility. Availability is selected before display strength; black is not reclassified as missing. The same existing four-texel qualification functions and camera uniforms remain present.

The actual group and candidate event receipts use the same sampler texture identities. Source provenance reconstructs from full upload to copy: coarse `texture-19` is the OVERVIEW 384×384 window at (64,64), copied from full `texture-17`; real fine `texture-20` is the full 512² MEDIUM texture. The black control's fine `texture-71` is a 320×384 window at (96,64), copied from full `texture-69`. Origin/Scale/Size uniforms match each real window, including their Float32 scale values. Both group conditions retain the same `buffer-16`, enabled two-FLOAT position attribute, byte stride8/offset0, and TRIANGLES/0/6. Candidate code reuses the current pointer and installs the captured actual uniforms, with no extra image upload. Its sampler event is a copy of the captured normal receipt; it is not a second post-setter reflection or a buffer-content readback. Independent source/ledger inspection preserves that distinction.

All eight normal PNGs are independently decoded by PNG CRC, zlib inflate and all five filters, then matched row-for-row against their bottom-up full RGBA. All 16 full normal/signal captures have exact sizes, hashes, maxima and nonzero counts. Every one of the 30 saved reduction buffers is reconstructed byte-for-byte with explicit 2×2 per-channel MAX (edge duplication at odd dimensions), or the declared one-hot average control. This covers all intermediate levels and final values, not merely the final maxima. One-hot MAX yields255 while average yields64.

The independently sampled actual saved Float32 uniforms and two real decoded source PNGs provide a separate **fixed-view numeric diagnostic**. Both Float64 arithmetic and explicit non-FMA `Math.fround` select exactly the actual 10,954 fine / 1,334 coarse pixels, and all 12,288 black-frame pixels select fine. Radiance is not claimed byte-exact: Float64 differs by one byte in106 photo-channel values, non-FMA fround in one value. These residuals remain saved; no tolerance/window/source parameter was changed. This diagnostic does not certify driver FMA/interpolation precision or a universal shader error bound. The real source PNGs here are all alpha255, so this trial does not independently exercise partial/missing source-availability stencils; those existing group obligations are not replaced by opaque input success.

## Successful later coverage and finish

Actual normal renderer draws precede their candidate replay, using the same program, draw arguments, sampler bindings, uniforms and attribute receipts. Recorded real destination factors explain the observed signal behavior: the additive layer uses ONE, while partial/opaque discs and procedural terrain use ONE_MINUS_SRC_ALPHA. Only R/G are attenuated; B/A remain pre-foreground eligibility facts.

| Transition | Whole-frame independently observed effect |
| --- | --- |
| group→additive | Entire signal byte-exact; destination ONE keeps the selected photo component. |
| group→partial disc | 840 R/G byte values change; none becomes zero. |
| partial→opaque disc | 332 R/G values change; 284 positive values become zero. |
| opaque→procedural terrain | 11,631 R/G values decrease; no positive value becomes zero in this input. |
| terrain→finish | Exactly the actual GL-y120..127 navigation rows lose763 positive photo-channel values; every other photo value and every eligibility value is unchanged. |

Group fine/coarse maxima222/139 become148/104 after completion. The actual navigation scissor is (0,120,96,8), copied from successful `finish()`; it is not a guessed CPU terrain bound. Both final normal PNGs were actually viewed: the real pair remains a small brown-toned galaxy composition with controlled white discs; the black control retains the dark background. This is no color/PSF/readability assessment.

The black control has R/G0 and B/A255 at every pixel, before and after finish; fine qualification blocks coarse despite zero photo strength. There is no W3 consumer or normal source callback in this experiment, so this does not prove W3 exclusion or final credit. Invalid-only registration produces no actual draw/preparation and explicitly retains NOT_EVALUATED/UNKNOWN; stale FBO contents are not an answer.

RGBA8 quantization is independently confirmed in the saved actual partial-point control: `[1,0,255,255]` becomes `[0,0,255,255]`, while the controlled analytic remaining strength `(1/255)×(1-.75)=.000980392156862745` is positive. Zero therefore cannot certify NONE. Positive signal tracks the selected sampler's weighted pre-clamp component under these destination factors; it does not establish a visible color difference after saturation/nonlinear presentation or a complete source-credit decision.

## State, resources and limits of recovery

Reconstruction of all 266 create/upload/copy/delete and draw/clear events has consistent identities and source-copy bounds. Logical texture peak is3,227,648 B. All accounted renderer/candidate texture, framebuffer, buffer, program and shader IDs retire, with final logical texture bytes0. This is GL logical accounting, not native/driver memory or GC. HTMLImage/Canvas references still exist in the harness.

All 73 recorded before/after state snapshots are independently equal: framebuffer, viewport, program, sampler units, VBO/attributes, blend/equations, scissor, color mask/clear color and recorded enables/pixel-store settings. These are touched-state snapshots, not a general driver trace. The actual group's attribute pointer was already nonnull before auxiliary setup. The routine does not demonstrate restoration from arbitrary untouched/null-pointer state. Pixel-store settings are unchanged by the exercised candidate operations; their presence in snapshots does not certify hypothetical future modifications.

A controlled target-helper 16² allocation creates a texture and forces framebuffer creation to return null; its texture is deleted and state/counts return to the prior snapshot. The next black frame succeeds. This tests helper cleanup, **not** actual driver OOM, complete initial-probe failure recovery, shader compile failure, native retirement or context loss. Recorded GL errors are0 and `contextLost=false`; no context-loss case was induced. The top-level candidate catches an unhandled failure and stops rather than providing a production fallback policy.

Steady candidate texture49,152 B plus seven simultaneous MAX levels16,388 B are confirmed from the full ledger. The saved reducer creates/deletes each chain; it is not an optimized persistent ping-pong implementation. Full intermediate diagnostic readbacks and state/reflection calls are present. No frame-time/FPS/one-pixel-only cost or justified total memory budget follows.

The two conditions use one full controlled96×128 viewport, one group per frame, and this explicit sequence: additive artwork, two discs, procedural terrain, finish. The task does not validate arbitrary ordinary-scene order, multiple overlapping groups, later image/VBO mutation, alternate framebuffer/depth/stencil/culling state, panorama readiness/material transitions, narrow-TAN ROI sizing, high-DPR390×844 frames, repeating-frame cost, WEAPP/phone or completed-frame lifecycle. Broader source credit remains unimplemented/unverified within this evidence.

## History and review-harness correction

The experiment executed registration SHA `85e16452de821088531ee9f19a4bfe6f791f6da26818ead6f3d53fd8e23c2513`, 4,696 B. Current qualification observes the authorized separate raw-plane owner SHA `85f9843fb004260360cb06f047b49f403cdb49fde0a97c367cdea7f63b718b89`, 5,811 B. All other execution inputs still match. Original bundle, executed source, graph and actual outputs remain immutable; this trial does not validate or inherit that new registration API.

Independent readback r1 failed an incorrect reviewer assumption that the group position stride was0. The actual frozen renderer uses `makeBuffer(2,{a_position:[2,0]})`, so its interleaved two FLOAT values have stride8. Actual receipts both show8. Failed script and after-inspection failure receipt remain in `output/contribution-fbo-independent-1002-r1/`; r2 corrects that oracle to2×4, preserving the actual source/output data. This was a readback-harness error, with no product or GPU rerun.

Author note `experience-contribution-fbo-feasibility-2026-10-02.md`, SHA `37423e1f3f7b11121759205cf03200ab2301d95fe94092e98582d056dd330fa4`, states the same recovery/precision/adoption limits. Its self-readback is not used as the independent pixel or ledger oracle. This review supports proceeding to the next bounded responsibility under the existing PLAN, with these precision, normal-consumer, source-credit, resource and target acceptance gaps still open.
