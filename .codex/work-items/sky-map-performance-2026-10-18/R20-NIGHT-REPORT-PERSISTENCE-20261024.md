# R20 NightReport persistence — paused WIP, 2026-10-24

Current continuation: [confirmation and persistence repair](R20-NIGHT-REPORT-CONFIRMATION-20261024.md) owns the new implementation/checks. The paused status and unchecked items below describe the original frozen WIP; latest execution remains in HANDOFF. Preserve this original before evidence.

This batch is **unfinished, unreviewed and not behavior-verified**. The user asked to commit all work and transfer to another computer while implementation was in progress; the root reports that the existing Goal is paused. This file preserves the exact next work rather than declaring a completed family. The one existing PLAN and all earlier incomplete obligations remain authoritative.

## Adopted scope and product boundary

- Continue the Independent API responsibility in PLAN R20; preserve the adopted UI → overlay → Sky outcome order. No provider/scoring/permission/cost decision, deployment, device acceptance or new dependency was adopted.
- Root confirmed the existing Source Plan `POST /v1/night-reports` query experience remains. A trusted composition resolver may select local-owner durable storage for that same write owner. A guest still receives an ephemeral basic query; no arbitrary guest gains private report GET. Missing resolver must reject private reads. Caller actor/role headers are not authorization.
- Tonight gains no new Save button or competing command flow. An unconfirmed attempt must retain its full original input/requestId; after a confirmed result, a later refresh creates a new requestId and obtains current evidence. Changing Decision Context must not retarget an old attempt or present its report as the new context.
- A replay keeps the original generatedAt/expiresAt/provenance, missing/partial meaning and report contents. It must not be called newly refreshed evidence. The current local-owner resolver is an explicitly non-production POC, not production authentication. Guest/old-server responses cannot be called durably saved.

Owners read: repository AGENTS, `project_context/global.md` and its `context.toml` routing, architecture root, relevant runtime/maintenance navigation, product/screen Tonight contracts, verification root, Source Plan Tonight input/aggregation requirements and the current R20 PLAN. The native interaction skill and its React Native reference were read for the Tonight lifecycle wiring; existing adopted UI is unchanged. Some broad exploratory reads were truncated and were not treated as complete reads.

## Actual before evidence

Local raw evidence is retained under `tmp/night-report-persistence-20261024/` in this work-item folder. It is synthetic task evidence, not restored private data, and is not an upload request.

1. `before.mts` ran the original actual Fastify HTTP path with InMemory report service plus generic SQLite runtime, using fresh task-owned synthetic data and random loopback ports. Exit 0, `before.log`/`before-result.json`:
   - First report returned 200.
   - Direct service reuse of one requestId with a changed target returned the old context. At HTTP the later generic payload digest then turned that request into 503.
   - Reopening app/repository/runtime and resending the original input returned 503: the regenerated reportId differed from the old generic token receipt.
   - Actual SQLite had only `business_records`/`runtime_meta`; the generic payload contained reportId/revision, not an authoritative report snapshot.
2. `before-validation.mts` ran original HEAD contract and service copies, changing only their import path to preserve the old implementation after source edits. The actual Fastify handler returned 200 for a non-array route mode, out-of-range origin latitude 999, and invalid calendar date 2026-02-30. Exact original copies and the response contexts remain in `before-contract.mts`, `before-service.mts`, `before-validation-result.json`; the successful run is in `before-validation.log`.
3. Initial harness failures remain separate: `before-harness-cjs.log` is a `.ts`/top-level-await format mistake; `before-harness-http-expectation.log` is the initial mistaken expectation that the HTTP layer would return the old report instead of the generic layer's 503, followed by a Windows Node assertion during error shutdown. The corrected isolated `.mts` runs above exited 0. Neither failed harness run is a product pass.

The suspected original client acceptance of another requestId's otherwise matching report was found by code tracing but **has not received its requested before counterexample**. Do not claim that client regression verified.

## Source frozen so far

No Git writes or package/lock changes were performed by this author. There are eleven changed/new source files; exact bytes and SHA-256 values are in local `tmp/night-report-persistence-20261024/wip-receipt.json` (SHA-256 `9d8683cdddbbfef3f09cc4f0d727ccd8e439f2c4b567f7621a21c34bf49501fc`).

- `packages/contracts/src/night-report.ts`: pure boundary validation now checks JSON/scalar/coordinate/mode/calendar/timezone qualification; fixed-field request identity and complete declared context/report requestId matching; persistence readback envelope type. No Node storage import or arbitrary new string length ceiling was added.
- `apps/api/src/modules/night-report/night-report-service.ts`: aggregation extracted into `generate`, optional legacy repository retained; legacy create/InMemory replay checks full declared request context. Existing algorithm and report content remain in the same aggregator.
- `apps/api/src/modules/night-report/postgres-night-report-repository.ts`: legacy request-conflict fallback also checks the existing report's full declared context. No Postgres schema/migration or live Postgres verification occurred.
- New `sqlite-night-report-repository.ts`: immutable actor/request-scoped report snapshots plus replay receipt use existing Node-only `commitWithReceipt` in one SQLite transaction; fresh schema in the old `tonight-decision.sqlite` file; existing generic tables untouched, not promoted into actual reports; close is guarded.
- New `persisted-night-report-service.ts`: trusted local-owner check, digest lookup before provider work, atomic snapshot/receipt admission after provider work, owner-scoped report and request-result reads. Provider work does not hold a SQLite transaction. Multi-connection/concurrency/rollback behavior is still untested.
- `runtime.ts`: replaced generic business runtime with the actual SQLite repository/service, requiring an injected real aggregator `generator`; personal-trial profile boundary retained.
- `night-report-handler.ts`: same v1 POST selects durable owner result only when the trusted actor and runtime exist; otherwise generates an ephemeral report. Adds explicit storage/replay headers and conflict outcomes. No generic token write remains in this handler.
- `apps/api/src/server.ts`: adds optional resolver, private `/v1/night-reports/:id` and `/v1/night-report-requests/:requestId` readback, private errors and exposed CORS protocol headers.
- `apps/api/src/start.ts`: removes the ordinary InMemory composition and generic NightReport boundary, injects the actual aggregator into its SQLite runtime and composes the existing explicit loopback local-owner resolver.
- `apps/mobile/src/data/night-report-client.ts`: checks requestId and full declared context; on explicit owner-storage response, checks actual receipt/report GET before confirmation. New `load` uses existing `createPendingApiCommand` and local AsyncStorage with per-context pending identity, stable unknown retry, in-flight sharing and new key after successful completion. Root ran the mobile typecheck after freeze, but behavior remains unchecked.
- `TonightScreen.tsx`: queryFn now delegates to `client.load(request, signal)`, replacing a new Date/Math.random requestId on every retry. Existing UI/state presentation remains.

