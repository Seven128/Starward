# Shared SDSS quality inputs in the real M51 core / DETAIL path

The shared offline source-quality owner and its real consumer now run on the
four previously acquired core-field files. Author checks, actual readback and independent full-array/kernel review
have passed within this single-field scope. This closes neither the six-field
mosaic's quality nor M51's colour, apparent softness, background/edge and
publication obligations. No source pixels, coadd weights, RGB, asset or runtime
publication changed.

## Owner and shared geometry

`data-pipelines/deep-sky/sdss_frame_quality.py` owns canonical cached psField/fpM
byte admission, bounded complete gzip/FITS/heap readback, the actual typed mask
planes and signed spatial PSF basis combination. It reuses the corrected-frame
identity owner. Its receipt distinguishes actual header identity from canonical
request provenance; missing header rerun/band stays unknown. Actual five-band
PSF status64 is retained, including the SPARSE qualification from the
[input readback](experience-sdss-core-quality-inputs-2026-10-02.md).

The interface reads all dynamic basis rows and each row's declared polynomial
orders. Active coefficients must be finite; inactive padding remains preserved,
including the actual r/z padding NaNs. Native zero-index column/row is converted
to PHOTO pixel-centre coordinates with +0.5, scaled by .001. Coefficient axes
follow the official entrypoint and actual wire order, rather than the different
PyDL transposition. Relative kernels preserve signed values and have no
normalization, subpixel shift, flux calibration or quality acceptance. The
[independent format research](experience-sdss-mask-psf-capability-independent-2026-10-02.md)
records the exact reference distinction and unknown archive code license; no
external reader code or dependency was adopted.

fpM's big-endian signed16 row/left/right SPANs use inclusive endpoints. The
reader validates actual enum, complete heap lengths, canonical ordered disjoint
spans, bbox and npix before OR-ing objects. Empty planes are supported; current
admitted object offsets are zero. Nonzero offsets and serialized empty objects
fail explicitly as unsupported, rather than being guessed or reported as bad
science. The format note's corrected actual read_mask call chain owns future
offset work. A cumulative variable-payload cap also prevents individually
in-bounds alias descriptors from causing unbounded expansion.

`sdss_source_stencil.py` owns complete four-neighbour source geometry for both
flux and flags. `sdss_gri_tan.bilinear_samples` retains its finite-neighbour and
float32 measurement rule; `PixelFlags.stencil` independently ORs those four
flags. Geometry, finite sample availability and quality flags have separate
meanings. `check_frame_quality` correlates field/band/shape, raw source hashes
and actual PS_ID; mismatches fail, missing processing facts remain unknown.
It does not inspect, edit or certify scientific values.

Author-frozen quality owner SHA256 is
`0e450d57d13baa31d1029a6e66435d2dcdd420e866ffe1633b8c3f1ecb02bbeb`;
its test file SHA256 is
`ae391d26dbfe464232f02b1dd0ea048574920e6c19e9c7ba93266871d99ed346`.
The consumer binding records the actual other owners, including the extracted
stencil, rather than relabelling the old e319… candidate producer.

## Actual consumer and complete readback

The [executed diagnosis](../scripts/experience-sdss-core-quality-diagnosis-2026-10-02.py)
uses the frozen six-field candidate's real M51 ICRS centre and DETAIL TAN WCS:
512×512, north-up/east-left, CRPIX256.5, pixel scale
0.00011111125716279 degrees. Only field3699/rerun301/camcol6/100 is qualified
here; the other five fields have no quality input supplied by this run.

Actual generation:

- `output/sdss-m51-core-quality-diagnosis-1002-r1/result.json`, 391239 bytes,
  SHA256 `1b1fc575f4e5ca50aac77b74a2290501270bb71baf2b6093891f8d66dd435866`.
- `binding.json`, SHA256
  `d014e5dd76cf77dc258a21e6de7944558554f04ac620f0f79881addc5d1ebab4`.

All three real corrected frames, psField and respective fpM share the actual
PS_ID `2009-05-26T23:29:46 08880 camCol 6`. Each complete DETAIL array has
262144 in-frame finite four-neighbour samples. Quality reading leaves the
source arrays unchanged. Full sampled science bytes, geometry and finite
availability equal the actual reproject consumer and the task-only previous
e319… bilinear formula. This is extraction compatibility, not independent
scientific truth. Every saved flag, availability and relative-kernel NPY was
decoded and byte compared. All sources, old candidate, 201 published files and
six preserved settings/outbox files remain unchanged. This generation made
zero requests and changed no images or deployment.

