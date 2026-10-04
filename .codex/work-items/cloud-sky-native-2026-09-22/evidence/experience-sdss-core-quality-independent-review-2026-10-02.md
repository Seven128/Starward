# Independent review: shared SDSS source stencil and core quality diagnostics

No new discrepancy requiring production repair was found in this bounded review. This is actual one-field source diagnostics and shared-owner development evidence, **not** scientific or whole-image quality acceptance. No production/PLAN/Context/asset edits, acquisition, service/native/phone work, source correction, coadd reweighting or publication occurred.

Reviewed production owners are `sdss_frame_quality.py` SHA `0e450d57d13baa31d1029a6e66435d2dcdd420e866ffe1633b8c3f1ecb02bbeb`, `sdss_source_stencil.py` SHA `b2c244872f291f52a4ca3817d46d2b799bf8aa1e0c3b1bfaa8c9fab1529fecab`, current scientific consumer `sdss_gri_tan.py` SHA `2f1fed34ca2f49913003b23a886677d197b1ab39fadb88ebfde74d5133dac58d`, and unchanged corrected-frame owner `66eed21091c6d4c80d35c79d8bbb28467ba65ef90740342c727c13bbd812d17e`. Focused test source is `test_sdss_frame_quality.py` SHA `ae391d26dbfe464232f02b1dd0ea048574920e6c19e9c7ba93266871d99ed346`.

The actual producer generation is `output/sdss-m51-core-quality-diagnosis-1002-r1/result.json`, SHA `1b1fc575f4e5ca50aac77b74a2290501270bb71baf2b6093891f8d66dd435866`. Its saved script, all12 output bindings, all owner hashes, the four-input acquisition inventory, 201 published files and six preserved files were read and verified. Actual cached corrected g/r/i source bytes and headers were independently read. The format/rights facts are in the separate `experience-sdss-mask-psf-capability-independent-2026-10-02.md`, whose exclusive r2 coordinate addendum controls the corrected official entrypoint trace.

## Actual independent arrays and geometry

The independent script `scripts/experience-sdss-core-quality-independent-2026-10-02.py` uses an **interval-event cumulative union** algorithm for the raw fpM SPANs, rather than the production row-slice rasterizer. Every native g/r/i flag pixel (1489×2048 per band) matches the producer's saved C-order identity. Independent arrays are saved for readback. Plane union counts agree, and the sentinel is never painted.

Raw corrected primary arrays, actual FITS WCS and independent four-neighbor calculations then reproduce all three 512×512 DETAIL flag arrays, geometry/finite availability and scientific float32 C-order bytes. This oracle does not call the new quality owner, shared source stencil or scientific bilinear sampler to compute those expected arrays. Native pixel flags are combined across the same four source neighbors, while finite/geometry is computed independently from scientific values. All actual DETAIL samples happen to be positive and finite. Preserving valid zero/negative flux is therefore separately checked with an explicit small boundary control; introducing NaN changes finite availability without changing flag geometry or flag bits.

All source/mask/PSF actual primary PS_ID values agree, not just their filenames. The matched processing batch remains a source association fact with quality unknown and availability not assessed.

| Independent finite DETAIL flags | g | r | i |
| --- | ---: | ---: | ---: |
| INTERP | 405 | 191 | 3342 |
| SATUR | 57 | 25 | 58 |
| NOTCHECKED | 0 | 60291 | 0 |
| BRIGHTOBJECT | 262144 | 262144 | 262144 |
| SUBTRACTED | 0 | 129588 | 0 |
| CR | 383 | 166 | 164 |

These labels are diagnostics of the processing products. They were **not** converted into science absence, display alpha, sample rejection, a galaxy mask or an explanation of the brown color. They also do not establish the processing quality of the other five mosaic fields.

## Actual PSF mathematics and controls

