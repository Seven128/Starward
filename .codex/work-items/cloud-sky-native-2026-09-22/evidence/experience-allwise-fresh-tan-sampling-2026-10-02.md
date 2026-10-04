# AllWISE W3 fresh cached TAN science responsibility — 2026-10-02

Current status: source implementation and bounded offline execution are closed within the scope below. [Independent complete-source and full-array reconstruction](experience-m82-fresh-sampler-independent-review-2026-10-02.md) is closed within its declared sampling scope. These results do not adopt a new M82 display, classify its old JPEG dark regions, or establish native/scientific quality acceptance.

## Shared responsibility and compatibility

`data-pipelines/deep-sky/allwise_finite_tan.py` now owns `sample_cached_tan(plan, entry, *, source_directory, source_files, source_count, properties, properties_sha256, source_paths=None)`. It returns each requested profile's actual float32 intensity, independent boolean finite qualification, actual TAN WCS and source metadata in `TanSamples`. It does not require a product PNG receipt or apply a display stretch. No object-specific path or second task sampler was added.

The owner verifies plan/entry identity and ICRS center, north-up/east-left geometry, the hash-bound W3 properties descriptor (equatorial, tile width 512, order 8, FITS -32), unique supported profiles and source count. It computes actual WCS/HEALPix lookup demand for all requested profiles before admitting sources. Optional frozen world/lookup/header/tile declarations are checked against the actual computation; absent descriptive `tiles` in the older M42 plan do not disable actual required-source validation.

Canonical required tile paths and URLs remain independent of their physical cached filenames. `source_paths` only locates those same checked files beneath the declared cache root; canonical sets must match complete actual demand, physical locations must be distinct, and the unchanged shared `image_quality.checked_source_files` enforces containment, CHECKED/complete-array receipt, bytes and SHA256. The actual unchanged `checked_fits` then reads every science array, preserving finite zero/negative values and selected NaN/Inf. A missing source is rejected before sampling; it is not converted to artificial source holes.

`render_cached_candidate` now calls this science responsibility and retains its all-three-level requirement, frozen expected PNG hash and missing-count checks, encoded alpha readback, original stretch, metadata and shared QC. Publication/old-offer code is unchanged.

Frozen source hashes:

- Owner: `d917e04227ce6b0faefdf7780bb144f040c3049eaae8f4cb629603411c5b25c4`.
- Existing test owner: `8109e6037ad465d17f0411ef0197a626f8c8d33d598ca25198930c0b3c0da5a2`.
- `image_quality.py` and `hips_tan_lookup.mjs` remain respectively `b69389f2961949ddb96a2248cbb4f7e866e653a78e710efb87fdfde88660fcff` and `32b6c7c52fd6b54dc35c093560f891bca00fc7f46bac9a7e5e4a7325889c5b0a`.

## Actual M82 scientific output

Task entry: `scripts/experience-m82-fresh-science-2026-10-02.py`. Closed exclusive generation: `output/allwise-w3-m82-fresh-science-1002-r2/result.json` (`87cf424defdf7621577095a6c4f29720ed7683e780747a3d364ffc3bae4acdb4`) and `binding.json` (`16db2ae831bd889b454b14f36735efae9f2e9fb0517a1d2d58e28ce68f67150c`). Its source snapshots and executed-script copy bind the actual generation.

Only the existing exact 512², 0.25° DETAIL plan is used, with original tiles 121705/121707/121708 and the authorized newly obtained 121710/121793/121796. No raw tile is downloaded, copied to a replacement input tree, or aliased as a different tile. Their six physical paths/hashes and canonical identities are separately recorded. Source scientific total remains 6,308,736 bytes. Each actual complete primary array has 2624 absent terminal padding bytes; the reader admits complete samples without concealing the warning.

- `detail-science.npy`: 1,048,704 bytes, SHA256 `39ab5e7d4a918e179a0c8449d08365883c7d9fc79c3d76b2f8c90ebebd7c68c2`.
- `detail-availability.npy`: 262,272 bytes, SHA256 `fc271d01c7559a8e237edefec5a1c04c11ade05a42efae5bf8358153f08a88f2`.
- Actual selected samples: 262,125 finite and 19 nonfinite; finite zero and negative counts are both 0 in this real target. Synthetic owner regressions separately demonstrate preservation of actual zero and negative values.
- World SHA256 `2d6981c26f566bc56ac0ba926ab880146486a25bc18deb138d512af2755e806c` and lookup SHA256 `b0e379afaba5c36f747f4b30497503712a476f9741e3ec065fd28e2573889d4e` reproduce the old exact DETAIL plan.

