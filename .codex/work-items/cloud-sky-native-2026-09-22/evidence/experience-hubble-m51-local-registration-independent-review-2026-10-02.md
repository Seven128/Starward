# HST M51 local registration: independent offline review, 2026-10-02

**PASS for the bounded local diagnosis and its preserved failed associations. No transform/WCS or image is adopted.** Four actual foreground-like point correspondences support a local relative comparison. They are all in one SDSS field, and their convex hull covers only 6.771% of the nominal HST geometric support. Northern/companion, cross-field/cross-run and absolute astrometry remain unverified. The original roughly 5 arcsec AVM warning remains valid evidence; these small local residuals do not supersede it.

Read the complete [author diagnosis](experience-hubble-m51-local-registration-2026-10-02.md), the three exact executed author scripts, actual source/candidate/quality arrays, per-region originals, and [the separate source/rights/nominal-projection review](experience-hubble-m51-candidate-independent-review-2026-10-02.md). The specific image's rights conclusion is retained; full visible runtime credit, accurate source meaning, background/edge composition, producer/runtime integration, publication and target-native acceptance remain separate undelivered obligations. No HTTP, image acquisition, paid service, package install, DevTools, phone, production edit or correction occurred in this review.

## Actual output and association inspection

Actually viewed the original `provisional-ties-contact.png`, the original `curated-foreground-contact.png`, and the independent `independent-six-regions-contact.png`. The new contact shows original JPEG RGB, unchanged nominal HST target sampling and actual SDSS r science side by side for all six regions. SDSS grayscale uses an explicitly local diagnostic linear scale; prepared HST colour is not an r-band flux comparison. There is no corrected raster or transformed image in these contacts.

All six saved original HST 129×129×3 regions match the cached 4000×2776 source JPEG decode byte for byte. The JPEG decode hash matches the prior source review. Each of the five author SDSS 97×97 science/finite/contributor-flag regions matches the frozen full mosaic arrays byte for byte. The independent generation additionally saves the real sixth SDSS science/finite/flag region and six unchanged nominal HST target ROIs, because the author's first contact excluded the unmatched region.

Independent strict eight-neighbour comparisons reproduce all six bounded searches: the strongest eight peaks in the 45×45 search are examined under the unchanged compact rule. Candidate counts are **2, 3, 1, 2, 2, 0** for foregrounds 1–6. This does not exhaust every celestial identification or establish a general registration selector; it reproduces this stated bounded rule from real values.

| region | independent actual finding | diagnostic eligibility |
|---|---|---|
|foreground-1|Strong HST diffraction-spike source and dominant compact SDSS counterpart; nearby faint HST/SDSS point distinct.|PASS local relative correspondence; r peak is 58.353× next qualified compact candidate.|
|foreground-2|Strong HST diffraction-spike source and dominant compact SDSS counterpart; earlier faint neighbour is visibly distinct.|PASS local relative correspondence; r peak is 53.968× next qualified compact candidate.|
|foreground-3|Strong HST diffraction-spike source and one qualified compact SDSS counterpart.|PASS local relative correspondence; no second qualified compact candidate.|
|foreground-4|Visibly stellar-like HST/SDSS point, but actual SDSS core carries processing flags.|EXCLUDED: 113 NOTCHECKED and 25 each SATUR/INTERP pixels in the 113-pixel disk.|
|foreground-5|Strong HST diffraction-spike source and dominant compact SDSS counterpart; source background structure/highlights remain uncertainty.|PASS local relative correspondence; r peak is 66.507× next qualified compact candidate.|
|foreground-6|Actual source and nominal HST ROI are very dark, with no independently qualified source; no usable compact SDSS counterpart.|EXCLUDED: all eight examined SDSS maxima fail contrast. No point filled to enlarge the hull.|

All four accepted SDSS regions contain 9,409 finite samples each. Their actual 113-pixel radius-6 core disks have zero INTERP/SATUR/NOTCHECKED/GHOST/CR flags under the declared diagnostic rejection rule. OBJECT/BRIGHTOBJECT/SUBTRACTED and other retained flags are not silently erased or equated with unavailable science. Science samples and finite geometry remain untouched when the diagnostic tie is excluded.

