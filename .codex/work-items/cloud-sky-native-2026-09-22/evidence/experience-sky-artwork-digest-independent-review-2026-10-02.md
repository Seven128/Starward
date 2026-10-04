# Encoded sky image digest: independent bounded review, 2026-10-02

The current request boundary correctly rejects an actual substituted JPEG payload of the same encoded length and dimensions before file write or image creation. No production defect was found within this review's scope. This is content identity evidence, not a scientific, rights, native decoder, durable storage or performance acceptance.

## Bound owners and consumers

- Request owner: `apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts`, SHA256 `7e42ec756f5567fe7afffc34fa79f43dd4608bf65a1b6bd821f91dac8a3109e5`.
- Shared digest/display-support owner: `packages/miniapp-contracts/src/sky-image-display-support.ts`, SHA256 `21621418e9d32d2c24255290ef7c6d4505cb405148434fd4199a3b2926658ef9`.
- Existing dependency: `@noble/hashes` 2.0.1, SHA-256 plus `bytesToHex`; installed module/package bindings are in `output/sky-artwork-digest-independent-1002-r1/installed-noble-binding.json`. Nothing was installed.
- `useSkyNativeImages` passes actual requested bytes through this owner. Constellation artwork, fixed-body imagery, 2MASS and **wide-field W3** (`useSkyWideFieldW3`) resolve through its shared path. The separate selected deep-sky image request path is outside this review and has not been certified migrated by this result. The loader changes wanted identities on camera/time selection, retains bounded file leases, and redecode of a retained file does not re-enter the response digest check. The digest is outside the frame renderer.
- Full input, consumer, fixture and source bindings before/after: `output/sky-artwork-digest-independent-1002-r1/result.json`, SHA256 `7a15990e21acd494b7c4f69976425e23f30172cff414dc5c97ce8bc5165df5fe`.

The manifest hash is checked as exactly 64 lowercase hexadecimal characters before request/image allocation. Actual response status/type/encoded byte length and PNG/JPEG geometry checks run before the digest. A mismatching digest returns through failure before `writeFile` and native `createImage`. The subsequent successful write and decoded geometry guards keep their existing cancellation and release semantics.

## Real payload counterexample

Input is the existing published W3 `Norder0/Dir0/Npix0.jpg`, 68,725 bytes, 512×512. Its original encoded SHA256 is `9ae4fd846e523e274c8618b97b24ce01be28e134718fa255b8dd5b24d19ac38c`. The task changes one existing JPEG DQT quantization byte, without changing file length, SOF geometry or publication files. The task replacement remains fully decodable in Pillow 12.3.0; its SHA256 is `b79cf429d1f8af0247d7c5ac1d84ce6bbedb746f1c2a83683b1626ecdf6e4454`.

Actual full RGBA decode finds 262,095 changed pixels out of 262,144, with a maximum channel difference of 53. This is a changed visual payload, not only a different comment/header. Detailed encoded and decoded hashes are in `decode.json`; the changed JPEG is retained in this new output generation.

| Same manifest, controlled callback path | writeFile | createImage | ready | fail |
| --- | ---: | ---: | ---: | ---: |
| Production, original real JPEG | 1 | 1 | 1 | 0 |
| Production, substituted real JPEG | 0 | 0 | 0 | 1 |
| Task-only digest predicate bypass, substituted real JPEG | 1 | 1 | 1 | 0 |

The task mutation removes exactly one predicate from a saved copy of the current request owner. It leaves the current length/geometry/lifecycle guards intact. It proves those guards alone admit this substituted payload; it is not represented as a historical Git revision or an attack on native WeChat. VM callbacks emulate request/write/image-load ownership; independent actual Pillow decode establishes that both input JPEGs are real decodable images. This does not certify actual native decode or storage.

Invalid empty, non-hex short, 63-character and uppercase 64-character manifest hashes all fail before requesting or allocating an image. Valid original payload release removes its controlled file once despite repeated release. Empty, `abc` and a Uint8Array subarray digest match Node crypto and leave input bytes unchanged.

## Bounded desktop digest timing

Windows x64, Node v24.16.0, Core i5-11400F desktop. For each actual local encoded file, one warmup and three measured calls to the shared pure-JavaScript helper. Node crypto comparison and file reads are outside timers. These are cached input measurements, not an HTTP request or a true cold-JIT/device benchmark. Largest constellation means largest encoded-byte descriptor among the current v3 catalog's 85 published illustrations.

| Actual published input | Encoded bytes | Three calls, ms | Median, ms |
| --- | ---: | --- | ---: |
| Auriga constellation PNG | 57,787 | 1.2049 / 1.1802 / 0.2948 | 1.1802 |
| Current Clementine Moon JPEG | 372,399 | 1.8898 / 1.8825 / 1.9532 | 1.8898 |
| Current 2MASS JPEG | 703,555 | 3.4210 / 3.3619 / 3.3016 | 3.3619 |
| W3 Npix0 JPEG | 68,725 | 0.3350 / 0.3332 / 0.3395 | 0.3350 |

All measured digests match the exact current publication hash and independent Node crypto. The constellation samples have substantial warmup/JIT variation; three samples do not establish a stable latency distribution. Production hashes one successfully received encoded response before write/decode; it does not hash every render frame or retained-file redecode. No inference is made about native latency, total memory, 4GB/16GB capacity, server requests, bandwidth or 200 DAU.

The first task generation stopped on the task's cross-realm `deepStrictEqual` object assertion after performing its four 1+3 measurements but before saving timings. Its partial files and `task-harness-failure.json` remain in `output/sky-artwork-digest-independent-1002/`; those lost times are unknown. Parent expressly authorized one corrected 1+3 supplement for the same four files, in a new generation. r1 uses scalar geometry checks across the VM realm and saves timing records before later checks. No output was overwritten.

## Checks and limits

`node tools/run-node.cjs --import tsx --test apps/wechat-miniapp/src/features/sky/sky-artwork-request.test.ts apps/wechat-miniapp/src/features/sky/sky-native-image-chain.test.ts`: 11 pass, zero failure. Exact captured output is `representative-tests.txt`. These test success/cancellation/late-write cleanup, invalid dimensions/hash, content substitution, retention/GPU-owner controlled behavior and real published W3/fixed-body/2MASS bytes. Controlled PNG header fixtures do not themselves establish complete valid PNG decoding. Controlled native callbacks and fake GPU resource ownership do not establish WeChat runtime behavior.

Reproducible task command: `node tools/run-node.cjs --import tsx .codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sky-artwork-digest-independent-2026-10-02.mts`. New exclusive output naming prevents replacement of an earlier generation. The companion Python probe is task-only. There was no network/source download, native runtime, service, device, branch switch, commit, dependency install or production/test edit. All bound source files and the six preserved settings/outbox files have equal before/after hashes.

Hash identity does not establish image quality, scientific validity, source rights or authorization. This boundary does not perform write/readback, persistent cache reread validation, or total storage integrity verification. Those remain separate responsibilities and are not upgraded by this result.
