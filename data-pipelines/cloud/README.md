# ECMWF total-cloud batch preparation

This offline owner acquires IFS 0.1° `tcc` through the official
`ecmwf-opendata` client, verifies each GRIB message with ecCodes and retains
native WGS84 grid-point values. It does not activate a product version, deploy,
upload, replace the current QWeather composition or render images in an API.

Install the pinned `requirements.txt` in an isolated Python environment. Run:

```text
python data-pipelines/cloud/prepare_ecmwf_tcc.py --output <new-absolute-directory> --run <available-00-or-12-UTC> --as-of <query-UTC> --source aws --acquisition-deadline <absolute-UTC-cutoff> --maximum-output-bytes 536870912
```

Use an actually available 00/12 UTC run. The source has native 3-hour frames
through lead 144 and 6-hour frames thereafter. The last requested frame covers
`as-of + 240h + reserve`; the default 12-hour reserve corresponds to the adopted
00/12 batch cadence. The manifest gives the exact last query time for which a
full future 240 hours remains available. Neither the reserve nor interpolation
creates data beyond the last native frame. Public IFS currently extends to lead
360; source availability is checked by acquisition, not inferred from that limit.

The default crop, 70–140°E and 0–55°N, is a rectangular data envelope containing
China, not an administrative boundary. Values are stored as little-endian
float32 only after an exact comparison with the decoded native values. The
separate validity mask preserves real zero. Each frame is processed and released
before the next; no full temporal global cube is loaded. A complete same-run,
native-cadence batch is required before `manifest.json` is written.

Original messages and receipts are immutable under `raw/`; source, method,
processor and regional file hashes identify the publication. A changed request
needs another output directory. Interrupted downloads remain `.part` for bounded
inspection rather than being silently trusted or replaced. Reuse already pinned
raw files and their receipts for a new processing attempt; they are checked
before use. `processor.py` preserves the exact processing source and a running
source change prevents sealing. Existing output conflicts fail without replacing
bytes. Nothing here changes old publications or a current pointer.

The acquisition session retains the official client's naming, index matching and
single-parameter Range download. It requires a quoted strong object ETag and
first tests that a deliberately false `If-Match` actually returns 412. Index and
data reads then use their pinned validators; status, Content-Range, length and
the consumed body are checked. The actual index and per-object receipt are
retained locally. Revalidation at the end rejects an object changed during this
attempt. URL credentials and signed query parameters are not written into provenance. In the
2026-10-28 capability probe the primary portal ignored `If-Match`, while the
official AWS mirror enforced it, so the new development acquisition explicitly
uses `--source aws`; an incapable source fails before consuming GRIB data rather
than silently weakening the boundary or switching mirrors mid-batch.

Both the CLI and callable `prepare()` entry accept only the shared official
mirror names `ecmwf`, `aws`, `google` and `azure`. Custom URLs and invalid mirror
values are rejected before creating output, recording metadata or constructing
the client; an SDK-supported access URL is not a publication source identity.

Acquisition is bounded by the earlier of the explicit deadline and the last
native frame minus the 240-hour horizon and requested reserve. HTTP requests
have a finite connect/read timeout no greater than the remaining attempt, with
at most two attempts (one retry) in this session owner; the official client is
kept at one attempt so the policies do not multiply. The CLI also stops its own process at the
absolute cutoff. The default 512 MiB attempt ceiling covers retained files and
consumed response bodies, based on the first approximately 291 MB batch; it is
not a production capacity claim. Each native numeric frame is released before
the next. A late acquisition cannot seal a manifest using an expired reserve.
The manifest is the final numeric marker. A directory already containing it is
not reacquired: inspect its exact result instead of blindly replaying the job.

Per-object integrity and a common run do **not** establish one atomic model-job
revision. `candidate-qualification.json`, bound to the exact numeric manifest
hash, therefore records `DEVELOPMENT_ONLY`, `formalReady: false` and source-group
qualification `UNKNOWN`. A numeric manifest or two stable metadata scans cannot
promote it to formal map readiness. Known provider corrections are separate
admission rules: the documented 2026-10-22 00 UTC restart requires the complete
288–360-hour group to be reacquired after the provider's correction cutoff;
replacing only an apparently changed frame is rejected. A notice not applicable
to the requested run is not proof that unknown future corrections cannot occur.
The old directory name `qualified` only describes its numeric/source-parameter
checks and does not grant this stronger source-group qualification.

