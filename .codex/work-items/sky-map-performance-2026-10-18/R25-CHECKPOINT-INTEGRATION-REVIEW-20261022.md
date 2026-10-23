# R25 checkpoint and owner-observation integration review

2026-10-22. Independent review of the task-only r25/gen29 preparation before phone qualification. The reviewer did not edit implementation, production source, frozen candidates, services or device state. Only this report was written. The [performance method](../../skills/starward-miniapp-development/references/performance-investigation.md), [actual phone/OOM result](R25-MEMORY-PHONE-RESULT-20261022.md) and [prior owner investigation](R25-STELLAR-RETENTION-INVESTIGATION-20261022.md) govern the evidence boundaries.

## Decision

**No P1/P2 finding in the reviewed current r25 route.** The implementation is suitable for the next bounded target qualification. This is a local implementation review, not confirmation that the new route has already worked under the phone's high-memory condition or that memory retention is fixed.

The change answers two concrete gaps: acknowledged early observations no longer depend on the phone surviving until 90 seconds, and selected old SAO entries can be related to actual cache replacement and aggregate membership. It deliberately does not promise a whole-heap retaining graph.

## Reviewed behavior

- `r25-memory-lifetime-observer.ts` returns a frozen last-checkpoint receipt using copies of the live event/checkpoint arrays. Future observation remains possible. Checkpoint slot 10 is reserved for the terminal point; omitted intermediate points remain counted. Seal still releases weak witnesses and makes the full scalar record immutable.
- `r25-memory-lifetime-adapter.ts` queues at most 10 immutable scalar strings, each limited to 32 KiB. It uses one request at a time, at most two automatic attempts per packet, and exact-byte manual retry. A failed earlier packet does not permanently prevent later packets from being attempted. Only HTTP 200 with `stored:true` acknowledges a packet; a new run cannot replace unacknowledged data. Repeated export while a request is in flight does not add another simultaneous request.
- Baseline is queued immediately; 5/15/30-second active observations are queued only while tracking is active. Actual pause/hide/scope/retirement observations stop new allocation and owner tracking, retain weak witnesses for bounded drain, and export without waiting for the final deadline. Final export releases witnesses. Unsupported WeakRef remains explicit, with no invented liveness.
- `r25-stellar-owner-observer.ts` selects at most 8 tile keys and 8 aggregate objects. Stored product references are WeakRefs or weak keys; map values and exported memberships are bounded scalar data. There is no retained product callback, span array or catalogue history. At steady state, the owner observer retains at most 48 WeakRef objects in addition to the existing six-site lifetime samples. Cumulative observer allocation is not zero and remains part of run conditions.
- The two owner hooks are placed immediately after the real `transformed.set(tile,cached)` and before the real `return resolved`. They record actual entry identity and the existing spans' membership. Stripping only the declared import and calls restores the production resolver byte-for-byte. The transform object's relation to its closed-over arrays follows the actual source; the new record does not invent a direct heap edge between the six-site sample IDs and every transform array.
- The collector validates the new fixed schema before path/disk access, uses a separate sequence-qualified filename, preserves exact retry/conflict handling and the existing 32-file limit, and continues accepting historical v1 lifetime receipts. Earlier acknowledged files are not rewritten by subsequent points. This supports persistence against loss of the phone VM; it is not a claim of atomic host-crash or power-loss durability.
- The current builder selects r25/gen29 and a 20,000 ms normal-play trial, materializes the owner observer and hooks, and binds templates/source into the candidate. The actual guarded product Pause callback remains the stop owner. The fixture parameter changes preserve the 20-second boundary, replacement-run guards, hide/unmount behavior and separate terminal receipt. The old 60-second delayed-clock expectation is retained only for the historical 60-second case.
- `refresh-unbuilt` remains confined to the selected task candidate with `prior.result === null` and absent generated bundle/project. Up to three distinct preparation archives are created without overwriting an earlier archive. A frozen candidate is still rejected. Historical frozen candidates are evidence, not rebuild targets for the changed templates.

## Executed checks

The reviewer ran the four affected test files with Node's local forced-GC test option:

`node --expose-gc --test scripts/r25-memory-lifetime.test.mjs scripts/r25-memory-lifetime-adapter.test.mjs scripts/r25-memory-checkpoint.test.mjs scripts/r25-stellar-owner.test.mjs`

The paths above are relative to this work item's directory. **23/23 passed, zero skips.** Coverage includes immutable early receipts, supported/unsupported capability, mixed liveness, end-slot reservation, bounded retries and file capacity/conflicts, schema and conservative payload width, no strong lifetime-observer root, and an explicit retained-aggregate positive control followed by release.

The real complete resolver/transform owner test uses controlled geometry admission and numerical helpers. It establishes the ownership distinction and probe behavior locally, not target astronomy, natural phone GC or React/Taro roots. The prior separately preserved real-SAO experiment retains its own scope.

The reviewer also executed `verifyNormalBaselineV3Fixture` directly against the generated r25 source with `normalPlayTrialMs:20000`. All 30 reported facts passed, including unchanged complete accepted-state behavior, 15-second metrics, exact same-run 20-second Pause, hide/unmount/replacement guards and deferred terminal retries. This fixture still labels itself as non-phone evidence.

Independent frozen r24 `project/weapp` readback remained SHA-256 `c7ebcfd83650572dec468e1ce9e5b481b1abb237ab06b1e73aa9d1d6b3c8eea7`, 337 files, 5,041,951 bytes. The reviewer did not refresh or rebuild it. Final r25 typecheck, complete build/inspection and candidate binding remain with root after its final preparation refresh.

## Required interpretation of the next phone result

The minimum useful qualification is a current candidate/process binding, actual nonempty full-sky BSC/SAO work, and newly read-back 5/15-second files carrying nonempty owner relations before the terminal deadline. Read actual point timestamps, omissions, errors, sequences and acknowledgements; do not substitute scheduled timer delays for observed timings.

`latestObservedEntry`, `latestObservedTransform` and `firstIsLatestObserved` describe the last cache write observed while tracking. New tracking stops on Pause or retirement, so these values must not be relabelled as the current cache contents after that boundary. A live old aggregate after demonstrated replacement directs investigation outside the latest-per-tile cache, but is not a retaining root or proof of unbounded growth. Collected samples, observation-only overhead, deterministic sampling bias, unselected objects and unobserved isolates retain their existing limits.

Do not restart the failed Heap/Timeline or long OOM window to validate these implementation changes. A successful early checkpoint route should advance the owner-specific diagnosis; it does not close the unresolved V8 OOM, product memory acceptance or complete Goal.
