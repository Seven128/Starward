# HST M51 bounded local registration diagnosis, 2026-10-02

This author task has produced four visually qualified **local, relative** stellar-point correspondences and a bounded fit/readback. It has not applied any transform or adopted a new WCS/image. All four SDSS counterparts use the one real field **301/3699/6/100**; their convex hull spans only 6.77% of the acquired HST image's nominal geometric support. Full-field, companion/northern coverage, cross-run and absolute astrometry remain unverified. Independent review of this new matching/fit is pending.

The original publisher AVM and its approximately 5 arcsec warning stay intact; [the separate source/rights/nominal-raster review](experience-hubble-m51-candidate-independent-review-2026-10-02.md) is not expanded into an alignment-quality certificate. HST prepared B/V/H-alpha+[NII]/I RGB and SDSS calibrated but bilinear r samples have different PSFs, filters and epochs. HST scientific masks/calibration/physical saturation and possible stellar motion are unknown; SDSS primary TAN is also approximate. Relative fit statistics are not absolute error bounds.

## Preserved initial automatic failure

`output/hubble-m51-registration-trial-1002-r1/result.json` SHA256 `9a4d6d2aef39b29fd5886b2cf4833ce0d517bedb081385f3219d182c28836348`, binding `9e1b4921034245c11ba0196518a1934183a8a22eaeee1eaee468c84fd0cf9ce8`.

The first trial searched at most 100 SDSS compact maxima within actual HST nominal support, ±22 target pixels for counterparts, using actual positive-weight contributor r flags. It produced three provisional proposals and explicitly required visual review before using the provisional fit. **Actual contact inspection rejected the first two HST matches:** a compactness/isolation condition disfavoured the real bright foreground-like sources with extended diffraction spikes, and selected weak neighbouring points instead. The wrong offsets were [+14.294,−12.279] and [+5.404,−19.334] target pixels. The third point in the companion's dust field lacked adequate foreground identification and was not used. The resulting provisional −0.75°/5.53-pixel RMS fit is invalid for registration. This generation is retained unchanged as real false-tie evidence; no old image or matrix was corrected to match it.

The next task did **not** loosen numerical criteria to manufacture automatic matches. It selected six small raw HST regions around actual visually observed diffraction-spike features, then searched the unchanged SDSS compact/flag rule in a bounded ±22-pixel area. Real source RGB regions and large SDSS scientific regions expose each association for inspection; the foreground-like peaks and their faint neighbours are distinguishable in the actual saved contact sheet.

## Actual curated regions and source facts

Curated immutable generation: `output/hubble-m51-curated-registration-1002-r1/result.json` SHA256 `fdbd364dd867f9df92986ac5af59010cca339b15c45d4d0e20ccdf4bae5445cc`; binding `b3f4c20023ec1fe1963d66e85dba924a6e7185401b10cdb95fa826a6c2eaf5a0`. The saved `curated-foreground-contact.png` was actually viewed. Its original HST 129×129 RGB regions show the diffraction-spike features; its SDSS 97×97 r regions are displayed with an explicit local linear diagnostic scale. They are not source-colour comparisons or new published images.

| ID | actual HST JPEG centroid, column/top row | actual SDSS target centroid | nominal HST−SDSS, target px | qualification |
|---|---|---|---|---|
|foreground-1|[438.918,2427.082]|[1423.096,1408.909]|[+1.016,−0.697]|foreground-like diffraction point; strong isolated r counterpart|
|foreground-2|[490.264,1947.882]|[1251.293,1396.140]|[+0.479,−0.604]|foreground-like diffraction point; strong isolated r counterpart|
|foreground-3|[875.898,1136.794]|[956.411,1267.849]|[+0.091,−0.820]|foreground-like diffraction point; unique compact r counterpart|
|foreground-5|[1593.932,2132.937]|[1305.139,998.780]|[−0.235,−0.967]|foreground-like diffraction point; strong isolated r counterpart|

These are **author visual qualifications**, not catalog-confirmed stellar identities or independent review. For IDs 1/2/5, the selected SDSS r peak is respectively about 58.35/53.97/66.51 times the next nearby compact candidate; ID3 has only one qualifying r peak. This reveals why the previous weak-neighbour assignments were incorrect. The real galaxy nuclei and extended/structured regions are excluded from these four associations.

Each qualified SDSS ROI contains 9,409/9,409 actual finite science samples. Its selected core has no actual contributing r INTERP/SATUR/NOTCHECKED/GHOST/CR flags, while OBJECT/BRIGHTOBJECT and other flags remain recorded. The shared contributor flag union is reused from frozen `output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json`, SHA `9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0`; it includes only real positive common-weight contributors and never changes science availability. The proposal records each contributing field's actual frame/psField/fpM association and original source hashes/PS_ID. All accepted points have weight1 from field100.

