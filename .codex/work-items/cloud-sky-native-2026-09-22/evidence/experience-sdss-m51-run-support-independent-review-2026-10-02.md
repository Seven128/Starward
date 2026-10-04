# Independent cached M51 run coverage check, 2026-10-02

The run-support report matches independent actual cached masks. Run 3716 cannot replace the complete current mosaic or its central detail with the existing selected fields alone; its scalar field PSF metadata does not supply missing pixels or establish measured spatial resolution.

Reviewed report: `output/sdss-m51-run-support-1002-r1/result.json`, SHA256 `1fae7c2a8a8aca2b1f8c553c720a8eace1f86497b839af6d7805f672dbafe8a7`. Candidate: frozen r2 `candidate.json`, SHA256 `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`.

Independent review: `output/sdss-m51-run-support-independent-1002-r1/review.json`, SHA256 `27af942db9c3627e13e70c706b4a1fb27f61fb7ef18acaedaed8e1602b9dd196`.

| Centered master crop, exclusive XY bounds | Total master pixels | Run 3699 same-field gri | Run 3716 same-field gri |
| --- | ---: | ---: | ---: |
| Overview `[0,0,2048,2048]` | 4,194,304 | 2,796,831 | 1,633,534 |
| Medium `[512,512,1536,1536]` | 1,048,576 | 874,142 | 292,498 |
| Detail `[768,768,1280,1280]` | 262,144 | 262,144 | 16,964 |

Run 3699 detail is fully supported, while both runs separately have overview and medium gaps. Their combined same-field gri union covers all 4,194,304 master pixels. These counts are source support at master resolution, not the 512×512 downsampled image count or display alpha.

The independent task script does not invoke the new run-support script or any mosaic/reader owner. It reads the prior independent real source review's g/r/i field-membership bitmaps and takes their bitwise AND, then selects the known run bit ranges and explicit center crops. Field order/identities match actual r2 receipts: rerun 301, camcol 6; 3699 fields 99/100/101 and 3716 fields 116/117/118. All three target WCS headers and 2048² shapes agree. Every saved per-field three-band footprint/finite-neighbor support matches independent membership on every pixel; prior actual r-only geometry matches the r membership on every pixel; positive normalized weights match coherent per-field support. Field counts and crop/run counts exactly match the reviewed report.

All examined input bindings and six preserved settings/outbox identities remain unchanged. No raw frame reread, WCS projection, scientific sample edit, weight/RGB processing, download, runtime invocation or source/weight adoption occurred. Scientific validity, artifact flags, full asTrans astrometry, spatial PSF and actual seeing remain unverified. A complete crop is a coverage fact, not a quality certificate; these results do not establish a better weighting or finish the detail/clarity obligation.
