# Independent review: actual bounded SDSS local overlap diagnosis

The saved diagnostic output passes this independent check within its stated local-observation scope. No production or actual-output discrepancy requiring repair was found. The local match, native signed PSF differences and patch residual statistics are supported observations; they do **not** establish a global/absolute astrometric transform, calibrated flux/color, blank-sky model, source correction, new weights, natural color or image/runtime quality adoption.

Everything was offline and task-local. No requests, source downloads, installs, production/PLAN/Context edits, science/flags/weights/RGB changes, reprojecting the whole mosaic, publication/native/device/service operations occurred. All old201 assets and six preserved files retain their identities. Only new scripts, independent outputs and this note were added.

## Exact inspected generations

- Author note `experience-sdss-local-overlap-diagnosis-2026-10-02.md`: SHA `4c81a7925fa3e06d34cb49e6a1689fa9896e99dba40602b08c2f0a73142d2c11`.
- Actual diagnosis `output/sdss-local-overlap-diagnosis-1002-r1/result.json`: SHA `4611e2bf79b8e7bb3c31b0a022badcdff8d445c9ada3adaf9a3d36e25405bb6f`, binding `7fbbaf5ca7571cd5902c21b917c13b9aab544ebbf92ec0ee963846f38a04255d`.
- Frozen executed diagnosis script: SHA `c8f04dc33f0d5b438fda8e96aa3ca0c33a7c8f0ac251fa4726c1501b084c291b`.
- Author derived controls/readback `output/sdss-local-overlap-controls-1002-r1/derived-summary.json`: SHA `5a3a9e5fd293ab661d4d78324174079838b9aee97447504e33497655c5e8474b`; binding `a8915212b071e5153bfae9d025df7a858fda34a5cb79fb7f3caf652456984dcb`.
- Frozen r2 mosaic candidate: SHA `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`.
- Actual whole projection r3: SHA `9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0`, independently checked in `output/sdss-m51-mosaic-quality-independent-1002-r2/review.json`, SHA `c4fb08f54a4e83dcd6045201d126c90be320f08a954ae57adbf6d85c983ac0e5`.

The local output's protected input inventories and every actual output file were read/hash-checked before and after this audit. The previous independent whole-target proof supplies the source-origin validation of full projected flags and scientific sidecars; the local review takes their actual regions rather than repeating full source reprojection. The supplementary generation independently confirms that all18 current cached corrected-frame byte hashes still match those exact whole-source receipts. Genuine source/quality files and the excluded synthetic field101 fixture retain their separately established provenance distinction.

## Independent source-region and coordinate checks

Independent script `scripts/experience-sdss-local-overlap-independent-2026-10-02.py` reads actual per-field science/finite sidecars and the already independently verified full-target flag arrays read-only. It rebuilds the declared target from the exact original center2048/field angle and verifies every peak/patch RA/Dec. Saved row increases toward south; target FITS y is `2047 - savedRow`. Actual native coordinates come directly from the cached corrected primary FITS WCS, without calling the production sampler/quality reader as an oracle. Primary TAN remains a declared approximation, not full asTrans/DCR or absolute astrometric truth.

The six fields' three-band finite intersections independently yield **exactly nine** nonzero overlaps; no additional positive overlap is omitted. Overlap and catalog-exterior counts agree:

| A→B (run/field, rerun301/camcol6) | Common pixels | Catalog-exterior pixels | Selected peaks | Background ROIs |
| --- | ---: | ---: | ---: | ---: |
| 3699/99→3699/100 | 175362 | 39763 | 3 | 4 |
| 3699/99→3716/116 | 25363 | 0 | 0 | 2 |
| 3699/99→3716/117 | 39431 | 0 | 0 | 3 |
| 3699/100→3699/101 | 140495 | 0 | 2 | 4 |
| 3699/100→3716/117 | 137547 | 0 | 0 | 4 |
| 3699/100→3716/118 | 39432 | 0 | 0 | 4 |
| 3699/101→3716/118 | 45279 | 0 | 1 | 4 |
| 3716/116→3716/117 | 69518 | 2037 | 3 | 4 |
| 3716/117→3716/118 | 104322 | 5983 | 2 | 4 |

All11 selected33×33 compact-peak ROIs and all33 background ROIs have complete coherent source supply. Every saved array plane is exactly the stated gA/gB/rA/rB/iA/iB source crop, and all264 scientific planes plus their264 matching flag planes agree with the corresponding frozen source sidecars byte-for-byte. The66 peak finite planes are true, reflecting actual scientific supply rather than inferred flag brightness or quality. Array filenames do not override the explicitly verified array order.

Every selected peak is an actual eight-neighbor local maximum in the pair's r-band mean and meets its recorded r compactness, contrast, core processing-bit exclusion, surrounding-emission and separation requirements. This review checks selected-region eligibility and inspects the bounded selector; it does **not** rerun the exhaustive ranking to claim those peaks are unique or optimal stars. The search considers at most200 bright maxima and selects at most3 peaks, so its empty result in four cross-run pairs remains a missing local estimate rather than proof of registration. Peaks are not catalog-confirmed star identities. Diagnostic peak eligibility uses r, not all bands; other bands retain their own processing flags and scientific values.

All66 saved native51×51 signed PSF kernels are independently reconstructed from raw coefficient wire bytes, active per-basis orders, all four bases, official row-power/column-power axes and PHOTO+.5 convention. Native WCS positions, full signed kernel bytes, negative-pixel counts, sums and NEA agree. No signed basis/kernel value is clipped or normalized into a scientific measurement. These source-relative kernels and NEA are not FWHM, measured spatial PSF accuracy or the final matched mosaic PSF.

