# H7 deployment fixture portability repair — 2026-10-18

The three deployment consumers no longer read the ignored historical `output/sky-*` acceptance directories. Production deployment, recovery and Sky product code are unchanged.

## Change

- Added `tools/deployment/sky-static-test-support.mjs`. The existing locked `pngjs` dependency generates two distinct, nonempty 2×2 PNG payloads. They are test data, not astronomical imagery, adopted resources or OCI provenance evidence.
- The helper seals each publication with the existing `writeSkyStaticBundle` owner. Managed fixtures admit two distinct revision/digest/source publications through the real `prepareSkyStaticDelivery` owner, including its inventory, retained URL union and lease disposal. Only Docker inspection/extraction is simulated.
- `promote-release-candidate.test.mjs` uses the controlled payloads for a sealed two-file candidate. `recover-database.test.mjs` builds its original managed sources locally, then retains the existing legacy-public-only and authenticated-source-capable recovery paths. `sky-static-consumer.test.mjs` captures the managed fixture through `captureSkyStaticBackup` and restores it through the existing archive owner.
- File counts and byte expectations come from the declared fixture inputs, replacing the historical 6,838-byte constant. Successful promotion, recovery, release and preview paths additionally compare every restored PNG byte with its known original payload.
- Existing authentication/tamper rejection, publication and revision identity, old URL preservation, process ordering, lease cleanup and rejection-before-side-effects assertions remain. No test was skipped or deleted, and no production validation was relaxed.

## Verification

Executed on the current Windows worktree with the repository Node launcher:

| Existing entrypoint | Result |
| --- | --- |
| `node tools/run-node.cjs --test tools/deployment/promote-release-candidate.test.mjs tools/deployment/recover-database.test.mjs tools/deployment/sky-static-consumer.test.mjs` | 46 passed, 0 failed, 0 skipped; 7.05 s |
| `npm run test:deployment` | 248 passed, 0 failed, 0 skipped; 13.50 s |

The former CI fixture-setup failures are covered by these passing consumers. The complete deployment suite was run once after the repair. Raw local logs are ignored in this task's `tmp/deployment-repair-targeted.tap` and `tmp/deployment-repair-owner-suite.log`.

This verifies local deterministic deployment tests. It does not claim a rerun of remote Product CI, a live deployment, a real OCI admission or target-runtime product acceptance. No old local artifact was downloaded, and no IDE, phone, Git or production environment action was performed by this repair.
