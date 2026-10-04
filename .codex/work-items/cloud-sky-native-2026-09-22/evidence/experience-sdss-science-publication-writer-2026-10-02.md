# SDSS science optical v2 cached offline writer

2026-10-02. The opt-in offline writer now packages the previously admitted M51 r2 science mother, receipts and three availability PNGs through the single shared TypeScript publication validator/hash owner. This closes offline packaging responsibility for this exact cached fixed-transfer candidate. It does not register imagery, adopt visual quality or complete normal/native rendering.

## Frozen source and one actual generation

- `data-pipelines/deep-sky/publish_sdss_science.py`: SHA256 `ea3a9db10edc20623ac25a40975b67b5ca8876dcce48a98a4653a4b45a5940e3`.
- Meaningful regression owner `data-pipelines/deep-sky/test_publish_sdss_science.py`: SHA256 `3f6ea32fb759ffbde971acbbb0db63f2c84b3a2c721ac7704ff2ec5080429b95`.
- Actual run script `scripts/experience-sdss-science-publication-writer-2026-10-02.py`: SHA256 `a10f093c440d205f6ad6e0954d3f56e9bdbbe3dfd44dcf5f7965f6fbf0b782b2`.
- Root-owned shared contract/CLI used by this run: `sdss-science-optical-publication.ts` SHA256 `e3fba07199d6e26534336517acddf3756578a5890c3403b098c266302057007f`; `pack_sdss_science_publication.mts` SHA256 `7ac3ebcd3c1c301d250294ee2202f5c9a23ab8c615fe7ca759d5bb8b1dae5bbd`.
- `output/sdss-science-optical-writer-1002-r1/result.json`: SHA256 `40f03ef51ed404890f8fe1207bf144a55491b55faea9984279ad8aba6af64c0e`.
- Its `publication/manifest.json`: 18,078 bytes, file SHA256 `3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5`; distinct canonical optical publication hash `34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0`.
- Its `publication/writer-receipt.json`: SHA256 `4f163aea2ef0696baf826a67c67abcbfd586ad6fa6b3e7b2bc60633040c79dcc`.

The script ran once with the existing bundled Python plus offline `output/allwise-w3-atlas-0929/python-deps`, then the existing Node runtime via `node tools/run-node.cjs --import tsx data-pipelines/deep-sky/pack_sdss_science_publication.mts`. Python records ordinary byte hashes; canonical publication hashing/admission belongs only to the shared TS owner. Original payload, stdout/stderr, upstream report/binding copies, full 18 receipt sidecars and before/after inventories remain in this exclusive generation.

## Actual science, recipe and availability

Caller-pinned cached reports are `output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json` SHA256 `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52` and `binding.json` SHA256 `bc2af0aafc316986c6e55ae75a144074421b930dad2273c001809803585c087d`. The writer verifies their bound source bytes and complete NPY identities, cross-checks source identities/receipts/header digests, preserves coherent finite science eligibility and reproduces RGB once from the whole 2048² mother with the current shared owner. It performs no FITS decode, new reprojection, acquisition, per-level fitting or generated celestial detail.

The cached r2 recipe object stays unchanged. A newly reproduced current fixed recipe uses Astropy 8.0.1, i/r/g → R/G/B, interval minimum 0, stretch 5 and Q 8, and exactly reproduces all cached RGB bytes. Its declared scope/correction/clipping fields come from that actual shared call. The Python cached writer currently supports **fixed only**; the shared TS contract also supports whole-master-zscale. No zscale publication has been packaged here; extending the writer requires actual same-master reproduction and corresponding evidence.

Joint availability contains 4,194,304 pixels. Original g/r/i science retains 681,586 / 650,374 / 707,834 negative measurements and no exact zero measurements. Neither negative science nor displayed black implies absence. All three actual M51 level alpha maps are fully available; real r2 therefore supplies no partial-coverage example. Separate synthetic regression fixtures exercise valid zero/negative/black and missing-area availability without claiming a new scientific source admission.

The exact original three encoded PNG files total 949,846 bytes. Complete RGBA readback agrees with the shared availability box outputs at factors 4/2/1 and exact TAN crops; the overview/master field values differ by one ULP, while medium/detail are TAN crop fields rather than arithmetic halves. Availability alpha is separate from display brightness/contribution. Source/processing metadata truthfully describes corrected frames, primary-linear-TAN reprojection, common geometric coaddition, whole-master Lupton and availability reduction, rather than copying the legacy SkyServer JPEG processing claim. Scientific validity remains UNKNOWN; artifact quality masking, full asTrans, PSF matching, natural-colour and photometric certification remain open.

## Checks, counterexamples and independent review

The actual generation's 13 focused tests passed. They cover report/raw/recipe/RGB/PNG and TAN identity mismatches, meaningful partial availability, invalid output/input locators, exact receipt bytes and exclusive failed generations. Tiny synthetic test arrays are fixture controls, not packaged v2 science or imagery-quality evidence.

Root identified receipt and PNG filenames being constructed before TS admission. Both writes now call the existing containment owner before opening output files. Task-only in-memory removal of exactly those two guards makes the corresponding regressions fail and actually writes outside their declared output directories within their own temporary synthetic owner: `output/sdss-science-output-containment-mutation-1002-r2/result.json`, SHA256 `d237360b5e6a504b0057e28a2f2c2dbdf71ce99cf95ea4f4f11d40cb1099589c`. Raw observations were saved before the oracle. The earlier r1 failure is preserved: failing tracebacks retained NumPy mmap handles and caused WinError32 temporary-fixture cleanup errors. R2 changes only those deliberate failing fixtures to in-memory loads; it does not establish producer memory or native lifecycle behaviour.

Before/after inventories preserve all 91 cached r2 files, 201 old deep-sky asset files and six unrelated Settings/outbox modifications. Root independently checked saved inputs, all 18 receipts and all complete three PNG box outputs in `output/sdss-science-publication-root-readback-1002-r1`. Sphere's independent exact hash/CLI/array/PNG/receipt/containment review is `experience-sdss-science-publication-independent-review-2026-10-02.md`, SHA256 `aabcc0184b7054bfe333920448041e76e8e356b582da408cc416b29d681862c9`, with fresh-invalid and actual-array reports SHA256 `c87b839ae9a852059c6709ef68d22bfc249bccfc1ef5367184ce5d6b880dfd18` and `46c67444ac2e833186efb894bdc44e4ce0833eedd3db9e582aa47e6fed658549`.

Current contract and miniapp typechecks pass; root separately records seven existing worker cross-target type diagnostics with the same failures after removing only the new barrel export in memory (`output/sdss-science-worker-typecheck-boundary-1002-r1`). This author note does not convert that worker verification gap into a pass.

The next dependency is explicit hash-aware opt-in transport, then normal source/group-contribution integration. Unversioned/v1 discovery, existing immutable assets and defaults remain in place. There was no new renderer/GPU run, source acquisition, service/IDE/watch start, deployment or phone operation. Native performance, full interaction/visual quality, source attribution after actual painting and 200DAU capacity acceptance remain unverified.
