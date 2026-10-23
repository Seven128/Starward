# R20 management identity and command recovery — 2026-10-23

Scope: the management API boundary, admin-web session/command consumers, existing operator clients and release configuration validation. This record is local development evidence; it is not device, deployed-environment, public-release or full Goal acceptance. No existing DevTools/phone/ADB session, shared service or frozen candidate was operated or rebuilt.

## Implemented responsibility

- `workers/miniapp-api/src/admin-credentials.ts` is the single server configuration parser used by API authentication and release validation. Separate token digests bind explicit principal/roles. Legacy single-token configuration needs a fixed server actor plus RBAC; no implicit OWNER and no header-based role selection remain.
- The four management controllers use the shared authenticated context and an explicit operation. Spot creation/editing have write permissions. The session endpoint returns only the verified principal. Dashboard data is filtered by the principal's read capabilities rather than revealing audit data under a case-read grant.
- `apps/admin-web/src/app/admin-session.ts` owns authentication generations and one unresolved command per originating credential/actor. Late results cannot revive a logged-out/replaced session. Lost responses and failed readback retain the serialized payload, revision and key; retries keep them. A different principal cannot inherit the attempt. Explicit reauthentication with the same credential/actor installs a new result lifetime around the preserved command.
- The actual page uses the returned server actor and checks receipt actor/key/status before durable readback. Operator resolve/merge now require the existing repository's revision/key fields. Isolated launcher source and release examples were migrated without changing a running environment or local secrets.

## Independent review correction: cache failure after commit

Independent review reproduced a material failure with real Nest/Fastify routing and the production exception filter: the repository had returned a COMMITTED result, but a Redis-shaped `NOPERM ... permissions ... scan` error during cache invalidation became HTTP 403. The page would have treated that as an uncommitted rejection and discarded the key.

The correction uses one `committedEnvelope` owner for all existing post-commit cache paths: candidate search, spot patch, publish/suspend, contribution merge and publication lifecycle. It attempts all affected prefixes, preserves the committed result/receipt, and reports `postCommit.cacheInvalidation` as COMPLETE or FAILED. It does not claim automatic durable cache recovery. Admin-web keeps FAILED visible and unverified after matching durable readback, preserves the attempt and retries with the same key; only successful cache recovery permits confirmation. The CLI reports the committed result and warning without automatically replaying a legacy write.

The HTTP regression observes the normal Nest POST status 201 with COMMITTED + FAILED after the injected Redis denial, then REPLAYED + COMPLETE after same-key recovery, with one business effect. Legacy PATCH returns its saved result with the failed-cache status, and every affected cache prefix is attempted. UI verification separately checks that a failed cache is not shown as confirmed.

A second independent sequence caught a retry-history error: a lost first response followed by a same-key 403 was incorrectly treated as proof that the first request never committed. The command owner now retains unresolved history and any matched commit receipt across retries and same-credential reauthentication. The actual page tests both lost response → 403 → same-key recovery and committed/cache-failed → 403 → same-key recovery. The 403 preserves the original attempt and known commit fact; it does not reset the operation.

## Checks and actual boundaries

| Check | Observed result | Limit |
| --- | --- | --- |
| `node ../../tools/run-node.cjs --import tsx --test src/admin-auth.test.ts src/admin-operations.controller.test.ts` from the Mini API workspace | 7/7 pass after the post-commit correction | Real Nest/Fastify header/body/route binding and filter, in-memory repository ports; no Redis server |
| `ADMIN_AUTH_TEST_DATABASE_URL` scoped to the new local test DB, then `node ../../tools/run-node.cjs --import tsx --test src/admin-auth-postgres.test.ts` | 1/1 pass | HTTP injection → actual controller/auth → actual PostgreSQL transaction/audit; no real network listener or deployed credentials |
| `node tools/run-node.cjs --test tools/miniapp/admin-page.test.mjs tools/miniapp/admin-session.test.mjs tools/miniapp/admin-operations-client.test.mjs` | 7/7 pass after the post-commit correction | Actual React page in JSDOM plus pure owner/operator ports; no native browser/device |
| `node tools/run-node.cjs --test tools/deployment/validate-release-environment.test.mjs` | 14/14 pass | Isolated fixture configuration, not a deployment |
| admin-web noEmit TypeScript check | pass after the post-commit correction | Type consistency only |
| Mini API noEmit TypeScript check | pass after the post-commit correction | Type consistency only |

The HTTP tests cover every registered management route without credentials and every POST/PATCH with the AUDITOR credential; the valid owner-header forgery remains denied. Owner patch reaches the repository with the authenticated actor. The response from `/session` contains no credential digest. A MODERATOR dashboard cannot receive audit records.

The PostgreSQL test used only the root agent's newly created isolated `127.0.0.1:60709/starward_account_write_20261023`, with a fresh random fixture spot. Unauthenticated, AUDITOR and forged-OWNER requests left the original name/version unchanged. The OWNER request wrote version 2, and both `audit_logs.actor_id` and `spot_revisions.created_by` read back `admin:http-owner`. The test closed its Nest application and pool; the root agent subsequently stopped that dedicated cluster. No original database was used or reset. This PG observation predates the cache-envelope correction; the changed post-commit behavior is covered by the new HTTP/consumer tests, and the authenticated transaction behavior is unchanged.

The real page checks a lost submit response, edits to the live form before retry, exact original body/revision/key reuse, receipt matching, cache-failure visibility, and logout before late submit or late dashboard readback. Late responses restore neither private content nor success. Pure owner checks additionally cover A → logout → A, another principal, and an old completion racing with a reauthenticated retry.

## Independent review of the final correction

The independent `/root/r20_auth_review` review reproduced both material counterexamples before correction, then confirmed them closed against the final implementation. Its final focused checks passed the 7 backend auth/controller cases and the 7 page/session/operator cases; the root agent also reported the targeted diff check passed. Review inspected the real credential/parser/controller consumers, retry ownership and the post-commit response/consumer contract. This is independent code/HTTP/React-port evidence, not self-review and not a new PostgreSQL, Redis, deployed-credential or device run. The earlier isolated PG result retains the boundary stated above.

## Retained gaps and migration conditions

- The legacy candidate-create and spot-patch repository contracts still lack idempotent mutation keys. Their committed result now survives cache failure, but a genuinely lost response still requires durable readback rather than blind resubmission. No repository expansion was made in this batch.
- Unknown admin-web command recovery is held in the current window's memory. Closing/refreshing the browser does not persist the attempt, and does not cancel the server effect. This limitation is explicit in the owning Context and [migration guide](../../../workers/miniapp-api/ADMIN-AUTH.md); no restart-safe client journal was added.
- API and clients must migrate together to respect the post-commit status. Existing live credentials/configuration, real operator deployment, public cache restoration under a live Redis fault, and deployed role checks remain unverified. The shared parser and example updates do not change those facts.
- Event-catalog commands retain their existing content/version reconciliation rather than gaining a generic idempotency mechanism. Ordinary Map/Sky/phone, sustained performance/OOM and all other Goal obligations remain with their current owners.
- The root agent's broad local suite is separately recorded by its evidence owner; it must not be represented as having included this later post-commit correction. The affected checks above are the follow-up evidence.

No Git operation, dependency installation, credential rotation, deployment, data upload or private-original cleanup was performed by this implementation subtask.
