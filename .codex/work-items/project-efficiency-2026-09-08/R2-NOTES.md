# R2 client response cache

Status: implementation finished; final full app regression 336/336 passed. Root owns isolated WEAPP build/integration and any device checks. No Context, visual/design, asset, Source, root package or workflow files changed by this subtask.

## Changes and ownership

- `apps/wechat-miniapp/src/services/response-cache.ts` is the single response-cache owner. `api-client.ts` retains transport, auth/session and endpoint orchestration and delegates response storage. Memory and persisted representations remain caches, not domain/query state owners.
- Exact existing group/path/account keys and ETag matching stay intact. Invalidations fence requests already in flight, so a late 200 cannot repopulate a revoked key and an invalidated 304/offline fallback cannot reuse the old body. Existing cancellation/supersession and 30-minute stale rules remain.
- Memory admits up to 24 entries / 6 MiB serialized UTF-8; persistence up to 24 / 3 MiB of actual serialized chunk data; each persistent response up to 2 MiB. These are representation budgets, not measured heap limits. Bodies use at most 240 KiB UTF-8 chunks, including surrogate-pair-safe splitting; native JSON string escaping is included in the storage budget.
- Changed bodies are written asynchronously and coalesced; the small schema-2 metadata manifest alone commits synchronously after complete body writes. This single pointer is intentional: invalidation can remove a body from recovery before returning, while an already pending native chunk write cannot later publish it. No asynchronous stale manifest can race a delete. Unchanged responses are not rewritten. Restart loads the manifest and only the requested body; bounds, checksum/envelope validation, expiry and orphan cleanup fail to cache misses.
- Schema-1 data migrates through the same writer; its old payload survives failed replacement. Full/corrupt/partial storage does not reject a valid network result. Whole-batch failures retain the last committed manifest. Generation changes requeue unrelated latest bodies and delete revoked partial chunks. Account deletion awaits pending cleanup; the account-switch branch removes only the deleted account.
- Root explicitly approved the single nonvisual Settings clear-handler binding. `clearTemporaryApiCache()` clears map/search/sky/observation-context response/query roots and cancels their reads. It does not clear authentication, preferences, favorites, plans, profile/import/draft records, active HTTP mutations or React Query's mutation cache. `request-lifecycle.ts` gained selective read cancellation; existing full acceptance reset keeps its original separate semantics. Settings state reset happens synchronously after the response fence, before waiting for background cleanup, so old route context is not retained during pending storage I/O.

Official API basis: installed Taro storage types and [Taro setStorage](https://docs.taro.zone/en/docs/apis/storage/setStorage), which supports asynchronous writes and states 1 MB per key / 10 MB total. No new dependency. The writer leaves budget headroom for replacement and other application storage; unavailable storage remains a best-effort cache.

## Checks and measurements

- Focused transport/cache/auth regressions: 37/37 initially passed. A subsequent focused run after Settings/race coverage passed 33/33. Final Mini Program full suite passed 336/336 in ~25 seconds; output is recorded in `R2-app-tests.log`.
- Mini Program `npm run typecheck --workspace @starward/wechat-miniapp` passed after fixture typing fixes. Final byte-loop optimization does not change interfaces; final rerun belongs to integration if otherwise required.
- Tests cover Unicode bytes; a >300k-character / ~707KB response; chunk limits and lazy restart readback; coalescing and unchanged bodies; count/byte eviction; memory-only oversized entries; full/failed body and manifest writes; malformed manifest, missing/same-length-corrupt/orphan chunks; expiry; atomic legacy migration; clear/account erasure during a paused native write; unrelated concurrent writes; newer body supersession; exact URL/account ETags; invalidated 304/stale/late 200; QueryClient cancellation; and preservation of active mutations and identity/library state.
- Backend collaborator produced `R2-real-sky-envelope.json`: exactly 680,798 JSON characters / 707,203 UTF-8 bytes from committed Gaia2048 stars / 20 frames plus deterministic fixture weather and memory repository. This is not live weather or a physical-device observation.
- `R2-cache-benchmark.mts` feeds that exact envelope through the actual cache owner plus injected storage. It was rejected by the old 300,000-character predicate; new memory/restart readback succeeds. Native adapter observes 3 asynchronous body writes plus a ~194-byte synchronous manifest; maximum storage value 268,731 bytes. The desktop cold cache-admission sample was ~11 ms after avoiding per-character allocation in UTF-8 accounting; this is not phone latency.
- Sequential 24 x 60,000-byte synthetic payload writes, retaining all 24 entries on both sides: old full snapshots sent 19,500,354 serialized bytes versus ~1,608,644 body-plus-manifest bytes, ~91.75% less adapter transfer. This is measured serialized bridge payload, not a claim of native disk speed, FPS, bundle reduction or network reduction. Exact run metrics live in `R2-cache-benchmark.json`.

## Root integration and durable Context suggestion

- Run the planned isolated `weapp-check` build; do not disturb `dist/weapp` or preview sessions. No physical-device storage/readback has been established here.
- In `project_context/areas/main/implementation-index.md`, add only the response-cache owner adjacent to api-client/query ownership: response-cache.ts owns bounded conditional/offline representations, asynchronous body persistence and immediate invalidation/recovery. Exact budgets/schema remain code-owned. Remove response-cache extraction from the api-client maintenance-boundary debt, while preserving unresolved transport/identity separation only if still warranted. Root is already editing those Context files; this subtask intentionally did not edit them.
- Recheck the exported Settings clear operation against current query-root callers if other agents change those names. The selected roots are existing map/search/sky query roots, not an unrestricted QueryClient.clear.

## Files owned by R2

- New: `src/services/response-cache.ts`, `response-cache.test.ts`.
- Modified: `src/services/api-client.ts`, `api-request-test-support.ts`, `cache-policy.ts`, `request-lifecycle.ts`, `request-lifecycle.test.ts`, `account-reauthentication.test.ts` under `apps/wechat-miniapp`.
- Single nonvisual binding: `apps/wechat-miniapp/src/content/settings/index.tsx`.
- This note, app-test log, exact fixture envelope and cache benchmark files are task-local evidence, not durable Context.


Independent follow-up: backend_efficiency found and repaired selective-invalidation/304 identity and native cleanup failure-reporting issues. Current details, additional file ownership, 48 serial regressions and final typecheck are in [R2-REVIEW.md](R2-REVIEW.md); earlier 336-test results above predate those repairs.

Native verification: R25-native-result.json/png and R25-native-fixture.mjs establish actual DevTools wx async storage of707203 B,3body writes,new owner-instance readback and0 remaining task keys. Scope is isolated native APIs,not phone/process restart.