Independent readback of all six field weight arrays confirms that every accepted core has **only `301/3699/6/100`, with common weight 1 throughout the core**. Its per-field projected r flags equal the actual contributor union there. The actual corrected-frame, psField and fpM source hashes match the retained association. Independently opened original FITS headers all carry the matching PS_ID `2009-05-26T23:29:46 08880 camCol 6`. This local provenance check reuses the previously independently validated full-field flag projections; it does not turn source quality UNKNOWN into good or repeat the whole fpM projection oracle.

Original JPEG highlight clipping is separately retained: any-channel/all-channel-255 counts are 60/1, 12/0, 26/0, 32/1, 19/0 and 0/0 for the six raw regions. These prepared-image RGB limits are not physical HST saturation flags, calibrated measurement validity or exposure completeness. Accepted matches remain visual foreground-like associations, **not catalogue-confirmed stellar identities**.

## Independent coordinate and fit mathematics

No author registration/centroid helper, shared sampler, PyAVM or WCS transform is called by the independent numerical oracle. It parses original AVM XML, independently forms the resized CROTA/CD matrix, applies explicit source inverse TAN with FITS one-based/bottom-left meaning, converts JPEG top-first rows, and applies explicit target forward TAN using the exact field-angle formula. Populated Spatial.Notes is preserved. Target-coordinate differences versus the author are at most **3.4174×10⁻¹⁰ pixels**; independently summed centroid differences are at most **1.5543×10⁻¹⁵ pixels**.

The independent centroid implementation recomputes the actual positive residual weights over the declared apertures and unchanged background annuli. These weights are only local diagnostic estimators; no source is clipped, sky-subtracted again or modified. A centered complex-covariance closed form independently replaces the author's uncentered design-matrix least-squares implementation. Its explicit direction is **nominal HST target points B = similarity(SDSS target points A)**. It reproduces all coefficients, point residuals, translations and leave-one-out predictions within 1×10⁻⁸ target pixels/numerical units.

| aperture variant (SDSS target/HST JPEG radius) | median HST−SDSS translation, target px | translation RMS | similarity scale | rotation | similarity RMS |
|---|---|---|---|---|---|
|small (4/4)|[+0.2423, −0.7856]|0.5795|1.0012188|−0.079343°|0.3774|
|central (6/8)|[+0.2851, −0.7583]|0.4888|1.0010715|−0.063445°|0.3180|
|large (8/12)|[+0.2956, −0.7853]|0.4658|1.0009807|−0.056528°|0.3186|

Central leave-one-out residual norms independently reproduce **0.6865, 0.0791, 0.8746, 0.9568 target pixels**. Small and large leave-one-out results also match. Known scale1.003/rotation+0.12°/translation[+0.8,−1.2] and zero-transform controls recover their analytic coefficients to numerical tolerance. Controls prove the estimator direction and numerical path, not physical source truth.

Independent polar-order convexity and shoelace area give **96,518.8214 target pixels² / 1,425,463 nominal geometric pixels = 0.0677105063** for the central hull. Full geometric support is independently counted from the unchanged nominal mother alpha. This is an area/coverage diagnostic, not an angular error, probabilistic confidence region or validation of the remaining field. All four ties remain in one SDSS field.

Maximum pairwise centroid changes across the three tested apertures are 0.0434/0.0559/0.0936/0.0499 target pixels for SDSS points 1/2/3/5, and 0.0757/0.1124/0.2753/0.3154 target pixels for their nominal HST points. Their HST−SDSS changes are 0.0472/0.1431/0.1909/0.3056 pixels. These observations expose sensitivity to aperture, diffraction/spatial PSF, prepared highlight/colour, background and possible epoch motion. Aperture sizes are in different native samplings and do not define equal angular supports. They are not statistical or absolute systematic-error bounds; no whole-field similarity is justified solely because local RMS falls.

## Preserved wrong-neighbour failure and selector limitation

