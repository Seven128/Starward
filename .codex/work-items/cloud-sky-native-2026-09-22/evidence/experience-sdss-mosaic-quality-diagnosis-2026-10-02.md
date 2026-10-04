# Real six-field M51 source-quality projection

The shared reader now consumes all twenty-four acquired quality inputs for the
six contributing fields and correlates them with the existing eighteen science
frames. This task projects source processing flags and samples spatial PSFs in
the actual 2048² master. [Independent full-input/full-array review](experience-sdss-contributing-mosaic-quality-independent-review-2026-10-02.md)
has passed within this diagnostic scope.
No scientific/display correction or product adoption has occurred.

## Actual source and coordinate binding

The original four [core inputs](experience-sdss-core-quality-inputs-2026-10-02.md)
and the [twenty newly acquired inputs](experience-sdss-contributing-quality-inputs-2026-10-02.md)
use the frozen shared `sdss_frame_quality.py` owner
`0e450d57d13baa31d1029a6e66435d2dcdd420e866ffe1633b8c3f1ecb02bbeb`.
The real candidate remains
`output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json`, SHA256
`73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`.
Each field's actual psField/fpM/frame identities and known PS_ID are checked
separately; distinct processing identities between runs are not a mismatch.

The task reconstructs the target with the original `target_tan(center, 2048,
fieldDegrees)` parameters and the source's admitted primary ICRS TAN WCS. It
retains north/top-first saved rows and the shared four-neighbour stencil.
Freshly sampled science, geometry and finite-neighbour arrays match all eighteen
frozen per-field sidecars byte-for-byte. Their common positive weights and the
saved contributor counts remain unchanged. The maximum normalized-weight sum
error from one is `4.470348358154297e-08`.

For each source band, the task saves the complete projected uint16 flag array.
Only actual positive-weight coherent contributors enter the final bitwise
union. A zero flag outside source geometry is never qualified as a good source
measurement. Flags do not change finite science, weights or display alpha.
Per-level counts refer to exact 2048/1024/512 source-master crops; they are not
mask counts for downsampled 512² overview/medium PNGs.

## Actual coverage, flags and PSF

| Master crop | Available pixels | Single contributor | Multiple contributors |
| --- | ---: | ---: | ---: |
| Overview | 4194304 | 3519537 | 674767 |
| Medium | 1048576 | 909016 | 139560 |
| Detail | 262144 | 245180 | 16964 |

The complete DETAIL contributor union has these processing flags:

| Plane | g | r | i |
| --- | ---: | ---: | ---: |
| INTERP | 703 | 668 | 3343 |
| SATUR | 57 | 25 | 58 |
| NOTCHECKED | 1424 | 62194 | 0 |
| OBJECT | 228789 | 184685 | 201335 |
| BRIGHTOBJECT | 262144 | 262144 | 262144 |
| SUBTRACTED | 0 | 129588 | 0 |
| CR | 399 | 166 | 165 |

BINOBJECT, CATOBJECT and GHOST have zero actual union pixels in this DETAIL
crop. This does not make them universally absent. Compared with the earlier
core-only diagnostic, the second run adds actual processing flags in its
16964-pixel contribution; it does not supply the central galaxy position.
Blanket rejection of BRIGHTOBJECT would erase the whole detail. The catalogue
centre still uses only field3699/6/100; its four-neighbour g/i flags are24 and r
flags152, with no SATUR/INTERP at that centre. These labels do not prove missing
astronomical flux or an acceptable rejection policy.

The task reconstructs signed relative PSF kernels at actual positive-weight
locations on a17×17 target grid. Per-band sample counts by field are36/129/45
for3699 fields99/100/101 and14/75/38 for3716 fields116/117/118. All basis terms,
actual per-row polynomial orders and negative kernel samples remain present.
Across these sampled locations, the noise-equivalent areas in native source
pixels are:

| Run | g range | r range | i range |
| --- | ---: | ---: | ---: |
| 3699 | 35.710965–45.250150 | 25.433253–42.538906 | 31.302899–38.359454 |
| 3716 | 17.088742–21.232800 | 17.923064–20.659120 | 16.234599–17.638043 |

NEA is `(sum K)²/sum(K²)` for a relative signed kernel. These are sparse source
model summaries, not measured stellar FWHM, a matched/coadded target PSF,
deconvolution parameters or a new confidence weight. Actual status values are
retained independently. The larger coverage and relative-kernel data reinforce
the need to measure registration/background at real overlapping stars and
patches; they do not authorize sharpening or swapping the core to the uncovered
second run.

## Results and retained task failures

- [Executed task](../scripts/experience-sdss-mosaic-quality-diagnosis-2026-10-02.py).
- `output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json`,1242152 bytes,
  SHA256 `9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0`.
- `binding.json`,80486 bytes,
  SHA256 `926850edbe64bd1fd6492e96accdc637480d1cffc3da2b18aa84b1e34e79099e`.
- Eighteen complete per-field flags, three contributor-union flag arrays,
  per-field results and executed snapshot are byte-bound and read back.

Two task failures remain in exclusive historical generations. r1 rebuilt the
target from decimal-rounded serialized FITS cards instead of the original
double-precision construction parameters. In99/g this changed328 finite
float32 values by at most1.862645149230957e-09 nanomaggies/pixel, with unchanged
finite masks. The exact original factory control matched every science byte.
r2 assumed the later acquisition's per-file `identity` field also existed in
the original core receipt, whose task had fixed CORE identity. The adapter now
takes the actual candidate field explicitly, checks any persisted identity and
retains strict shared filename/URL/header admission. Neither failure required
a production-owner or source correction; both failure records and partial
outputs remain available.

The completed task issued zero requests. All twenty-four raw quality inputs,
eighteen science sources, complete frozen candidate,201 published assets and
six unrelated retained changes remain unchanged. Source-primary TAN precision,
measured PSF accuracy, colour/softness, seams/background, actual native
composition and publication/provenance adoption remain unverified. The next
quality decision can now use this independently checked expanded diagnosis and
the [actual local registration/background observations](experience-sdss-local-overlap-diagnosis-2026-10-02.md),
whose local estimator still awaits its own independent review. No global
correction follows from one cross-run compact peak or unqualified sky patches.
