# SDSS science optical v2: independent offline publication review

2026-10-02. Outcome: the bounded new contract/CLI/writer path is suitable for the next explicit, non-adopted normal-consumer integration trial. The existing v1 JPEG default, immutable routes and assets remain compatible. This does not adopt imagery quality or register this candidate in the runtime.

The real input is `output/sdss-science-optical-writer-1002-r1/publication/manifest.json`, 18,078 bytes, file SHA256 `3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5`. Its independently recomputed optical publication hash is `34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0`. The two hashes identify different things: complete manifest bytes versus the canonical publication with transport hash/download URLs excluded.

## Frozen implementation and real inputs

- Shared TS admission/hash owner: `packages/miniapp-contracts/src/sdss-science-optical-publication.ts`, SHA256 `e3fba07199d6e26534336517acddf3756578a5890c3403b098c266302057007f`.
- Actual packaging CLI: `data-pipelines/deep-sky/pack_sdss_science_publication.mts`, SHA256 `7ac3ebcd3c1c301d250294ee2202f5c9a23ab8c615fe7ca759d5bb8b1dae5bbd`.
- Python cached writer: `data-pipelines/deep-sky/publish_sdss_science.py`, SHA256 `ea3a9db10edc20623ac25a40975b67b5ca8876dcce48a98a4653a4b45a5940e3`.
- Author's real generation result: `output/sdss-science-optical-writer-1002-r1/result.json`, SHA256 `40f03ef51ed404890f8fe1207bf144a55491b55faea9984279ad8aba6af64c0e`. This identifies the input generation; the author's summary is not the independent oracle.
- Unchanged upstream mother image: `output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json`, SHA256 `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`.

All 18 full admission-receipt sidecars were compared semantically with the pinned upstream receipts, and their exact saved bytes/hashes were compared with each published frame descriptor. Raw compressed source bytes, source URLs, rerun/run/camcol/field/band identities and primary FITS-card hashes agree. The six fields remain 301/3699/6/{99,100,101} and 301/3716/6/{116,117,118}, with complete g/r/i. This review reused their previously admitted cached scientific arrays; it did not decompress/read FITS or redo source WCS, calibration or coaddition.

The new source/processing description truthfully describes DR17 corrected frames, primary-linear-TAN display reprojection, common same-field geometric coaddition, one whole-master Lupton transfer and availability box reduction. It does not inherit the old SkyServer JPEG claim of “no pixel edits.” Scientific validity remains UNKNOWN; no new artifact masking, second sky subtraction, PSF matching, sharpening or generated celestial detail was applied.

## Independent checks and meaningful counterexamples

`scripts/experience-sdss-science-publication-independent-2026-10-02.mts` (SHA256 `6ef0dbd6450e2407486559d7fb0922ed1c92c4c902537dba4bab31ee80a05f69`) produced:

- `output/sdss-science-publication-independent-1002-r1/result.json`, 11,600 bytes, SHA256 `c87b839ae9a852059c6709ef68d22bfc249bccfc1ef5367184ce5d6b880dfd18`.
- Its before/after binding, SHA256 `bd5425459ce8e727e759c5dc6d7d8a94a4042599f976c96dbf6d882bbd3626ae`.

Independent lexical-key canonical serialization plus Node crypto reproduced the publication hash. Actual CLI execution on the saved Python payload reproduced the complete manifest stdout bytes. The shared manifest validator also admitted the actual payload with the browser `URL` global absent, preserving WEAPP portability.

Twenty fresh-hash invalid controls were rejected, including invalid stretch/Q/version/count/scope, brightness alpha, upgraded scientific validity, changed RGB mother, arithmetic half-field, missing credit, credentialed link, incomplete/duplicate source identity, noncanonical raw route, missing admission receipt, wrong CRPIX/crop and escaping filename. Redirected transport URLs and an unrelated W3 hash cannot admit the optical manifest; key order/envelope fields do not alter the canonical publication.

A task-only mutation bypassed the exact current recipe-admission guard. With the same newly calculated hash, negative stretch was rejected by the real owner and accepted by that mutant. Its source is saved in the new independent generation. It is an explicit guard-removal counterexample, **not a claim about an unsaved historical draft**. Current fixed and whole-master-zscale validation was read against the actual shared `make_rgb_display` recipe, including positive Q ≤1e10, effective tiny-Q normalization, coherent counts, deterministic fit statistics and one fit before crops. The actual writer generation exercises fixed 5/Q8; it does not publish a zscale variant.