## Checks actually run

- Corrected original HTTP persistence discriminator: exit 0; reproduced the defects above.
- Original invalid-input HTTP discriminator: exit 0; reproduced the three concrete boundary failures above.
- From `apps/api`, `node ../../tools/run-node.cjs --bin typescript tsc --noEmit`: exit 0 on the current API source changes; `api-type-first.log` is empty. An unrelated preceding file-copy command used an incorrect cwd and failed; it did not supply a before-client result. Do not treat this as a mobile typecheck.
- After source freeze, root ran workspace `npm run typecheck` for API and mobile, both exit 0. Root-owned logs are `tmp/night-report-handoff-api-typecheck-20261024.log` and `tmp/night-report-handoff-mobile-typecheck-20261024.log` in this work-item folder. These are type checks, not evidence of the new persisted effect.
  Their SHA-256 values are respectively `978f99bb9d1f8fc4eaac339cdb43b0c96d1c443cf1a9600a79fab53a73801f46` and `ce6b44d3005108a2cbd95d97d965341c9ddfe34ea02c4d6ecc302e989e3afcb9`. The author's earlier immutable receipt still says mobile was not run at that earlier point; these later root logs supply only the completed type-check result.
- **Not run:** after-fix API behavior/HTTP tests; native client tests; actual Tonight component tests; real normal nonempty/partial report after-fix readback; changed-input/concurrency/receipt-failure/unknown-commit regression checks; legacy PG effect tests; default start runtime smoke; structured probe; OpenAPI qualification; independent review; exact-head CI for this batch.
- No new final regression files have been created. No all-green claim or final acceptance is supported.

## Most specific next steps and known WIP gaps

1. Before extending this implementation, resolve the existing pending/re-auth ambiguity: a committed owner attempt whose reply was lost can be retried after trusted ownership disappears; current v1 then returns an ephemeral report and current client could wrongly clear the old pending attempt. Preserve the old complete attempt through actual authority denial/failed readback. Guest basic query must remain usable, while guest's lack of complete durable replay remains explicit. A retry protocol/known-result reconciliation must not turn a caller header into authority or introduce a competing write owner. This issue was identified during design tracing immediately before pause; no repair/test is claimed.
2. Write the focused actual Fastify → SQLite → close/reopen → report/receipt readback regression first. Use synthetic nonempty providers behind the real aggregator; preserve one ready and one real partial/missing mechanism, original expiry and provenance. Then exercise same-key changed full input, unique concurrent effect across connections, injected receipt insert rollback and lost real committed reply with the real mobile client. Keep actor and JSON identity checks at the actual enforcing owner.
3. Check `night-report-client.ts`/Tonight through their real callers. Cross-context pending storage is currently keyed by full declared context; verify isolation and lifecycle without losing unknown originals. Check cancellation and late responses, old legitimate v1 responses, wrong requestId/route modes/labels, confirmed new refresh identity and preservation of generatedAt/expiresAt. Do not create a per-field or device matrix.
4. The structured `tests/acceptance/structured/probes.mjs` still expects the old generic NightReport runtime API (`execute/read/list` without generator). It has **not** been migrated and cannot establish this batch. Add one bounded Tonight persistence probe using the actual runtime/service and preserve whole-family incompleteness/POC/provider/device obligations, following the existing itinerary/notification/field evidence pattern.
5. `packages/contracts/openapi/v1.json` is unchanged. Document actual owner readback, resolver/privacy/storage-header/unknown-conflict semantics and supported existing profiles/modes. Do not silently claim a production auth scheme or old generic database migration.
6. Obtain fresh independent review after the coherent implementation is frozen, as the root intended. Durable Context, total HANDOFF/INDEX/validation, committing/pushing and CI remain root-owned. Do not treat this paused WIP as ready delivery or remove earlier failures/skips.

## Resource closure

All tool commands returned; no running tool session or helper process remains from this author. Both actual discriminator scripts used random loopback Fastify listeners and closed all app/runtime/SQLite handles in `finally`, then exited 0. Synthetic `before-data-*` SQLite files and raw evidence remain locally for recovery. There was no long-lived server, Docker resource, new worktree, dependency installation, device/IDE/ADB/preview/shared PostgreSQL/API/bridge/queue/VPN/TUN/frozen build operation, N05/R6 action, raw/private upload, or Git mutation.
