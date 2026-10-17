# Cross-computer runtime asset handoff

2026-10-18. The user replied “应该是2吧” to the availability question: the original computer is probably usable, but the release inputs have not been migrated. Availability and exact paths are not yet verified. Do not reconstruct the missing A/N matrix, claim the original machine is connected, or regenerate r6 merely to replace missing transfer material.

## Verified on this computer

- `git lfs ls-files --name-only` lists the legacy `workers/miniapp-api/assets/terrain/glo30-greater-bay-area-85km.png`; it is materialized locally. Its manifest/colour metadata are ordinary Git. The same asset set exists in the incoming-main parent63b9b6d7. It is not the fixed main-Map terrain inventory or a numerical horizon source.
- `tools/resources/lfs-policy.json` selects repository image/catalog/history resources. The publishing commands write the fixed terrain/nightlight inventories to explicitly selected external directories; they do not automatically stage/upload them to Git LFS. Most `output/` is ignored by `.gitignore`. The current Git/LFS inventory does not supply the inherited r6 release and matching database state.
- `data-pipelines/dark-sky/README.md` requires matching sealed release files and a PostgreSQL `PUBLISHED` record. `assets:prepare` hydrates tracked LFS objects; it does not restore that database, activate a release, or copy arbitrary output from the other computer.
- The current phone's owned local backend uses MEMORY_TEST and fixture weather. Terrain is separately constructed through the actual `TerrainService`/Terrarium reader, so its uncached areas can trigger real source reads and on-demand generation. This is not proof that the original fixed publication environment was recovered.
- No evidence found so far establishes that this merge deleted the missing external releases. Original-computer presence, portable backup and runtime restoration remain unverified.

## Minimum input to recover from the original computer

Use its original record `D:/dev/Starward/.codex/task-notes/non-hard-obligations-20261005/resume-actions-20261011.md` to locate the already completed release and evidence. This is an asset-transfer requirement, not a new implementation plan.

1. The exact r6 dataset identity and complete sealed release directory: inventory/manifest, all referenced imagery, numerical files and proofs, source/license/provenance metadata and their checksums. Preserve existing immutable identities and URLs; filenames alone are insufficient.
2. The corresponding test-environment database recovery input or an existing supported publication export, with its schema/publication identity and integrity receipt. Use the established backup/restore owner and a fresh isolated local target. Do not overwrite the current account, drafts, historical writes or a shared/production database. Keep private database contents and secrets outside Git.
3. The fixed main-Map terrain inventory and all referenced fixed assets, plus the source/cache paths actually required by horizon analysis. Do not substitute the legacy85km display PNG for numeric COG/DEM input.
4. Existing completion receipts and the original A/N mapping sufficient to reuse N01–N06, locate/protect the N05 draft and avoid resending the R6 reminder. Transfer only necessary evidence, not all screenshots, cache history or raw logs.
5. A non-secret configuration map naming the intended database/release roots and existing credential storage owners. No passwords, tokens, keys or full connection strings belong in this handoff or archive manifest.

Before choosing Git LFS versus the existing release-artifact storage for any newly retained files, inventory actual required bytes and the applicable current resource policy/entitlement. A local archive is recoverable transport only; upload, integrity-verified readback and restored runtime use are separate results. Do not promise that pulling source alone now provides these external releases.

## Current transfer state

The user has now deferred the other-computer light/necessary production-data synchronization until after waking. No question or transfer action is pending for immediate response. Continue independent implementation and retain these prerequisites for one later handoff; do not cancel the original publication/environment obligations.

MISSING: original paths, verified release bundle/database recovery input, transferred hashes and successful isolated readback. This does not block independent source/performance work, but it prevents claiming that real r6/nightlight and the original business environment were reproduced on this computer. No data release, new LFS upload, database restoration or source re-acquisition was performed by this record.