`scripts/experience-sdss-science-publication-array-independent-2026-10-02.py` (SHA256 `00938749d627812df1d80248c021f2a35176d0b3298ba4d3aa0bc3ab61272fb7`) produced:

- `output/sdss-science-publication-array-independent-1002-r1/result.json`, 20,281 bytes, SHA256 `46c67444ac2e833186efb894bdc44e4ce0833eedd3db9e582aa47e6fed658549`.
- Its before/after binding, SHA256 `2eb5716f85e732b7608b63539e783e395505e1fd5b7dbcb644ec8f363ea8f2d8`.

The independent NumPy shared-intensity formula (without producer RGB/pyramid calls) matched all 2048² RGB pixels with maximum byte error 0. All 4,194,304 source-area samples are coherent/finite; g/r/i retain respectively 681,586 / 650,374 / 707,834 negative measurements and 0 exact zero measurements. The science/joint/RGB NPY identities remain unchanged. A shared descriptor is not an inferred scientific confidence map.

Pillow decoded each complete new 512² RGBA PNG. A separate integer-box oracle matched every pixel, and all three encoded files equal their original r2 candidate bytes. The common TAN crops are [0,0,2048,2048]/4, [512,512,1536,1536]/2 and [768,768,1280,1280]/1, with CRPIX 256.5 and the actual nonlinear TAN fields, not arithmetic half/quarter angles. The complete three-file family is 949,846 bytes; its different encoding/size is not a quality improvement claim.

Every real output alpha is 255, including 45,072 overview and 1,134 medium pixels whose RGB is black. Thus darkness is not absence. Separate small arithmetic controls retain known zero/black with alpha 255 and give one missing source pixel alpha 0/191/239 for factors 1/2/4. Only these supported integer factors provide this byte-255 completeness condition; actual full-coverage M51 is not itself a missing-source fixture. No threshold turns science brightness into availability.

The real Python `publication_payload` was invoked only for two altered-identity output-boundary controls in fresh task subdirectories. Parent-traversing object reference and receipt rerun were both rejected by its containment helper before an escaping file could be written. Partial control files remain in that exclusive review generation. These are deliberately invalid identities, not new scientific source admissions or invented historical PNG receipts.

## Compatibility and preservation

The independent reader checked exact old six publication IDs/hashes and 18 real JPEG byte hashes. V1 and v2 reject one another's schema, and the new v2 hash remains an independently pinned optical identity rather than a W3 identity. Two existing real Nest/Fastify HTTP tests were executed once and passed: old M51 default discovery/provenance/three JPEG routes, the other five exact admitted object offers, and invalid/unrelated resource routes. They use actual local controllers/injection, not a live server. Their scope is unchanged-v1 HTTP compatibility; they do not serve the new candidate.

The writer's full 91 cached files, 201 old deep-sky asset files and six retained Settings/outbox changes were independently matched to before/after bindings. The prior independently bound image inventory was also rechecked. No production file or original output was edited by this review. Four focused contract regressions were executed before the portability-only patch; the final-source actual no-URL payload check above covers that changed behavior without claiming the earlier run used the new source.

## Remaining scope and next dependency

The new output is an opt-in offline test publication only. A hash/admission validator cannot inspect NPY science merely from a wire descriptor; actual offline array/receipt/PNG verification and an approved exact-publication registry remain necessary. Admission receipts/scientific NPY files are offline provenance, not additional miniapp downloads.

The next normal path must retain old v1 as default, admit this exact v2 separately, consume PNG joint-area availability through the already reviewed one-pass coarse/fine mechanism, preserve unavailable/failure coarse fallback, and bind actual painted source/provenance to this optical publication. Existing pair capability is not yet that normal producer/consumer integration. This review did not repeat its GPU matrix.

The finite rectangular image boundary, dark brown colour, source PSF/run differences, artifact flags, full asTrans/DCR/absolute astrometry, background appearance and adopted image quality remain open. No browser/GPU render, native FS/decode/driver memory, device performance, 200DAU capacity, deployment or final interaction/visual acceptance was performed or certified here.
