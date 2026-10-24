# R20 admin command recovery after restart — 2026-10-24

Scope: the existing admin-web command/session owner and actual React page. This replaces the earlier window-memory limitation in [management validation](R20-ADMIN-AUTH-VALIDATION-20261023.md), without replacing its HTTP/authentication, PostgreSQL, cache or legacy API evidence. No API implementation, live credentials, shared service, DevTools, phone, ADB, frozen build, deployment or Git operation was changed by this subtask.

## Observed failure and implementation

The actual React-page regression first submitted a command whose server effect occurred while its response was lost, unmounted the page, then mounted a fresh page owner against the same origin storage. The original implementation had no “重试原操作” after that remount. `tmp/admin-restart-before-20261024.log` records this one failed case; a refresh did not cancel the effect.

`apps/admin-web/src/app/admin-command-journal.ts` now owns the encrypted browser journal. `admin-session.ts` continues owning command identity, current session lifetime, explicit retry and confirmation. The real page uses both owners:

- The first command reserves one durable pending row before any mutation HTTP. Row existence conservatively means the operation may have executed. A failed storage transaction prevents that first HTTP dispatch. Storage resolves only on transaction completion. Concurrent connections compare the same row and reserve at most one new command in a single IndexedDB readwrite transaction, using strict durability. This follows the already adopted native-App web storage mechanism; Web Locks/localStorage is not used for transaction correctness. See [IndexedDB transaction lifecycle and scheduling](https://www.w3.org/TR/IndexedDB/#transaction-lifetime).
- The origin's randomly initialized salt, API audience, server-verified actor and the exact credential derive an opaque scope and an AES-GCM key through Web Crypto HKDF. The original body, path, label, key, revision, declared readback check and matched receipt are encrypted. Raw tokens, their server credential digest and private command/receipt plaintext are not stored or logged. The journal is not server authorization. See the platform's [HKDF and AES-GCM operations](https://www.w3.org/TR/webcrypto/).
- Credentials now stay in page/session memory. The page removes only the two exact legacy admin session keys; it does not import them, write replacements or clear unrelated storage. Refresh/close requires authentication again. Another credential, actor, origin or API audience cannot find/decrypt the old command. Logout retires reads and clears displayed private state; it preserves unresolved ciphertext rather than pretending to cancel the server effect.
- Recovery loads and displays an unverified original operation. It sends no mutation automatically. Explicit retry retains the original serialized bytes/key and creates a current result lifetime. Persisted readback checks replace the old closures; first submission and restored submission execute the same actual case/media/merge/publication/lifecycle check. There is no default successful readback after restoration.
- A matched commit receipt and observed cache failure survive a normal remount. Later rejection does not erase that history. If receipt storage itself fails, memory retains the known commit and the original durable pending command remains; after a restart it is still unknown rather than falsely uncommitted. A failed final journal clear preserves the original recovery item. No plaintext fallback is written.
- A stale completion cannot delete a newer row. If the displayed old operation and current durable row differ, the first retry only updates the displayed pending item and requires another explicit confirmation before sending that different operation. Same-key explicit retries in separate windows still depend on the existing server receipt/idempotency contract; no automatic legacy replay was added.
- Unreadable/unsupported/corrupt storage blocks journal-owned mutations without deleting old recovery material. Server-confirmed authentication, dashboard/detail reads and the separate event-catalog reconciliation owner remain independent. The page exposes an explicit journal-read retry; recovery itself never sends a mutation. Final page unmount closes its database connection while preserving pending records; React StrictMode's immediate effect setup/cleanup repetition does not permanently close the active owner.

The root agent also identified coercion of `receipt.status` through `String` in the new owner. A focused actual `recordCommitted` call with an array status reproduced acceptance before correction. All three receipt guards now require the scalar string `COMMITTED` or `REPLAYED`. `tmp/admin-receipt-scalar-before-20261024.log` preserves that failed regression. This did not change the backend receipt protocol.

## Checks and evidence limits

| Check | Actual result | Boundary |
| --- | --- | --- |
| `node tools/run-node.cjs --test tools/miniapp/admin-page.test.mjs tools/miniapp/admin-session.test.mjs tools/miniapp/admin-operations-client.test.mjs` | 12/12 pass, zero fail/skip | Actual React page in JSDOM, command owner, Node Web Crypto and bounded IndexedDB API fixture; no native browser durability claim |
| `npm run typecheck --workspace @starward/admin-web` | exit 0 | Admin source/consumer types only |
| scoped `git diff --check` | exit 0 | Whitespace only |

The real page test retains original-input edits, exact key/body/revision reuse, lost response → retry 403 → recovery, cache FAILED → remount → retry 403 → recovery, logout before a late mutation/readback, and another credential with the same server actor. It additionally proves no mutation on restoration, no first HTTP when storage commit aborts, and rejection of a mismatched durable readback after restoration. The owner tests cover separate connection reservations, old-row completion versus a newer command, failed receipt/clear writes, corrupt ciphertext and explicit reconnect. The bounded IndexedDB fixture simulates serialization/commit; it is not proof of browser crash durability or actual cross-tab transaction behavior.

Final affected-suite log: `tmp/admin-restart-after-20261024.log`, SHA-256 `5aea50c4c00d97c544fef13894a5af49484b3bb688fd3f5239e7e52f9c7b5a26`. Type log: `tmp/admin-restart-typecheck-20261024.log`. Earlier remount failure log SHA-256 `3bdd603a25b43c51857e7031bd1b95cf8953d00b02470b344ded75d8f25e19f2`; scalar-status counterexample SHA-256 `769e7f11dcf75f13c3b39779b0f03f25601aad360ff6233e2d8b3df5204b7eb1`.

Frozen implementation identities at author handoff:

| File | SHA-256 |
| --- | --- |
| `apps/admin-web/src/app/admin-command-journal.ts` | `100ac80f74b162fd668c3c9fd0534458665af01a838d465cb543809e6136d332` |
| `apps/admin-web/src/app/admin-session.ts` | `534358f2dfd8e9612fd2f06e01ed613bb2d1d8ccee26e48f7e80ebbb4fc12cf6` |
| `apps/admin-web/src/app/page.tsx` | `a01bb1e2895ad81a2a265e2be49040e2b712f89350502754fe1c47169d854992` |
| `tools/miniapp/admin-journal-fixture.mjs` | `bef91311eba0ab293fbc219429741999904a74d0b9858611fe26fa063089c5b4` |
| `tools/miniapp/admin-page.test.mjs` | `2bf60678cba428cb4ac66e4f18f945373538a3cc4662cca560ae3194eec94f66` |
| `tools/miniapp/admin-session.test.mjs` | `0af13498533fbdea7a9c9434cbcc199c2b28e012b9ae44f31c860f5458453cfe` |

## Retained obligations

Independent review and actual browser observation were still pending at the author handoff above. Their later results and repair boundaries are recorded below; that historical handoff is not the current completion claim. The root reused one Vite + synthetic loopback HTTP fixture, with the actual production page/session/journal and the routes required by the case-state check. It is not a deployed API/database test.

The previous legacy candidate-create/spot-patch contracts remain non-idempotent and are not routed through automatic retries. Event-catalog content/version reconciliation remains its distinct owner. Live role/credential migration, real public cache recovery and deployments remain unverified. Clearing/evicting origin storage, changing credential ownership or losing the originating credential cannot be represented as canceling or recovering a server effect; those require durable server-state/receipt reconciliation.

The full Goal and all device/performance/private-data and other retained outcomes remain open with their current owners. Durable documentation reconciliation and exact-head delivery remain root responsibilities.

## Independent findings and root repair

The interrupted initial reviewer did not produce a final report. A new reviewer `/root/admin_restart_final_review_20261024` read the frozen sources and executed the six persisted readback consumers. Its first run failed 0/6 because the probe mounted `#queue`, which has no mutation-detail notice; the original probe and failure log remain in `tmp/admin-restart-independent-review-20261024/`. Correcting that same probe to the actual CaseView and its GET route produced **6/6, zero fail/skip**. Wrong original effect/target cannot confirm or clear any saved command; original matching effect can. This was a harness error, not six product defects.

That reviewer then confirmed a product P2: the page awaited journal opening inside the authentication catch, so one failed open retired an already server-confirmed identity and prevented dashboard reads. Its actual React/StrictMode opt-in counterexample failed 1/1 with dashboard GET=0 and mutation POST=0. Root independently reproduced the same failure in `tmp/admin-journal-readonly-root-before-20261024.log`, SHA-256 `4f9dff7d6943128083a0913d2b324d5fb60969689d9dcd55a3fe91a4d8144dc2`.

Root separated server identity/read availability from journal readiness. All six journal-owned write responsibilities and explicit command retry remain gated; the journal's explicit restore only reads existing recovery material. The existing actual-page test now fails an open with a real encrypted unresolved row, proves authenticated reads remain, attempts a blocked write with a valid reason, compares the original stored bytes, restores explicitly without a POST, then retries the original command. A first test extension clicked an existing reason-required disabled button after remount; filling the required input corrected that probe setup. It did not represent an admitted write or product failure. The final log replaces that extension's first overwritten working log; the exact initial failure is retained in the tool result (chunk `9d1363`), rather than represented as a preserved full log.

Final root affected checks at this repair: **12/12, zero fail/skip**, admin noEmit exit 0, same independent counterexample **1/1 pass**. Logs:

- `tmp/admin-readonly-repair-affected-20261024.log`, SHA-256 `2382511e4a10d0e2d9cd670d98964e872d24f95f43e1a3c062a60c95242dfea5`.
- `tmp/admin-readonly-repair-typecheck-20261024.log`, SHA-256 `65ee5260ff89fbb25dd69e65764ad022f93d3d1a1957372816cb042b3eb7b6f1`.
- `tmp/admin-journal-readonly-root-after-20261024.log`, SHA-256 `5f73ac6780ecad55dd2547f25cf70b9b559e52c3a44f47c12f56772ec27eb806`.

A fresh independent reviewer `/root/admin_journal_readonly_repair_review_20261024` independently ran that counterexample **1/1, zero skip**, read the root's full 12-test log/assertions and reused the unchanged six-readback evidence. Its report `tmp/admin-journal-readonly-repair-review-20261024/review.md` (SHA-256 `738cdaadc9fd1d2811f0f6188757ed36b4a0250f7ea9808a6f7e0c57028787b7`) closes the authentication/read-only P2 with no scope P1/P2. Its exact source hashes and bounded checks are recorded there; later root display-state changes are not silently attributed to this review.

## Actual browser observations

The root used the official Browser/Chrome runtime with newly created owned tabs. The first IAB normal reload observation and its files remain under `tmp/admin-restart-browser-20261024/`. Automatic tool continuation ended its loopback process; root confirmed the old process was absent and port refused before restarting. IAB was then explicitly unavailable, so remaining checks used the working official Chrome extension, Chrome 155. No user tabs, real credentials or shared services were used.

The completed Chrome normal journey exercised actual IndexedDB/Web Crypto and the actual page with synthetic local HTTP:

- A committed response was lost (the Vite proxy exposed HTTP 502). Close/reopen required authentication; another credential could not see the pending operation. Reauthenticating the original credential restored it with no automatic POST. An explicit retry's 403 retained uncertainty, and a later same-key/body retry confirmed the original effect: three attempts, one effect.
- Two actual windows submitted different inputs concurrently. The real IndexedDB transaction admitted only one new POST/effect; the losing window displayed the shared unresolved command. Its known commit receipt and cache FAILED fact survived closing both windows and opening a fresh one. Reauthentication did not send; retry 403 retained that known commit; the final explicit retry completed receipt/readback/cache confirmation. Total **six POST attempts, two effects**, with each three-attempt group's exact body/key hashes equal.
- Read-only inspection of the named test database found salt + one sealed row, matched commit/cache-failure facts and no plaintext synthetic credential or command/key; both exact old session keys and old local token key were absent. After final confirmation only the salt remained.

Key bounded evidence, all in that same browser directory:

| File | SHA-256 |
| --- | --- |
| `chrome-final-confirmed.json` | `e0afbcb71a38c48627a38f298539ead58b67158873a553e0ddf212ae8613475c` |
| `chrome-storage-before-clear.json` | `40836bce1439859484461e5ccd81d282801b2225f706a318be82ab8ce7c01013` |
| `chrome-storage-after-clear.json` | `1a4b7e0c74d4d6158e751ccfa6e4a74cd09d74d5e4fde2db742b81cad1f1af31` |
| `server-receipt.json` | `250b616e4996c9f7239314eab4ab1311ab08d3fa15ad01583ef39a18451076d6` |

`chrome-known-receipt-restored.png` caught the intermediate authentication compositor frame despite the ready DOM; it is retained as an unqualified capture, not a restored-result image. Root actually viewed `chrome-final-confirmed.png`, which shows the confirmed command, and embedded it in the user-visible progress update. AX/state, server readback and storage inspection support their respective claims separately. All owned tabs and the normal fixture (session 51137, ports 56740/56739) were closed.

For the repaired read-only boundary, the same fixture has one optional early `indexedDB.open` SecurityError injection for the named journal, with output isolated under `readonly-repair/`; production code is not instrumented. Real Chrome still authenticated and rendered the Case. Clicking an otherwise valid write sent **zero POST/effects**; explicit journal restore also sent **zero**, then an explicit write produced **one POST/one effect**, matching receipt/readback. The first successful empty restore left an obsolete local-write error notice visible; root preserved its AX record, cleared that stale notice when no pending command is restored, and observed its disappearance after reloading the changed actual page. This display-only adjustment does not clear any journal row. Root viewed `readonly-repair/confirmed.png`; the same observation exposed an old Case detail-state presentation discrepancy, treated below. The one-shot fault fixture session 1673 and ports 55486/55485 were closed, with all owned tabs absent.

These observations establish browser reload/close/reopen, actual cross-window admission, sealed persistence and explicit recovery under synthetic transport. They do not establish deployed authorization, real PostgreSQL/Redis/publication/cache recovery, storage eviction recovery, browser/OS crash durability, native device/performance acceptance or full Goal completion.

## Case detail consumer discrepancy and correction

A fresh independent reviewer `/root/admin_final_delivery_review_20261024` inspected the actual confirmed screenshot and produced one failing React observation: server/dashboard APPROVED and matched receipt, but the same Case still rendered old detail PENDING. It traced `CaseView`'s preference for detail state and the detail effect's missing dashboard/readback dependency. That mechanism already existed at f2; it was not introduced by the journal. The reviewer also found an important fixture limit: the production PostgreSQL queue only retains PENDING/CHANGES_REQUESTED, so the original synthetic APPROVED queue row cannot alone establish a normal retained-Case journey. It preserved this limit in `tmp/admin-final-delivery-review-20261024/review.md` rather than overstating that screenshot.

Root used the supported **request-changes** path, which retains the same Case in the real queue. One new phase in the existing actual-page test proved that receipt/dashboard/current detail said CHANGES_REQUESTED while the view still showed PENDING. This failed before the repair in `tmp/admin-case-refresh-before-20261024.log`, SHA-256 `6a9d2a1a3b04214849117033522195213820743299229dfdd7ad34114b385c78`. It reuses the same fixture and test; no second product harness was added.

The existing Case detail effect now retires its previous detail on dashboard/readback replacement and uses its existing GET, abort and session-instance guards to obtain the current detail. Until then it uses the current dashboard summary with the existing partial-read state. A retired request cannot overwrite the new detail. Media detail was deliberately not changed: it owns sanitized bytes/MIME, while its displayed media state already comes from the current dashboard; the reviewer did not establish a second media-decision defect merely from similar effects.

After this correction root's final three-file affected suite is **12/12, zero fail/skip**, including original recovery/late-result behavior and the new supported same-Case state assertion; admin noEmit remains exit 0. Final log `tmp/admin-journal-final-affected-20261024.log`, SHA-256 `ad65d57b57cff29917cb1b0263a848061bbfeeac17db74d580804c996d4f5d45`; type log `tmp/admin-journal-final-typecheck-20261024.log`, SHA-256 `65ee5260ff89fbb25dd69e65764ad022f93d3d1a1957372816cb042b3eb7b6f1`.

Root then reused the same Browser fixture with the actual queue retention rule for this path. Real Chrome remained on the same Case, sent one explicit request-changes POST with **one effect**, and showed **CHANGES_REQUESTED** together with the confirmed receipt. `tmp/admin-restart-browser-20261024/case-readback/confirmed.json` SHA-256 `70cf7e4b5385237549800c7af3366562c0930ec96dfa6369e723f2767e2d6f78`; its AX record and actually viewed/embedded `confirmed.png` show the same Case and result. Root closed the owned tab and fixture session 79103, ports 57048/57047. This adds rendered-consumer evidence under synthetic HTTP, without implying deployed moderation/publication acceptance.

Final frozen implementation: page SHA-256 `13e359fc6d7399681077a0415252e066884c051d1a7b92c8daf6e3c41eb4aa50`, page-test SHA-256 `97f4bdb4f308b7747212034361db970e826f98119cb2857a146239c4ba584b23`; the other four author-handoff source hashes above remain unchanged.

The fresh `/root/admin_case_readback_repair_review_20261024` independently ran the existing affected suite **12/12**, six restored readback consumers **6/6**, and original read-only open-failure counterexample **1/1**, all zero fail/skip. It checked the real queue's supported same-Case path, detail retirement/abort/session guards, original journal/retry boundaries, final source hashes before/after and the owning Context/migration text. It found **no unclosed scope P1/P2**. Report `tmp/admin-case-readback-repair-review-20261024/review.md`, SHA-256 `c8d69136cd4ddd1578c6ab1f15611320f72c35ec39b7b074b50ce6860f113f06`. Earlier review hashes are retained with their actual boundaries; they are not silently claimed to cover later changes. All review agents have ended. Root Context validation and diff whitespace checks pass; exact-head Git/CI delivery is recorded by the shared verification/HANDOFF owner.
