# M82 six-source fresh sampler independent review, 2026-10-02

**Bounded source/sampling review passed; image quality, publication and target acceptance remain open.** The review independently decodes the actual six cached scientific FITS arrays, evaluates inverse TAN and north-polar NESTED geometry, and compares every selected scalar and finite bit with the frozen shared sampler output. It does not call `sample_cached_tan`, `hips_tan_lookup.mjs` or `healpix-ts` to produce its expected science, and does not create an expected/display PNG. It read and actually viewed the existing published M82 DETAIL JPEG for diagnostics. No production, tests, assets, publication, PLAN, Context, retained files, runtime or source requests were changed by this review.

## Inputs and actual evidence

- Shared owner `data-pipelines/deep-sky/allwise_finite_tan.py`: SHA256 `d917e04227ce6b0faefdf7780bb144f040c3049eaae8f4cb629603411c5b25c4`.
- Tests `data-pipelines/deep-sky/test_publish_allwise_w3.py`: `8109e6037ad465d17f0411ef0197a626f8c8d33d598ca25198930c0b3c0da5a2`.
- Author frozen actual `output/allwise-w3-m82-fresh-science-1002-r2/result.json`: `87cf424defdf7621577095a6c4f29720ed7683e780747a3d364ffc3bae4acdb4`; its binding `16db2ae831bd889b454b14f36735efae9f2e9fb0517a1d2d58e28ce68f67150c`.
- Prior independent raw-source admission `output/allwise-w3-m82-source-independent-1002-r1/review.json`: `06ec40e7b3a4d9f1a71955f75044181fc93172d87aba9f8de01ce7e237954846`. All six primary scalar payloads exactly match independent raw big-endian decoding and Astropy primary data.
- This actual independent `output/allwise-w3-m82-fresh-sampler-independent-1002-r1/review.json`: **`6cc6e278cf94274d4734493f75e1b797c8b46fd566059b8ce6e5779ea2acd99d`**, 7107 bytes; `binding.json`: **`cd0faee38473508b7c4f0d0d89b620c077d8de841d974ab61efda792ac35e715`**, 52318 bytes.
- Reproducible script: `scripts/experience-m82-fresh-sampler-independent-2026-10-02.py`, with an exact executed copy in the new output. Sidecars preserve independent full science, boolean availability and tile/column/row lookup. `dark-region-diagnostics.json` preserves each core-dark and actual nonfinite target pixel's JPEG RGB, independent world coordinate and actual source identity/index/value. `bounded-mutations.json` and `focused-tests.txt` retain controls and checks. Every relevant production/source/previous-generation binding is checked before and after; output binding records all dependencies and outputs.

Run from this worktree with the existing cached interpreter:

```powershell
& 'C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' .codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-m82-fresh-sampler-independent-2026-10-02.py
```

The script intentionally refuses to overwrite its output generation. Its first invocation had a task-script quote syntax error before output creation; the quote was repaired and the single saved generation then completed. That was not a production sampler failure.

## Complete source identity and geometry

The actual canonical survey is the existing IRSA-hosted CDS AllWISE W3 HiPS source. Hash-bound properties identify equatorial order 8, 512-pixel tiles, `-32` FITS scalar data and the W3 survey. The individual cached headers have no tile identity, WCS or BUNIT. Per-tile identity comes from the checked canonical request/path and actual bytes plus these bound properties; units remain **unknown**, and the properties/receipt are not scientific-quality or new-rights approval.

All six files are 1,051,456 bytes, collectively 6,308,736 bytes. Each has a 2880-byte header and its entire 1,048,576-byte/262,144-scalar primary array. Each lacks 2624 FITS end-padding bytes; the preserved Astropy standards warning does not mean truncated scientific data. Tile 121707 has 24 NaN scalars; the other five are entirely finite. All six actual arrays contain no finite zeros, negative finite samples or infinity; the shared owner still must preserve those supported values when present.

| Norder8 tile | Actual raw SHA256 | Selected target pixels | Nonfinite selected target pixels |
| --- | --- | ---: | ---: |
| 121705 | `2ad25c13e886f1a615953db47dd3d9bd033ae6b42c67ad00298dbbc44fa17aaf` | 9193 | 0 |
| 121707 | `9e121e7d6d312503107cfa58332091cacf181c8ac93ae94f49217ad984ed0a14` | 135726 | 19 |
| 121708 | `f3dc5d59976f2a179394dfa83354854f4d404b15bd02b06b5fc81373de018f40` | 12636 | 0 |
| 121710 | `fa8ecd49a64be2642397d03ca513182402a7987a333a82d117518881617de276` | 76859 | 0 |
| 121793 | `65279bf677d34c211aa2f4c2a0413f6a17cd8aec163ddd2a17ddfb7c7b99949a` | 27364 | 0 |
| 121796 | `709be8352c3da931b10b30f5344054dc5dbeee14b6eabca2a7b47b456e806f88` | 366 | 0 |

The old DETAIL plan remains the controlling input: ICRS center RA 148.96970833333333°, Dec 69.6793888888889°, 512² pixels, 0.25° field, north-up/east-left TAN, one-based CRPIX1/2 **256.0** and reversal from encoded image row to increasing FITS row. The source nearest lookup uses NESTED nside 131072 (order8+9), column NW and row 511−NE. The independently implemented north-polar formula is deliberately bounded to this full field, whose latitude is above asin(2/3); it is not a replacement general HEALPix library.

