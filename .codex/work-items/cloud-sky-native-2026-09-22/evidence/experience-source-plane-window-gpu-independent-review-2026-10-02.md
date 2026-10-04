# Source-plane window actual GPU A/B: independent bounded closure

2026-10-02. Production stays on the existing window owner. The task-only source-plane clip candidate is **not adopted**: its actual 45° and 85° captures differ from the original full RGBA. The 139° zero difference has no useful artwork detection power because both no-art and grossly wrong crop also yield zero difference. No source, asset, budget or production change was made by this review.

This records a new actual-output review. It does not replace the earlier before-resource review or the independent ideal-math/fixed-float-lattice review, and does not retroactively change their scopes. The ideal affine/cone argument and the bounded non-FMA lattice result remain mathematical evidence, not a shader pixel certificate.

## Bound inputs and independent method

The actual author A/B generation is `output/playwright/cloud-sky-source-plane-window-gpu-ab-1002-r4/result.json`, 6,126,462B, SHA `a8bcd380aea334391ccc6a7c8b92e02e4efba8a22946a8833bb396d883432d7a`. Its original baseline is the full-hook resource r4 (`548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b`), with the same report/catalog/metadata, raw published bytes, actual HTMLImage objects, original 138-module production bundle and original controlled full-hook/GL executors. This is desktop software WebGL under controlled offline metadata/FS, not the Mini Program page/driver.

Independent entry: `scripts/experience-source-plane-window-gpu-independent-readback-2026-10-02.mts`. Run once with:

```text
node tools/run-node.cjs --import tsx .codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-source-plane-window-gpu-independent-readback-2026-10-02.mts output/source-plane-window-gpu-independent-1002-r1
```

The independent result is `output/source-plane-window-gpu-independent-1002-r1/result.json`, 54,815B, SHA `31783686a5644b44e61a5fa5b3cd4f6b9ad25cee9a0e57dafd09edfe10bac6e4`; binding 163,718B, SHA `147e876bcbdb7ea0fece6da648f9ac5c9bf43b694edfa0285647fe4d3ef8dacc`. All 412 bound input files were byte-identical before/after, including 138 production module inputs, 201 historical assets and the six preserved settings/outbox modifications. This is a readback, without another browser launch/render/matrix.

The review directly compared every original RGBA byte. A separately written PNG decoder checked chunk CRCs, zlib scanline length, PNG filter reconstruction and the complete top-down PNG against the bottom-up GL RGBA, across all 12 captures. It did not use the author's pixel comparison counts as its oracle. Original baseline 45/85/139 raw pixels exactly equal their original full-hook r4 captures. The baseline, candidate and gross bad-crop 85° PNGs were also actually viewed: the bad crop removes visible artwork, while the one-byte candidate residual is too small for a visual thumbnail to certify.

A TypeScript AST extraction independently re-created all four original controlled executor functions and matched the stored executors exactly. The baseline/noart bundles equal the original production bundle. The candidate/badcrop bundles equal that bundle with exactly the body of `skyArtworkTextureWindow` replaced; the candidate body delegates to the frozen numerical function, and the bad crop returns `{x:0,y:0,width:32,height:32}`. All other shader/render/cache/loader code remains byte-identical. The compiled candidate helper and frozen numerical candidate source (`191db39c94f604fda03a2c1ab82f115bb5eb75c32a61c9b7a43b98e6ad95c78c`) were hash-checked. No-art is the explicitly controlled artwork draw override in the original executor; it is not a new production source variation.

## Actual differences and detection power

| View | No-art changed pixels / max byte delta | Gross bad crop | Candidate |
|---|---:|---:|---:|
| 45° | 121,717 / 32 | 128,725 / 32 | **3 / 1** |
| 85° | 101,155 / 32 | 131,287 / 32 | **1 / 1** |
| 139° | 0 / 0 | 0 / 0 | 0 / 0 |

All comparisons use the complete 390×844×4 buffers, not ROI, screenshot appearance, rounded summaries or a tolerance that hides the residual. Independent PNG coordinates and bytes are:

| View / PNG coordinate | Original RGBA | Candidate RGBA |
|---|---|---|
| 45° `(212,415)` | `[19,28,40,255]` | `[19,27,40,255]` |
| 45° `(234,375)` | `[20,27,40,255]` | `[20,27,39,255]` |
| 45° `(158,264)` | `[18,28,40,255]` | `[19,28,40,255]` |
| 85° `(42,526)` | `[18,25,36,255]` | `[18,25,37,255]` |

At 45°/85°, no-art and gross bad crop establish bounded actual detection power, and the exact-pixel preservation requirement fails. The experiment has not established a perceptible product defect threshold, but these actual residuals cannot be rewritten as exact preservation or automatically waived for adoption. No parameter/pad/source/opacity tuning was performed.

