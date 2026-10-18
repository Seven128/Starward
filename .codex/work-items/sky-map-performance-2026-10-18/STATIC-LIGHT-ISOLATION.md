# Static nightlight independent read

2026-10-18. Authorized by the user's explicit request to reconcile “架构建议”, update PLAN and continue. Baseline7627d9ad was independently reviewed; this later change is outside that verdict. Implementation3b0d8916e66a9e7c37ec94503b8d18b4e8e2a01a was committed and normally pushed; no new whole-suite CI was dispatched for this module.

## Result and responsibilities

`GET /v2/map/night-light` returns the existing published annual-light layer for a validated actual viewport without reading observation Context, weather, astronomy, filters or account data. It is in the declared operation manifest and generated client. The service shares the same fixed/legacy publication reader with the old `MapScene` LIGHT contract. Schema-1 presentation and unavailable meaning are preserved; schema-2 still requires the real published database identity and sealed files. Read cancellation uses the existing HTTP/shared-read owners. The endpoint records duration/state/hash, not user coordinates or credentials.

Map now requests its static layer through `use-map-night-light`; image/native installation, source and legend remain with their original owners. The accompanying Scene requests NORMAL while LIGHT is selected, retaining weather-driven marker/filter behavior without requesting a duplicate light composition. Static discovery has its own short metadata cache and the original immutable-file cache remains separate. Layer choice and light retry do not wait for Scene pending state. A light failure does not hide the distinct Scene recovery; global refresh starts both relevant reads, and the dedicated light retry touches only its metadata/image/native installation. Existing valid raster retention and original bounds remain unchanged.

This removes an actual dependency. It does not yet adopt fixed-block rendering, a new provider, different source pixels, a CDN deployment or broader cache budgets. Stable terrain request identity and the remaining conditional modules in PLAN are still pending.

## Checks

- Backend focused batch:16 discovered,14pass,0fail,2skip. Includes the declared route match, actual loopback HTTP static response while an unrelated Scene promise is held, valid-zero content, malformed/missing view rejection, controlled publication-read failure and recovery, legacy Map exact selected time, cloud sample/time semantics, actual fixed-window composition and immutable assets. The two skipped cases require original/fresh PostGIS and sealed-release inputs; they are not passed.
- Frontend affected presentation/recovery batch:19pass. Includes actual page expressions for independently ready light during pending/failed Scene, original image/install/empty/error distinctions, stale cloud cannot paint as annual light, and actual light retry callback isolation. These tests do not establish native pixels.
- API and Mini Program typechecks pass. Generated SDK consistency and local Context validation pass. An initial API test invocation from the repository root failed before executing controller tests because TSX loaded the wrong decorator configuration; rerunning from the API workspace fixed the harness context. No production change was made to bypass that failure.
- Final ordinary isolated WEAPP build passes in `apps/wechat-miniapp/dist/weapp-check-overlay-static`. STATIC-LIGHT-CANDIDATE.json owns the exact compiled hash, all11 structural checks and package bytes:338files,total4,950,358B,main2,013,644B,headroom83,508B. This is a local check build and has not been previewed, uploaded or deployed. Main remains under2MiB, with limited headroom.

## Evidence limits and continuation

The loopback test controls the published layer read and holds the unrelated Scene; it proves dependency isolation and response semantics, not real r6 throughput. Real sealed-file/numerical tests remain separate. The current ordinary phone generation9 still contains the earlier frontend and is served by the preserved old in-memory backend. Do not restart that service, discard N05/accounts, or send this new frontend to it just to obtain a screenshot: deploy/restore the compatible API first through its owner. Real r6/fixed terrain/DB transfer is awaiting the original computer's handoff.

The older full Product CI39095632949 and independent review bind the earlier source only. New full checks/review, if performed, require their own exact commit receipt. Actual light first-visible latency, native continuity, source/quality coherence and the remaining H1–H8 obligations remain unverified. The Goal is not complete.
