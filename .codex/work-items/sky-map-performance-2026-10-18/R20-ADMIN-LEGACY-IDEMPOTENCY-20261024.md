# R20 candidate creation and spot patch command recovery — 2026-10-24

Scope: the two Mini API spot write responsibilities, their actual operator CLI, and an explicit compatible command entry. This follows the retained legacy gap in [management validation](R20-ADMIN-AUTH-VALIDATION-20261023.md); it does not extend the [admin-web journal](R20-ADMIN-RESTART-RECOVERY-20261024.md), migrate a live server or certify all management operations as idempotent. Author baseline is `4dcf56d0a2e54c468be7438397add429685166be`. Independent review and exact-head delivery remain root responsibilities.

## Confirmed failures and compatibility boundary

The actual existing callers are `tools/miniapp/admin-operations-commands.mjs`, isolated setup in `run-wechat-devtools-session.mjs`, and repository/authentication/infrastructure fixtures. Admin-web does not currently create or patch these spot records. The old no-key repository and HTTP response shapes are retained for those callers; no DevTools session or prepared candidate was operated or modified.

An isolated real Nest/Fastify → PostgreSQL regression first sent concurrent identical requests with one key to the original routes. Candidate creation generated **two spot IDs**. PATCH wrote **version 3, three revisions and two patch audits**, rather than one change from version 1 to 2. `tmp/admin-legacy-idempotency-20261024/before.log` preserves both failures. The `same-key` name selector also selected the receipt-insertion recovery case: the old contract returned 200 because it had no receipt write to inject. That third failure records the absent contract, rather than three separate newly discovered business defects.

The first bounded CLI regression also proved that an unsupported server received one legacy write before any version check (`cli-before.log`, CLI request port). A subsequent intermediate same-route/key implementation still allowed a newer session response followed by an older legacy write handler to cause an effect (`mixed-version-before.log`, controlled mixed-version port). A successful preflight alone cannot bind the generation handling the mutation.

The adopted safe entries therefore have explicit routes:

| Operation | Actual command entry | Required identity |
| --- | --- | --- |
| `spot.candidate.create` | `POST /v2/admin/spots/candidate-commands` | valid `Idempotency-Key`; server-derived actor; complete parsed input |
| `spot.patch` | `PATCH /v2/admin/spots/:spotId/commands` | valid key plus numeric `expectedRevision`; server-derived actor; target and complete parsed input |

`GET /v2/admin/session` advertises version **1**, exact method and path for these operations to the permitted principal. CLI checks these three fields before dispatch and uses the declared new route; it never falls back to an old write. An older route catalog returns 404 before an effect even if the session response came from a newer generation. API/server rollout precedes the new CLI. Authentication/RBAC is still enforced by the write owner and is not conferred by advertised metadata.

Original no-key `POST /v2/admin/spots` and `PATCH /v2/admin/spots/:spotId` retain their saved-result shapes and **remain unsafe for blind replay after an unknown outcome**. On the new server a valid key also opts these original routes into the receipt contract, but this is not a safe mixed-version migration entrance: an old server can ignore that header. The canonical new routes are the supported CLI recovery entrance. No automatic retry or automatic legacy replay was introduced.

## Implemented owner and actual effect

- The existing repository methods keep one business transaction for both compatibility and command callers. New command calls first take a transaction advisory lock for the actor/key identity, then use existing `#adminReceiptReplay`, business writes, and `#commitAdminResult`. Locking only an existing receipt row would not serialize the first two submissions. No new database table, migration, queue framework or dependency was added.
- The stored digest binds the operation, target/expected revision where applicable, normalized business input and **complete parsed HTTP body**, including differences the adapter normalizes away. Same actor/key with changed input or a different operation is rejected. This is a parsed-JSON identity contract, not a claim to hash raw HTTP whitespace. The CLI keeps a stable key and original serialized input/flags; editing the source file before retry cannot silently become the original command.
- A generated candidate ID, its detail, completeness assessment, initial revision, source/read models and audit commit with the receipt and existing mutation/outbox record. PATCH checks its expected revision under the existing spot row lock and commits the resulting detail/revision, coordinate verification where supplied, assessment/read models and audit with the same records. Replays precede revision checking, so the original revision can recover its already committed result. Different keys targeting the same expected revision admit only one change.
- Receipt result/readback is the immutable committed snapshot; it is not a claim that the spot has never advanced afterward. The CLI checks actor, operation, key, receipt status, resulting revision and matching result/readback, then checks the requested candidate/patch effect. A matched receipt carrying the previous name cannot produce verified CLI output. Unverified/lost outcomes retain the instruction to preserve the original input and key; they do not trigger another mutation.
- Existing `committedEnvelope` remains the sole post-commit cache owner. A cache denial reports COMMITTED/REPLAYED plus FAILED; explicit same-key retry repeats cache invalidation without another business change. All affected cache prefixes are attempted. No real Redis recovery or durable cache-retry worker is claimed.

