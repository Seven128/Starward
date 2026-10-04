# Shared offline imagery owner: implementation and actual evidence (2026-10-02)

This is task evidence for the unique PLAN's shared imagery dependency. It does
not replace the PLAN/Context or certify display quality, native runtime,
200-DAU resources, phone acceptance or the complete experience.

## Ownership and implemented boundary

The prior read-only audit is
`experience-shared-imagery-owner-audit-2026-10-02.md`. Production code now has
one offline `data-pipelines/deep-sky/image_quality.py` responsibility, called
by the existing `publish_allwise_w3.py` JPEG publisher and
`allwise_finite_tan.py` complete-science renderer. Source rights, FITS array
reading, TAN/HiPS sampling, stretch, immutable/versioned publication and
runtime GPU composition retain their existing owners.

The common owner verifies actual byte/hash/size/decoded dimensions, PNG
8-bit RGBA/chunk CRC/IEND and JPEG SOI/EOI, catalogue identity and the currently
supported north-up/east-left TAN header geometry. Explicit unit, matrix,
pole, axes, rotation and unsupported distortion conflicts are rejected;
published-header checking remains absolute-astrometry unverified. Directly
stored CDS hips2fits JPEG response hash/bytes cannot contradict the actual
asset. Derived PNG source-tile identities are distinct from output identities.

The complete finite renderer first computes all three actual TAN lookup
source sets, verifies the full acquired/scoped/hash-bound set, then applies
the existing scientific FITS reader. Missing acquisition is UNKNOWN and
cannot become a nonfinite sample. Actual finite/nonfinite source samples
must match encoded alpha; valid pure black remains opaque data. An overview
must contain the catalogue geometric extent bound; medium/detail deliberately
cropped refinements are reported without being rejected as invalid coverage.
The catalogue extent is not an exact survey-band source footprint.

The read-only batch binds actual manifests/assets, source, processing,
field, pixels and supplied WCS. Encoded luminance, clipping, edge/row/column
differences, 8×8 chroma cells and Laplacian statistics locate regions for
review. They do not establish photometry, original resolution, scientific
validity, artifacts or a quality pass, and do not repair or mask images.
Every accepted report explicitly says
`STRUCTURE_ACCEPTED_QUALITY_UNVERIFIED`.

## Actual input and output evidence

Successful generation is `shared-imagery-quality-2026-10-02-r2/`:

- `binding.json` pins source/script/report SHA-256, seven current publication
  identities, and the unchanged asset inventory.
- `current-publication-batch.json` reads **171 target TAN images**:
  150 current W3 JPEGs, three current M42 PNGs and 18 SDSS JPEGs across six
  legally admitted targets. All 168 JPEGs retain unknown scientific sample
  availability and precise SDSS WCS remains unknown. The three batch PNG
  reports check published alpha/count correspondence only; this batch itself
  does not reconstruct their sources.
- `m42-complete-source-reconstruction.json` independently exercises the
  existing production renderer with **20 complete local FITS inputs,
  21,029,120 bytes**, bound plan/receipt/HiPS properties and actual source
  hashes. All three reconstructed PNGs are **exactly identical** to current
  published bytes. Overview/medium/detail respectively retain 22/648/5095
  source nonfinite samples and 1095/4016/4206 valid opaque pure-black pixels.
  Source finite/nonfinite availability is verified, while scientific
  validity, exposure depth, saturation and artifacts remain unknown.
- `m82-incomplete-source-rejection.json` shows the shared set guard and actual
  finite renderer both reject the existing partial candidate. Six sources
  were planned, three are checked, and zero levels were rendered. No new
  mask or image was made, and the unresolved dark feature is not classified
  as a scientific hole.
- `assets-before.json` and `assets-after.json` bind **201 pre-existing files,
  7,182,848 bytes**, including current/previous manifests, notices, JPEGs and
  PNGs, all unchanged. `experience-shared-imagery-quality-initial-baseline-2026-10-02.json`
  also confirms the first attempt's baseline equals the successful r2 after.