The contact sheet was actually viewed. All22 A/B r image panels also independently match the actual saved patches under the declared common per-row grayscale scale and3×nearest enlargement. The unique cross-run source A visibly spreads more than B; this is consistent with the reported model differences, while remaining a small observed local comparison rather than source-quality acceptance.

## Independent estimator and residual checks

The local intensity fit is independently reimplemented with **centered covariance/variance regression**, rather than calling the author's `lstsq` estimator. It bilinearly samples B at A+[dx,dy], scans the declared ±2-pixel/0.1 grid and0.02 refinement, and fits only an estimator-local scale/constant. All33 actual band fits select the same grid positions (maximum shift-grid difference0). All output RMS, relative residual RMS, fitted scale/constant and unshifted metrics agree within floating-point tolerance. Positive-residual centroid mathematics at radii4/6/8, baseline/MAD and radius-sensitivity values independently agree. None is applied back to science.

The analytic control's actual B feature is displaced [+0.64,−0.38] in saved column/row. The independently recovered **positive B−A sampling direction** agrees, while reversing that sign produces a detected error larger than1 pixel. Same-patch zero, constant target no-estimate and true shift beyond the search limit are independently confirmed. The latter remains marked at the search boundary; a bounded search minimum is not a recovered unbounded physical shift. Controls use finite analytic inputs and establish estimator orientation/limits, not measured stars or PSF/astrometric truth.

All99 background-band A/B raw median/MAD/quantiles, signed/zero sample counts and B−A statistics match independently computed values. The three-band median residual colors are differences of those signed flux statistics in nMgy/source-pixel units, not magnitudes, calibrated color or white balance. Together with the33 peak-band measurements this closes the132 actual measurements reported by the author, without relying on its self-readback summary as an oracle.

The one cross-run peak [188,893] in3699/101→3716/118 has the reported g/r/i fitted B−A shifts [−0.30,−0.42]/[−0.16,−0.36]/[−0.22,−0.32]. Its signed source PSF NEA differs substantially (A/B roughly39.70/18.33,29.00/18.57,35.49/16.81 source pixels). The fitted scale, centroid and intensity match therefore remain confounded by spatial PSF, sampling/morphology, noise and the approximate WCS. This single point cannot estimate a global transform, calibrated flux ratio or a correction policy. Four of five cross-run overlaps have no selected compact-peak estimate.

## Catalog-exterior and estimator support limits

The expanded ellipse is independently recomputed from the actual task's major/minor size13.71/11.67 arcmin, PA163° and multiplier1.25. **Exactly three** saved background33×33 ROIs lie wholly outside it: [1968,2000], [1968,1840] in3699/99→100, and [368,16] in3716/117→118. The first has zero OBJECT, selected-processing and NOTCHECKED pixels in each band of both sources. The other two retain their reported processing/object/not-checked labels. The ellipse's exclusion is a finite catalog geometry statement: it does not exclude stars, galaxy/companion wings or undetected sources, and even the first patch is not certified blank sky.

Background candidates are a fixed32-pixel lattice, ranked first by **center** being exterior, then r-band object/processing fraction and scatter, with at most4 separated ROIs. Entire-ROI exterior is subsequently recorded, not guaranteed by ranking. Selection is biased/bounded and lacks a source-specific scientific sky mask. Marginal/difference MAD on bilinearly reprojected, correlated samples is not independent calibrated noise variance. Small same-run disagreement is compatible with shared/correlated observation content; it does not justify confidence weights. Position- and band-dependent cross-run residuals within the ellipse do not identify a second sky subtraction or constant field/color offset.

One supplementary finite control establishes a future **identifiability** boundary: compact nonconstant A with a completely flat zero B has no reference shift information. The independent centered-covariance oracle returns no estimate; the frozen author's task function still returns an arbitrary bounded shift with residual/A-standard-deviation1 because it checks target variance only. This does **not** invalidate the actual saved results: both fields of every selected peak passed finite contrast/compactness qualifications, and B is nonconstant. It is not a production defect or a reason to alter old outputs. The task function must not be promoted to a general registration owner without qualifying both inputs, ambiguity, boundaries and failed/partial data.

## Reproducible independent outputs and conclusion

- Main independent script `scripts/experience-sdss-local-overlap-independent-2026-10-02.py`; exclusive `output/sdss-local-overlap-independent-1002-r1/review.json`139465B, SHA `316c3f612590790ae9f0cbcd7ce000e5c7c64301a42c8ff8436cc0f886457d15`; binding128376B, SHA `a1f6448d2bf32a5617977a116c336d098536a4bef9af9aec218120c6bd17884f`. Per-pair independent results and analytic source arrays are saved.
- Source/flat-reference addendum script `scripts/experience-sdss-local-overlap-readback-addendum-2026-10-02.py`; exclusive `output/sdss-local-overlap-independent-1002-r2/result.json`5701B, SHA `c6ec0f72bde73f1e7a5a3feb0a70dd7bb67d5d39488a8b716b5aeba1a00322df`; binding7800B, SHA `d4810eb692dd458e5f3d8ca46df25ebc05cde919826b991cae09e8474408aafc`. This adds exact18-frame readback and one finite estimator boundary, preserving the entire prior independent r1 generation; it does not repeat the actual matrix.

The local output is usable for bounded relative observations and for identifying what a subsequent supported shared quality responsibility must distinguish. Existing complete source flags/PSF inputs are now available, but no global/absolute registration, blank-sky model, scientifically justified rejection/weighting or PSF/background/color correction follows automatically. Source PSF, seams, natural color, full asTrans, measured correspondence and final product/runtime quality remain open. No further source download is required to preserve or review this conclusion.
