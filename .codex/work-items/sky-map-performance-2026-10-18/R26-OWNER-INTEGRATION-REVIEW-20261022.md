# R26 outer-owner observation integration review

2026-10-22. Independent review of the task-only r26/gen30 extension before phone qualification. The reviewer read the actual observation modules, exact source transforms, protocol/collector, generated candidate, selected installed framework and tests. No implementation, production source, frozen candidate, device, IDE, service or Git state was changed. This report is the only repository write.

The [performance method](../../skills/starward-miniapp-development/references/performance-investigation.md), [r25 phone qualification](R25-CHECKPOINT-PHONE-RESULT-20261022.md) and its [independent review](R25-CHECKPOINT-PHONE-REVIEW-20261022.md) remain authoritative. The tool combination is already usable for the user's targeted performance and memory investigation. This extension answers the next specific repair question—whether an observed outer owner still reaches the selected obsolete aggregate identities—and is not another general tool-selection gate.

## Decision

**No P1/P2 finding in the reviewed current r26 route.** The extension is suitable for the bounded target observation after root completes the full candidate build/inspection and actual session binding. This is an implementation review; the phone's exported host-Fiber entrance and a concrete path to its old aggregates remain unverified.

The current prepared candidate is gen30, source `0ea8e7ed28acf55ba0ab6e7a1978e5cc6965f0dfa56eb2a8e43abe6691074bc8`. Root owns the final compiled bundle and any source-binding changes following this review.

## Actual ownership and use boundaries

- The added `aggregateId()` reads the existing weak aggregate-ID map and returns a scalar or null. It neither adds keys nor retains an object in a value. Release clears that map through the existing owner. Null means unselected, not collected.
- Request usage is observed after the real lifecycle's disposed guard and `latest = frame`; it means an admitted lifecycle request, not every page attempt. Paint usage follows the existing actual `paintStarted(frame)` hook. Accepted usage follows `attempt.publish` and the existing actual acceptance hook. The accepted-command slot separately reads the resulting `presentedSkyFrameRef`; a usage count is not a claim that every field of the submitted frame became current state.
- Three exact slots are observed: lifecycle latest, draw preparation and accepted command. The source transform includes actual assignments and clears, including both lifecycle hide/dispose `finally` paths, preparation reset/failed/reentrant/uncacheable paths, and all three accepted-state null resets. The existing accepted updater, command setter, draw behavior and normal product scheduling remain unchanged.
- Pause stops workload-use counting, but slot assignments/clears continue until the observation ends. Each slot distinguishes unobserved, empty, selected, unselected and unknown. The eight reserved counter rows do not assert that eight aggregate samples exist; the protocol joins nonzero counts and selected IDs to the actual owner sample list.
- Exact stripping of only the declared import/calls restores the complete source bytes. The unchanged r17 transport and stage recorder are reused; the extension does not rely on r17's active flag after its 15-second metrics seal.

## Framework graph scope and retention safety

The selected installed versions read from the Mini Program's resolution path are `@tarojs/react` 4.2.1, `@tarojs/runtime` 4.2.1 and React 18.3.1. The adapter's `internalInstanceKey` is a public package export in both runtime code and declarations. `eventSource` is the actual runtime export. The Fiber field layout is still a version-bound implementation contract, not a portable public heap API.

The coordinator calls `eventSource.get()` only for `spot-night-sky-scene` and `spot-night-sky-scene-selection`; it does not enumerate unrelated app nodes. The observer checks exact descriptor-backed ID, host tag and `stateNode` identity before following `return` and `alternate`. It examines only function-like Fiber hook state, base state, known queue eager state, and whitelisted object fields/array indexes. Getters, arbitrary property names, function bodies, callback contexts, native objects and WeChat private IPC/CDP are not inspected or exported. Descriptor/iterator/lookup failures and skipped accessors are counted.

Limits are explicit: two entrances, 32 ancestors, 32 function Fibers, 1,024 hooks per Fiber, 32 updates per queue, 4,096 visited value objects, depth six, 32 array items, 24 matches and 32,768 descriptor reads. Cycles terminate. Temporary node/queue/seen structures exist only during the synchronous call; the returned frozen result contains scalar counts, fixed labels, sample IDs and paths. The coordinator retains only this scalar result. The weak ID callback closes over the existing weak owner, not a product frame history.

