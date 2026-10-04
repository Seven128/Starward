# M82 source-finite DETAIL display trial, 2026-10-02

**One actual diagnostic PNG generated and viewed; not adopted or published.** It preserves the independently reviewed scientific intensity and availability arrays and applies the existing shared `finite_rgba` once over the whole DETAIL array. The central dark feature remains visible and image softness is unresolved. The trial does not repair source artifacts, supply unavailable levels, or certify higher resolving power.

## Exact input, owner and output binding

- Independent scientific review: `output/allwise-w3-m82-fresh-sampler-independent-1002-r1/review.json`, SHA256 `6cc6e278cf94274d4734493f75e1b797c8b46fd566059b8ce6e5779ea2acd99d`.
- Actual science: `output/allwise-w3-m82-fresh-science-1002-r2/detail-science.npy`, `39ab5e7d4a918e179a0c8449d08365883c7d9fc79c3d76b2f8c90ebebd7c68c2` (1,048,704 bytes); actual boolean availability `fc271d01c7559a8e237edefec5a1c04c11ade05a42efae5bf8358153f08a88f2` (262,272 bytes). Both agree with the independent source sampling sidecars. Their file and scalar/boolean bytes remain unchanged.
- Shared `data-pipelines/deep-sky/allwise_finite_tan.py` SHA `d917e04227ce6b0faefdf7780bb144f040c3049eaae8f4cb629603411c5b25c4`; QC owner `image_quality.py` remains SHA `b69389f2961949ddb96a2248cbb4f7e866e653a78e710efb87fdfde88660fcff`.
- New exclusive real PNG: `output/allwise-w3-m82-detail-display-1002-r1/M-82-detail-source-finite.diagnostic.png`, **41,297 bytes**, SHA **`25a55dc09778e5e8220652a8772e5e3a1788d680232b93890cacc4b713c11144`**.
- Actual result `output/allwise-w3-m82-detail-display-1002-r1/result.json`: **`624cb058b11018e224a7273da3ef6d9f2ada5d03ae98265d3cdf9e00564c6e27`**, 3809 bytes; actual `binding.json`: **`265e5860c460ee93edb26ec7e7f8e26d3d5be7c9bf79b2d66d870dc0c384a7db`**, 54003 bytes.
- Script `scripts/experience-m82-detail-display-trial-2026-10-02.py`, exact executed copy in output. `metadata.json`, `quality.json`, and `core-pixel-diagnostics.json` preserve the actual transfer, WCS/source identity, full QC and old/core coordinate to new RGBA mapping. Input bindings include relevant frozen generations, retained 201 assets and six unrelated preserved files; all checked unchanged after execution.

```powershell
& 'C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' .codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-m82-detail-display-trial-2026-10-02.py
```

The generation is immutable and the script refuses an existing output directory. It generated no historical expected PNG receipt, overwrote no previous generation, used no upstream request and edited no production owner, asset, route, publication, PLAN or Context.

## Actual display behavior

Existing shared method is grayscale, finite-only 1/99.7 percentile bounds, scale `.1` asinh. This full 512² array's actual bounds are **[269.85169921875, 2949.9394130859314]**. This is one whole-array fit, with no local core/periphery fit, parameter search or independent per-object correction. The owner's historical `finiteCutsDN` property name is preserved as recipe evidence; **DN units are not established** because these source primary headers have no BUNIT.

Pillow wrote and completely verified/decoded this actual PNG. All decoded RGBA bytes equal the shared transfer result. Actual alpha equals the source boolean availability at every pixel: **19 nonfinite samples transparent, all 262125 finite samples alpha255**. Scientific float32 and availability bytes remain exactly unchanged. There are **45525 valid opaque RGB-zero pixels**, demonstrating that finite display black is not absence.

For the actual 17 old JPEG near-black core coordinates independently inspected in the previous review:

- All retain their same finite positive source values and alpha255.
- **13** are RGB0; the remaining four grayscale values are **14, 2, 1 and 10**. Their exact source tile/column/row, old JPEG RGB and new PNG RGBA are saved.
- The actual PNG was viewed, and the dark feature inside the bright core is still present. Threshold clipping in this existing transfer preserves the finite low intensities as opaque black; it does not heal the feature. The separate 19 source nonfinite targets are transparent and are not reclassified as these 17 finite coordinates.

For the 216359 actual previously diagnosed peripheral near-black JPEG positions (radius≥80, old JPEG luminance≤8), all remain finite opaque. **45504** decode to RGB0, with new grayscale percentiles `[0,0,1,8,11]` at `[0,1,50,99,100]%`. Those encoded zeros do not create alpha holes or scientific missing data. JPEG luminance only selects a region to compare; it supplies no scientific mask for old or new imagery.

QC invokes the current shared `inspect_image` with the actual scientific boolean mask. It checks actual bytes, encoded dimensions/container, declared geometry and source-mask correspondence. Scientific/artifact validity stays unknown. QC, lossless encoding and greater file size do not certify visual quality or new scientific resolution.

## Remaining limits and next dependency

The PNG retains the same declared ICRS north-up/east-left 0.25°/512 TAN and CRPIX256.0. Source world/lookup hashes remain `2d6981c26f566bc56ac0ba926ab880146486a25bc18deb138d512af2755e806c` and `b0e379afaba5c36f747f4b30497503712a476f9741e3ec065fd28e2573889d4e`. Exact old CDS interpolation, pixel origin and absolute registration are not inferred from appearance or this new nearest sampler.

Core finite low values and possible source saturation/detector artifacts remain unresolved; this trial does not diagnose their physical cause. Source PSF and softness are not corrected by this transfer or larger PNG. No brightness-derived alpha, replacement scientific mask, clipping-as-absence, guessed zero supply or inpainting is used. Existing W3 data are historical infrared, not natural optical color or naked-eye appearance.

The result supports an honest separated scientific/finite/display responsibility. It does **not** satisfy the requested full shared image-quality outcome or justify adopting this diagnostic as an improved M82 product image. The nine original OVERVIEW/MEDIUM scientific inputs remain unacquired and unverified. Runtime consumers, publication migration, native/mobile output, combined scene quality, total memory/performance and final acceptance were not exercised.
