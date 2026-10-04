# Independent review: contributing quality inputs and actual full-mosaic diagnostics

No production discrepancy requiring repair was found in this bounded review. All 20 newly acquired quality inputs satisfy the currently supported format and actual processing association rules. The repaired six-field diagnostic consumer correctly reproduces scientific samples/availability and projects/combines processing flags over the complete 2048×2048 target. These results establish usable **diagnostic inputs and behavior**, not scientific/image quality acceptance, correction, new weights, sharpness or publication adoption.

This review used cached bytes only: zero HTTP requests, dependency installs, native/phone/service operations, production/PLAN/Context edits, source corrections, reweighting, display changes or publication. The published201 files, six preserved settings/outbox files, frozen source frames, prior outputs and owners retain their exact identities. The independently reviewed core100 format/owner controls are referenced rather than repeated as a new core review; core100 is necessarily included in the actual whole-target projection.

## Newly acquired actual inputs

Controlling acquisition is `output/sdss-contributing-quality-inputs-1002-r1/acquisition.json`, SHA `901b671c84da7799c85f092c3a15652fc1e7eb37e508e56863a2d961d463ff31`; its binding SHA is `909b985bfe897f75c0282c5c2df8d3c166c71b6711f0e32b6a065334518204ed`. Stockr2 `input-manifest.json` SHA is `64db3bc0301f977549b2d6b67c8589cbb534c2911680e5c34cc43d90e6e8b0d2`.

Each of five actual fields supplies one psField plus g/r/i fpM: 20 files, 3,644,048 raw bytes and 6,546,240 decoded FITS bytes. The acquisition reports separate canonical verified-TLS HTTP200 transfers, no redirect or retry. This independent readback verifies its exact local raw/decoded files and identities; it does **not** independently replay HTTP or turn a canonical filename/reference URL into source provenance.

| Actual field (rerun301/camcol6) | Coherent positive-weight master pixels | Actual matching frame/psField/fpM PS_ID batch | Format/association |
| --- | ---: | --- | --- |
| 3699/99 | 464512 | 2009-05-26T23:29:46 08880 camCol6 | Supported / all g,r,i match |
| 3699/101 | 616585 | 2009-05-26T23:29:46 08880 camCol6 | Supported / all g,r,i match |
| 3716/116 | 164849 | 2009-05-27T08:22:49 04865 camCol6 | Supported / all g,r,i match |
| 3716/117 | 1121555 | 2009-05-27T08:22:49 04865 camCol6 | Supported / all g,r,i match |
| 3716/118 | 520970 | 2009-05-27T08:22:49 04865 camCol6 | Supported / all g,r,i match |

The exact PS_ID strings including their original spaces are in the actual JSON. They agree within each three-input association, not necessarily between different runs.

The independent script reads complete FITS payloads and all table columns. Every variable descriptor has its actual count/heap byte bounds checked before payload comparison. All five psField files have five band tables with four actual51×51 signed eigenimages each. Actual BEfloat coefficient wire bytes equal Astropy's matrix representation; each basis's active row/column orders and finite active coefficients are checked, while inactive nonfinite padding remains a recorded fact. All actual kernel origins are zero and active orders are supported. Signed basis values are retained, not clipped. Current support does not imply measured spatial-model accuracy or require adopting its coefficients for image correction.

All 15 fpM files have complete12-HDU structures, exact ten-plane enum plus non-painted sentinel, native shape1489×2048 and actual inclusive BEint16 SPAN triples. Every object's nspan/heap length, bounded coordinates, canonical sorted/disjoint/non-touching spans, inclusive bbox and sum-npix is checked. Every actual object has zero row0/col0; empty planes are valid. The tested current layout supports those inputs. Nonzero-offset or empty-object variants remain explicitly unsupported/unknown rather than silently becoming zero flags or good pixels. Cross-object overlap is legitimate and is later ORed, not summed into flag values.