The independent oracle directly decodes coefficient wire bytes and uses the confirmed official row-power/column-power expression, declared PHOTO +0.5 coordinates, all four bases and each row's active polynomial orders. It does not call the production reconstruction method to derive the expected kernels. Actual center51×51 signed kernels agree with g/r byte precision and maximum i error `1.3877787807814457e-17`. All four actual DETAIL corner coordinate/kernel summaries also agree. Negative kernel samples survive: g355, r339, i337.

Independent relative-kernel NEA is g `42.20863905618664`, r `39.12421425809409`, i `37.543907033511545` **source pixels**. These are neither FWHM nor a target/mosaic sharpness measurement. Full asTrans, measured-star correspondence, spatial model accuracy and PSF correction remain unverified.

An independently written new-hash asymmetric FITS fixture has different per-basis row/column orders, inactive padding NaNs, four unequal signed basis samples and explicit expected values. It verifies axes, per-row orders, retained fourth contribution and signed values without relying on that source's brightness or a pydl transpose oracle.

Four isolated task-only source mutations demonstrate consequences:

- Transposed coefficient axes produce maximum actual raw-kernel error g0.01300565/r0.00837039/i0.01008012.
- Dropping the fourth basis produces nonzero actual errors in all three bands.
- Removing PHOTO +0.5 produces actual maximum errors between approximately2.89e-6 and7.62e-6.
- Bypassing batch mismatch rejection incorrectly labels two distinct PS_ID values MATCH. The current owner rejects the newly hash-bound input instead.

New-hash standalone-admitted PSF fixtures with a different field or processing batch are rejected by the shared association owner. Removing PS_ID preserves `PARTIAL_KNOWN_MATCH_MISSING_UNKNOWN`, not MATCH or good quality. Wrong band and source shape are rejected. The exclusive additional generation `output/sdss-m51-core-quality-independent-1002-r2` closes the band case with a truly new-hash synthetic fpM whose actual FILTER, canonical task filename and expected identity agree with r but whose independently admitted frame is g; it passes standalone structure admission and is correctly rejected at association. It is expressly **not acquired r data**, despite its canonical-form reference URL. Science and original source bytes remain unchanged.

The relevant alias-budget, self-consistent duplicate/overlap, and new-hash SPAN/heap/enum checks were rerun (three focused tests, all passed). The new owner bounds aggregate variable-payload expansion before forcing arrays; per-descriptor heap legality alone would not have closed repeated alias consumption. The shared stencil's last-source-sample/+1-neighbor, nonfinite coordinate, empty-axis and quality/flux independence semantics were inspected and independently exercised. No unbounded dependency or alternate source path was added.

## Artifacts and limits

- Main independent actual review: `output/sdss-m51-core-quality-independent-1002-r1/review.json`, 20982 bytes, SHA `00a66c14f8dd5322407756c36b32f7825aa46e413045eabe5089f1e69239ee81`; binding SHA `a864cf3af9fe7f9936c0f2ddeddab13dfe30026ec66b5049dd971b3597c0534f`.
- New-hash band control: `output/sdss-m51-core-quality-independent-1002-r2/result.json`, 1696 bytes, SHA `893ecdf6bc9dee9840dbf6b7fe2e01b283345ff0864d87805abdf515260e79bb`; binding SHA `f52ab75a2edc3a6474f0ba1f7d3c6fbbcd18d59ddea3db740c417525d625e5ee`.
- Offline scripts, exact executed main snapshot, independent arrays, explicit new-hash fixtures, isolated mutants and focused-check output are retained. Prior generations are not overwritten. The readback emitted only expected deprecated RADECSYS/date-normalization warnings from the existing primary WCS; no new astrometric model was adopted.

All bound production owners, original four inputs/acquisition/producer output, original corrected source bytes, the 201 published assets and six preserved files remained unchanged. No network request was issued. Official archive/SDSSIDL code was not copied, installed, compiled or executed; no dependency was installed. Current fpM object support is deliberately offset0 and nspan>0, with other variants unsupported and empty planes supported. This review does not certify new variation support, persistent-cache integrity, server/native resource capacity, source rights, astronomical image restoration, color adoption, source-relative sharpness improvement or final WEAPP quality.
