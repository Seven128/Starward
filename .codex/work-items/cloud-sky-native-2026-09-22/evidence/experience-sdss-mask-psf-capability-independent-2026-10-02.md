# SDSS core field mask / spatial PSF capability: independent bounded facts

This is task-local read-only research and complete cached-file format checking, not a production quality reader, source adoption or image-quality acceptance. No production, PLAN, Context, published asset or retained settings/outbox file was edited. This review did not fetch any astronomical source again.

## Inputs and reproducible artifacts

The four actual input files are only rerun 301 / run 3699 / camcol 6 / field 100, not a complete quality set for the six-field mosaic:

| Raw file | Bytes | SHA-256 |
| --- | ---: | --- |
| psField-003699-6-0100.fit | 423360 | a9a238ecfd14edcb7b099be7fcb2e05b52ed52c80a8f597548e60e3fc314739b |
| fpM-003699-g6-0100.fit.gz | 113613 | de27f43803c187f70021be90754654bf6f39ba9a5291a5242032727dd3e47952 |
| fpM-003699-r6-0100.fit.gz | 117357 | 9e16a6ba356bee8d196918344cfac0cd09337a1a761ea3db49e871fa3488e184 |
| fpM-003699-i6-0100.fit.gz | 111920 | d7474a0642a473a0f5a91f1e7ecdb6a6f512de292821d42ba7bd85d15b195850 |

The total raw/compressed input is 766250 bytes. These match the original HTTP receipts and saved bytes; this audit adds no transfer-origin or scientific-entitlement claim. Gzip streams were independently fully decompressed with CRC/length checking, byte compared with the existing decoded files and verified as complete FITS. All table columns and variable arrays were forced, and every raw P-descriptor/heap payload was checked against bounds and Astropy arrays, including PSF coefficients and all SPAN triples. Primary RUN/CAMCOL/FIELD agree. RERUN and fpM FILTER are absent from those headers: rerun/band provenance remains the canonical acquired path/URL, not a fabricated embedded header value. Matching PS_ID connects these four files, but does not certify the complete scientific pipeline or all mosaic fields.

Actual format evidence is `output/sdss-mask-psf-capability-independent-1002-r1/result.json` (752567 bytes, SHA `90365008513553e40eacbc52fe4e4c7ffef481d7bb895087327648a8242aec7e`), bound by `binding.json` (SHA `3af1252c3a54b03d373bef6910c0cae2efbc9772284aa95dcfb942b321488ceb`). The offline script is `scripts/experience-sdss-mask-psf-capability-independent-2026-10-02.py` under this work item.

The r1 result's reference to `phRegionSetValFromObjmask` was an incomplete API trace and must **not** establish the actual `read_mask` object-offset rule. Historical r1 is retained. The controlling correction is the exclusive new generation `output/sdss-mask-psf-capability-independent-1002-r2/coordinate-addendum.json` (15569 bytes, SHA `ae085c44756ac1b7d88615f66ab0dde94bcc056020af47216565c2e2ab1ce232`), binding SHA `14a0cb6f4067e48407137add9053dffeeb9424771a62b252debf7af60691957d`. Its script is `scripts/experience-sdss-mask-psf-coordinate-addendum-v2-2026-10-02.py`; the intermediate r1 supplement and its script remain frozen. The r2 points to them and supersedes the incomplete offset implication without upgrading old evidence.

## Existing and mature capabilities

The project has no existing fpM SPAN or spatial KL PSF reader. Local Astropy 8.0.1 already supports FITS binary tables and variable heaps; the missing responsibilities are the file-format semantics and diagnostics. `pydl`, `fitsio`, `sdss` and `scipy` are not installed. No dependency was installed.