`host-linked` and `alternate` identify the actual traversed branch. The result explicitly says the current committed tree is unresolved: the node's creation-time link need not point to the currently committed member. A path is evidence of the inspected strong fields at that moment, not by itself a framework leak, full retaining root, or whole-heap coverage. No match in inspected fields cannot exclude opaque callbacks, other roots or skipped/capped data.

The coordinator scans at most twice per run: `active-5`, then the first `drain-10`. Later drain/end packets carry the last scalar scan with its original phase and `checkpointClockElapsedMs`; they do not pretend to contain a fresh graph. This clock field belongs to the surrounding checkpoint observation before the synchronous graph scan. The graph's own wall-clock duration is separate, with equal ticks reported as below-resolution/null. A missing Canvas entrance remains unavailable rather than a clean-memory result.

## Transport, compatibility and budget

The r25 adapter is reused through an exact template transform. Its finite single-flight queue, at most two automatic attempts per packet, immutable byte retry, successful-store acknowledgement and terminal reservation remain in place. The new owner data are appended to the same independently saved checkpoints, under the separate `starward-r26-memory-checkpoint-v1` schema. Early records still do not depend on survival to 90 seconds.

The strict new validator limits the fixed fields/path tokens, known phases, sample IDs and all nested shapes. It validates the unchanged observation/owner portion through the historical r25 validator, then checks that use/slot/graph matches refer to actually selected IDs. The existing collector keeps validation before path access, sequence-qualified files, exact retry/conflict behavior and the 32-file limit; historical r25 packets remain accepted. No arbitrary graph/value export is admitted.

An independent conservative serialization calculation used all eight owner memberships, all eight usage rows, all three slots, all 24 longest graph paths, longest fixed labels, and 13-character numbers even where the actual allowed maximum is smaller. It yielded **20,762 compact UTF-8 bytes**, below the 32,768-byte packet limit. This is an upper-bound serialization exercise with deliberately impossible count combinations, not a valid diagnostic receipt or target measurement.

## Checks executed by this reviewer

1. `node --expose-gc --test` for `r26-memory-checkpoint.test.mjs`, `r26-fiber-owner.test.mjs` and `r26-aggregate-use.test.mjs`: **15/15 passed, zero skips**. These cover actual complete lifecycle and preparation owners, exact source restoration, use/slot semantics, descriptor/getter/cycle/cap behavior, no probe-held strong history, current/alternate distinction, immutable early data, two-scan restriction, strict protocol and collector coexistence/conflicts.
2. The framework test executes the complete installed Taro renderer/React/reconciler with the native `setData` boundary controlled. It validates actual mount/update identities and removal of the owned entrance at unmount. This is stronger than an extracted-method test but still not phone or Starward native-lifetime evidence.
3. Executed `verifyNormalBaselineV3Fixture` directly against the generated r26 source: **30/30 reported facts true**, including exact same-run 20-second product Pause, 15-second metrics, original accepted-state semantics, hide/unmount/replacement guards and terminal retry behavior. Fixture results remain explicitly non-phone evidence.
4. Independently fingerprinted the frozen r25 `project/weapp`: unchanged `96ff37ca9d10824983b9493146ab806539c5d19e805ca7a6a252b5ed7d8ecda3`, 337 files / 5,046,564 B. No old candidate was rebuilt.

Do not broaden these checks merely for reassurance. Root should complete the new candidate's full typecheck/build/inspection and use the already authorized ordinary-preview route for this specific observation. On the phone, verify actual entrance coverage, scan limits/errors, original scan timestamps, nonempty sampled identities and saved files before interpreting a hit. An observed path must be distinguished from a legitimate current/alternate/in-flight holder using actual usage, slot and later drain facts. Stop expansion when a decisive owner is found and repair that lifetime; a negative covered scan is not a no-leak pass.

The prior high-memory tool qualification, actual V8 OOM, both product priorities and complete Goal retain their existing status. This review neither supplies a new phone result nor closes the unresolved retaining root or product acceptance.
