# SDSS six-field local overlap diagnostic, 2026-10-02

The bounded offline diagnostic is complete within its scope. It supplies actual local registration, residual background/colour, flags and native PSF observations. It does **not** establish a field correction, clean sky model, scientific image-quality pass, natural colour, runtime acceptance or adoption. No HTTP was issued and no science, masks, weights, RGB, old sidecars or production code was changed. This is author diagnosis/readback; independent review of this particular estimator/output is still pending.

## Immutable generations and binding

- Candidate: `output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json`, SHA256 `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`.
- Diagnostic: `output/sdss-local-overlap-diagnosis-1002-r1/result.json`, SHA256 `4611e2bf79b8e7bb3c31b0a022badcdff8d445c9ada3adaf9a3d36e25405bb6f`; binding `7fbbaf5ca7571cd5902c21b917c13b9aab544ebbf92ec0ee963846f38a04255d`.
- Exact executed task source: `scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py`, SHA256 `c8f04dc33f0d5b438fda8e96aa3ca0c33a7c8f0ac251fa4726c1501b084c291b`; frozen `executed-script.py` has the same bytes.
- Controls/readback summary: `output/sdss-local-overlap-controls-1002-r1/derived-summary.json`, SHA256 `5a3a9e5fd293ab661d4d78324174079838b9aee97447504e33497655c5e8474b`; binding `a8915212b071e5153bfae9d025df7a858fda34a5cb79fb7f3caf652456984dcb`.
- Executed control script: `scripts/experience-sdss-local-overlap-controls-2026-10-02.py`, SHA256 `4459ff1131db4192b7dc776d4dd61a2ef28a6b229ca236608673325cd9a43faa`.
- Quality inputs are the original core four and genuine new 20, with actual acquired request receipts; the synthetic review field101 fixture is excluded. See [input acquisition](experience-sdss-contributing-quality-inputs-2026-10-02.md) and [shared quality owner](experience-sdss-source-quality-owner-2026-10-02.md).

The diagnostic binding preserves all candidate files, both quality-input generations, all 201 old published deep-sky assets, five relevant Python owners and six unrelated files. The 18 corrected-frame bytes were checked against candidate receipts when read; `check_frame_quality` associated each actual native frame, matching psField and same-band fpM. The six field association JSON files retain that helper's `NOT_ASSESSED` availability/`UNKNOWN` quality result. The control binding then preserves the full frozen diagnostic generation and task source.

Reproduce in a **new nonexistent** output directory:

```powershell
& 'C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' .codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py --output output/<new-exclusive-generation>
```

No source acquisition or additional dependencies are performed. The script reads cached NumPy/Astropy/Pillow and writes only task evidence.

## Actual scope, coordinates and method

All nine genuine overlap counts match the prior frozen per-field arrays: five cross-run pairs and four same-run adjacent pairs. The zero-contribution `3716/5/117` input is excluded. Science and finite sidecars are opened read-only with `mmap_mode='r'`; the script asserts that finite pixels equal actual finite science for each of all 18 arrays. It does not reproject or recompute mosaic science.

Coordinates use exact `target_tan(candidate.center, 2048, candidate.fieldDegrees)`, **not rounded serialized target WCS cards**. Target step is approximately 0.400000526 arcsec/pixel, saved north/top first; FITS target y is `2047 - savedRow`. Each native coordinate comes from the actual checked corrected frame's WCS. This avoids the metadata rounding discrepancy found by the root's separate full-grid replay. The WCS remains the existing primary-header linear TAN approximation; asTrans/DCR is not applied or certified.

The star search is bounded to the brightest at most 200 eight-neighbour local maxima per overlap, at most three spatially separated peaks. Both fields require the whole 33×33 three-band finite ROI. Selection uses r-band core flags (INTERP, SATUR, GHOST, CR), local annulus contrast, compactness and absence of comparable nearby emission. This is a diagnostic selection rule, **not an adopted science mask**. NOTCHECKED, OBJECT, BRIGHTOBJECT and the other flags are recorded separately; flags do not alter eligibility/science. Each peak is described as an isolated compact intensity peak; there is no catalog-confirmed star identity.

For each selected peak, the actual output saves six 33×33 g/r/i science patches, six independent four-source-neighbour OR flag patches, six finite masks and six **signed**, unnormalized native 51×51 PSF kernels. `arrayOrder` is explicit (g A/B, r A/B, i A/B); the awkward science file label in r1 is just a filename, not its ordering. Local centroids at radii 4/6/8 use positive residual weights after an annular diagnostic baseline. A separate local match samples B at A+[dx,dy] on a 17×17 ROI, searches ±2 target pixels and refines to 0.02 pixels; a fitted scale and constant are used only inside the estimator. No baseline, shift or scale is applied to science.

Background selection uses a fixed 32-pixel lattice, at most four separated 33×33 patches per pair, prioritizing catalog-exterior and then low r-band OBJECT/processing flags and low local scatter. Every g/r/i plane's flags and raw median/MAD are saved. This is **not** a certified blank-sky mask; the existing 1.25×catalog ellipse does not exclude stars, deep wings, companion light or undetected sources. The metric `1.4826 MAD` is local scatter on correlated bilinear target samples, not calibrated per-source noise variance. Median g−r/r−i residuals are differences in nanomaggies per source pixel, not magnitudes or natural-colour measurements.

## Observed compact peaks