Analytic inverse TAN differs from independently constructed Astropy world components by at most **8.526512829121202e-14 degrees**. The independent Astropy world bytes give the existing plan hash `2d6981c26f566bc56ac0ba926ab880146486a25bc18deb138d512af2755e806c`. Both independently evaluated world arrays produce exactly the existing full lookup hash `b0e379afaba5c36f747f4b30497503712a476f9741e3ec065fd28e2573889d4e`. This checks the declared transform and sampling responsibility, not absolute astrometry or exact old CDS interpolation/origin.

Every independently selected float32 byte, including selected NaN payloads, equals `detail-science.npy`; every `isfinite` boolean equals `detail-availability.npy`: **262125 finite / 19 nonfinite** out of 262144. Actual finite statistics and metadata agree. All six actual source contributions are necessary for this full target; omitting the small 366-pixel contribution is missing input, not source nonfinite science.

## Core black hole and peripheral dark pixels

Actually viewed published `M-82/M-82-detail.jpg`, 9569 bytes, SHA256 `91a9220c505c1521ec5cc14c1312721ef1afdd653297a86ef892452a4172b699`. Its bright nucleus contains a small near-black hole and the overall image remains soft. These observations do not certify source science or display quality.

All positions below use zero-based encoded JPEG x/y and the **declared** existing center/field/origin mapping. Luminance uses decoded actual RGB with coefficients .2126/.7152/.0722. Thresholds select regions to inspect; they never produce scientific masks.

- Inside the explicit viewed core box x `[248,272)`, y `[245,270)`, 17 actual pixels have luminance ≤8 (located at x259–266/y251–258). **All 17 independently select finite positive tile121707 samples**, intensity 56.52937316894531–313.9743957519531 in unknown units. Their median is 198.9324951171875. A mask inferred from these black JPEG pixels would incorrectly discard all 17 known finite samples.
- The 19 actual selected NaN target pixels lie at x250–255/y249–253. They **do not overlap** those 17 core-near-black JPEG pixels. The full coordinate/source record is saved. This does not explain the physical origin of the old hole or prove which old CDS samples/interpolator formed it. It rules out treating the reviewed black-hole diagnostic as a direct copy of this new 19-pixel finite mask.
- For radius ≥80 pixels from the geometric image center and actual JPEG luminance ≤8, **216359** peripheral dark pixels independently select finite values (268.67864990234375–305.20526123046875; median 273.0147399902344), with contributions from **all six tiles**. Low encoded brightness therefore cannot serve as missing-input, nonfinite or scientific confidence evidence, even outside the nucleus. This supersedes only the old incomplete-source diagnostic within this exact new six-source/DETAIL scope; it does not retroactively close old JPEG source coverage.

Source saturation/detector artifacts, actual PSF, exact old CDS interpolation, old pixel origin and absolute registration remain unresolved. Properties describe nominal W3 angular resolution of about 6.5″; the DETAIL target sampling is about 1.758″ per pixel. Resampling does not create higher scientific resolving power. This review performs no repair, inpainting, stretching, source mask guessed from black pixels or natural-color conversion.

## Shared-boundary controls and compatibility

Five newly affected production regressions were rerun and passed: receipt-free fresh science preserving zero/negative/NaN/infinity; actual complete geometry demand before array read; invalid receipt/bytes/canonical identity; properties/lookup/geometry mismatch; locator confinement. These use real FITS fixtures and mocked coordinate lookup. Actual six-source checks above independently cover real full geometry and data. No finite zero/negative exists in this actual target, so their general preservation is demonstrated by the controlled fixture, not invented actual samples.

Two bounded independent in-memory controls are saved. Changing the 17 JPEG-near-black core samples into unavailable is detected as 17 false exclusions. Silently changing CRPIX256 to 256.5 alters **238073** target lookups and fails the existing geometry identity. Neither control modifies the production owner, frozen output or sources. The author's separately bound real false-complete receipt/bypass control remains author evidence, not relabeled independent generation.

Read and hash-checked all saved old/current M42 compatibility outputs in `output/allwise-w3-fresh-sampler-compatibility-1002-r1` (result `9aa01e93b7ad5c92cd1eba896f589e1374cb1ed92536e0423b103b2d3111e3cc`). Old/current **full metadata and full QC file bytes are equal**. All three published M42 PNG files were independently fully decoded and their real alpha counts checked against manifest finite/missing counters. This review did not repeat their full source render or claim those saved author outputs as independently generated. The current 201 retained deep-sky asset files and all six preserved unrelated files were rechecked against frozen identities and remain unchanged.

No discrepancy requiring a shared sampler repair was found in this bounded review. It supports proceeding to a separate honest M82 display trial using these scientific/finite arrays, with source artifacts and mask meaning retained. It does **not** authorize adopting a new image or publication, claim complete three-level M82 input, remove its finite core artifact, certify optical/natural-color/PSF quality, or close runtime/mobile/total-memory/performance obligations. The original OVERVIEW order4 one tile and MEDIUM order7 eight tiles remain **nine unacquired, unverified inputs**.
