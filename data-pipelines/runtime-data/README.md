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

For a new receiver, `rebuild.files[].locations` selects the provider, folder and admitted representation of the file's `transportPath`. The complete `transport` or each ordered `transport.parts[]` carries the exact object `driveFileId`/`url` with its byte size and SHA-256. Use the authenticated Drive owner to download those declared objects as original bytes with inline base64 disabled. Preserve each declared transport filename (or each ordered part filename) in one external download directory, then run:

```sh
npm run backend:data:import -- --profile rebuild --from-directory /absolute/source-downloads --cache-root /absolute/external-source-cache
```

The current connected raw-file action rejected the 2,014,480,666-byte GZIP at its 256 MiB limit even with inline base64 disabled; both supported full-file browser download methods then timed out at 120 seconds. Its selected receiver representation is therefore the declared eight original-byte parts. Each part is within the proven connected limit; they form one GZIP stream and must not be gunzipped individually. The smaller source uses its complete original GZIP. This does not change either source identity or authorize exporting browser credentials. Keep temporary authenticated file references in transfer memory, not logs, source or the lock. A complete download is still only a received transport until the importer validates it. Reassess the transport only when the connected action changes; do not repartition or re-upload a verified mirror merely because another supported download route is available.

The common importer accepts exact original TIFFs or the file's declared `transport` GZIP. It streams complete GZIPs or ordered original-byte parts through transport SHA-256, decompression and the locked TIFF identity checks. Part bytes/hashes, their declared order, the complete GZIP identity and the decompressed identity all remain separate checks. No complete assembled GZIP copy is needed for multipart import. All new members validate in a uniquely owned staging directory before admission; truncated/corrupt/wrong-version data leaves no new cache entries. It checks available space against the remaining decompressed bytes, bounds expansion by each locked size and never overwrites changed cache files. A valid existing cache works offline. The source/download and cache roots must both be outside the checkout; no database, runtime release or remote sharing is changed.

Source validation streams SHA-256 rather than loading multi-GB files into memory. `prepare --profile rebuild` also validates an already populated external cache. A receiver may acquire the exact originals through the [official EOG account flow](../dark-sky/README.md), or use a verified existing copy/Drive mirror. Official acquisition must establish actual download entitlement and the selected revision; a login or directory listing alone does not establish file availability. An official compressed download is acceptable when decompression produces the exact locked TIFF bytes and SHA-256. Do not substitute another year/revision or rerun the publisher to hide an identity mismatch.

`NOT_UPLOADED` with empty locations means no verified off-host copy is recorded; it does not mean the original computer is the only possible acquisition source. Keep supplier acquisition and our durable Drive mirror separate: after acquiring and checking the exact source, record its provenance and upload/read back an immutable copy in the selected data folder when needed. Add verified Drive locations to this same lock, preserving the original hashes. A transfer size restriction may require ordered byte parts; record those and the original-file hash, not just ZIP names. Do not guess protected URLs, retain session URLs/credentials in Git, or fetch this group in ordinary app startup or CI.

Optional `officialSource` records an actually observed supplier URL/transport and its evidence state. `LISTED_NOT_DOWNLOADED_OR_HASH_VERIFIED` is a navigation aid, not file admission or a Drive backup. For compressed sources, `transport` carries the exact original GZIP path/bytes/SHA-256 separately from the locked decompressed-file identity; a rounded listing size is not an exact byte count. A multipart transport adds an ordered `parts` array with each part's exact identity and remote object locator. `locations` selects that transport's remote representation and records its independent readback state. `READBACK_PENDING` never means backed up. Reuse existing authenticated browser access without exporting credentials or assuming paid programmatic entitlement. `prepare --profile rebuild` remains a populated-cache verifier; import is explicit and neither command silently downloads the supplier locators.

## Publishing a new data version

1. Use the existing [nightlight publisher](../dark-sky/README.md) and terrain publication owner. Preserve retained URLs, declared coverage, numerical companions, provenance and license notices. Preparation/sealing, database publication and runtime activation are separate operations.
2. Inventory the public group and source inputs once. Select storage using measured full retained volume and expected downloads. Reuse unchanged content hashes. Prefer Drive for large raw sources; extend LFS only within verified allowance and the selected policy. Public runtime groups also support `materialization: EXTERNAL_CACHE`: keep only the lock/index and reviewable provenance in Git, record the verified Drive transport, and import the payload to `STARWARD_DATA_HOME/runtime/<release-id>` outside the checkout. Set the absolute `STARWARD_DATA_HOME` in the process/private configuration. The same verification/start commands then consume that cache; `prepare` reports the required authenticated Drive transfer rather than fetching LFS. Current `CHECKOUT` releases continue using their existing paths. Do not remove old tracked history or retained runtime URLs as part of a storage switch.
3. Produce `FILES.json` with `node tools/run-node.cjs --import tsx tools/resources/backend-data.mjs index --from-directory <admitted-public-root> --output <new-FILES.json>`. This shared command indexes only `nightlight/` and `terrain/`, preserves original bytes and refuses overwriting an existing index. Bind its returned byte count/SHA-256, nightlight dataset/inventory and terrain inventory/version in `current.lock.json`. For Drive, upload immutable objects and independently download/verify before recording available locations. For LFS, use `assets:rules`, verify staged pointers against the working hashes, and use the existing pre-push hook. Commit the lock, manifests/policy and relevant code together; push LFS objects before claiming the commit is runnable elsewhere.
4. Run file verification and the current PUBLISHED/schema check against the selected isolated database. Verify affected real API consumers. CI verifies public files after hydration; it has no private database or source-rebuild credentials. Production static mounting/object distribution and activation continue through the deployment owner, not LFS or a code pull.

Git history is the version history of the index; temporary signed URLs, local absolute paths, secrets and repeated full inventory copies are not. Reassess a mature tool such as DVC if recurring multi-dataset pipelines or unattended Drive/CI synchronization justify it. DVC already supports Git-bound data and Drive remotes, but its [official Drive instructions](https://doc.dvc.org/user-guide/data-management/remote-storage/google-drive) currently describe an affected default OAuth app and recommend a custom cloud project for heavy/automated use. This workflow reuses the already working LFS/Drive connection and publication checks; it has not silently provisioned a second credential system.

## Source rights

Retained proofs carry the original per-asset attribution, source contributors, quality and processing descriptions. EOG VNL is distributed under [CC BY 4.0 and its product notice](https://eogdata.mines.edu/files/EOG_products_CC_License.pdf); data reuse permission does not grant provider-download entitlement. Terrain retains the [Tilezen/Terrarium contributor and liability requirements](https://github.com/tilezen/joerd/blob/master/docs/attribution.md). The finite published region is not national coverage. File integrity is not a new claim of scientific accuracy, field measurement or product acceptance.
