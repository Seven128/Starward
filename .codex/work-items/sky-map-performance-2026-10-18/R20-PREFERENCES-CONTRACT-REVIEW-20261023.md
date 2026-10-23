# R20 native preferences contract review

2026-10-23. Read-only production review of the current `packages/domain/src/preferences/runtime.ts`, native/web storage adapters, native hydration/store/Wizard consumers, domain tests, structured acceptance carrier, R20 PLAN, Mobile Screen/Product Contracts and relevant native Source Plan clauses. This note is task evidence, not a competing plan. No device, DevTools, ADB, shared service, current build or user database was opened.

## Confirmed contract and counterexample

- Native production creates one runtime promise and hydrates through `list`. Existing hydration interprets ordered operation records as current state; no production consumer displays the complete operation history. Domain and structured acceptance read historical command receipts by entity ID.
- User profiles are named durable entities. Their count is legitimate user data, not an append-log budget. Source Plan requires save/switch, preserved draft/error/retry and restart restoration. No current owner declares a receipt-count or receipt-time limit.
- The runtime serializes one instance, but its storage interface exposes independent read and write. Existing Node SQLite and Expo SQLite transactions protect only write. The isolated real SQLite probe `r20-preferences-contract-review-probe.mts` created two runtime handles for one new database and concurrently saved different profiles. Both returned version 1; only the second entity survived readback. Result: `r20-preferences-contract-review-probe-result.json`. Handles were closed; test data remains under the task tmp directory.
- Wizard regenerates `updatedAt` at each submit while using the same profile ID/revision key. Full-payload replay validation therefore requires retaining the first save attempt's complete payload/time/key across an unknown outcome. Simply adding a digest comparison without updating this caller creates an unretryable legitimate save.

## Smallest safe responsibility shape

- Persist a versioned current projection per actor: all current profiles, active selection, last valid location and destination restoration hint. Preserve save's explicit behavior of activating its saved profile. Router remains the only navigation truth.
- Retain replay data according to still-live responsibility, not arbitrary LRU numbers: current profile writes plus the current active/location/destination command receipts provide a natural finite bound relative to current user entities. A richer retry window needs an actual owner justification.
- A retired receipt cannot make its old key eligible as a new command. Versioned new keys must bind an immutable preparation revision or owner sequence. Exact retained key/digest replay is checked first; absent old-generation keys fail as stale/retired. Never silently create a new key/base revision for an uncertain old command. Existing arbitrary v1 keys may replay retained matching receipts but cannot be accepted as new v2 commands.
- Add an actual atomic storage boundary, such as compare-and-swap of the prior raw state. SQLite can conditionally update or insert by the expected prior value. Concurrent changes yield explicit conflict/readback rather than overwriting another acknowledged profile. Web needs an actual supported cross-tab owner if it claims that guarantee; a per-runtime Promise does not supply one.
- Migrate at the same durable state key under the same atomic boundary. Unknown schemas or invalid required structure leave bytes untouched and fail clearly; no empty-state recovery or parallel v1/v2 truth. A post-commit thrown reply requires readback before deciding the write was absent.

## Compatibility details

- Fold v1 in stateVersion order, retain the exact effective selection and all current profiles. Its previous list reader maps `itinerary` to `trips` and `profile` to `me`.
- The previous hydration reader ignores invalid location writes and keeps the preceding valid location. The existing mobile test persists a good device location then latitude 200 and requires the good location to survive. Taking the last location record without validation would break recovery.
- Old absent coordinate accuracy/time remain absent; 0 coordinates are valid. Do not synthesize provenance during migration.
- The initial default profile is revision 1 but unsaved. Its first Wizard save is revision 2; new-entity validation must support the current real entrypoint.
- Existing structured acceptance uses generic token/location/instant payloads for `preference.save`. Migrate that carrier to real profile inputs and actual projection/readback, instead of keeping a generic receipt-only path to satisfy it.
- New full input validation should state how non-JSON values are treated. Historical JSON persistence dropped undefined object properties while its canonical digest included them as null; blindly recomputing all old digests from serialized result payload can reject a formerly accepted record. Preserve stored legacy identity where necessary rather than inventing reconstruction proof.

## Focused completion evidence

1. Real valid v1 profiles, activation, location and destination migrate to the same effective state, restart, and receive the next valid version. Invalid-late-location and old aliases preserve existing behavior. Migration/write lost replies never erase old or committed new state.
2. Same key and equivalent key ordering replay; changed payload, actor or operation conflict without modifying bytes. A fully retired old command cannot become a fresh overwrite, including after restart. Genuine later intent uses a newly prepared immutable fence.
3. Many writes over fixed current entities leave bounded projection/replay state; independently created profiles are all retained. Assert state shape and correct final values, not just smaller serialized size.
4. Two actual SQLite handles cannot both acknowledge conflicting version writes while losing either accepted profile. Same-intent concurrent handles yield one committed effect and one replay or explicit recoverable conflict.
5. Wizard/storage lost-response retry uses the original payload/time/key and restores the committed profile. A changed draft cannot be mislabeled successful under an earlier key. UI failure text must not claim a write definitely did not occur after an unknown result.
6. Existing cold hydration/early action, real location metadata, same-session profile switch retry and affected consumer checks remain valid. These local checks do not establish device positioning or product completion.

## Transfer checkpoint supplement

The user requested a commit/push and continuation on another computer before v2 implementation began. Production runtime and storage adapters remain v1/read-write; no compareAndSwap implementation was landed. The new `packages/domain/src/preferences/runtime.test.ts` case `changed payload` actually fails: the altered command is incorrectly returned as replayed. Do not skip it or report this checkpoint as all green. The full v2 design remains a proposal subject to owner implementation and independent review.

The reviewed SQLite probe is now tracked at `scripts/r20-preferences-contract-review-probe.mts`; it creates a fresh synthetic database under task `tmp/`. Its original local result was acknowledgedVersions `[1,1]`, one persisted entity, `lostIndependentProfile=true`. Original database/logs remain local, not uploaded. The F07 consumer probe is separately tracked under `scripts/`; its passing assertions reproduce defects rather than prove correctness.

Two additional consumer obligations must accompany full digest enforcement: PreferenceWizard/quick profile generation must freeze the candidate timestamps/payload/key across unknown-result retries; and a historical receipt must not be blindly applied as current UI state. Saving A, then selecting B, then replaying old A must not silently reactivate A while durable current state stays B. Return/read authoritative current projection or explicit supersession at the runtime boundary and migrate actual store consumers. No legacy digest may be recomputed from lossy JSON and falsely certified equivalent.

All investigation agents were stopped for this transfer; none is an owner to resume on the receiving machine. Reuse these artifacts and create a fresh reviewer when implementation is ready.
