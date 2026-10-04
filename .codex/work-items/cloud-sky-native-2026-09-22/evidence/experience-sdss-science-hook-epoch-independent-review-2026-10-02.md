# Independent science optical Hook and epoch handoff review — 2026-10-02

The frozen optional science Hook, angular selection and metadata-to-file epoch handoff passed bounded independent review. No further production repair was identified. This is a prerequisite capability: the ordinary page/scene/group still does not adopt science-v2 images, and upload, actual contribution, completed-frame source credit, target WEAPP and image-quality acceptance remain open.

## Reviewed responsibility and source

The optional argument of `useSkySdssOptical` is an independent optical publication hash. An explicit value selects the science metadata lane; malformed/foreign values cannot select legacy discovery. Its cold metadata intent checks active/ref/hash/positive finite FOV independently of the old JPEG scale gate. After metadata admission, level selection uses the actual TAN fields, normalized to the already adopted M51 .3/.16/.065-degree refinement policy and its reference footprints. It does not require a photograph to fill the viewport. The v1 selection function and default Hook invocation remain the prior JPEG lane.

The resource owns a deep-frozen JSON snapshot and frozen outer capability. Its pending AbortController/query listener/cache-demand listener belong to one pending request and leave in `finally`. A settled resource owns only its originating cache epoch stamp; releasing another demand or aborting a settled observer must not retire it. Cache clear invalidates that shared stamp. The Hook rejects mismatched object/hash and retired metadata during render, then checks the stamp again in the actual asset resolver before public-file acquisition. Each level descriptor retains its real PNG/hash/bytes/TAN field/crop/availability identity; coarse recovery retains the same master and publication.

Frozen production inputs independently used:

| Owner | SHA256 |
| --- | --- |
| `use-sky-sdss-optical.ts` | `6a9be6b649d0d04d115039532f9a6028e3fcbad1e52bdaa92e6a568601ce12f2` |
| `sky-sdss-optical-selection.ts` | `259e0e85510c979b6b5400a7e8adfb18d90a108c40136e74befd7cd9a6f55521` |
| `sdss-science-optical-resource.ts` | `daafee434d960fba8681b01e9ca549f4cf55fb71fe74261e24df4cddaa616466` |
| `sky-public-image-runtime.ts` | `b8ebb9b6fc6caaa93660aa3bdc418e48301ba23210c98e25cc6f4c308aeffb6f` |
| public file-cache core | `221e1979747c12bc8edcc6c7f2d592dc80a039740d107658c03a106c709874fe` |

The existing native Hook, artwork request/loader, byte validator, bare resource request, client and contracts are also bound and preserved. No production code, tests, page, source data, old output, static exporter or budget was edited by this reviewer. Any following page/frame assembly work is a separate review; this note does not cover future page changes.

## Actual resource evidence independently read back

Read `output/sdss-science-optical-resource-after-1002-r2/resource-traces.json` (17,104 bytes, SHA256 `ff4ecd3f4995ddb255d0f234998ab6fd84e5ac10152b68535dd598bb0c967a4b`), full executed sources/test/log and all 21 before/after inputs. They match current production plus the current executed test `cb4b3a5ce078eb929ac3d02135ad7bd6611a6a36b6af8692d89b25d96c415d29`; full resource/runtime source snapshots are exact. The declared fixture is the real writer-r1 manifest/three PNGs, not its default portable synthetic fixture. The author exercised complete helper/client/bare/runtime/cache modules with controlled MapFS/Taro/AbortController callbacks and a read-only pending-demand-count tap; no WEAPP/HTTP/GPU claim follows.

Independent checks of those raw records and actual code establish:

- Source snapshot and outer capability are frozen; the post-settle public metadata-listener count is zero. Pre-aborted query causes zero request/cache acquisition.
- Pending clear advances epoch and removes the public demand and query listener. Normal abort completes its callback; Taro abort throwing preserves an incomplete native callback, while a throwing controller abort preserves one inner native-signal listener until the actual late callback. After that callback all listeners are zero. A failed abort is not treated as completed native I/O.
- Metadata success delivered in the same turn as clear cannot cross resolution qualification. A settled resource retained by two observers is independent of either settled query cancellation or another demand's release, but both become non-current on clear.
- Explicit retry creates the new metadata epoch; two actual compressed-file acquisitions deduplicate the real DETAIL PNG. Releasing one lease preserves the other. Clear then retires that remaining lease exactly once and reports partial while its bytes/ref are held; final release/clear reaches zero leases, retired, pending, running, reserved and bytes.
- Not-found, transport failure, foreign publication, synchronous request exception and query abort all release their pending subscriptions. The source publication/science meanings are unchanged.

Read the actual original `77e596ea067e4eb0a244002b9343fecb3ad6ac014b57ae2989e07fd8ce7f3e03` resource snapshot, failing log and `outerFrozen:false` record in `output/sdss-science-optical-resource-before-1002-r1`. Removing only the current `Object.freeze` outer return reconstructs that exact old source. This failing-before evidence remains author-generated and was independently verified, not claimed as a new independent historical execution. Author after-r1 used test6757; after-r2 used current cb4. Their traces are byte-identical, but their test bindings remain distinct. Default portable setup/startup failures do not change the actual-path evidence or supply native validation.

## Independent complete Hook path

Script `.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-science-hook-independent-2026-10-02.mts` is 25,026 bytes, SHA256 `a41b0e73da2276e9587a2fc057ae0ca77a7e136b5da56b02d748f31c9a063baf`. The successful exclusive generation is `output/sdss-science-hook-independent-1002-r4`:

