# Higher-resolution M51 observation candidate with actual AVM metadata

The real SDSS field/PSF diagnostics show a material source-detail limitation at
the M51 core. Rather than infer invented detail from upscaling or sharpen a
model without measured support, this bounded trial examines one higher-quality
published observation. It retains the native engine, existing sources,
commercial exclusions and prior outputs. It is a new source candidate within
the current shared-image quality responsibility, with no product adoption.

## Specific rights and image meaning

The [heic0506a source page](https://esahubble.org/images/heic0506a/) directly links
the specialized [ESA/Hubble usage terms](https://esahubble.org/copyright/).
These materials use CC BY4.0; the terms permit reuse and changes without
individual permissions, provided full credits stay visibly associated with the
image and online links remain active. The [CC BY4.0 terms](https://creativecommons.org/licenses/by/4.0/)
allow commercial copying, adaptation and redistribution with attribution,
license notice, indicated changes and no implied endorsement. Logo, identifiable
person, music/paper/code rights are separate. This astronomical observation
contains no identifiable person or required logo use.

Full unchanged image credit:

> NASA, ESA, S. Beckwith (STScI), and The Hubble Heritage Team (STScI/AURA)

This is the specific esahubble.org product and its linked terms. It does not
change the excluded esa.int Gaia/current all-sky products, DSS or other
unresolved namespaces. Future native usage needs an actually visible associated
full credit and source/license/change disclosure; a credit hidden in a source
route alone does not discharge the visible-credit requirement. No such runtime
adoption has happened.

The source is the historical2005 Hubble ACS observation composite combining
B/V/H-alpha+Nii/I. Its colours are the published multi-filter interpretation,
not SDSS gri, calibrated RGB flux, live conditions or unaided-eye appearance.
Original metadata describes11477×7965 pixels and a9.56×6.64 arcminute field.
The acquired publication JPEG is4000×2776. Neither output dimensions nor
metadata's `Spatial.Quality=Full` certify astrometric or scientific quality.

## One acquired image and preserved metadata

The source page, specific copyright page and observed publication-JPEG link
were each requested once, with verified TLS, exact final URLs, no redirect or
automatic retry. Pages were capped at1MiB each and the JPEG at8MiB; the decoded
image cap was16million pixels. No original205MB TIFF, full-resolution38MB JPEG,
zoom tiles, additional object or scientific band data was acquired.

`output/hubble-m51-source-quality-trial-1002-r1/` preserves these source bytes,
per-request receipts, extracted raw XMP, executed source and full decode:

- Publication JPEG4060187B, SHA256
  `7b13a932bcf54653c591d369e8d1c4cbdbeb693ecc468242facb239fde52e4c2`.
- Source page61937B, SHA256
  `56a9908293e798465a80dffc89e5292d8854074c06c55278aa36004aa97477c7`.
- Rights page44020B, SHA256
  `424d08457ef4ae817d4f603310962b44d09ed1caa5c256466b0dd9b409dce9d0`.
- Result SHA256 `2497653ac6946c0b21e77a71539ca8d75cc7c0332de523a41b91e451d01335c9`;
  binding `71278a1caa481251d05d6bf9f6e3ddfd8cfdc91b89715f97d0a6468551dc5a54`.
- Full decoded RGB33312000B, SHA256
  `e9720f3cfcd75966deb94060b6a0711b295e094ae03c76ec1d58633a343b1710`.

The raw AVM1.1 packet supplies ICRS/J2000 TAN, actual signed scale, rotation,
reference dimensions/pixel/value, filters and unchanged credit. Importantly its
spatial note says the reference was calculated from Simbad and can differ from
a background by approximately5arcseconds. This note remains authoritative
uncertainty even though a separate metadata field says Full. No DSS background
was fetched or used. Real star correspondence is necessary before precise
placement or adoption.

## Mature reader trial and actual three-tier pixels

[PyAVM](https://astrofrog.github.io/pyavm/) was considered and used in an isolated
offline trial. Its actual0.9.9 universal wheel is379786B with provider-pinned
SHA256 `8bba0ee9645a8a9f215af9ceea67b494a6ee1fe380cebdc00ba99d781539ad76`.
The full wheel license retains MIT and included BSD3 notices; no GPL reader,
global installation or production dependency was introduced. Existing
NumPy/Astropy/Pillow supply the optional numeric capabilities. Package and
license files are bound in `output/pyavm-metadata-trial-1002-r1/acquisition.json`,
SHA256 `61cf93a9854b8d8e3eb398632db4491eec10ea6d3906854eccd55c4c2513bb94`.
The initial task included a license directory in its file glob and stopped
before writing the detailed request record. Cached-only `is_file` readback
recovered the complete acquired wheel, metadata and license without another
request; missing detailed response receipts remain unavailable.

The actual library initially rejected the publisher's empty optional
`Spectral.Notes` RDF text. The projection task removes exactly that proved-empty
optional element from a separately saved XML packet, retaining the entire raw
XMP and the meaningful spatial-uncertainty note. No package source or image
bytes were modified. The mature `to_wcs(target_shape=(4000,2776))` then provides
the nominal image WCS; its resize/origin convention and actual output are under
independent review. JPEG top-first rows are reversed to the FITS/AVM bottom-up
y-axis for the shared numeric stencil.

The cached source is mapped once to the same exact2048² M51 target construction
as the frozen SDSS candidate. A fixed2×2 subpixel quadrature with the shared
four-neighbour bilinear stencil produces one encoded-RGB master. The existing
premultiplied box owner derives three central512² tiers from that master. No
Lupton transfer, per-tier exposure, white balance, deconvolution, sharpening or
generated astronomical detail is applied.

| Tier | Geometrically supported master crop pixels | Crop total | Encoded PNG bytes |
| --- | ---: | ---: | ---: |
| Overview | 1425463 | 4194304 | 181742 |
| Medium | 1014375 | 1048576 | 529695 |
| Detail | 262144 | 262144 | 603802 |

The resulting alpha represents complete image-stencil geometric support and
its box area fraction. **Scientific pixel availability remains UNKNOWN**.
Source black is not tested into missingness; unobserved raw-science/exposure
masks are not synthesized. The partial overview/medium cannot substitute for
the full coarse source coverage. Cross-source filter/colour/coverage and
fallback semantics require a deliberate shared publication/composition rule.

Root actually viewed the raw JPEG and nominal detail/overview PNGs. The detail
shows finer spiral/dust structure and the source's blue/red regions. The
overview retains a finite rectangular footprint and composited background;
that border and the approximate placement are unresolved. Actual viewing of
these offline pixels does not certify native sky blending, calibrated colour,
precise registration, absence of scientific gaps or final quality.

`output/hubble-m51-nominal-projection-trial-1002-r1/result.json` is9161B, SHA256
`a209ac6e4c10aebfaa5bb2447e20c1682836046dff1a21cacc8969003f2b7994`;
binding `249b8bf0a5718548d54ca8e17577575c9a124fc0ef120e29ac150906aad0d8cc`.
The output includes the single RGBA master, three complete decoded/readback PNGs,
normalized XML, actual library WCS and executed task. All source bytes, old
candidate/201 assets, scientific owners and six unrelated changes stay intact.
The three PNGs total1315239B; these are candidate file bytes, not a deployed
DAU/latency/capacity result. Original source bytes and decode memory stay
offline, separate from eventual mobile assets and the client cache budget.

## Next dependency

[Independent specific-source rights/AVM and whole-raster review](experience-hubble-m51-candidate-independent-review-2026-10-02.md) is closed for those bounded facts. [Actual four-point local registration](experience-hubble-m51-local-registration-2026-10-02.md) and its [independent review](experience-hubble-m51-local-registration-independent-review-2026-10-02.md) support only one SDSS field and 6.771% of nominal HST support; no full-field or absolute correction is adopted. The initial wrong-neighbour output remains preserved, and the exploratory contrast selector is not a reusable registration policy.
Then verify multiple isolated real source correspondences across the useful
field, preserving filter and PSF differences and the publisher's uncertainty;
metadata parse success alone is insufficient. A reusable AVM source adapter,
real geometric/unknown-science contract, same-master tiers, bounded encoding,
actual foreground contribution/full attribution and old-source fallback must
be established before normal publication/scene adoption. Image-specific input
records can vary; the shared processing and lifetime owners should not become
per-object manual retouch logic. Other objects, M82, native/WXML/phones,
persistent cache, cost/performance and full Goal obligations remain open.