All 15 cached frame associations are independently checked from real header/asTrans values and primary PS_ID. Corrected-frame primary `FRAME` is **not FIELD**: e.g.3699/99 g has FRAME107 but the actual asTrans FIELD99. The one asTrans row's RUN/RERUN/CAMCOL/FILTER/FIELD and NAXIS match the expected actual source. Optional primary FIELD remains checked when present; shape and band also match fpM and the current batch. The PS_ID association is a processing identity fact with quality unknown and availability not assessed.

The previously generated synthetic `.../core-quality-independent-1002-r1/fixtures/different-field/psField-003699-6-0101.fit`, SHA `2f59c889f66d26c4c39b73ca71ab6a8b5602340676bb0f251d1e52e2db936575`, remains an unchanged **wrong-field test fixture**. The genuine acquired3699/101 psField is a distinct path and SHA `8c33bb742ed47b225990f01b713bb202de0ebb08842cbb6fa1e4063726fca939`; their actual g basis data differ. The new stockr2 excludes the exact fixture hash with its prior review binding. Same filename, same size or self-consistent header alone would not establish provenance. The genuine file's separate acquisition receipt and binding are necessary.

Input-review script: `scripts/experience-sdss-contributing-quality-independent-2026-10-02.py`; final exclusive result `output/sdss-contributing-quality-independent-1002-r4/review.json` is191014B, SHA `31aa21cdf1384a06d5d4c1172fd8973957159e6649dd8fba45c957d53622f3b1`; binding84679B, SHA `f84c298e3bfa3e58361983c2e7f99433ab6c2902fc68ed99e12acd8c9bc6f891`.

Its earlier r1/r2/r3 generations remain immutable saved script/failed-JSON history, not passes. R1 compared native-endian variable eigenimage bytes with BE wire bytes; normalized BE bits and values agree. R2 assumed primary FIELD existed. R3 also exposed a task helper's keyword lookup error and incorrect use of primary FRAME as FIELD. Final r4 uses independently read asTrans identity, retains primary FRAME as metadata and closes the real association. No production repair or source change was involved.

## Actual complete mosaic consumer

Reviewed production owners remain `sdss_frame_quality.py` SHA `0e450d57d13baa31d1029a6e66435d2dcdd420e866ffe1633b8c3f1ecb02bbeb`, shared geometry `sdss_source_stencil.py` SHA `b2c244872f291f52a4ca3817d46d2b799bf8aa1e0c3b1bfaa8c9fab1529fecab`, scientific consumer `sdss_gri_tan.py` SHA `2f1fed34ca2f49913003b23a886677d197b1ab39fadb88ebfde74d5133dac58d`, and corrected reader SHA `66eed21091c6d4c80d35c79d8bbb28467ba65ef90740342c727c13bbd812d17e`. Frozen candidate r2 JSON remains SHA `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`.

Actual producer is `output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json`, SHA `9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0`, binding SHA `926850edbe64bd1fd6492e96accdc637480d1cffc3da2b18aa84b1e34e79099e`. All its exact outputs/inputs and source hashes were checked before and after the audit. Parent r1 failed due to rounded serialized FITS CDELT changing replay samples; r2 failed because a task adapter expected a later per-file identity in the old core acquisition. These failed generations stay historical. This review applies to repaired r3 and its exact construction parameters.

The independent whole-target script reuses the previous independent **interval-event cumulative SPAN union**, not the production row-slice rasterizer. It independently reconstructs every native flag array, actual source WCS coordinates and four-neighbor science/flag sample. It does not call the production quality reader, stencil, bilinear sampler or reconstruction method as an oracle. Exact target construction uses the frozen center2048/field angle rather than rounded summary FITS cards, preserving the real north-up/east-left pixel grid.

Every one of18 full2048² field scientific float32 arrays is C-order byte equal to frozen r2, and each full footprint/finite-neighbor mask is equal. Complete native flag identities/counts and all18 full projected uint16 flag arrays agree. Scientific negative/zero values remain measurements, finite qualifications come from scientific neighbors, and geometry flags remain independent of scientific absence or brightness. All six per-field coherent g/r/i masks equal the actual positive-weight contributor masks; the six frozen weights and contributor count array are unchanged.

