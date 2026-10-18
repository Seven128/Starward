# Commit-bound backend data

[`current.lock.json`](current.lock.json) is the version/transport entrypoint for this commit. Public runtime data, rebuild inputs and private recovery have different purposes; pulling source never authorizes overwriting a database. The shared command owner is [`backend-data.mjs`](../../tools/resources/backend-data.mjs). It validates exact public files, publication identities and the current database schema/binding; the original nightlight/terrain publishers and readers still own scientific meaning, rights and activation.

## Normal development and another computer

After fetching/pulling the intended code and installing locked dependencies:

```sh
npm run backend:data:status
npm run backend:data:prepare
npm run backend:data:check-db -- --config /absolute/private/runtime.json
npm run dev:miniapp:published -- --config /absolute/private/runtime.json
```

`prepare` verifies the selected public group and hydrates missing LFS objects through the existing resource owner. An already valid checkout makes no network request. Corrupt or edited bytes fail visibly; preparation does not silently replace them. `check-db` is read-only and requires the exact current schema plus the selected dataset's PUBLISHED inventory/hash. `start` repeats those checks, binds absolute publication roots from the lock and starts the existing local API entrypoint; it disables auto-migration and reminder delivery. It does not start a worker, create a database, change accounts, start DevTools or activate a remote release. Existing conflicting publication settings fail rather than selecting an old dataset silently.

The private JSON uses existing runtime configuration names (`DATABASE_URL`, `REDIS_URL`, `MINIAPP_SESSION_SECRET`, `MINIAPP_MEDIA_STORAGE_MODE`, `MINIAPP_MEDIA_STORAGE_ROOT`, optional provider/auth settings, and an available `MINIAPP_API_PORT`). Keep it outside the checkout; do not print its values. Credentials, original phone-local drafts and private media do not come from the public data lock. A new computer's initial database recovery uses the linked private recovery owner and a fresh owned database, then this check; subsequent code pulls reuse its database until an explicit compatible migration/publication operation is required.

`npm run backend:data:env` emits only the non-secret publication-root/version mapping for an existing authorized launcher. `npm run backend:data:verify` checks files without connecting to a database. Neither command proves that a running service or phone uses those files.

## Storage selection and Drive fallback

Use LFS for admitted, reasonably sized public immutable runtime binaries. Git retains source, exact original JSON/proof bytes, the file index, licenses and the lock. Keep large rebuild-only inputs and private recovery archives in the owner-selected private Drive data folder, with key custody separate. Do not wait for an overage to change storage: include retained versions, collaborators and CI download/cache use when checking actual account headroom. No paid LFS overage is authorized. An account with no payment method stops at its free quota; if a payment method is added, establish a $0 LFS hard-stop budget first. The current account's actual checks belong in task evidence, not a permanent quota claim here.

Each immutable remote object record carries the dataset/product role, exact file ID/URL, byte size, SHA-256, and either an original file or ordered original-byte parts plus the complete-object identity. A remote folder link alone is not a versioned backup. Upload/readback and local verification receipts must distinguish public files, database state and accepted product behavior. Do not replace bytes under an already published identity or expand Drive sharing. Use the same selected Drive folder for data groups where practical; keys remain separate by design.

For the current runtime's Drive mirror, the connected Google Drive owner downloads the exact listed file IDs with raw-file mode and base64 output disabled, preserving original part names. Reuse verified local downloads. Do not print file contents, credential fields or signed download URLs. The connector supplies authentication; the repository does not extract its token or provide a separate unauthenticated Drive downloader.

```sh
node tools/run-node.cjs --import tsx tools/resources/backend-data.mjs assemble --from-directory /absolute/downloads --output /absolute/runtime.zip
python tools/resources/import-backend-archive.py --archive /absolute/runtime.zip --output /absolute/new-public-import
npm run backend:data:import -- --from-directory /absolute/new-public-import
```

The shared assembler verifies each part and the original full archive. The ZIP adapter reads only the exact pinned public members into a fresh directory; unrelated source caches, private packages and keys are not imported. The final importer validates the entire group before installing missing files or LFS pointers, preserving current edits. This fallback does not require LFS server availability and does not mutate the database. Agent-assisted Drive transfer is supported; unattended Drive authentication/CI has not been provisioned.

