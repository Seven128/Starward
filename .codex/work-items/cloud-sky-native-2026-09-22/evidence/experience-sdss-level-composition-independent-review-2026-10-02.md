# Independent opt-in level composition review, 2026-10-02

No new blocking discrepancy was found within the current bounded opt-in prototype. Actual saved pixels, source identities, availability selection and synchronous texture lifetime are consistent with its declared responsibility. This review does not adopt the source/format/consumer or certify native performance, image quality or the complete experience.

## Exact source and actual evidence

- Level/shader owner: `sky-artwork-level-composition.ts`, SHA256 `35aad62d496cd244846a63c9c27764cdf36572ba934175f7c872f1c470abe473`.
- Renderer: `sky-gpu-renderer.ts`, SHA256 `bc0c927aa861a078c5c0e96b123ed84034db1838ba55185c5eb5db44f2e27444`.
- Texture owner: `sky-gpu-textures.ts`, SHA256 `5642145c2941af15621c28d9eabc47d0ae8e4a0dc5f443c38ee7d9646b38f84e`.
- Actual final software-GPU r3 result: `output/playwright/cloud-sky-sdss-level-composition-1002-r3/result.json`, SHA256 `47f2c8e4a1cf868a7ec3db4a90c2f7b8f2a35b87189432b2c18e33a76ccbc832`.
- Independent readback/CPU review: `output/sdss-level-composition-independent-1002-r2/review.json`, SHA256 `80f7f79aefe0600786e4660a8afa13323777f09f37ba62bcd558a9618d6d1205`.
- Independent pin/legacy/actual pressure review: `output/sdss-level-pin-independent-1002-r2/review.json`, SHA256 `7fef3d7c0b944f40ce68e398c7799a80aa0c33a86cc0bfb80371342e16dad197`.

All compiled source/input/artifact hashes match actual files. The executed script equals its current source. Three owner snapshots equal the final production files. Existing r2 mosaic input remains frozen; no source, science, WCS, RGB or publication was reprocessed for this review. The independent script invokes no shader/registration/source-processing helper and starts no browser.

All 14 actual 390×844 PNGs fully decode and exactly equal the saved `readPixels` RGBA after the explicitly required vertical row reversal. Captured GL/draw errors, released texture count and logical-byte balance are zero. Each non-baseline combination has one actual group pass; preparation/submission is not promoted to existing scene source credit, which remains null.

## Independent sampling and the actual later foreground

The CPU oracle reconstructs the camera ray directly with float64 stereographic geometry, then computes TAN coordinates from the report's actual observed M51 center/north directions. It does not call `registerSkySurvey`, `registerSkyArtwork`, `skyArtworkUvAtDirection`, the shader generator or image pipeline. It independently performs clamped four-neighbor eligibility, bilinear RGB, valid fine priority including zero RGB, and one encoded-display source-over formula.

The report's night Sun altitude is −31.4455627° and day Sun altitude +35.4363872°. These are actual input instants, not inferences from a display-mode label.

The optical insertion precedes `sky-scene-render.ts`'s later deep-sky auxiliary drawing. Because the task adapter intentionally returns false and grants no old source credit, M51 remains `imagePainted=false`. The later `context.disc` is at logical (195,422), radius3.2, stroke1, `#A9BDD6`, opacity0.9. Its point-size owner has an 8.4-pixel complete raster boundary containing 52 pixel centers. The baseline already contains this later foreground; it cannot serve as a pure pre-image background at those pixels.

The first independent generation retained the unadjusted full-frame oracle and its residuals. Actual RGBA coordinates locate all 32 pixels with >4-byte residuals inside this independently identified later-disc boundary. r2 retains coordinate/actual/baseline pixel records and audits **all 329,108 pixels outside the complete 52-pixel boundary**. The maximum channel differences there are 1.9451 bytes for the night pair, 2.3381 for the day pair and 2.6280 for the same-bitmap case; the largest other case is 1.9451. No >4-byte residual exists outside the later-disc boundary. This is a finite-precision numerical audit, not a claim of bit-exact GPU float/interpolation equivalence. The 52 pixels remain present and verified in every actual full-scene PNG/raw readback; they are excluded only from a pure-photo CPU background oracle, not from the evidence or product scope.

## Exact behavior and bounded mutations

