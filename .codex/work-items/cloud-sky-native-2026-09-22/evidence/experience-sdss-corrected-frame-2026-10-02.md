# SDSS corrected-frame cached-source admission (2026-10-02)

Scope: a reusable local input reader only. No download, RGB/mosaic, pixel
publication, runtime integration, old-asset change, service restart or new
dependency. The PLAN, Context, README and existing publishers remain with
their current owners and were not edited for this responsibility.

## Controlling source and actual format

Read the official [DR17 imaging files](https://www.sdss4.org/dr17/imaging/images/)
and its linked [frame datamodel](https://data.sdss.org/datamodel/files/BOSS_PHOTOOBJ/frames/RERUN/RUN/CAMCOL/frame.html).
The reader treats the primary float32 2048×1489 image as already calibrated
in nanomaggies/pixel and already sky-subtracted. It does not multiply NMGY or
subtract the supplied sky again. The primary TAN WCS omits the full polynomial
solution; original asTrans metadata is retained for later adaptation. Finite
values do not measure artifacts/quality, and fpM masks are not supplied here.

Actual root-acquired M51 inputs are
`output/sdss-corrected-m51-1002/frame-acquisition.json` and `sources/`:
run 3699, rerun 301, camcol 6, field 100, bands g/r/i. The primary raw CCD
`FRAME` is 108 for g while the asTrans `FIELD` is 100; no equality was guessed.
Actual BUNIT is `nanomaggy`, RADECSYS is ICRS, and the source CD matrix is
rotated. The reader parses it with existing Astropy, without assuming
north-up/east-left source orientation or claiming full absolute astrometry.

## Ownership and interface

New `data-pipelines/deep-sky/sdss_corrected_frame.py` exposes:

- `read_cached_frame(path, expected, max_uncompressed_bytes=...)` expects
  run/rerun/camcol/field/band plus independent compressed SHA/bytes and required
  sourceUrl matching the exact official DR17 SAS identity path. `CorrectedFrame`
  returns the copied float science `data`, parsed
  Astropy `wcs`, original primary `header` copy and byte-bound `receipt`.
- `read_cached_band_set(directory, records, required_bands, max_uncompressed_bytes=...)`
  rejects absent/duplicate bands, different fields and paths outside the cache.
  It preserves actual identity on each result; it does not assemble RGB or
  replace a missing channel with black. Acquisition adapters explicitly map
  `record.identity`, `record.url`→sourceUrl, `path`, `sha256` and `bytes`.
- CLI admits one explicit input and writes a new separate receipt; no network
  code, automatic source fallback or publication path is added.

Compressed size/hash are checked before use. The caller supplies an explicit
output safety ceiling, also bounding the compressed file read. A single bzip2
stream must reach EOF without trailing data and stay below that ceiling.
FITS validates all four actual HDU payloads/checksums, fixed primary shape/type,
calibration vector and actual sky-array dimensions, all 31 asTrans model
columns/types and source identity. Declared headers alone cannot establish
scientific-array receipt. A missing final scientific float rejects input;
complete-array FITS end padding is reported separately. Full original primary
cards, asTrans cards/columns/row (including high-order coefficients) and their
hashes are retained, with raw-source SHA/bytes; the raw cache remains reusable.
The current consumer directly supplies ICRS coordinates to the source WCS,
so this bounded adapter requires an actual parsed ICRS reference frame rather
than silently accepting FK4/FK5. The exact official acquisition URL is checked
against run/rerun/camcol/field/band; receipt-provided URL correspondence is
not a claim of independent network-origin proof.

## Real source receipts and checks

Current generation `sdss-corrected-frame-2026-10-02-r2/binding.json` binds the new source/test/script,
unchanged requirements, actual acquisition and
`reader-receipts.json` (SHA256
`385dcfe139f14a855032ac1cdd8c9bb3dd57e60e313aa9923e47c22b77f9a0d3`).
Reader source SHA256 is
`66eed21091c6d4c80d35c79d8bbb28467ba65ef90740342c727c13bbd812d17e`.

| Band | Compressed bytes | Finite samples | Finite zero | Finite negative |
| --- | ---: | ---: | ---: | ---: |
| g | 2,880,390 | 3,049,472 | 0 | 725,941 |
| r | 3,056,156 | 3,049,472 | 1 | 733,494 |
| i | 3,197,532 | 3,049,472 | 2 | 764,866 |

The three original compressed files total **9,134,078 bytes**, and before/after
hashes are unchanged. Each actual four-HDU stream decompresses to 12,447,360
bytes (37,342,080 total). The trial's explicit 32 MiB ceiling is an offline
safety bound above observed file size, not a client memory or server capacity
budget. Actual original zero and negative samples remain measurements; all
three receipts state `STRUCTURE_ACCEPTED_SCIENTIFIC_VALIDITY_UNVERIFIED`,
scientificValidity UNKNOWN and artifactMask NOT_SUPPLIED. The only current
reader warnings are Astropy's explicit RADECSYS deprecation normalization;
original cards are preserved.

`experience-sdss-corrected-frame-actual-2026-10-02-r2.txt` records the actual
three-band read. `experience-sdss-corrected-frame-tests-2026-10-02-r2.txt` records
nine relevant regressions passing with the cached Python 3.12 and existing
Astropy/NumPy. They use actual cached payloads for scientific tests, and
bounded regenerated temporary mutations with newly correct hashes, covering:

- wrong compressed SHA/bytes, complete/truncated/concatenated/over-limit bzip2;
- changed actual asTrans FIELD and removed polynomial column;
- loss of actual primary/final scientific samples despite complete bzip2;
- finite zero/negative samples and nonfinite samples without invented masks;
- missing band, incorrect BUNIT/NMGY and singular celestial WCS.
- source FK4/FK5 being used for an ICRS target, and absent/other-provider/
  wrong-rerun/query/fragment acquisition URLs.

The actual cache is not shipped as a repository fixture; those tests explicitly
skip if it is unavailable. This run had all three real payloads and no skips.
Temporary mutated files never changed the acquired sources and are explicitly
synthetic boundary inputs, not new SDSS provider observations. Independent
reviewer `sphere_review` observed five actual counterexamples in the first
ready implementation (two reference-frame mutations and three URL changes),
then saved its exact source snapshot
`experience-sdss-corrected-reader-before-2026-10-02.py.txt` (SHA49bbe5815cfd33cace73685b59d579a0bea002a62447505aff405b9a4fa10189)
and independent before results
`experience-sdss-corrected-reader-independent-before-2026-10-02.json`.
The first receipt generation is retained unchanged; r2 closes these objective
boundary conflicts. Independent after-review remains with that reviewer;
neither this record nor a test count accepts scientific quality, full WCS
correction or the eventual rendered candidate.

The subsequent `sdss_gri_tan.py` owner consumes this reader and separately owns
resampling, footprints, same-master RGB/levels and candidate evidence. This
reader does not preempt its numerical, image-quality or composition obligations.