The cached primary header has no BUNIT; intensity units are explicitly unknown. Independent finite qualification establishes selected scalar availability only. It does not mask detector artifacts or assert photometry/PSF/absolute astrometry, and does not classify old CDS JPEG dark/bright pixels. There is no new M82 PNG, stretch, old-JPEG scientific mask, published level or HTTP runtime route. The nine OVERVIEW/MEDIUM source inputs remain unavailable/unrequested and their unknown bytes are not represented as zero.

The first task attempt `output/allwise-w3-m82-fresh-science-1002-r1` stopped on a task-local default-GBK manifest read before science output; its executed-script snapshot remains. The corrected UTF-8 r2 generation is separate and complete. No earlier acquisition or candidate output was overwritten or retrospectively upgraded.

## Checks and actual old/new consumer evidence

The two affected existing test files ran 23 tests successfully. Five added owner checks cover fresh science without a display receipt, valid zero/negative and actual NaN/Inf, whole real-demand admission before any scientific read, bad receipt/hash/byte/canonical URL, properties/lookup/geometry mismatch and cache-root escape. This is development evidence for those boundaries, not a quality or target acceptance count.

`admission-mutation.json` binds a real six-source completeness-receipt counterexample: changing one supplied `completeArrayReceived` to false normally raises `image_quality_source_input_unavailable`. A task-only bypass of just the shared admission call produces actual science despite the false receipt; the output matches the valid-input array. The production owner is never changed by this bounded mutation. The check demonstrates the receipt gate affects the result, rather than merely counting a passing assertion.

The r2 task migrated actual M42 20-source reconstruction through the new owner and compared each PNG byte against the current published asset; all three are unchanged. Its mask counts remain 22 / 648 / 5095.

Parent requested full metadata/QC protocol compatibility in addition to PNG equality. `scripts/experience-allwise-sampler-compatibility-2026-10-02.py` actually executes the prior owner snapshot (`6ce051e687cb2a66da3de0390c6b16015b5f44eb0f34457ff874142dd5edc354`) and current owner against the same M42 input and actual current catalog row. Old source is loaded from the acquisition generation's immutable snapshot; only lookup sibling resolution uses the unchanged current lookup path. Results: each PNG is byte-identical, each full metadata object is semantically identical, and its compact JSON bytes using the publisher's separators are identical. All three complete QC objects and their serialized bytes are likewise identical. Complete old/new metadata and QC are saved independently, rather than inferred from PNG equality.

Compatibility generation: `output/allwise-w3-fresh-sampler-compatibility-1002-r1/result.json` SHA256 `9aa01e93b7ad5c92cd1eba896f589e1374cb1ed92536e0423b103b2d3111e3cc`, binding `c8c2906f4535b66f9badb22b489ef1f8d4259f705b0108989d14845de57eaa6e`.

The retained old-candidate PNG receipt guard is also exercised through the actual consumer: `scripts/experience-allwise-display-receipt-guard-2026-10-02.py` changes only the first expected PNG digest in a task-only intercepted receipt read. Complete physical source admission and rendering run, then reject with `allwise_candidate_pixels_changed`. Receipt, manifest and production owner bytes remain unchanged. `output/allwise-w3-display-receipt-guard-1002-r1/result.json` SHA256 `e4ba1201392f249845f2d8f61a074bc33a98ad20002b7f830ace772369bcea7e`. This verifies fresh sampling did not remove the old display-consumer obligation.

The fresh task verifies 201 existing asset files against the prior frozen asset inventory, then before/after; old M82 inputs/aliases/plans/receipts, new acquisition generation and old M42 candidate remain unchanged. All six unrelated settings/outbox bytes still match their retained baseline. No PLAN, Context, README, GPU source, scene/runtime consumer, IDE, phone, publication or deployment is changed by this step.

## Remaining dependency

Independent direct TAN/HEALPix reconstruction and every actual scalar/finite bit now agree with the shared output. Its actual old-JPEG coordinate diagnostic locates 17 near-black nuclear pixels in finite positive source samples, apart from the 19 nonfinite target samples; it rules out a direct nonfinite-mask repair of that diagnostic. Use a separately bound display trial to inspect the real processed pixels, while exact old CDS interpolation/origin, source artifact cause and corrected quality remain unverified. Decisions about display transfer, source PSF, all-three-level inputs, consumer integration and native/full-experience acceptance remain with the unique current PLAN and their owners.