The first generation remains byte exact. Independently recomputed centroids from its real SDSS and unchanged nominal HST pixels reproduce its three original provisional coordinates. The first two proposed HST positions lie **17.619 and 19.367 target pixels** from the actual bright foreground centroids. Their actual wrong HST−SDSS offsets remain [+14.2936,−12.2793] and [+5.4044,−19.3345]. Original contact inspection supports rejecting these as weak-neighbour assignments. The third proposal remains excluded because its companion dust-field location lacks adequate reliable foreground identity.

An independent closed-form fit of these original three wrong/unqualified pairs reproduces **−0.751881° rotation and 5.525817-pixel RMS**. Replacing two accepted HST points with those exact preserved wrong-neighbour coordinates raises the four-point independent RMS from 0.3180 to **8.0099 pixels** and changes rotation to −1.3373°. This uses actual escaped-defect coordinates; no original pixels or record is mutated. It demonstrates why provisional matching must not silently become an adopted correction.

One important selector limitation remains: the compact rule's contrast is the **maximum over the full 33×33 patch**, which can be raised by a nearby brighter point rather than the centered candidate. Actual weak neighbours can therefore receive a misleading high nominal contrast even though their aperture weights/peak are small. This does not alter the four accepted dominant bright peaks or the reported local fit; they were independently seen and chosen as the strongest matching sources. It does prevent treating this bounded exploratory selector as a validated general automatic image-registration pipeline. Future automatic selection needs its own correctly centered source evidence/qualification rule, before any reusable registration policy is adopted.

## Immutable evidence binding

- Original automatic result SHA `9a4d6d2aef39b29fd5886b2cf4833ce0d517bedb081385f3219d182c28836348`; binding `9e1b4921034245c11ba0196518a1934183a8a22eaeee1eaee468c84fd0cf9ce8`.
- Original curated result SHA `fdbd364dd867f9df92986ac5af59010cca339b15c45d4d0e20ccdf4bae5445cc`; binding `b3f4c20023ec1fe1963d66e85dba924a6e7185401b10cdb95fa826a6c2eaf5a0`.
- Original author fit result SHA `376420444bd4608f00830a34bf0bb5a316e1364c46d889336b2fd0c9d0a91902`; binding `d045d67de6d3bd05152b753b36650e4a2ecc504db2c49967a2b11cebcb80877a`.
- Independent numerical/ROI review: `output/hubble-m51-registration-independent-1002-r1/review.json`, SHA `361297590d5faff226398609e529d98270d05491895c5e490567e974d1228717`; binding `e2257d599ecb05e74f843d897cb7b96f72c0276240b1e77de250e808498c7f25`. Executed script SHA `9da5751d062ad12aaaaf2cd48358ff242b63ecc667aef750afb6ecb820192497`.
- Actual-view closure plus original failed-fit readback: `output/hubble-m51-registration-independent-visual-1002-r1/review.json`, SHA `9df06d9d18c50a207e70b255ba2a18b61afd818fe96d245ad65574f7bdfd9f2e`; binding `4776b39bde03768bf4bc5a79e339051220167a7843838bd3df8f5b2e4036f46a`. Executed script SHA `5a225fff4cd8bfdddcd3168ba1037a025d22ee768267baf10f6e0683bffbd0a0`.

The first independent numerical report accurately states that its new contact still awaited visual inspection when generated. It is not edited afterward: the second immutable closure records the subsequent actual tool view and its qualifications. Both independent bindings check the complete original author binding inputs/outputs and their exact live hashes. The final closure binds 407 unique protected files. Candidate science/finite/weights, quality arrays, JPEG/XML, nominal PNGs, all failed outputs, 201 existing published deep-sky assets and the six unrelated settings/outbox edits remain unchanged. No PLAN/Context or production owner was edited by this independent reviewer.

The next owner decision must retain the local coverage limit and selector caveat. Reliable extra cached northern/companion correspondence would need actual clean supported pixels and independent identification; absent/flagged/ambiguous sources remain absent/flagged/ambiguous. A policy may retain nominal placement with explicit precision limits, but this review does not authorize a full-field correction, source adoption, colour treatment, rendered composition or target acceptance.