Foreground-4 is visibly a stellar diffraction feature but is excluded from the diagnostic fit: its 113 selected SDSS core pixels include 113 NOTCHECKED and 25 each SATUR/INTERP. The underlying finite values remain finite and unmodified; rejection is only tie selection. Foreground-6 has no compact SDSS counterpart passing the unchanged bounded criteria; this is an explicit northern-side evidence gap. The ambiguous earlier automatic dust-field point also stays excluded.

HST RGB clipping is recorded separately: the selected raw ROIs have some channel255 values, and foreground-1 includes one all-RGB255 pixel. This is **prepared image highlight clipping with unknown physical saturation**, not a fabricated HST science flag. The raw and original nominal master are never changed. The centroid range checks below capture some aperture sensitivity but do not resolve that physical uncertainty.

## Bounded relative fit and uncertainty observations

Fit generation: `output/hubble-m51-registration-fit-1002-r1/result.json`, SHA256 `376420444bd4608f00830a34bf0bb5a316e1364c46d889336b2fd0c9d0a91902`; binding `d045d67de6d3bd05152b753b36650e4a2ecc504db2c49967a2b11cebcb80877a`.

The explicit orientation is **B_nominal_HST = similarity(A_SDSS)** in the same saved north/top 2048-pixel target. This is a diagnostic relationship, not a new source WCS. Small/central/large checks use SDSS radii 4/6/8 target pixels and HST raw JPEG radii 4/8/12 pixels respectively. HST coordinates are converted with the unchanged publisher nominal WCS and exact target factory; source pixel centres and top/bottom orientation retain the independent AVM review's meanings.

| variant | median translation HST−SDSS, target px | translation RMS, px | similarity scale | rotation | similarity RMS, px |
|---|---|---|---|---|---|
|small|[+0.242,−0.786]|0.580|1.001219|−0.07934°|0.377|
|central|[+0.285,−0.758]|0.489|1.001072|−0.06344°|0.318|
|large|[+0.296,−0.785]|0.466|1.000981|−0.05653°|0.319|

Central leave-one-out prediction residual norms are about **0.687, 0.079, 0.875, 0.957 target pixels**; three points fitting a fourth provide limited leverage. At approximately 0.4 arcsec per target pixel, these are relative local observations, not a full-field certified angular error. Variation with aperture, spatial PSF, encoded colours/highlights, background contamination, native projection and epoch may contribute. A similarity reduces the local residual compared with a constant translation but is not thereby justified for the entire acquired field.

The four SDSS centroids span approximately [956.411,998.780] to [1423.096,1408.909], a convex-hull area of 96,518.8 target pixels², **6.77%** of the HST nominal geometric support. They do not constrain the northern companion side or other SDSS fields/runs. No overall translation/rotation/scale correction should be adopted from this bounded local result alone.

## Verification, preservation and next dependency

The fit script rereads all four science/finite/flag ROIs, verifies core flag eligibility and recomputes SDSS centroids exactly from actual saved values. A known analytic similarity (scale1.003, rotation+0.12°, translation[+0.8,−1.2]) is recovered within numerical tolerance; this checks fitter orientation, not real astrometric truth. Exact old automatic SDSS centres match the corresponding new curated centres, while the HST weak neighbours differ, preserving a reproducible failed-association case before qualified matching.

Executed task script hashes:

- automatic trial `556956bc94148ca9aa9b50544936f9781f7a5eda31b4efeb97612346cc88ab0a`;
- curated proposal `2dbfa287af57335f8026fe6988dc738c8da8066f1b1b2a8fe44c0c9db37792c1`;
- qualification/fit `28c74f221a50e362f49e7d63f263a5af99fd046a4f8a641313fac3f095368c67`.

All original candidate science/finite/weights, actual quality projections, HST JPEG/metadata/nominal PNGs and failed automatic output remain immutable. The proposal binding also preserves old 201 deep-sky assets and the six unrelated edits. There is no new HTTP, service/plate-solve fee, install, production code change, source recolour/sharpen, mask application, corrected PNG, publication, source UI change or native acceptance.

Next, independent review should check the four actual associations and fit sensitivity before any source registration policy is chosen. A further bounded northern/companion tie would need actual clean source support and reliable identification; a missing/faint/flagged point cannot be filled or accepted merely to enlarge the hull. If no such correspondence is supported by these cached observations, retain the limited nominal/relative precision and full-field gap. Full credit, correct image-geometry/science semantics, background/edge composition, shared producer/runtime integration and target quality remain separate obligations owned by the continuing plan.
