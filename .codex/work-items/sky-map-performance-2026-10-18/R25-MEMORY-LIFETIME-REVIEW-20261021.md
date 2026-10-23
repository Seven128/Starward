# R25 memory lifetime probe independent review

Reviewed 2026-10-21/22 by a separate read-only agent. Scope: the task-only observer, protocol, tests, adapter, source transform, and the actual transform / GPU upload / time / Context call sites. No product source, frozen candidate, device, IDE, service, or Git state was changed by this review.

## Open finding

**P2 — accepted counter values can make a sealed receipt permanently exceed the shared 32 KiB export boundary.** `r25-memory-lifetime-observer.ts` accepts quantities up to `1e12` and retains up to ten scalar checkpoints. `r25-memory-lifetime-adapter.ts` seals before the byte check; an oversized cached receipt cannot be exported or restarted, and a retry sends the same oversized text. The protocol rejects it too. The existing overflow test uses an invalid clock and all-live witnesses, which leaves shorter values than a valid clock with mixed live and collected witnesses.

Reproduction against the reviewed files: configure generation 28 and a valid hash; use an identity-preserving fake WeakRef; for each of nine rounds track 700 objects at each of the six sites, with quantity `1e12`; make alternating references dead; advance an initially valid clock by 10001 ms; add `scope-ended` checkpoint. Start contributes the first baseline checkpoint; add seven `scope` events. Result: **33,380 compact UTF-8 bytes**, ten checkpoints, and `validateR25MemoryLifetime(...) === false`. The same reproduction at quantity 8404 produces **31,592 bytes** and validates. This establishes an admitted-input/export-budget inconsistency, not a claim that the current phone workload has hit it. Preserve overflow/unknown semantics while making the permitted receipt fit the writer limit; do not silently drop interpretation-critical data.

## Confirmed implementation properties

- The observer stores WeakRef instances and numeric metadata, never a direct strong reference to a tracked object. `deref()` is immediately reduced to a boolean. WeakRef creation and dereference still keep a target alive until the current JavaScript job ends; this observer cannot establish collection within that job.
- First 32 witnesses stay fixed. The recent cohort is a FIFO of at most 32 selected after every 16 subsequent hook calls. Per-site retained witness count is at most 64; omitted witnesses remain visible through selected/evicted/unselected counters. Recent-cohort membership changes during active tracking, so differences between its checkpoints are not automatically changes to the same object set.
- Sealing drops weak witnesses, deep-freezes the scalar receipt, and returns the same receipt on retry. Tracking and checkpoints after seal do not mutate it.
- Unsupported WeakRef yields explicit unsupported capability and null liveness cohorts. Invalid or backwards wall clock and counter overflow remain explicit. Array slots are not heap bytes; typed view and backing byte lengths overlap.
- Adapter state contains timers, booleans and sealed text, without retaining a product frame, context, target object, or product callback. Pause, hide, retirement and Context-scope end stop new tracking while preserving already sampled witnesses until seal. Active or unexported prior runs reject another start, and pending POST prevents a new run.
- Instrumentation observes the four actual shared stellar-transform arrays and the actual newly allocated `Float32Array` plus backing buffer passed into `gl.bufferData`. It leaves the original array sizes, data and product publication owner intact.
- Protocol admits fixed fields, fixed site order and finite counters. Run IDs are limited to the fixed prefix plus decimal/alphanumeric components, excluding traversal separators. No free object payload or location/account identifier is admitted.

## Validation and claim boundaries

Independent command: `node --expose-gc --test .codex/work-items/sky-map-performance-2026-10-18/scripts/r25-memory-lifetime.test.mjs` — **4/4 passed**, including real cross-job collection of an observed array. Separate local scalar-budget reproductions produced the open finding above.

No phone qualification was performed by this reviewer. Node collection proves the local observer does not introduce that retaining root; it does not prove Mini Program WeakRef support, device collection, acceptable observer overhead, module-wide memory attribution, or absence of leaks. These samples cover only six allocation sites, not child objects that escape separately, whole JS heap, response cache, GPU resources, textures, Native allocations, or retaining paths. A typed view/backing becoming collectible does not prove the GL allocation has been released. The parent’s MemoryInfra result remains scoped to its actually observed Blink providers.

Builder integration, collector admission, adapter fake-timer tests and final phone artifacts were still being prepared when this review completed; they are not certified here.

## Reviewed content identity

| File | SHA-256 |
| --- | --- |
| `scripts/r25-memory-lifetime-observer.ts` | `59f51b233e9f3fdbdf4b120e2bd11fdc45e6e1bf4af54b41de7de9f8484520b5` |
| `scripts/r25-memory-lifetime-protocol.mjs` | `5ac400acb7c94a6e0f4281ba2ab5ff040e53fb531cbcd17b8a7a9082542b67d5` |
| `scripts/r25-memory-lifetime-adapter.ts` | `97d2769fa4abb61453710511ac6c065babaa7364f3133d4fd468696a95c97aae` |
| `scripts/r25-memory-lifetime-instrumentation.mjs` | `2b488176a5597fc519a8538c5522d3ebf71801f21b0dbb7483d242522a3df96f` |
| `scripts/r25-memory-lifetime.test.mjs` | `e599e4634c12f29543bd58dc7951e26e06a1ccbf8421e8e754ee19e52b74fc14` |