All actual field/band active flag counts and weighted flag contributions agree for every exact native-master crop. Final union arrays are independently ORed using **only actual positive-weight coherent contributors**, and all three full union arrays equal saved producer arrays. The complete target remains scientifically available; flags do not change this fact or determine display alpha.

| Exact native-master crop | Available pixels | Single contributor | Overlap | g/r/i INTERP | g/r/i NOTCHECKED | r SUBTRACTED |
| --- | ---: | ---: | ---: | --- | --- | ---: |
| OVERVIEW | 4194304 | 3519537 | 674767 | 25388 /25422 /21349 | 35493 /114600 /17847 | 250856 |
| MEDIUM | 1048576 | 909016 | 139560 | 8736 /6097 /10137 | 9287 /90625 /6161 | 250856 |
| DETAIL | 262144 | 245180 | 16964 | 703 /668 /3343 | 1424 /62194 /0 | 129588 |

These are source-master crop counts, **not downsampled512 output-image pixel counts**. All DETAIL BRIGHTOBJECT counts are262144; that is a processing label, not whole-crop missing flux. The larger full-field/overlap inputs explain why aggregate flag counts are no longer just the old one-field DETAIL counts, without adopting a causal image-quality interpretation.

A bounded diagnostic-policy counterfactual retains only the highest-weight field's flags, rather than ORing all positive contributors. It loses actual flag information in130154 g pixels,110877 r pixels and120278 i pixels. The independent full-union comparison detects this mechanism; no science/weights or production policy were changed for this test.

All1011 actual positive-weight17×17 spatial PSF sample locations were independently checked against source WCS coordinates, support and raw coefficient-wire mathematics. Every signed kernel's full byte hash and signed metrics agree. All actual center support/flag/relative-PSF statements also agree. Only3699/100 contains the M51 center's complete source stencil; sharper3716 center coordinates are outside the actual frame (x about−220 to−223). This forbids treating a neighboring sharper field's PSF as available at the core. Kernels retain negative lobes, per-basis active orders, four bases, official row-power/column-power axes and PHOTO+.5 convention. Sparse source-relative NEA is neither FWHM nor target-resolution/PSF matching or measured-star validation.

Whole-review script: `scripts/experience-sdss-mosaic-quality-independent-2026-10-02.py`; exclusive final `output/sdss-m51-mosaic-quality-independent-1002-r2/review.json`1362204B, SHA `c4fb08f54a4e83dcd6045201d126c90be320f08a954ae57adbf6d85c983ac0e5`; binding83293B, SHA `64364f8df5cda531d88ab91cd6afd8d953bdd75bc243c29e5243841d469ff802`. Independent full union arrays and per-field actual review results are saved. Its r1 stopped at the first field because the task assertion omitted enum sentinel metadata; failed JSON/script is preserved. The sentinel is present in metadata and correctly never painted; r2 explicitly verifies both facts.

## Scope and next usable responsibility

The six actual fields now supply structurally supported, batch-associated quality metadata and a independently checked full target diagnostic consumer. That closes the prior absence of five contributing fields' actual masks/PSF models; it does not close source quality, accurate spatial/absolute astrometry, measured PSF/model accuracy, color/background fidelity or image-quality adoption.

Processing labels require their existing official source semantics before a policy is chosen. NOTCHECKED/SUBTRACTED/BRIGHTOBJECT must not be guessed into science absence, alpha, reweighting, or causes of brown color. Primary TAN remains the declared approximation; full asTrans/absolute correspondence and any spatial/noise/background or PSF matching remain unvalidated. No GPL/unknown-license archive implementation was installed, compiled, copied or used as production code. Standard-format facts and independently implemented mathematics support this diagnostic path.

The next owner can use these actual arrays and contributions to assess a specific, evidence-backed shared quality policy or visual comparison. No per-object patch, guessed black-mask, generated astronomical detail, blanket source rejection, deconvolution, new source selection or default display change follows from this PASS. Native/runtime composition and final product acceptance remain separate dependencies.
