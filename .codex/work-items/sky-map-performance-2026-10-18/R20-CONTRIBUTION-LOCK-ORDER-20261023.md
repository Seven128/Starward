# R20 contribution transaction order

Scope: account deletion, contribution writes, media review, moderation and canonical publication in the current dirty checkout. This record is evidence for PLAN R20 refactor 2; it does not replace PLAN/HANDOFF or close device, memory, queue or other media obligations.

## Confirmed defect and callers

The original `deleteAccount` locks `users FOR UPDATE`, then all owned `user_submissions FOR UPDATE`, before entering the erasure helper. The helper's former case-before-submission order therefore did not establish the actual transaction order. `adminResolveModeration` and `adminRequestContributionChanges` acquired the case before the submission. Migration 009 additionally takes `users FOR SHARE` from the contribution update trigger: review could hold case/submission while waiting for the deleting account, and deletion could hold the account while waiting for the submission.

The same audit covered actual consumers, not only the helper: media review's joined `FOR UPDATE OF m,s` did not establish a parent-first lock; legacy/formal submission writes media and cases after the submission; formal submission holds the canonical spot before the submission, whereas evidence merge previously did the reverse; PUBLISH held the spot and submission before its trigger acquired the account. `saveContributionDraft` could acquire its spot foreign-key lock after an existing submission lock.

## Implementation

- `contribution-transaction-locks.ts` owns administrative subject discovery, account SHARE admission, optional canonical spot lock, submission lock, and identity/privacy revalidation before the actual case or media lock. Existing revision, state and receipt checks remain at their current business owners.
- Existing contribution write entries take the account SHARE mode before children, matching the database trigger. Draft save acquires its target spot foreign-key lock before the existing submission. Account deletion keeps its existing UPDATE barrier and complete privacy-erasure transaction; erasure now takes submission before case, matching its caller and administrative consumers.
- PUBLISH discovers the relevant owner set, locks those users in sorted order, acquires the canonical spot, and rechecks owners before any publication mutation. A newly merged owner causes that transaction to roll back and discover again, at most three attempts; only this explicit pre-mutation set-change is retried. Database errors, unknown commit outcomes, revision conflicts and unrelated operations are not blindly retried. Erased submissions are excluded from publication updates; independently valid canonical publication and merge relationships remain available.
- Upload expiry's cross-account selection and retirement changes belong to the root agent's concurrent media implementation. Their final evidence is recorded separately; this document does not claim that changing the helper alone covers that worker.

## Actual verification

Only the root-provided disposable PostgreSQL database `starward_lock_b18f445389a2` was used. Tests load the real migrations, including erasure/append-only triggers, and call the real repository/service methods. Named independent pool connections are paused after actual SQL locks; `pg_stat_activity.wait_event_type = 'Lock'` confirms the competing command reached PostgreSQL. Per-test database statement/lock timeouts bound failures. No device, DevTools, shared API/bridge/Redis, current accounts or existing debug database was touched.

Before the repair, the test selected by `--test-name-pattern='moderation.*delete-first'` failed: the real moderation update produced **`error: deadlock detected`**. After the repair, `contribution-lock-order-postgres.test.ts` passed **6/6**:

1. Delete first: review waits at the account boundary, deletion commits, and review rejects without resurrecting private content.
2. Review first: review commits, then deletion erases contribution history and the committed operation receipt; anonymous structural evidence remains.
3. Delete first versus PUBLISH: canonical publication succeeds without updating the erased contribution.
4. PUBLISH first versus delete: publication commits under the account/spot/subject locks, then deletion retains canonical publication and the merge relationship.
5. Media review versus request-changes: the common submission serializes their real lock conflict; stale revision fails, a fresh command succeeds, and replay returns the same receipt/result.
6. A merge entering during PUBLISH owner discovery: the transaction reacquires the new owner set; the old spot revision remains rejected without an accidental receipt or publication. A fresh revision subsequently publishes and updates the eligible contribution's publication result.

Additional existing checks: the contribution privacy projection and two operation-receipt representation tests passed **3/3**. `tsc --noEmit -p workers/miniapp-api/tsconfig.json` passed. Targeted `git diff --check` passed.

Existing real consumer regressions subsequently passed in the two additional root-created disposable databases, without changing their allowlists: `contribution-upload-postgres.test.ts` plus `contribution-media-publication-postgres.test.ts` **3/3** in `starward_upload_b18f445389a2`; `contribution-candidate-intake-postgres.test.ts` **4/4** (including its three subtests) in `starward_intake_b18f445389a2`. These cover draft/formal upload locking and rollback, real filesystem bytes, reviewed media publication and repository recreation, immutable submitted evidence, intake unknown/known semantics and canonical effects. Database/cluster shutdown remains root-owned.

Verified local file identities (SHA-256): lock owner `6c71dc5f77b0c3ba4a9bce4b4f1774fd5b0b434c9117f928603f31e5c145a03d`; six-case PostgreSQL regression `2202d30ebc7b192364902f05df1f6720a5f8ad11d34dbde71374af14bfb2651c`. The shared repository file also contains concurrent root-owned media changes, so these identities do not claim that its future whole-file contents were frozen by this run.

One first post-repair test run was stopped after a fixture error: its temporary `pool.connect` wrapper hid the callback overload used by `pool.query`. The wrapper now restores the original connect entry immediately after acquiring its one controlled client; rerun completed all six tests. This was a harness hang, not evidence of another database deadlock. Only the matching owned test child was terminated; no service was restarted.

Limits: these results establish the corrected callers and representative conflicting mechanisms in isolated PostgreSQL. They do not prove universal deadlock freedom, production deployment, Redis reconciliation, original-content backup erasure, or any deferred UI/phone/OOM result. Independent review remains coordinated by the root agent before closing this batch.
