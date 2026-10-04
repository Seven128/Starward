# Public image startup and temporary-cache clearing integration

Date: 2026-10-02. Owner: delegated `sphere_grid/cache_launch_clear`; this is an implementation record, not independent review or target-runtime acceptance.

## Change

- `app.tsx` retains the existing legacy `skyImageFileSession.removePreviousFiles` startup call and independently initializes the public encoded-file singleton. Synchronous unavailable-runtime and asynchronous initialization failure use a bounded diagnostic marker. The persistent namespace is owned by `sky-public-image-runtime.ts`; this entrypoint does not sweep it as legacy files.
- `clearTemporaryApiCache` synchronously invokes that same singleton's clear before API request cancellation or any await. Rejection handling is attached immediately. API read cancellation, selective response invalidation, query cancellation, query removal and response flush are attempted independently even after another cleanup fails. The public owner's `partial`, `pending` or rejection and response-cache incomplete cleanup report the existing `local_cache_cleanup_incomplete` error. Successful completion keeps the existing count of cancelled API reads.
- The transport fixture explicitly injects a typed public-image clear function. The fixture's native image owner is synthetic; these service checks do not demonstrate file integrity, leases, native persistence or storage capacity. Existing count output, assertions and tests were preserved. The deliberate event-loop-yield test retains inactive query fixture data by setting its GC lifetime to Infinity rather than allowing the generic fixture's zero-delay GC to erase unrelated data.

## Verification

Before changing the production clear function, the four new service regressions failed: missing public clear invocation/order, false success for partial cleanup, and early exits from query/response cleanup failure. An initial fixture added an output field to `counts` and inherited zero-delay query GC; these caused three failures in the first combined post-edit run. The fixture was repaired without weakening existing assertions or changing production query GC. The final affected test run passed all 49 tests, including four new regressions and the original 45 tests:

```text
node ../../tools/run-node.cjs --import tsx --test src/services/api-cache-clear.test.ts src/services/response-cache.test.ts src/services/request-lifecycle.test.ts src/services/delete-transport.test.ts
tests 49; pass 49; fail 0; cancelled 0; skipped 0
```

The new cases exercise held public cleanup with immediate API/query/durable-response cleanup, partial/pending/rejected/synchronous unavailable public cleanup, synchronous/rejected query cancellation failure, response invalidation/flush failure, and incomplete durable cleanup. Unrelated plan responses/queries and authored drafts remain; a cancelled API callback cannot repopulate the temporary cache. `git diff --check` passed for the affected files. Typecheck is reserved for the parent migration's combined check.

## Source binding after final affected run

| File | SHA-256 |
| --- | --- |
| `apps/wechat-miniapp/src/app.tsx` | `a978497fb4e398c1441742ab96ce832f3d202993d35bcee45c8ec861119e7aff` |
| `apps/wechat-miniapp/src/services/api-client.ts` | `427095636955e0147b67a487bf5cf489f49a78f7a58966ee3433b639de590d7d` |
| `apps/wechat-miniapp/src/services/api-request-test-support.ts` | `d75a608cd444e5725fa0a1d8a7ebb8cc2d12be17c4c1f3c0b3b53be530024ba2` |
| `apps/wechat-miniapp/src/services/api-cache-clear.test.ts` | `fc05e9fe7f9e243916d23cac5cb553456b08e56a614129fc6593ed5eaa94e237` |

Existing shared transport/cache-fence changes in `api-client.ts` and existing clock injection in the harness were present at delegation start and remain intact. Only the app entrypoint, import/clear function, fixture injection and new clear-service tests were edited in this delegation. Cache core/runtime, hook/request adapters, six preserved settings/outbox changes, PLAN/Context, IDE sessions, services and phones were not changed or started. No commit, push, deployment or source download occurred.

Native launch, file-cache retention across launches, actual settings feedback with live Canvas leases, WX file-system behavior, device quota and complete experience acceptance remain unverified by this service run.