## Rebuild inputs

`rebuild.files` records the original global EOG inputs separately. Current published r6 application checks need the runtime products, not all global source TIFFs. Algorithm changes, republishing and original-pixel comparisons need the rebuild group:

```sh
npm run backend:data:verify -- --profile rebuild --cache-root /absolute/external-source-cache
```

Source validation streams SHA-256 rather than loading multi-GB files into memory. `prepare --profile rebuild` also validates an already populated external cache; acquisition uses each recorded authorized remote location. `NOT_UPLOADED` with empty locations is an actual missing off-host input, never an instruction to guess a URL or regenerate data. The current two TIFFs remain on the original computer until uploaded and independently read back. Add their verified Drive locations to this same lock once available, preserving their original hashes. A transfer size restriction may require ordered byte parts; record those and the original-file hash, not just ZIP names. Do not fetch this group in ordinary app startup or CI.

## Publishing a new data version

1. Use the existing [nightlight publisher](../dark-sky/README.md) and terrain publication owner. Preserve retained URLs, declared coverage, numerical companions, provenance and license notices. Preparation/sealing, database publication and runtime activation are separate operations.
2. Inventory the public group and source inputs once. Select storage using measured full retained volume and expected downloads. Reuse unchanged content hashes. Prefer Drive for large raw sources; extend LFS only within verified allowance and the selected policy. Public runtime groups also support `materialization: EXTERNAL_CACHE`: keep only the lock/index and reviewable provenance in Git, record the verified Drive transport, and import the payload to `STARWARD_DATA_HOME/runtime/<release-id>` outside the checkout. Set the absolute `STARWARD_DATA_HOME` in the process/private configuration. The same verification/start commands then consume that cache; `prepare` reports the required authenticated Drive transfer rather than fetching LFS. Current `CHECKOUT` releases continue using their existing paths. Do not remove old tracked history or retained runtime URLs as part of a storage switch.
3. Produce `FILES.json` with `node tools/run-node.cjs --import tsx tools/resources/backend-data.mjs index --from-directory <admitted-public-root> --output <new-FILES.json>`. This shared command indexes only `nightlight/` and `terrain/`, preserves original bytes and refuses overwriting an existing index. Bind its returned byte count/SHA-256, nightlight dataset/inventory and terrain inventory/version in `current.lock.json`. For Drive, upload immutable objects and independently download/verify before recording available locations. For LFS, use `assets:rules`, verify staged pointers against the working hashes, and use the existing pre-push hook. Commit the lock, manifests/policy and relevant code together; push LFS objects before claiming the commit is runnable elsewhere.
4. Run file verification and the current PUBLISHED/schema check against the selected isolated database. Verify affected real API consumers. CI verifies public files after hydration; it has no private database or source-rebuild credentials. Production static mounting/object distribution and activation continue through the deployment owner, not LFS or a code pull.

Git history is the version history of the index; temporary signed URLs, local absolute paths, secrets and repeated full inventory copies are not. Reassess a mature tool such as DVC if recurring multi-dataset pipelines or unattended Drive/CI synchronization justify it. DVC already supports Git-bound data and Drive remotes, but its [official Drive instructions](https://doc.dvc.org/user-guide/data-management/remote-storage/google-drive) currently describe an affected default OAuth app and recommend a custom cloud project for heavy/automated use. This workflow reuses the already working LFS/Drive connection and publication checks; it has not silently provisioned a second credential system.

## Source rights

Retained proofs carry the original per-asset attribution, source contributors, quality and processing descriptions. EOG VNL is distributed under [CC BY 4.0 and its product notice](https://eogdata.mines.edu/files/EOG_products_CC_License.pdf); data reuse permission does not grant provider-download entitlement. Terrain retains the [Tilezen/Terrarium contributor and liability requirements](https://github.com/tilezen/joerd/blob/master/docs/attribution.md). The finite published region is not national coverage. File integrity is not a new claim of scientific accuracy, field measurement or product acceptance.