Actual flagged target pixels, using the OR of all four native neighbours:

| Plane | g | r | i |
| --- | ---: | ---: | ---: |
| INTERP | 405 | 191 | 3342 |
| SATUR | 57 | 25 | 58 |
| NOTCHECKED | 0 | 60291 | 0 |
| OBJECT | 225698 | 180707 | 201335 |
| BRIGHTOBJECT | 262144 | 262144 | 262144 |
| SUBTRACTED | 0 | 129588 | 0 |
| CR | 383 | 166 | 164 |

BINOBJECT/CATOBJECT/GHOST have zero flagged pixels in this DETAIL. Zero is an
actual result for this field/region, not a certificate about the whole mosaic.

The catalog-centre native four-neighbour flags are24 for g/i
(OBJECT+BRIGHTOBJECT),152 for r (also SUBTRACTED). Neither SATUR nor INTERP
occurs in those twelve native centre samples; each is finite positive. This
does not establish the cause of the colour or prove a saturation-free galaxy.
Rejecting any flagged sample would reject this entire DETAIL because all
samples have BRIGHTOBJECT. The flags therefore cannot be a blanket scientific
absence or transparency rule.

Each centre kernel contains all four signed bases and is51×51 float64:

| Band | Native zero-index x,y | Signed relative sum | Negative kernel samples | NEA in source pixels |
| --- | --- | ---: | ---: | ---: |
| g | 1710.2804656,783.2630620 | 0.962610888 | 355 | 42.2086391 |
| r | 1708.8089905,771.0226051 | 1.017426061 | 339 | 39.1242143 |
| i | 1710.6463492,773.4710734 | 0.995593223 | 337 | 37.5439070 |

Four actual DETAIL-corner positions per band also produce finite signed
kernels, with spatially varying statistics recorded in the result. NEA is
`sum(kernel)^2/sum(kernel^2)`, not FWHM, calibrated photometry, a measured-star
resolution test, a mosaic PSF, or permission to sharpen/match/weight the data.
Primary TAN remains the retained astrometric approximation; full asTrans and
absolute registration are not applied or certified.

## Flag interpretation and next dependency

The actual r-band processing flags deserve review without a guessed pixel
correction. [DR17 sky processing](https://www.sdss4.org/dr17/algorithms/sky/)
distinguishes catalogue PHOTO sky from the postprocessing global sky used in
corrected frames; bright galaxy models used during sky estimation are restored
before subsequent detection. This supports the inference that a processing
label alone cannot establish absent galaxy flux, and does not identify the
exact origin of this region's SUBTRACTED bits. No second background subtraction
or restoration is inferred here.

[DR17 catalogue flag guidance](https://www.sdss4.org/dr17/algorithms/flags_detail/)
also separates detection/deblending and interpolated-data warnings from
astronomical absence. That page describes object-catalogue flags: its bit
numbers and specific object classification are **not** a replacement for the
actual fpM enum or this pixel mask. In particular, no current mask plane is
automatically turned into missing science or zero opacity.

[Independent full-source/full-DETAIL and kernel review](experience-sdss-core-quality-independent-review-2026-10-02.md)
is now closed: three full native flag arrays and three DETAIL science/flag/availability
arrays match independent calculations; all signed kernels and processing associations
agree, with new-hash batch/field/band and numerical counterexamples retained. The
scientific/whole-mosaic quality is still unknown. Main review SHA256 is
`00a66c14f8dd5322407756c36b32f7825aa46e413045eabe5089f1e69239ee81`;
the separate new-hash band control is
`893ecdf6bc9dee9840dbf6b7fe2e01b283345ff0864d87805abdf515260e79bb`.

The current dependency is extending this same data-driven reader to the remaining contributing
fields with bounded, genuinely missing quality inputs and assess actual
registration, source processing and PSF differences before prescribing colour,
background, matching or mosaic qualification. Keep old publication offers,
the optical provenance migration and normal coarse/fine consumer integration
as separate obligations. M51/M82 quality, six-field spatial accuracy, runtime,
phones, cache/resource/200DAU capacity and final acceptance remain open.
