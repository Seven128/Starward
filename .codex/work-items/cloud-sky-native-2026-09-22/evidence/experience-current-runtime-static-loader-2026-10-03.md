# Non-deploy current/receipt/runtime loader — development

The existing `loadSkyStaticDelivery` and its sole production consumer `operatePreview` now resolve non-deploy operations from the current successful preview-deploy receipt and existing exact generation overlay, rather than the current prepared inventory's generation. This fixes the reproduced case in which another candidate was prepared but never became the running publication. Preparation, release/deploy publication and admitted historical URL preservation keep their existing owners and behavior. No new scheduler, store framework or paid facility was introduced. Independent review remains **MISSING**; this is not remote deployment or runtime acceptance.

## Semantics and recovery

The loader uses the same validated store, preparation lease, admitted source/history validation, plain-file receipt reader and runtime observation owner. It selects only the current pointer and the receipt it references; unrelated corrupted historical receipts remain the retention inventory's responsibility and cannot introduce a dependency into a current-service operation. The selected current receipt must be successful deploy v2, agree with the validated revision/digest and bind its actual sealed source/generation and overlay. Legacy/missing/failed current and invalid identity fail without borrowing prepared state.

`check` requires an observed running Caddy with the same readonly generation and publication hash. A different generation, foreign/invalid mount or a running Caddy without the selected static publication rejects. `stop`, `backup`, `inspect-backups` and `maintain-backups` may resolve a valid current record when no running Caddy is observed; their observation explicitly says `CURRENT_RECEIPT_WITHOUT_RUNNING_CADDY`. This does not claim live service or a Sky resource backup. Prepared pointer bytes, runtime and current receipt filenames/bytes are rechecked before handing off the selected overlay. The lease remains with the consumer until its existing finally cleanup.

`operatePreview` passes the actual operation and runtime execute dependency into the loader and records its non-sensitive selection observation in the `sky-static-load` step. Existing compose authorization/readonly checks, stopped writers, certificate/health/static HTTP verification, failure receipts and lease cleanup remain in place. All unknown and historical resources stay retained. The complete release/rollback/Sky-backup reference set is still unverified.

## Actual development outputs

[Pinned result](../../../../output/sky-current-loader-development-1003-r1/result.json) binds the four affected production/test files. Four affected owner/consumer/release/operator-preview groups passed 49 checks, zero failures. Relevant new behavior uses actual sealed filesystem generations with controlled Docker responses:

- Prepared newer/current mounted older selects the older overlay and files, preserves prepared bytes and keeps the lease until consumer disposal.
- Check refuses absence; stopped-edge operations retain only the explicit valid recorded selection. Current/runtime mismatch, environment identity mismatch, failed and legacy current cannot use prepared fallback.
- A changed mount or current receipt during the second observation rejects before returning an overlay.
- The actual `operatePreview` default loader, not a substituted `loadStatic`, selects the older current publication. Its Compose configuration and verification dependencies consume that identity. A subsequent mounted-generation mismatch fails before any Compose action or writer stop. Docker, Compose and HTTP verification remain injected; this does not prove an actual host/runtime.

[Failing-before script](../scripts/verify-nondeploy-current-regression-2026-10-03.mjs) substitutes only the archived previous prepared-only loader into the current owner, keeping current helpers and regression. The previous function selects the newer directory and the expected-current-directory assertion fails; [actual output](../../../../output/sky-current-loader-development-1003-r1/previous-loader-output.txt) is retained. No broad matrix was repeated after the final source checks passed.

## Remaining scope and next dependency

Remote readback is still unavailable, not empty/stopped/absent. No SSH retry, credentials refresh, service restart, cleanup, deployment, publication, download or imagery processing occurred. The six protected settings/outbox files and other production work remain unchanged against r39/r38; r40 captures current exact state.

D's file-bound references and non-deploy consumer have development evidence. Actual remote mounts/receipts, rollback/Sky-backup completeness, physical disk retention and whole-host headroom remain open. Since remote readback cannot currently supply them, independently continue D's whole-miniapp 200DAU cost and mixed-capacity model using existing measurements and governing activity units. Inspect existing model/consumer evidence before adding only missing business/resource families or assumptions; do not rerun old static HTTP/inventory matrices, confuse DAU with concurrent users or claim the expected production configuration was deployed. Complete image quality, ordinary adoption, native page/Back, Android/iOS/new Moon and independent review remain unchanged obligations.
