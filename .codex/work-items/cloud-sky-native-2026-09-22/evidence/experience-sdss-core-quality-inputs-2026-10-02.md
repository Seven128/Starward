# M51 core field quality inputs — bounded acquisition and cached structural readback

Status: closed within this input/structure scope. Exactly four previously absent files for existing `run=3699 / rerun=301 / camcol=6 / field=100` were acquired once from the established SDSS origin; all four now have complete structural readback. This does not certify corrected-frame pixel quality, spatial PSF quality, mosaic PSF, or a new display publication. No production owner, science array, mask selection, PNG, asset or deployed consumer changed.

## Executed generations and provenance

The pre-request `rg` inventory and acquisition's repeated cache check found no exact requested filenames in the inspected source/output caches. The [official pipeline URL template](https://www.sdss4.org/dr17/imaging/pipeline/) supplied the canonical directory `https://data.sdss.org/sas/dr17/eboss/photo/redux/301/3699/objcs/6/`. Each of the following requests returned HTTP 200 with exactly the canonical final URL, verified TLS, no redirects, and no retry:

| Exact raw file | Received bytes | Raw SHA256 |
| --- | ---: | --- |
| `psField-003699-6-0100.fit` | 423360 | `a9a238ecfd14edcb7b099be7fcb2e05b52ed52c80a8f597548e60e3fc314739b` |
| `fpM-003699-g6-0100.fit.gz` | 113613 | `de27f43803c187f70021be90754654bf6f39ba9a5291a5242032727dd3e47952` |
| `fpM-003699-r6-0100.fit.gz` | 117357 | `9e16a6ba356bee8d196918344cfac0cd09337a1a761ea3db49e871fa3488e184` |
| `fpM-003699-i6-0100.fit.gz` | 111920 | `d7474a0642a473a0f5a91f1e7ecdb6a6f512de292821d42ba7bd85d15b195850` |

Actual transfer total was 766250 bytes. Each child had a 30 s socket timeout and 40 s whole-child budget, a hard 4194304-byte response cap, and a 16777216-byte decoded FITS cap. Four-file total caps were 16 MiB raw and 64 MiB decoded. Three gzip streams reached EOF with CRC/length readback; decoded g/r/i FITS sizes were 316800/319680/308160 bytes. A per-file durable request receipt preserves real status, times, URL, raw/decoded identities and any admission failure; valid independent results are retained.

The acquisition generation is immutable:

- `output/sdss-m51-core-quality-inputs-1002-r1/acquisition.json`, SHA256 `5b4d5e73c52bf1613412ba948ae5d2046a38f7991bd54dc353298fe9e1686eb8`.
- Its `binding.json`, SHA256 `99e8be01fccbec027b20d80c87f5e6aeaa337378e95e0d267b77cde5536d91ba`, includes the actual executed script snapshot, all source/request/inspection files and preservation inventories.

The first psField admission stopped at a task-reader column-name membership check: it expected lowercase names while the real file contains mixed-case `RNROW/RNCOL/RTYPE/RROWS`. Its historical receipt remains `RAW_ACQUIRED_UNCHECKED` with `psfield_eigen_columns_missing`; HTTP acquisition success was not silently upgraded. The task reader was corrected to compare names case-insensitively while preserving actual names. A separate exclusive cached readback generation read the exact original psField bytes, reused the three completed fpM inspections, and issued **zero requests**:

- `output/sdss-m51-core-quality-readback-1002-r1/readback.json`, SHA256 `fe17a5334e476120f798164ab9772eba5d4252fc2c06cf09ee43e7af47d01c86`.
- Its `binding.json`, SHA256 `7f3250364b145bb17c1200185cd422a3cf3450e44044da2ac9f5f888dd3fe3bb`, binds original acquisition/request generation and unchanged inventory, plus the new executed readback and structural-reader snapshots.
- Current task-only structural reader SHA256 `56899bf04fcd326dd45203dd63ee531c9204d516d3b2fabab121b04b1b28ea3f`; readback task SHA256 `c62454ae19bd54fc94887de55f1b42f7f458c750c44aae4f40820be934acc29e`.
- New psField inspection SHA256 `ff17711cc8dad0d8a7b3861ae0e1298657acd7393ebbaa94e123131f690f2762`.

Both generations retain full actual headers, column formats/units/shapes, finite-scalar summaries and P/Q heap descriptor bounds/readback lengths. Astropy read all HDUs/tables with the complete container; this is structural admission, not semantic decoding of packed masks or construction of PSF images. The cached readback records psField `FITS_STRUCTURE_CHECKED_OFFLINE` and three fpM `FITS_STRUCTURE_CHECKED_REUSED`.

