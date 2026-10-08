# Resource storage and task artifacts

This node owns repository storage boundaries and developer resource preparation. Publication identity, source rights, coverage, serving and retention remain with their existing data-pipeline and deployment owners. The executable selection is [lfs-policy.json](../../tools/resources/lfs-policy.json); do not copy its file inventory into Context.

## Storage boundaries

| Content | Owner and storage |
| --- | --- |
| Source, reusable pipelines, tests, current editable prose, manifests, licenses and provenance | Ordinary Git; review meaningful changes directly. |
| Selected immutable images, generated star catalogues and compatible old text publications | Git LFS: Git stores pointers, local LFS cache stores bytes, GitHub LFS stores uploaded objects after an authorized push. Working paths and content hashes stay unchanged. |
| Acquisition caches, intermediate images, build outputs, raw logs, screenshots and cumulative inspection snapshots | Ignored local `output/<task-or-run>/` or task scratch; never automatically promote into Git/LFS or a Docker build context. |
| Task goals, the one current plan, acceptance ledger, concise conclusions and current finite review bindings | Task-local documents under `.codex/work-items/`; preserve FAILED / UNKNOWN / MISSING. Durable decisions belong to the relevant Context owner. |

An ignored directory is not a backup. Before retiring existing tracking, archive the exact affected files, verify every archived member against its source, retain a small receipt with archive hash and restore instructions, and retain original paths until cleanup is separately safe. `tools/resources/archive-task-artifacts.py` archives Git-visible files before ignore changes; it does not capture previously ignored inputs. Restore standard tar/gzip into an empty recovery directory, verify identities, then selectively recover. A same-disk archive is local recovery only; off-host backup requires an explicitly selected destination and verified readback. Never claim an upload or backup from the presence of a Git pointer.

The existing Cloud Sky task has narrow ignore exceptions for current review evidence and fixed test/publication inputs. These are required dependencies, not a precedent for tracking all scratch. Keep them until their consumers and provenance are safely migrated together. Historical scripts are archived investigations; the retained current batch scripts and `data-pipelines/` own further work. Archive location and migration evidence live in the governance work item, not in this durable Context.

## Efficient development

Install Git LFS on each development machine. Before the first authorized push, run `git lfs install` and verify the pre-push hook; preserve and integrate any existing hook rather than overwriting it. Linked worktrees may share hooks/configuration, so inspect that scope first. Merely adding `.gitattributes` does not upload objects or rewrite history.

- `npm run assets:prepare` prepares selected current resource versions. An already materialized working copy works offline. For limited work, append `-- images`, `-- catalogs` or `-- text-history`; use `all` before the full build.
- `npm run assets:verify` rejects indexed missing files, empty payloads and unhydrated LFS pointers before normal development/release consumers. It does not replace publication hash, format, rights or coverage checks.
- `npm run assets:audit` reports local bytes and unique object bytes; account storage and remaining monthly download allowance stay UNKNOWN until checked remotely.
- Edit `lfs-policy.json` and run `npm run assets:rules` when adopting a new resource class or moving the editable text version. Review the resulting attributes, stage only the intended paths and verify pointer SHA-256 against working bytes. Do not generate a new publication version for each object or routine verification.

CI skips checkout smudging, restores the LFS object cache and prepares resources before their consumers. Cache keys follow resource inputs, so ordinary code changes reuse the same data. Context-only work does not fetch resources. Docker excludes `output/` and task directories and verifies materialized resources before the release build. GitHub source ZIPs containing pointers are not ready-to-run resource bundles.

GitHub Free is the selected hosting tier; no paid overage is authorized. Its documented LFS storage/download allowances are account-wide, include retained object versions, and are distinct from GitHub Actions cache quotas. Before the first authorized upload or a material expansion, check actual remaining storage, current billing-cycle downloads and a zero paid-spend limit; local size alone cannot establish them. Never auto-upgrade, buy storage or change billing. Use [GitHub's current LFS billing rules](https://docs.github.com/en/billing/concepts/product-billing/git-lfs) when reassessing. Do not use `git lfs fetch --all`, history migration or repeated unchanged downloads as ordinary setup.

Runtime delivery continues through the existing publication/export and static-service owners; LFS is development storage, not the application image CDN. Reassess external object storage/DVC only when verified volume, collaborators, processing or delivery requirements justify it.

## Prevent repeated records and script growth

Batch repeated data/image work through one parameterized owner; validate representative samples, expand the batch, and inspect true exceptions. Reuse unchanged input hashes, image products and diagnostics. Keep bounded run results with input identity, outcome, failed/unknown obligations and links to raw output; never recursively embed prior reports, copy full source trees into evidence, or append every historical hash list to the next report.

Update the one current task state and finite review input set. Historical raw runs remain immutable local artifacts with a small locator/receipt; do not make a new code file, test, version and handoff per star. Promote a recurring check into the existing pipeline/test owner with a meaningful regression; freeze displaced one-off probes instead of maintaining competing executables. Context stores durable boundaries and rationale, not run transcripts or copied inventories.