- `result.json`: 3,260 bytes, SHA256 `7ac5582ed01cd744853620af0067b572eb3faff4d0638042db9f387fd1bd273c`.
- `binding.json`: 14,839 bytes, SHA256 `6c9a4a3973092ed23f7dfa8d2cdad804217bb5349baea89b0b004079c7d05f2e`.
- Full nine-state observations, current-vs-mutant effect-gap traces, actual source snapshots, exact executed script and the one mutated Hook source are saved separately.

Invocation from `apps/wechat-miniapp`:

```powershell
node ../../tools/run-node.cjs --import tsx ../../.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-science-hook-independent-2026-10-02.mts output/sdss-science-hook-independent-1002-r4
```

This independently executes the complete optical Hook, complete existing native-image Hook, actual metadata wrapper/client/bare/runtime and actual loader/request/file-cache code. React/query scheduling and native Canvas load/error callbacks are controlled explicitly. MapFS and Taro callbacks are controlled offline; all supplied compressed-image bytes are the real previously reviewed writer PNGs, and the real public cache performs length/dimension/SHA qualification. The fake Canvas validates file presence/content identity and supplies declared dimensions/callbacks; it is not a WEAPP decoder or a rendered pixel oracle. A common read-only acquisition-method wrapper preserves `this`, returns and exceptions and records actual owner calls/settlement; it adds no GL, requests or metadata reads.

The actual nine-state path:

1. Cold valid `.31` FOV intent enables only explicit metadata, with no image request or legacy discovery. After actual manifest resolution, its real field policy selects no image at that FOV.
2. `.05` selects DETAIL plus MEDIUM. A controlled DETAIL native-error callback leaves the actual MEDIUM PNG usable (512 square, field `.11377788994540003`, correct SHA) and reports update failure without declaring the image absent.
3. Explicit retry resolves DETAIL and keeps MEDIUM; both exact asset descriptors share master RGB and availability hashes. The detail descriptor carries `joint-area-alpha` and FITS CRPIX256.5. Compressed files are reused: two initial image transfers remain two after retry, while decode callbacks increase from two to three. These are offline file transfers, not network timing.
4. Wrong explicit hash and foreign reference reject metadata before relabeling/returning old native pixels; the actual science client throws, and no unversioned default discovery occurs.
5. A ready-resource clear makes the old registered image objects non-current, releases their leases and makes the Hook fail with no usable image. Rerender alone causes no acquisition. Explicit retry resolves a new metadata stamp and obtains the two real PNG files again in the new cache epoch.
6. Inactive cleanup and final clear reach entries/leases/bytes/reserved/running/pending/retired/failures zero. The main path totals four offline image transfers and seven controlled decode attempts. No native GC/physical memory inference is made from those references or counters.

Selection checks against actual admitted geometry preserve `.3` OVERVIEW, `.1` MEDIUM and `.05` DETAIL; `.31`, zero and NaN have no level. Scientific availability remains independent of brightness. The prior independent writer/science review proves these same-master files preserve finite black/negative eligibility and actual box alpha; this Hook audit neither recreates that science matrix nor pretends to exercise a partial science publication in the normal renderer.

## Meaningful effect-gap mutation and failed harness history

Controlled interleaving: resolve valid metadata → render the Hook → clear the actual cache before passive native acquisition effects → commit those effects. Current production makes **zero public acquisition calls and zero image transfers**. Removing only the resolver's `resource.isCurrent()` guard in an in-memory Hook variant makes **two actual public-owner acquisition calls and two real PNG transfers**, materializing 711,847 compressed bytes (DETAIL+MEDIUM) in the new epoch from stale metadata. Both variants subsequently clean up. The current gate therefore has observable cache/file effect; it is not a zero-image assertion or a copy of selection output. This is a controlled scheduling counterexample, not measurement of actual React/WEAPP timing.

Failed independent generations are preserved, never upgraded:

- r1 failed before metadata I/O because my CommonJS VM binding omitted the default-import `__esModule` shape. The controlled bridge was repaired; no production change followed.
- r2 and r3 failed their expected mutation-effect assertions because my world variant source argument was not passed to the module compiler. The mutated source was saved but the normal source actually executed in those cases. Consequently those generations do not prove a guard mutant or a production defect. My initial hypothesis that later retirement had canceled the mutant before transfer was incorrect; r4's real executed variant closes the cause and detection evidence. r4 preserves the actual effect rather than weakening the assertion to an empty result.

All successful-generation bound inputs are exact before/after, including the six unrelated Settings/outbox files through the author's input bindings. Existing science assets/recipe and frozen producer identity are reused; no download, image processing, GPU, service listener or IDE was invoked. The prior provenance transport closure remains separate.

## Remaining boundary

The capability is ready for the next explicit scene-envelope/contribution responsibility. Fine/coarse failure recovery is present as a native-reference/descriptor result, not an actual photograph paint claim. Ordinary scene opt-in, single-contribution replacement inside valid fine area, uploaded/prepared-vs-visible qualification, actual completed-frame source callback and normal credit still require their own integration. Source colors, PSF/artifacts, footprint background, full astrometric accuracy, WEAPP cache/decode/WebGL, final interaction/quality and 200DAU capacity remain unverified. No package/driver/native total-memory, real FPS or cloud deployment conclusion follows.