## Actual psField structure and limits

Actual primary `RUN=3699`, `CAMCOL=6`, `FIELD=100` match the existing core field. `FILTERS="u g r i z"` supplies the real band order. `RERUN` and singular `FILTER` are absent; rerun 301 is request provenance, not an invented header fact.

All ten HDUs were read. HDUs 1–5 correspond to the actual u/g/r/i/z order, so the requested g/r/i eigenimage tables are HDUs 2/3/4. **Each table has four basis rows**, including the fourth: `c` shape `(4,5,5)`, actual `nrow_b=ncol_b=3` in every row, `RNROW=RNCOL=51`, and four `RROWS` heap arrays of length 2601. `RTYPE=128` was retained. The [official image PSF example](https://www.sdss4.org/dr17/imaging/images/) uses three basis rows in its example; that example does not authorize ignoring the actual fourth row.

HDU 6 supplies real field/per-band summary values: field 100, `psp_status=0`, and `status=[64,64,64,64,64]`. The [psField data model](https://data.sdss.org/datamodel/files/PHOTO_REDUX/RERUN/RUN/objcs/CAMCOL/psField.html) describes the status low-bit field and the `SPARSE` high flag; 64 must not be reported as unqualified status-zero quality success. Actual u/g/r/i/z `psf_width` values are approximately 1.774959/1.644310/1.543766/1.571834/1.644771. These field scalars do not replace a spatial PSF reconstruction or a final mosaic PSF measurement. Actual `gain` and `dark_variance` arrays, plus HDUs 7–9, are preserved in the inspection. Missing actual column `TUNIT` remains null; documentary units must be distinguished from file metadata.

## Actual fpM structure and limits

Each actual primary has matching RUN/CAMCOL/FIELD, with `MASKROWS=1489`, `MASKCOLS=2048`, `NPLANE=10`, `NFILTER=5`. `RERUN`, `FILTER` and `FILTERS` are absent in all three files. The requested g/r/i identity is bound to canonical path, raw hash and receipt; it is not represented as a verified file-header band identity.

Each file has twelve HDUs: primary, ten SPAN tables, and an `S_MASKTYPE` enum table at HDU 11. Actual SPAN columns are `refcntr,nspan,row0,col0,rmin,rmax,cmin,cmax,npix,s`; `s` is a `1PB` variable byte heap. Raw P descriptors, heap bounds and corresponding returned byte-array lengths were checked. **The bytes were not interpreted as a per-pixel bitmap.** The [fpM data model](https://data.sdss.org/datamodel/files/PHOTO_REDUX/RERUN/RUN/objcs/CAMCOL/fpM.html) is the structural reference for this source.

Actual enum values 0–9 are `S_MASK_INTERP`, `S_MASK_SATUR`, `S_MASK_NOTCHECKED`, `S_MASK_OBJECT`, `S_MASK_BRIGHTOBJECT`, `S_MASK_BINOBJECT`, `S_MASK_CATOBJECT`, `S_MASK_SUBTRACTED`, `S_MASK_GHOST`, `S_MASK_CR`; value 10 is `S_NMASK_TYPES`. These are the file's named plane enumeration, not a guessed integer bitmask. The [mask algorithm page](https://www.sdss4.org/dr17/algorithms/masks/) explicitly describes five convex-polygon masks that differ from fpM photo masks; its BLEEDING/BRIGHT_STAR/TRAIL/HOLE/SEEING numbering must not be applied to these tables.

## Preservation and next dependency

Acquisition/readback bindings verify old 201 assets and the six preserved settings/outbox edits unchanged. Acquisition additionally freezes existing corrected frames, r2 mosaic outputs and related source owners; readback freezes the entire original acquisition generation before/after. No existing scientific input was fetched again or overwritten, and no production code/PLAN/Context/README changed.

The next science-quality dependency can reuse these exact cached inputs: one responsible checked source reader must preserve actual band provenance and dynamic basis count, validate/decode fpM SPAN semantics before any pixel-quality qualification, and reconstruct the spatial PSF from all basis rows at bounded real field coordinates before any matching/quality decision. The present receipts supply those raw structures only. Packed-span interpretation, spatial PSF, source artifacts, all other fields, final mosaic quality and new publication remain open; this acquisition does not resolve brown colour, soft detail, display background or quality adoption.