`publish_tcc_batch.mts` and its `starward-cloud-current-v1` / `ready.json`
markers publish numerical development inputs only. The API and outbox runtime
allow `MINIAPP_CLOUD_PUBLICATION_ROOT` only under `LOCAL`, including local
PostgreSQL use. The same runtime-config admission applies to direct service
construction and an injected cloud registry; `TRIAL` and `COMMERCIAL` reject
these inputs before database or queue setup. An unconfigured cloud root keeps
the existing release weather path. This restriction does not qualify a source
group or supply complete display/OSS readiness; the formal publication owner
must establish those results before enabling the complete migrated contract.

`workers/miniapp-api/src/cloud-publication.ts` is the bounded, explicitly hash
pinned numerical reader. `packages/miniapp-contracts/src/cloud-grid.ts` owns
bilinear spatial sampling and same-run adjacent-time interpolation. Missing
positive-weight support, a missing native bracket, a different run or an outer
edge cannot be filled from another frame/provider. Point evidence keeps selected
time and both actual brackets. Other weather retains its existing source rules.

Offline image preparation uses those same numerical and coordinate owners:

```text
npm run node -- --import tsx data-pipelines/cloud/prepare_tcc_display.mts <absolute-spec.json>
```

The spec supplies `directory`, `manifestSha256`, a new absolute `output`, bounded
`windows` using the existing `DisplayRasterWindow` shape, `selectedTimes` and
explicit `execution`: `deadlineAt` (absolute UTC), `maximumConcurrent`,
`maximumQueued` and `maximumOutputBytes`. There are no default production
capacities. For a small development fixture only, tests pass a deadline 30
seconds from invocation, one process, zero queued jobs and 4 MiB total output.
Every interior pixel is transformed from the declared GCJ display grid to WGS84;
numerical interpolation precedes the existing Map three-band cloud palette.
The scientific algorithm remains in `prepare_tcc_display.mts`, with the same
eight proof source roles. A serial owned Node process reuses the original
numeric reader and only the current window's coordinate arrays across times;
the batch CLI preserves window/time order and uses this same execution owner.
The execution owner shares identical in-flight source, method, exact time and
window requests. One cancelled reader cannot cancel another. Last-reader
cancellation and the absolute deadline terminate the owned process; a successor
waits for its actual `close`. Normal close awaits the numeric reader's drain.
The execution owner has no completed-PNG cache or public/API activation.

PNG, source/method/coordinate identity, actual time brackets and image proof are
written immutably under an exclusive output-directory lock. The explicit byte
budget includes existing and incomplete files, new images/proofs, measurement,
and inventory staging and commit; finite directory entry limits also apply.
Failed/cancelled batches retain their partial files and do not seal a complete
inventory. Retries charge retained bytes and only reuse byte-identical outputs;
they cannot overwrite a complete inventory or silently clear an unknown lock.
The complete inventory is committed only after actual successful child exits.
Preparing it is not OSS/CDN delivery, source-group qualification or DB/API activation.

Measurement separates parent CPU from cumulative owned-process CPU, summed once
on normal exit; an interrupted process has incomplete CPU coverage. Wall time
starts at producer entry and ends after image writes and process drains, before
the final measurement/inventory writes. RSS is the maximum sampled individual
process at 50 ms and stage boundaries, not an aggregate/native transient peak.
External tsx helper CPU is excluded. These development observations do not
establish production capacity.

Development checks:

```text
python -m unittest discover -s data-pipelines/cloud -v
npm run node -- --import tsx --test packages/miniapp-contracts/src/cloud-grid.test.ts workers/miniapp-api/src/cloud-publication.test.ts
npm run node -- --import tsx --test data-pipelines/cloud/prepare_tcc_display.test.mts workers/miniapp-api/src/cloud-display-publication.test.ts
```

Source terms and operational description: [ECMWF Open Data](https://www.ecmwf.int/en/forecasts/datasets/open-data),
[official client](https://github.com/ecmwf/ecmwf-opendata). CC BY 4.0 attribution,
license link and modification notices are retained; retrieval is not evidence of
forecast accuracy, target-map registration or production capacity. Actual batch
and resource evidence belongs to the current Goal work item.
