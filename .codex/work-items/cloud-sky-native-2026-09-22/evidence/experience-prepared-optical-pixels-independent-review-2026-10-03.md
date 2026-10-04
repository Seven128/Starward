# Prepared optical saved software-GPU pixels: independent review

2026-10-03. Bounded saved-output readback passed; **photographic edge integration remains failed for quality adoption**. No production files changed, browser/GPU execution, HTTP, source JPEG/FITS decode, reprojection, IDE/watch, device work or deployment occurred in this review.

## Exact evidence and scope

- Author run: `output/playwright/cloud-sky-prepared-optical-pixels-1003-r4/result.json`, 6,988 B, SHA256 `cd0871213b33b5a4de5b1b97b3d864e1513903e528801e432b1e603d0806db11`.
- Actual author script: `scripts/experience-prepared-optical-pixels-2026-10-03.mjs`, 13,850 B, `9177e28befcc169eb902beed13f2e7725de0d1f3fb0511595baa7d8dfa0a294b`; its execution copy is byte-exact. Saved browser bundle: 2,084,184 B, `aa8e41c87abf7e311859e090f2eed447358ee1dba3a97ef641218e940aa7e8dd`.
- Actual Prepared R4 manifest: 7,509 B, `23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1`, publication `8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802`. The browser entry's full publication and three embedded PNG buffers exactly equal this admitted source; total encoded PNG bytes are 1,315,239.
- Independent reader: `scripts/readback-prepared-optical-pixels-independent-2026-10-03.mjs`. Actual Node tool `5dbf68` exited 0. `output/prepared-pixels-independent-1003-r1/result.json`, 8,950 B, `14e0f0661ce52e903d52d9f125b74df02db5d7a45791de1700552c180654776e`; `bindings.json`, 59,475 B, `f90d100ac79bd91dc6f2c25f3e45ec11cafe2efc48f3eaf6e1755e8934c86d67`.

The 97 recorded parser buffers exactly cover the non-stdin esbuild inputs; their pre/post/current lengths and hashes match. The 15 selected host identities, including the six preserved Settings/outbox files, also match. The independent 149-input inventory was checked again after reading. The entry, bundle and metafile are retained. These are execution-byte and selected-tool identity evidence, not a complete Playwright/esbuild/Chromium DLL loaded-module trace or an independently reproduced build. The recorded lane is Playwright 1.62.1, Chromium 151.0.7922.34 with SwiftShader; AST reading used the bound TypeScript 5.9.3.

The actual complete `drawSkyScene` function runs with a controlled report, identity equatorial-to-ENU rotation and rigid camera roll. Catalogs are explicitly `UNAVAILABLE`, target frames empty, ordinary image layers absent. This is a real Prepared optical path through the current Scene/GPU, **not complete UI, ordinary Hook/query/accepted-page execution or a full populated star-sky composition**. Each condition and background creates/disposes a renderer, resets the drawing buffer and registers the same three previously decoded HTMLImages. It is not a continuous retained-renderer journey or a cold/warm request measurement. The independent ICRS-vector check confirms the controlled camera targets the published center (max component residual below `1e-14`); it does not validate physical AVM astrometry.

## Independent full-byte observations

The reader implements its own PNG chunk CRC, zlib inflation and inverse filters 0–4. All six 390×844 PNGs exactly equal their complete bottom-first RGBA readbacks after row reversal: 1,316,640 B per frame. Six complete image-free background buffers are hash-bound and independently compared. Opaque canvas readback alpha is 255; this does not claim an 8-bit native alpha attachment.

| Condition | RGB pixels differing from no-image background | Actual wrapped texture creations / deletions | Optical completion |
|---|---:|---:|---|
| OVERVIEW .38° | 85,785 | 2 / 2 | null |
| MEDIUM + OVERVIEW .17° | 282,805 | 4 / 4 | null |
| DETAIL + MEDIUM .10°, roll37° | 329,160 | 2 / 2 | null |
| DETAIL retired, MEDIUM surviving, same view | 329,160 | 1 / 1 | null |
| MEDIUM only, same view | 329,160 | 1 / 1 | null |
| Prepared frame through science-family port | 0 | 0 / 0 | null |

Retired DETAIL and independent MEDIUM-only match **all 1,316,640 RGBA bytes and the full PNG**. The retired case reports DETAIL failure while the surviving MEDIUM-only control reports none. Retirement here is the explicitly controlled pre-frame native-lifetime flag; it does not demonstrate asynchronous cache-clear or Hook recovery. The wrong-family port exactly equals its background for every channel, with no created texture. DETAIL versus MEDIUM-only changes 186,096 pixels / 475,748 channel bytes, max difference71: this proves the fine path has actual pixel effect in this controlled view. An independent one-byte copied-buffer mutation is detected as one changed byte/pixel; no original evidence or production bytes were mutated.

The three source PNGs also independently decode to 512² RGBA, with exact embedded bytes and published alpha counts: OVERVIEW `88,625 opaque / 934 partial / 172,585 zero`, MEDIUM `253,400 / 387 / 8,357`, DETAIL `262,144 / 0 / 0`. No alpha-positive pure-black pixel occurs in these particular files; absence of such a sample is not a general validity rule. Their metadata continues to say `geometric-source-area` display alpha and scientific availability `UNKNOWN`. Box-averaged geometric support, radiance/display opacity and scientific validity remain distinct.

## Completion, resource and quality limits

The actual entry's renderer options contain only `imageFailed`, with **no `artworkContributions` allocation policy**. Current shared code therefore skips auxiliary capture and returns an incomplete UNKNOWN receipt; exact completion requires `receipt.completed`. All six saved callback summaries are null. Real rendered pixels do not manufacture participating-source credit. This run does not prove accepted page attribution, visible credit, local readability, default registry adoption or full attribution recovery.

The texture instrumentation wraps actual `createTexture`/`deleteTexture` returns and counts handles. Recorded tracked texture counts return to zero for each disposed renderer. There is **no full texture-byte/upload/copy/buffer/FBO/program/state ledger in this run**, and background handle summaries are not persisted separately. The result supports these limited counters, not zero driver/native memory, all-resource disposal, GL-memory peak or timing/capacity. The prior shared-owner review remains separately scoped; it cannot fill unobserved per-run resources.

I actually viewed `overview.png` and `detail-parent-rotated.png`. OVERVIEW visibly places M51 and its companion inside a bounded tilted photograph rectangle, with a hard edge and a clear source-background/sky seam. That is a material unresolved quality problem, consistent with the original finite footprint and the prepared publisher's explicit unadopted edge/colour statement. DETAIL shows spiral/dust/HII structure over the viewport, but that close crop cannot certify a resolved outer boundary. It does not establish natural colour, measured PSF, physical resolution, scientific validity or absolute alignment; publisher AVM is still `UNVERIFIED_APPROXIMATE_PUBLISHER_AVM` with the retained approximate 5-arcsec note. No generated detail or new edge treatment was introduced.

R1's unsupported esbuild filter pre-browser failure, R2's incorrect default completion expectation and R3's camera-control failure remain FAILED historical artifacts. R4 fixes the harness expectations/roll, with the same scoped production owners. This readback does not upgrade those generations, enable ordinary/default Prepared, or accept target WEAPP/native rendering, final full experience, scientific/image quality, hardware memory/performance or 200-DAU capacity.

There is no additional blocking discrepancy in this bounded R4 pixel/readback mechanism. **Quality adoption and completed credit remain open**, together with populated full-scene/runtime and target-device acceptance. Source/protected final readback is retained in the same independent output folder, without a new evidence chain.