The [official SDSS imaging guide](https://www.sdss4.org/dr17/imaging/images/) documents `read_mask` / `read_PSF`, spatial PSF reconstruction and native approximately 0.396 arcsec pixels. The standalone PSF's default integer output has artificial soft bias, so it is not a default signed scientific-array consumer. Catalog `psfWidth` describes a noise-effective double-Gaussian summary; it cannot replace the location-dependent kernel.

[pydl's existing PSF API and source](https://pydl.readthedocs.io/en/latest/_modules/pydl/photoop/image.html) is a mature reference with [BSD-3 obligations](https://pydl.readthedocs.io/en/latest/licenses.html). It offers a centered kernel, normalization and trimming. Its source applies +0.5 to zero-indexed x/y, but its matrix transposition differs from the actual official wire/call chain below, and its coefficient slices use the first basis's orders despite documentation allowing per-basis variation. It should not be used blindly as an exact orientation oracle for this file. No pydl code was copied or installed.

The SDSSIDL repository has a GPL file. That does not prove that the separate atlas archive has a complete permissive grant. The exact official package was acquired **once**, specifically authorized by root: `https://www.sdss4.org/wp-content/uploads/2014/10/readAtlasImages-v5_4_11.tar.gz`, 77730 bytes, SHA `b914c8b53977995d3ab06bfb786dd6e0e1c337d5a2eb6babaf43e0e828f2b943`, HTTP 200 with verified TLS, no redirects/retries, 128 KiB response bound and 30-second bound. Its receipt and tar directory are in r1 `reference/`. All 34 members were inspected in memory; no extraction, installation, compilation or source adoption occurred. No LICENSE/COPYING was present. `geometry.c` contains an AT&T component-specific permission notice; that is not a grant for the whole bundle. Whole-bundle code license remains **unknown**, and unknown/GPL source must not be copied into the product. Standard format facts and mathematical expressions can guide an independently written parser without adopting this code.

## Confirmed fpM format and coordinates

The [fpM data model](https://data.sdss.org/datamodel/files/PHOTO_REDUX/RERUN/RUN/objcs/CAMCOL/fpM.html), actual enum and official archive together establish:

- Each mask table row's `s` is a variable byte payload of exactly `6*nspan`, containing **big-endian signed int16** triples `(y,x1,x2)`. It is not an entire serialized object record. Table row0/col0, bbox, npix and reference counter remain separate fields.
- Endpoints are inclusive. Local bbox is the SPAN extrema and `npix` is the sum of inclusive widths for that object. Counts summed across objects are not a union or scientific confidence.
- The actual standalone entrypoint `main_mask.c:125` calls `phMaskSetFromObjmask` (`phSpanUtil.c:2854–2898`): effective row is `span.y + object.row0 - targetMask.row0`; columns follow the same rule. Apply object offset once, subtract target origin once, clip to the target, and OR contributions. The unrelated REGION API cannot be substituted as this proof.
- HDU1 is enum0 INTERP, through HDU10 enum9 CR. HDU11 contains the enum; value10 S_NMASK_TYPES is a sentinel, not an eleventh plane. OBJECT/BRIGHTOBJECT/other labels are not automatically bad or missing science.
- `refcntr` is memory reference bookkeeping, not source identity, quality, exposure weight or multiplicity.

All actual g/r/i rows had offset `(0,0)`, reference count1 and nonempty spans; object counts are 1075/885/883. All within-object spans are lexically ordered, have no adjacent overlap/touch, match bbox/npix, and fit 1489×2048. Empty planes are real zero-row tables. Nonzero-offset and empty-object support cannot be accepted from these all-zero inputs alone. For empty objects, the official constructor initializes bbox0/npix−1, while the bbox updater sets npix0 but leaves bbox untouched when nspan0; no unique meaningful serialized empty bbox was established here.

The r2 has five explicit synthetic format examples covering positive/negative offsets, row exclusion, column clipping, nonzero target origin, inclusive endpoints and object union. Each matches a hand-declared pixel set and detects a no-offset counterexample. These are format arithmetic checks, not acceptance of a future production reader. The r1 actual wrong-endian counterexample yields out-of-frame spans rather than silently treating native-order bytes as valid.

## Confirmed PSF wire/mathematics; bounded approximation

The [psField model](https://data.sdss.org/datamodel/files/PHOTO_REDUX/RERUN/RUN/objcs/CAMCOL/psField.html) and this actual file have ten HDUs, five band eigen tables, **four** bases per band, 51×51 samples per basis and declared 3×3 polynomial terms per basis. All basis samples and all active coefficients are finite; signed values must survive. Real r basis1 and z basis1 have a NaN in inactive 5×5 padding. The initial audit's whole-matrix equality/finiteness assumption failed on that fact; byte equality and declared-term finiteness close the correct boundary. Rejecting all padding NaNs would wrongly reject the actual r input. The original acquisition's mixed-case-column false rejection remains historical, rather than rewriting its receipt as a successful model inspection.

The axes are closed by **wire plus the actual entrypoint**, not a guessed matrix name:

1. Raw BE25float at row offset8, reshaped in C order5×5, equals Astropy `c` **bitwise**, including padding NaN. Astropy did not transpose it.
2. Official `main_PSF.c:61` takes rowc from argument3 and colc from argument4; line104 forwards in that order.
3. `read.c:430` copies wire coefficients directly into the C matrix; `variablePsf.c:1084–1093` evaluates `C[rowPower,columnPower]` with scaled row and column respectively.

Thus the documented official wire expression is a per-basis sum of `C[r,c] * (row*.001)^r * (col*.001)^c`, followed by the signed linear combination of **all actual bases**. Read each row's declared orders; do not hardcode three bases or first-row orders. In contrast, the inspected pydl expression transposes its row/column power matrix. At the actual M51 center, the two independently evaluated expressions differ: maximum unit-integral kernel difference g0.0120672, r0.0100300, i0.00911033. This only proves a consequential distinction; neither synthetic arithmetic nor a kernel sum is a measured-star absolute PSF validation. No external reader was executed.

The intended interface should explicitly convert zero-based source-array `(x,y)` to declared PHOTO `(col,row)` with +0.5, keeping the original point and convention in its report. `RROW0/RCOL0` describe the eigenimage region, not the full-frame sky position; all actual values are0. The 51×51 kernel is centered at array `(25,25)` without a subpixel shift. Non-square kernels, other region origins and full astrometric precision are not established by this square input.

Using only the frozen candidate's primary TAN metadata, the M51 core lies in field3699/6/100 at g `(1710.2804656,783.2630620)`, r `(1708.8089905,771.0226051)`, i `(1710.6463492,773.4710734)` zero-indexed. Four-neighbor and centered51-pixel support are inside. The supposedly sharper3716/6/117 places that point at x≈−221 to−223, outside its frame; direct core replacement by that run cannot close the missing contribution. This is the existing TAN approximation, not full asTrans or absolute registration evidence.

## Minimum next shared responsibility and remaining claims

Reuse local Astropy and the existing verified cached-input boundary. A small shared owner can admit psField/fpM with bounded raw/gzip/table/heap/identity checks, preserve typed flags and signed basis arrays, implement the documented per-row formula, and expose diagnostics through the same source-pixel stencil used by scientific sampling. Mask flags, scientific finite/footprint availability and display alpha need distinct meanings. Missing quality inputs must remain unknown; they cannot become a zero-bit good certificate. No extra library or speculative framework is required for this bounded path.

First close the real field100 DETAIL mask consumer and spatial kernel at its actual native source position with independent review and meaningful nonzero-offset/order/axis controls. Kernel NEA is a diagnostic in source pixels, not an FWHM or proof of improved image sharpness. No clipping, interpolation, deconvolution, PSF matching, coadd weight change, brightness-derived mask or removal of finite zero/negative science is authorized by these facts.

Whole six-field mosaic quality, contributing interpolation/CR/saturation treatment, actual spatial PSF accuracy, full asTrans, measured-star correspondence, natural color, source PSF improvement, native runtime and final quality remain unverified. Source input rights remain with the existing source owner; this note does not make new legal conclusions about code adoption.

The 201 published files and six unrelated preserved files stayed hash-identical. The parent-authorized shared-stencil change had already moved `sdss_gri_tan.py` from historical e319… to2f1fed… when this audit began; this is explicitly recorded, not falsely reported as matching the old owner. Those current owners were unchanged during the actual offline audit. No source WCS, science array, RGB, weight or asset was changed by this task.