## Separate identity-input finding

Source review led to one actual boundary counterexample, without expanding to an unrelated schema matrix: `spotId: ["spot:…"]` passed the former regular-expression coercion. The real command endpoint returned **201**; PostgreSQL readback found **one stored array spot identity and one COMMITTED array-identity receipt**. `identity-before.log` and `identity-before-durable.json` retain those facts. The controller now explicitly requires a scalar string when a caller supplies the optional ID. The final same entry rejects the array with 400, and that attempt's candidate name has zero stored spot rows. Legitimate string identities and omitted/generated IDs remain supported. The earlier malformed synthetic row was retained in the owned test database rather than scrubbed from the failure evidence.

## Checks and their limits

All logs below are under `tmp/admin-legacy-idempotency-20261024/` and remain local; no private originals, raw deployment credentials or production records were used or uploaded.

| Actual command/check | Result | Evidence boundary |
| --- | --- | --- |
| From `workers/miniapp-api`: `node ../../tools/run-node.cjs --import tsx --test src/admin-spot-commands-postgres.test.ts`, with explicit owned `ADMIN_SPOT_COMMAND_TEST_DATABASE_URL` | **6/6 pass, zero fail/skip** | Real HTTP/auth/controller and PostgreSQL/PostGIS effects, real spawned operator CLI; synthetic local data |
| Same workspace: `node ../../tools/run-node.cjs --import tsx --test src/admin-auth.test.ts src/admin-operations.controller.test.ts` | **7/7 pass, zero fail/skip** | Existing route inventory now includes the new entries; unauthenticated/AUDITOR writes deny and server actor is preserved; repository ports for this suite |
| Root: `node tools/run-node.cjs --test tools/miniapp/admin-page.test.mjs tools/miniapp/admin-session.test.mjs tools/miniapp/admin-operations-client.test.mjs` | **15/15 pass, zero fail/skip** | Actual React/session/journal consumers plus CLI contract ports; no new browser/device observation |
| Mini API pinned TypeScript noEmit | exit 0 | Source and test type consistency |
| `node --check tools/miniapp/run-infrastructure-check.mjs`; scoped `git diff --check` | exit 0 | Syntax/whitespace only |

The six real PG cases verify required key/revision and legacy response compatibility; same-key candidate concurrency with one spot/audit/receipt/outbox event; full-input and cross-operation conflict; one coordinate verification and patch revision under same-key/cache failure; different-key revision CAS; receipt-insertion rollback of business/receipt/idempotency/outbox effects and recovery; actual COMMIT followed by an injected acknowledgement failure, HTTP 500 and a reopened application/pool recovering the receipt; and real CLI creation/patch/retry through an owned HTTP listener.

That CLI case also exercises a bounded real HTTP mixed-generation adapter. Its `/session` comes from the new owner while its mutation route catalog only exposes the old create route, which forwards to the actual legacy business owner without a key. A positive control creates one synthetic record through that old route. The new CLI receives 404 at its new command path, makes no fallback write, and its distinct candidate has **zero PostgreSQL rows**. This adapter is a controlled rolling-version counterexample, not a deployment of an old binary or a live rolling release.

The acknowledgement fault occurs **after actual PostgreSQL COMMIT** and returns an uncertain HTTP error; it is not presented as a raw socket-loss test or a database crash. Restart evidence is application/pool reopen against durable PostgreSQL, not OS power-loss durability. Cache denial is injected at the existing cache port, not a new Redis-server run.

The existing infrastructure runner now invokes this file sequentially with its own `starward_verify_<16 hex>` database, explicit environment and Mini API working directory, and records a separate `admin_spot_commands` result. Default no-database unit runs skip these six cases; they cannot establish the PG result. Author executed the equivalent direct owned-DB command and syntax check, **not the whole infrastructure runner or exact-head remote CI**. Those integration/delivery results remain pending with root.

Key immutable local log hashes:

| File | SHA-256 |
| --- | --- |
| `before.log` | `beb60c3f5c159dd850dd11f65ee132bea39dd100e700abc378fb482e6ed0acda` |
| `cli-before.log` | `8b3cbe78f91500abcde18e55afafd2908aa04ec83e0f8aabe579bea1d8ad5d46` |
| `mixed-version-before.log` | `37cc6853e9e73be94859c9a5e0c10acd44c84a155e064c868e1f5922d14f2fdb` |
| `identity-before.log` | `73d6ae88e9c9fed9187f5a2ce1e7631f96b66aec1d65ba221a4aabb63dc0ae43` |
| `identity-before-durable.json` | `08801648917b33359ffcdc496e67a8f3ef79988d7fdb486769ab46eaf9329177` |
| `final-postgres.log` | `601407d46e23df8115721e94df8a4dfc476408cbe1eec1f953cb215c051d430c` |
| `http-auth-final.log` | `529d43f92b6a67aac90ee64b045a87c0f77dfeb0cf351b308e302b397eb33e18` |
| `admin-consumers-final.log` | `47894caa03bb6d1d91946c07500465350614db410547ecbba45090b174bcc04c` |