At 139°, original artwork opacity is `.0002368`; no-art and gross bad crop show that this current RGBA8 frame cannot detect those artwork changes. Candidate 139 exact therefore cannot qualify the 28 crop windows, source coverage or a float32 error bound. The earlier independent numerical result that Boo/Cet have no valid 139° lattice fragment is a separate fact from the other sources having no measurable RGBA8 contribution. It must not be converted into a universal all-source rejection or coverage assertion.

The author's CPU membership diagnostic (`output/source-plane-window-difference-membership-1002-r1/result.json`, SHA `fe24fab00b4776c39e71a40b0f7ff578decd5b0db65b0c7ce90be5d07f729523`) was read in full. It identifies original double-UV membership in Cep at the three 45° residual pixels and Dra at the 85° pixel, with all original double-derived LINEAR neighbours inside the candidate rectangles. This is useful bounded localization, **not** unique actual shader causal attribution. Current evidence does not distinguish sampling remap arithmetic, shader float rounding, copy/image state or another mechanism, and does not justify saying the residual is definitely a missing texel or definitely harmless rounding. The independent fixed non-FMA lattice similarly does not reproduce all GPU operation/interpolation/texture paths.

The actual recorded fragment HIGH_FLOAT reports precision 23, rangeMin/rangeMax 127; RGB attachment bits are 8 and **alphaBits is 0**. Raw readPixels and PNG alpha are 255 in this opaque canvas, which does not imply an 8-bit alpha attachment. The author corrected the prior note's conflation; its current note SHA is `c127578ccc48398a6d5b6ff3b52969f477b6d7209b69508fa8a59225f9f02438`. No target WEAPP highp guarantee is inferred.

## Shared GL accounting and remaining resource cost

The independent readback reconstructed all 36 pass ledgers sequentially per variant, including source upload dimensions matched to actual source SHA/dimensions, GPU copies, deletes, retained-byte sums and peak/end values. All events reconcile; reported GL errors and GPU failures are empty/zero. The accounting describes logical RGBA texture allocation and actual upload/copy/delete events, not deferred driver/native/OS/decoder memory.

| View / original → candidate | Maximum logical peak B | Third warm-frame end B | Third warm-frame source upload B |
|---|---:|---:|---:|
| 45° | 8,798,208 → 8,798,208 | 3,432,448 → 2,281,472 | 0 → 0 |
| 85° | 12,738,560 → 11,587,584 | 11,812,864 → 9,039,872 | 0 → 0 |
| 139° | 30,932,992 → 26,730,496 | 16,777,216 → 16,244,736 | 14,155,776 → 9,699,328 |

The candidate reduces some measured logical GPU work/residency but does not eliminate 139° warm texture re-upload. Here “source upload” is HTMLImage→GPU `texImage2D`, not a public-network transfer. The original 16MiB owner rule is frame-end retention, not a hard maximum working-set cap; full-source upload and copied texture overlap can exceed it. The ideal mathematical 25,944,064B illustration+other working-set sum is not interchangeable with this actual 26,730,496B transient peak. No network/cache-byte saving, full-image decode reduction, CPU hot-path gain, sustainable native capacity or new resource budget is proved.

## Reused captures and failed-generation boundary

The complete r1/r2 failures and r3 failure record were read. r1 fails controlled runtime initialization (`Taro`/`gl` unavailable); r2 fails extracted executor syntax; neither completes a scene. r3 completes baseline/noart 45→85→139 before the candidate helper's first call fails for unbound `assert`. R4 supplies the equivalent task assertion and executes candidate/badcrop, while the six successful r3 capture/trace sets are copied without alteration. Every reused JSON/RGBA/PNG was independently matched byte-for-byte to its original source and validated against bound hashes.

This is legitimate explicit reuse of successful unchanged work, not a claim that r4 reran all variants or that r1/r2/r3 are successful whole experiments. Prior failure outputs and receipts remain immutable. The numeric candidate was not adjusted to obtain this result.

## Closure

The bounded actual A/B conclusion is independently closed: **candidate has retained actual pixel residuals, 139° alone lacks detection power, and production remains on the original window**. The earlier ideal-math candidate review remains valid within its stated scope; actual output narrows adoptability instead of overruling the mathematical statements.

Any later revisit needs evidence addressing the actual residual mechanism, a useful pixel oracle for its relevant conditions, conservative float/texture/enclosure fallback and affected lifecycle behaviour. It cannot silently change exact-preservation or source/budget contracts. The separate active-retention candidate uses original windows and must be evaluated independently; its mockGL cost tradeoff is already recorded in the prior independent candidate note. No active A/B, expanded 13-condition runtime, native device, full Mini Program page interaction, cloud capacity, final experience or Goal completion is certified here.
