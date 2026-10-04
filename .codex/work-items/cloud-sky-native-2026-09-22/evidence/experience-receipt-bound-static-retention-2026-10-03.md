# Existing receipt and current-pointer retention binding — development

This increment extends the existing Sky retention owner and host-local inspection CLI. It does not change release/deploy behavior, repair the non-deploy prepared-overlay resolver, delete resources or establish remote acceptance. Workspace/branch/HEAD remain the authorized checkout. Independent review is **MISSING**.

## Actual contracts and ownership

Read `tools/deployment/release.mjs`, `operator-preview.mjs`, `validate-release-environment.mjs` and `verified-backup.mjs` directly. Release and operator-preview v2 receipts carry revision/digest plus a Sky delivery identity and operation steps. The successful preview-deploy current pointer links its receipt and overlay. Existing v1 lacks a Sky binding. Verified-backup v1 describes the encrypted database backup and restore verification; it supplies no Sky publication backup contract. No dedicated typed Sky rollback receipt was found. Historical release sources/generations remain possible rollback resources, with completeness unverified.

The owner now optionally scans known receipt filenames in the validated environment's separate receipt directory. It reuses the plain-file boundary and rejects linked roots/files. It validates schema, selected environment, operation/status, revision/digest, required successful static steps and their verification result. Non-null identities bind actual admitted sealed source bytes and matching generation bytes, including file/byte counts and history containment. Missing successful v2 binding, foreign environment, altered identities, missing sources/generations or malformed current pointers fail; they cannot silently disappear from the inventory.

Legacy v1 and early failed v2 without delivery remain explicit unknowns. Failed/running v2 with an identity retain the bound source/generation without claiming successful delivery. The current pointer must refer to a successful deploy receipt with matching identity and exact existing generation overlay. Its generation is reported separately from the observed runtime mount. Stable receipt files prove recorded claims, not live mounts, historical delivery acceptance or a complete reference set. Private receipt bodies, operator names, domains and private environment paths are not copied to the report.

The existing preparation lease covers the observation. Selected filenames and each receipt's bytes are rechecked after the runtime recheck. All unknown generations/stages remain retained; `referenceCompleteness=UNVERIFIED`, physical allocation and deletable bytes remain null. The configured CLI enables both runtime and receipt observations through existing descriptor/env validation. It requires a host-local Docker/store filesystem correspondence.

## Development evidence

[Pinned result](../../../../output/sky-receipt-retention-development-1003-r1/result.json) records three production/test source pins. The already executed four-file owner/consumer/release/operator-preview command passed 45 checks, zero failures. No repeated broad matrix was needed. New behavioral paths use actual sealed local files and injected Docker responses:

- A newer prepared/current-pointer generation and an older mounted generation remain distinct and retained; historical release, current pointer, failed binding, early null and legacy records preserve their meanings.
- Foreign environment, missing successful identity/steps, changed publication hash/current identity and linked receipt files reject. Failed observations release the lease.
- A receipt changed during the second mount observation invalidates the whole report.

[Mutation script](../scripts/verify-receipt-retention-mutation-2026-10-03.mjs) creates task-only relocated source copies. Removing only `receipts.verifyUnchanged()` admits that changed receipt and makes the behavior regression fail with “Missing expected rejection”; [actual output](../../../../output/sky-receipt-retention-development-1003-r1/mutation-output.txt) is retained. This is development verification, not independent review or actual Docker/remote receipt acceptance.

Existing remote readback remains unavailable; it is not evidence of no mount, stopped service or empty receipts. No SSH retry, startup investigation, credential refresh, download/reprocessing, service restart, cleanup, deployment or publication occurred. Existing Sky/other dirty changes and the six protected files remain preserved in the execution checkpoint.

## Remaining dependency

`loadSkyStaticDelivery` still selects the prepared generation for non-deploy operations. Bind that consumer to actual current receipt and observed runtime, including mismatch, absence, old v1, failure and changing-observation semantics, without treating preparation as a running publication. Remote receipt/mount readback, Sky backup/rollback reference completeness, physical disk/whole-host retention and mixed 200DAU capacity remain unverified. Complete image quality, ordinary registry adoption, native page/Source Back, Android/iOS and new Moon obligations remain unchanged.