- Valid black fine: 188,962 independently selected interior pixels exactly equal the actual baseline, including its real later foreground. Fine black excludes coarse.
- Partial alpha128 and missing alpha0: each 4,096 patch-interior pixels exactly equals actual coarse-only. Outside fine, 4,018 independently selected pixels retain coarse exactly.
- Failed fine upload and invalid fine registration: complete framebuffer equals coarse-only. Fresh decoded identity recovery and one-byte retention-pressure output equal the real pair over the complete framebuffer.
- Actual warm pair equals cold raw RGBA and has no second original upload or copy in the recorded trace. Same bitmap in both slots uploads one full-source texture; its independent CPU image/registration selection agrees numerically with the actual frame.
- Saved brightness-as-availability shader mutation incorrectly leaves coarse at all 188,962 black interior pixels. Independent comparison detects all of them.

The current shader's explicit `joint-area-alpha` samples are separate from encoded-display contribution. Original alpha is inspected before RGB-derived display blending. The current r2 input's overview/medium alpha is fully available; synthetic partial/missing controls test selection. This does not by itself validate every future producer's alpha encoding, every partial cropped window or native float/LINEAR behavior. Published compatibility and supported consumer states remain later work.

## Texture owner and escaped lifetime defect

Source review confirms the lease covers both preparation and actual submission, and releases only pins added by its synchronous scope in `finally`. A nested scope does not clear an outer scope's pin. Ordinary later submissions and `finish` use the original eviction/budget policy. Identity pinning does not preserve a replaced window; the renderer requests one full-source texture when both slots share a bitmap, preventing a second window preparation from deleting the first sampler.

The independent controlled texture probe verifies nested exception cleanup, preserved outer pins, released temporary pins, ordinary eviction after the outer scope, failed finer identity latching while coarse stays usable, original frame-end retention and zero disposal resources. A task-only copy with the two pin predicates bypassed deletes newly prepared coarse before the common submission; the check detects the lifetime mechanism. It does not make a new native/driver claim.

The earlier **actual** software-GPU pressure result remains bound to its own saved owners: before SHA256 `641969843ee6fd7fcbabf7c69a18a2117138b7303afc7cc8cd6f94f6fca71151` has `sky_gpu_artwork_levels_draw_failed` and different actual RGBA; after SHA256 `d80860a95dd8bfb8bd131cff1d0f84cd3644185099170aa6583910fc991b34d4` has no draw error and RGBA identical to the final normal pair. Snapshots and actual frame hashes were independently read. The historical after renderer has its own source identity; it is not relabeled as the final renderer, though the final r3 source is separately verified.

The first independent pin script stopped at its task-only mutation matcher: it expected both predicates to be followed by `&&`, while one is the last conjunct. Nested/exception probes had already passed. Its failure note remains in `output/sdss-level-pin-independent-1002-r1/`; the corrected matcher checks the predicate exactly twice and writes a new generation. No production file or previous evidence was edited.

Relevant texture, explicit-contract and window checks were independently rerun: 10 pass, zero failure. No broader matrix or GPU runtime was rerun. Independently checked identities of all 201 legacy published assets, 22 single-field outputs and the 6 unrelated settings/outbox files remain unchanged.

## Actual visual inspection and remaining scope

Current r3 night pair, day pair and partial PNGs were viewed directly. The registered galaxy structure persists over the actual day blue background, but the image still has brown/orange color, soft detail and colored points; the source PSF/noise and core clarity obligation remain unresolved. Cropped viewport imagery and brightening/selection are not an HD repair, spatial PSF measurement, natural color, faint-extent or complete-field quality acceptance.

Logical texture peaks in the saved trace are 1,458,176 bytes at night and 1,540,096 by day, including temporary full/window coexistence. They exclude decoded images, browser/native/driver storage and other resource owners. The one-byte pressure probe tests synchronous submission, not a feasible one-byte runtime budget. No native latency, total memory, server capacity, bandwidth or 200 DAU claim follows.

The optional method remains absent from normal scene/loader/source-route adoption. Program preparation or successful draw is not visible-source/provenance credit. Public native retry, producer compatibility, integrated source outcome/UI, frame performance, native availability behavior and final experience acceptance stay open. No browser startup, HTTP download, service, IDE/device action, deployment, dependency install, branch change, commit or production/test edit occurred in this independent review.
