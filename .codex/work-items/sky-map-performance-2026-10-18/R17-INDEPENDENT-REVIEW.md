# R17 and stable overlay independent review

2026-10-18, current uncommitted implementation after `a36aebf8`. Three fresh read-only agents inspected separate responsibilities; none controlled the phone, services or private data. This record is evidence, not overall Goal completion.

## Geometry, time and data review

`r17_data_review` reviewed the current endpoint/access checks, time-model registration/consumer path, landscape output and staged EOG receiver. It found two P2 discrepancies:

1. A legacy MAP_POINT proposal Context could lack the newer private-proposal field. The original post-await private check would then omit renewed authorization. `getSkyGeometryWindow` now repeats the complete existing Sky access check after calculation and compares Context revision/fingerprint. The actual pending-proposal API test withdraws consent during that calculation and verifies rejection; the selected test passes.
2. Ready geometry was being used as evidence that the requested instant was drawn. The page now derives accepted time from the current visible native canvas generation and Context, and `skyTimePreviewStatus` keeps pending/failure separate until the accepted writer agrees. A focused behavior case verifies delayed draw, native failure, retired generation and same-run playback. Relevant time/continuity/ruler cases pass29/29.

The reviewer verified the landscape composed-pixel/GPU-release evidence and found no additional established discrepancy in the staged transport receiver. Remote Drive readback was still pending during that review.

## Stellar integration review

`stellar_review` independently checked the7 candidate source hashes, public fixture,5 original baseline modules (including reversed import rewrites), complete BSC/loaded-SAO consumers, conservative rejection, names/picking/appearance and lifecycle. It ran4 focused files successfully and found no provable defect. It also inspected both fixes above; it did not rerun their API race itself. The full local comparison remains owned by `SKY-STELLAR-CPU-COMPARISON.json`:440 frames and6 legacy arrays retain identical identities/geometry. These are local CPU/consumer results, not native phone frame-rate evidence.

## Stable terrain windows and development bridge review

`overlay_bridge_review` inspected actual request/serializer, coverage/query hook, shared support/grid, producer and native consumers. It reran5 files,38/38 pass and zero skip: terrain-overlay-request, terrain-overlay-coverage, use-terrain-overlay, terrain-service and terrain-fixed-raster. Same-window pending reuse, cross-window cancellation/late response, cached revisit, unsupported edges, finer demand and old v1/v2 immutable URL behavior were covered. No established defect remained.

It separately read `tmp/r17-phone-bridge.mts` without requesting or changing a service. The bridge preserves8791's in-memory account/Context, reads restored public map products from8794 and invokes the current geometry service for formal spots with renewed Context checks. It is a disposable mixed-version development adapter. It does not establish current production backend, private-proposal or real-weather acceptance. Its total latency includes legacy Sky access reads and cannot be reported as pure geometry CPU/service latency.

## Final time transaction and diagnostic review

Fresh `r17_runtime_review` inspected the actual ruler/Apply owners and current diagnostic staging. It independently confirmed that ruler settlement only updates preview, cancellation/hide restore the committed owner, and explicit Apply owns the Context transaction. It reviewed current Canvas acceptance after both `surface.present` and `attempt.publish`, original BSC/actual loaded SAO consumption, private-data boundaries and complete paired-source differences. Its focused time/probe checks passed. It found a collector admission race at the32-result cap; root serialized the shared read/count/write admission queue, and the reviewer independently confirmed31+2 concurrent requests yield200/429, identical retry200, changed payload409 and rejection releases the next waiter. No established defect remained.

The first12-second phone diagnostic interval contained no active operation and all counters zero; it is retained as `INVALID_EMPTY_WINDOW`, not a performance result. Both diagnostic sides were then rebuilt with the same45-second interval, one-second arming delay and unchanged2048 sample caps. Four diagnostic tests pass, including exact automatic stop and overflow. This changes only task-local measurement time, not product rendering, cadence, catalogue or input rules. Current paired identity remains in R17-PHONE-PROBE-BUILD; the earlier ordinary bundle below is historical.

## Map publication and prepared consumer review

Fresh `map_publication_consumer_review` independently read seal/restore, old URL and header retention, shared immutable OSS state, runtime DB/seal/inventory/proof binding, failed-file recovery, cancellation and bounded cache responsibilities. It found no established defect. With PNG encoding forced to throw, it independently read a real2×3 prepared window and its6 original cell proofs:12,558B/SHA `2f68e40a1924c6d09a3ab7fad0759a9e90c119d974298492d5b9bf29128017de`,393,216/393,216 valid pixels, identical proof, no composition. It did not touch services, DB or phone and did not certify live/CDN/device performance.

Root subsequently configured the owned current8796 API via the existing backend-data environment mapper and the explicit prepared root/hash. The real restored database's PUBLISHED dataset supplies all four target windows. Eight terrain/light metadata+PNG reads match sealed identities and immutable headers; see MAP-CURRENT-RUNTIME-CHECK. The first temporary launcher omission and unavailable response remain recorded. This runtime evidence is separate from the reviewer's local reader and final524-object Caddy readback.

## Remaining evidence

Combined contracts/API/Mini Program typechecks pass. One coherent ordinary WEAPP candidate was built with all current source changes: `94a82118b5ac70df656dcf15c43511ccc96daaf7ed014183d419edb08e5ecffa`,338 files,4,962,653bytes; source/bundle bindings are in the existing OVERLAY records. Android development feedback, actual composed motion, selector/ruler/cancel/apply and performance comparison remain required. No review or green check closes the retained R/H obligations.