`author-receipt.json` binds all seven implementation/test/runner source hashes and these logs; the empty successful type log is SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. This is author evidence, not independent approval.

## Resource closure and retained obligations

Only a new Compose project `starward-admin-spot-88d938c433d6` was started, using the existing pinned PostGIS image, its own volume and synthetic database `starward_admin_spot_88d938c433d6`, bound at `127.0.0.1:60969`. No Redis service was started. Each test application, loopback listener, CLI subprocess and pool was closed. Before stopping PG, container project/service labels and the exact loopback mapping were verified; afterward its state was `exited` and local listener count was zero. `owned-runtime-closed.json` preserves that readback. The synthetic database/volume were retained; no container/volume deletion or unrelated service stop occurred.

No Git mutation, package/dependency change, device/IDE/ADB/preview operation, shared PG/API/bridge/queue access, frozen rebuild, account/N05 operation, deployment or data upload was performed by this author. Root separately delivered the dependency patch at the stated baseline. Live credential/role rollout, actual public-cache restoration, old-client unknown-outcome reconciliation, storage-loss/server reconciliation, other command families and all original Goal/device/performance obligations remain with their owners. Overall Goal completion is not claimed.

## Independent review and root integration

The fresh `/root/admin_spot_commands_independent_review_20261024` reviewer independently ran the real PG/HTTP/spawned CLI **6/6**, authentication **7/7**, actual admin consumers **15/15** and pinned Mini API noEmit, all without failures or skips. It traced first-submission actor/key locking, atomic effect/receipt/audit and rollback, revision CAS, commit-acknowledgement loss and reopen, source identity, auth, compatible legacy calls and mixed-generation failure. Whole infrastructure execution and exact-final-head CI were not part of those local runs.

The review found one P2 in the CLI readback owner: a matching receipt/result/readback could omit the supported requested `accessTags` field and still produce successful output. Its unchanged positive/negative control first gave **1 pass / 1 fail**, not a PostgreSQL data-loss or actual network-truncation claim. Root added the missing-field case alongside the existing previous-name formal regression; against the old guard the six CLI tests gave **5 pass / 1 fail, zero skip** (`tmp/admin-spot-readback-before-20261024.log`, SHA-256 `285622c8fa1fd094b7e879a6fced32d0f232d942ef09e57b5732d56c1854cb15`).

The one-line guard now requires both field presence and equality, retaining coordinate transformation and reason/revision rules. Root's final page/session/CLI run is **15/15, zero fail/skip** (`tmp/admin-spot-readback-after-20261024.log`, SHA-256 `777b680d41d61945e3999058d0a153d00c72768d163020828cb6c47511cd4aa0`). The same reviewer independently reran its original controls **2/2** and formal CLI **6/6**, zero fail/skip, and found no remaining P1/P2 in this bounded change. Five original source hashes remain unchanged; the two final CLI hashes are `83d86dd188a234b09cb40c7357a231fb2de07792e932ff2da894149a7aa815a8` (command owner) and `346b7e2158c863439d6a13b0da606a9be6ac2da2d375a47c3a7baa3988594af6` (formal regression). PG was not restarted for this JavaScript guard; the unchanged PG/controller results and final positive control retain their stated boundaries.

The independent report is `tmp/admin-spot-commands-independent-review-20261024/review.md`, SHA-256 `63950c34ed8a34d20275493db66a748bb4d26dddc6f722a8632184b7c3d6fd45`; its final receipt SHA-256 is `628d6249e2e4b7841ae269ca0af6ba86488b5ef2e6ae346bc77e83332fdd14cd`. These bind all seven final source hashes, checks and resource closure. The reviewer also checked the management guide and operations Context against the actual protocol. Root's Context structure validation, runner syntax and scoped diff checks passed; structure validation does not certify ordinary links or product behavior.

After the independent PG run the exact owned container was stopped again, database connections were closed and port 60969 had zero listeners. Synthetic data, volume and failure evidence remain retained. Author and reviewer have ended. Source, guide, Context and task evidence are prepared for root's coherent commit; exact new Git/remote/CI evidence remains to be recorded after that operation. The successful `4dcf56d0` CI baseline covers the prior dependency/journal delivery and does not cover this new command batch.
