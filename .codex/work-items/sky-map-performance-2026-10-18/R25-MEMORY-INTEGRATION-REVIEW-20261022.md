# R25 memory candidate integration independent review

Reviewed 2026-10-22 by a separate agent. Scope: task-only observer, strict receipt protocol, adapter, source instrumentation, their tests, collector dispatch, builder integration and the affected normal-path fixture. The reviewer ran local tests and read the prepared source; no device, IDE, service, build, production source or Git operation was performed. This review document is the only retained file written by the reviewer.

## Conclusion

**The prior export-budget P2 is resolved for the reviewed implementation. No new P1/P2 was found in the scoped integration review.** The candidate is ready for the root's remaining build and actual-target qualification. This is not a verdict that the phone memory route works, nor that Sky has no leak.

The earlier finding remains documented with its original file identities in [the first lifetime review](R25-MEMORY-LIFETIME-REVIEW-20261021.md). This follow-up supersedes that finding's open status only for the file identities below.

## Budget correction and independent checks

The source now declares the six site names and units once at the receipt root. Each checkpoint uses the fixed site index. It omits only the redundant `unselectedAllocations` value, which is exactly `allocations - selected`; allocations, selected witnesses, eviction counts, collected/alive/unknown counts, quantities, ages, clock errors and omissions remain available.

The reviewer independently repeated the previous failing case: identity-preserving fake WeakRef, six sites, nine rounds of 700 hooks per site at quantity `1e12`, alternating live/collected witnesses, valid clock increments of 10001 ms, ten checkpoints including baseline, and eight events. The current compact receipt was **28,836 B**, with a valid clock, and passed the strict validator. The generated run ID can vary its exact serialized length slightly.

A separate conservative serialization bound assigned the maximum decimal length to counters, six-digit allowed times, two-digit witness counts, maximum run-ID length, the longest phase/event names and longer boolean literals. It deliberately allowed combinations that cannot coexist, so it overestimates a real receipt. That bound was **31,721 B**, leaving **1,047 B** below 32 KiB. The phone's byte check and the collector's compact UTF-8 byte limit remain intact; the limit was not increased. Pretty-printed local storage has a different byte size and is not the transport limit.

Independent command:

```text
node --expose-gc --test .codex/work-items/sky-map-performance-2026-10-18/scripts/r25-memory-lifetime.test.mjs .codex/work-items/sky-map-performance-2026-10-18/scripts/r25-memory-lifetime-adapter.test.mjs .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-phone-probe-v3.test.mjs
```

**23/23 passed, zero skipped.** Coverage includes the original budget mechanism, actual Node cross-job weak collection, explicit unsupported capability, bounded cohorts, clock invalidation, immutable seals, adapter 90-second sealing, individual pause/retire/hide/scope paths, same-byte failed export retry, pending/unacknowledged run isolation, collector rejection before disk access, exact retry/conflict/capacity behavior and existing v3 coexistence. Local Node collection is not Mini Program GC evidence.

## Integration review

- Collector dispatch recognizes only the new fixed schema and calls its validator before constructing a path or touching disk. Fixed variant/run-ID rules prevent this schema from supplying traversal paths. Memory receipts cannot be misclassified as the legacy terminal receipt. Existing exclusive creation, serialized writes, exact-content retry, conflict response and 32-file capacity remain.
- Clock validation now requires the invalid flag, error counters and null elapsed value to agree. Schema keys, site order, units, cohort bounds and witness conservation remain checked. The actual candidate binds generation 28 and the full source hash; the adapter replaces both declared placeholders before compilation.
- The finite builder adds only review r24, uses generation 28 for its memory branch, includes the new templates in source binding, and writes a distinct task directory. It transforms complete current source and preserves predecessor directories. Its source/template readback, source re-transformation check, dependency checks and complete-build path remain active.
- The normal-path fixture stubs only the optional diagnostic adapter boundary while continuing to exercise its existing product behavior. The transform comparison removes only the explicitly declared task import and two hook statements before comparing all remaining transform text with production. The actual adapter is tested separately with its real observer and byte-count implementation; this fixture stub does not establish target observation behavior.
- The instrumentation still observes actual four transform arrays and actual GPU-upload typed view/backing objects, without replacing their math, lengths, payload or the buffer passed to `gl.bufferData`. No new product frame, Context or product callback is retained by the observer/adapter.

Read-only binding verification succeeded for source hash `d42ea5e8b885927e00ac0ee71df78267d87dd4719b17fd0a7d9b005191cea9b4`: recomputing the binding-input hash matched; reviewed templates and builder matched the manifest; the seven affected prepared feature files matched their manifest hashes. The observed manifest was prepared with generation 28 and had no completed build result at this review's read. No claim about final bundle bytes follows from that source check.

## Target interpretation still required

The 90-second timer is an export deadline, not a guarantee that the host allows timely background execution or that an `end` liveness sample exists. The adapter can fill its ten-checkpoint budget when several lifecycle paths occur together; the existing omitted count makes that explicit. Read actual checkpoint timestamps and `checkpointOmitted`, especially after pause plus hide/retirement, rather than calling the deadline a measured 90-second survival interval.

The first cohort is fixed; the recent cohort changes membership during active tracking. After tracking stops, both can be compared across later checkpoints, but active recent-cohort count differences are not a same-object growth curve. WeakRef construction/dereference preserves the target through the current job; target collection must be observed in later jobs. A missing collection is not proof of a retaining path or leak, and a collected view/backing object does not establish GL/native release. Array-slot counts are not heap bytes, and view/backing byte lengths overlap.

Current phone capability, real nonempty full-sky work, source/scene binding, observer overhead, actual pause/retirement, collected-object evidence and the useful causal decision remain the root's target qualification. The six allocation sites do not cover whole-heap retainers, separately escaped child objects, all response caches, textures or native allocation stacks. The previously verified MemoryInfra/GC coverage remains limited to its actually observed renderer providers.

## Reviewed file identities

| Script | SHA-256 |
| --- | --- |
| r25-memory-lifetime-observer.ts | `59f8d45e51a862d906cced1e520e55ec7a2bb3af43c2ea450b6c9f60858428f8` |
| r25-memory-lifetime-protocol.mjs | `821b86f2688db33df6cc3b85b1e75b267384dd7c9055cb6fbe3ef9c55b84bcd8` |
| r25-memory-lifetime-adapter.ts | `97d2769fa4abb61453710511ac6c065babaa7364f3133d4fd468696a95c97aae` |
| r25-memory-lifetime-instrumentation.mjs | `2b488176a5597fc519a8538c5522d3ebf71801f21b0dbb7483d242522a3df96f` |
| r25-memory-lifetime.test.mjs | `80c671b5e23734b24b4b0f86a40e77e44fcacb144443b4c1e272b95814872fed` |
| r25-memory-lifetime-adapter.test.mjs | `ef26e5af98a20c58b53b085946433b02cbef7e853d4708c0fed935cb0dc86719` |
| r17-normal-baseline-v3-fixture.mjs | `447371d29bd91ae02867e4a7d8700f84ef36cd178e872f3ef4f187ca728ca0f7` |
| r17-phone-probe-collector.mjs | `28ea431977d162c5d514756e30017c6f94c4627d8f75119e2a76be8f5a861379` |
| build-r17-normal-baseline-v3.mjs | `bbfd1af230d17e4bbb673d3d5a5c8286b37027ecca7312d5b0bf640c299ffe18` |