The **wide W3 NESTED resource is outside this 171-image TAN batch**. Current
targets are evidence inputs, not a product requirement limit; the shared owner
can review additional legitimately admitted publications through the same
contracts without per-target pixel tools. No assets were downloaded,
published, deployed or modified and no service/developer session was touched.

## Verification and escaped-defect evidence

`experience-shared-imagery-quality-tests-2026-10-02-r2.txt` records the relevant
Python suite (18 tests) passing with the already cached Python 3.12 runtime,
Pillow 12.3.0, NumPy 2.5.3 and Astropy 8.0.1; requirements were unchanged and
no package was installed over the network. `experience-shared-imagery-quality-batch-2026-10-02-r2.txt`
records the real batch/reconstruction summary. Scoped `git diff --check`
passes.

The existing publisher trusted a cache adapter returning a decodeable 512px
JPEG as a declared 256px overview; the new real-publisher regression rejects
that mismatch before writing an image. Existing immutability and science
coverage tests were retained; their old dimension-invalid mock now uses
the actual level-specific original M42 JPEG bytes.

Independent reviewer `/root/sphere_review` demonstrated three defects in the
first new gate using actual source-bound assets: an M42 PC/CD/CUNIT override
still accepted, a direct M82 JPEG response receipt contradicted its actual
hash/bytes, and a PNG missing its final IEND still decoded/accepted while the
serving owner would reject it. These mechanisms are now guarded and covered
by actual-asset negative regressions, including PNG CRC, JPEG EOI and WCS
pole/axes cases. Independent after-review is recorded in
`experience-shared-imagery-quality-independent-review-2026-10-02.md` and
`experience-shared-imagery-quality-independent-checks-2026-10-02.json`
(SHA-256 `a9ae9546543e4e59b26a0e18568e68e9a8c9a262ee7fc2d7a6688830bb0cbbd7`).
The reviewer checked the actual source/script/report bindings, all 201 current
asset hashes, seven publication identities, 20 source hashes, actual PNG
alpha/valid-black counts and original M63 cell colors. Six in-memory bounded
gate-removal mutations wrongly accepted the invalid input; current production
functions rejected each one. Historical pre-fix tool output is honestly
distinguished from those hash-bound current mutations. The reviewer did not
independently repeat the full source renderer or accept visual quality;
there is no new blocking structure finding and all stated runtime/quality
gaps remain open. This implementation note does not turn self-checks into
independent review.

The first retained folder `shared-imagery-quality-2026-10-02/` contains only
its initial asset baseline and 171-image report. It then failed before source
reconstruction with `KeyError: tiles`: the added completeness guard assumed
the newer descriptive M82 plan field existed in the older M42 plan. The fix
derives the real entire required source set from the existing production TAN
lookups, and r2 verifies the complete old input path. The first folder is
retained as an incomplete earlier generation, without being overwritten or
bound to the later source.

## Quality and dependent work still open

Actual original M63 overview diagnostics locate its visible red stripe at
the cell [320,64,384,128]: encoded red chroma mean 25.475 versus adjacent
8.029. That is an anomaly-review coordinate, not an automatic source repair
or a scientific coverage classification.

M51's finite optical dark rectangle against a daytime blue environment,
precise service WCS and whole progressive composition remain open. Source
black background, display blending and survey coverage are separate meanings;
the report cannot infer a scientific mask from darkness. M82 has unavailable
inputs and an unresolved dark-region cause. Source saturation, color, survey
band content, level seams and genuine resolution remain review/reprocessing
obligations with sufficient real inputs. No AI image detail, per-target hand
cutout or brightness-inferred science mask was introduced.

The minimal completed boundary is a reusable source-bound structure and
anomaly-review owner through real existing inputs and existing publishers.
Native composition, actual target-runtime image quality, resources and final
whole-experience acceptance remain separate dependencies in the unique PLAN.