Eleven selected peaks were actually viewed in `compact-peak-r-contact.png`. A and B use the same per-row linear grayscale scale and nearest pixel enlargement, making their source shapes comparable; no candidate display image is changed. Four cross-run pairs contain no peak passing this bounded diagnostic selection; this is an explicit evidence gap, not proof of correct registration.

| A → B | run relation | peak saved coordinates | r local B−A sampling shift, target px |
|---|---|---|---|
|3699/99 → 3699/100|same|[1893,1655], [2000,2028], [1983,1930]|[0,+0.02], [−0.02,+0.02], [0,+0.02]|
|3699/100 → 3699/101|same|[484,1654], [573,1893]|[−0.02,+0.02], [−0.02,+0.02]|
|3699/101 → 3716/118|cross|[188,893]|[−0.16,−0.36]|
|3716/116 → 3716/117|same|[1779,68], [1826,178], [1835,392]|[+0.02,+0.02] at all three|
|3716/117 → 3716/118|same|[474,540], [462,435]|[+0.10,−0.04], [+0.10,−0.06]|

Same-run r residual RMS / ROI standard deviation ranges about 0.0068–0.0525; radius-dependent centroid sensitivity is about 0.0029–0.0291 pixels. These limited values do not certify full-grid or absolute registration. The same-run exposures share observation content, so their close agreement is also not an independent-noise quality validation.

The one cross-run peak at [188,893] gives:

| band | local shift B−A, target px | fitted scale B→A | residual RMS / A std | radius centroid sensitivity, px | native signed-PSF NEA A/B, source px |
|---|---|---|---|---|---|
|g|[−0.30,−0.42]|0.8032|0.1840|0.0798|39.6965 / 18.3273|
|r|[−0.16,−0.36]|0.8068|0.1790|0.1054|28.9988 / 18.5653|
|i|[−0.22,−0.32]|0.7544|0.2543|0.0570|35.4921 / 16.8062|

All these band cores have no selected processing bits, with finite science independently present. The viewed A source is broader than B; actual reconstructed spatial PSFs also differ substantially in NEA. The fitted scale, colour difference and shift are therefore confounded by PSF/sampling and cannot be treated as a calibrated flux ratio, a uniform field offset or a PSF-correction prescription. Signed kernel values and source status flags remain preserved; NEA is not FWHM or a homogenized mosaic PSF.

## Observed local residual backgrounds and noise

Thirty-three patches are saved. Only three whole 33×33 patches lie outside the expanded catalog ellipse: same-run 3699/99→100 at [1968,2000] and [1968,1840], and 3716/117→118 at [368,16]. At [1968,2000], all bands in both fields have zero OBJECT, selected-processing and NOTCHECKED pixels. The other two are not clean: [1968,1840] has eight selected-processing i pixels in each field and one NOTCHECKED r pixel in B; [368,16] has g OBJECT/processing and r/i OBJECT pixels. Even the first remains an uncertified outer-sky patch, not a deep-wing sky model.

At the first exterior patch, native-calibrated projected marginal MAD scatter is g≈0.00917/0.00934, r≈0.01496/0.01512, i≈0.02863/0.02879 nMgy/pixel. B−A medians are respectively +0.0001933, +0.0001753, −0.0000954. These are observations of that patch, not whole-field noise/sky values.

Cross-run low-object r patches usually have scatter about 0.015–0.018 nMgy/pixel per field; their difference MAD / quadrature marginal MAD is close to one. Same-run r ratios are much smaller (roughly 0.03–0.18), consistent with highly shared observation content. This distinction argues against estimating independent noise/confidence simply from same-run disagreement.

Cross-run medians vary with position and band. For example 3699/100→3716/117 at [1552,656] has g/r/i B−A medians [+0.0000862, −0.0001190, −0.0054543], while [528,816] has [+0.0013188, −0.0029752, +0.0016985]. Both are inside the catalog ellipse. Per-band processing/NOTCHECKED and scatter are retained in `derived-summary.json`. A constant three-band background offset cannot be inferred from these mixed local samples, and no second sky subtraction is justified.

## Verification and next dependency

The separate task controls recover known analytic B−A=[+0.64,−0.38] within floating-point roundoff, recover same-patch zero, return no estimate for a constant patch and report the boundary for a true shift beyond the ±2-pixel search. These control orientation/finite estimator limits, not real astrometric truth. The readback exactly recomputes **132 local band measurements** from the saved arrays: all selected centroid/shift/PSF statistics and all background median/MAD differences. It preserves the whole original diagnostic generation and has no scientific calibration/adoption effect.

The next bounded quality decision needs the root's complete 2048² source-quality projection and independent review of all real six-field inputs, plus review of this local output. A subsequent local registration trial should distinguish spatial PSF-induced centroid/matching bias from actual relative astrometry before considering a shared correction. Four of five cross-run overlaps still lack a usable compact-peak estimate here; one cross-run point cannot constrain a global transform. Existing cached native fields may allow additional outer-background demand beyond the current small target, but the actual shared overlap and absence of galaxy/deep-wing contamination must be established first, without assuming the catalog ellipse supplies clean sky. No new download is required merely to inspect that possibility.

Any future science-mask/PSF/background policy belongs to an explicitly reviewed shared owner with preserved finite zero/negative values and independent availability, not an automatic patch to this frozen mosaic or a catalogue-score/FWHM shortcut. The present task ends at actual diagnosis; colour, source PSF, seams and final image quality remain open.
