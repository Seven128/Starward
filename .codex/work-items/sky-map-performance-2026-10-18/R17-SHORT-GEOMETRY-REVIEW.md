# Short geometry integration independent review

2026-10-21 — reviewer `/root/review_short_geometry_integration`.

**No P1/P2 defect found in the reviewed uncommitted short-window integration.** This permits the planned coherent candidate comparison; it does not establish phone responsiveness, visual conformance or freedom from memory leaks. Exact reviewed file hashes, base HEAD and command outcomes are in [the accompanying record](R17-SHORT-GEOMETRY-REVIEW.json).

## Scope and controlling requirements

Read the current PLAN/REQUIREMENTS and relevant development/performance/interaction owners. The required results remain smooth six-field tapping/holding and normal Play at maximum all-sky view with landscape, plus fast final correct terrain/cloud/light coverage after movement/zoom; both retain their separate memory obligations. The optional two-hour supply is the PLAN's measured candidate, not an acceptance result. Existing terrain/text-cache work was excluded. The existing r16 time-intent rollback repair was checked only where the new integration touches it and remains intact.

Reviewed the shared window selector, service/controller/astronomy propagation, client request and response admission, query hook, public time owner, ruler and actual page Play consumers, including changed local tests. No device, IDE, running service, database, upload, commit or push was operated.

## Decisive checks

- `packages/miniapp-contracts/src/sky-time-model.ts:57`: omitted mode still selects NIGHT. TWO_HOURS selects the containing noon-aligned cell, keeps exact 30-minute interpolation samples, and clips the final cell to an already supported shortened DST night. Unsupported long-night behavior remains unchanged; a short model cannot claim the whole day.
- `workers/miniapp-api/src/controller.ts:523`, `miniapp-service.ts:1818`, and `astronomy-service.ts:430`: only the two admitted modes pass the public route; complete original access checks still run before and after asynchronous computation. The computation uses the same observer, algorithm, source identity and bounded time-model cache, without weather or a Context edit.
- `apps/wechat-miniapp/src/services/sky-geometry-window-response.ts:10` and `sky-celestial-client.ts:13`: grid start **and mode** participate in identity. Admission validates original Context/observer, exact requested coverage and source bounds; an old full response cannot satisfy a short request even when they share their start.
- `use-sky-time-geometry.ts:17`: one current Query and one retained model remain. Existing cancellation, `gcTime: 0`, immutable model admission and API cache limits remain in use. Repeated times in one cell reuse supply; a newer key does not install the older response. No new history array, subscription, background timer or per-frame observation was added.
- `sky-observation-time.ts:66` and `spot-sky-page.tsx:2199`: Play preparation belongs to the current time intent. Full supply is required before starting 1x playback; newer manual input, pause, cancellation, hide or Context replacement retires the pending request. The same live page guards reject late preparation. Full-window failure preserves a retry path (`sky-time-controls.tsx:136`) and does not silently run to a two-hour stop.
- `sky-time-presentation.ts:13` and `spot-sky-page.tsx:2810`: short supply does not shrink the selectable day. Calendar ticks and fractional input remain distinct from admitted scientific coverage and do not manufacture weather/advice. Existing accepted-sky fallback remains explicitly pending for a not-yet-supplied target.

The resource conclusion is limited: the reviewed changes preserve bounded owners (one retained model, existing Query cleanup, API cache limits and the 16-entry service time-model cache). It is **not** an allocator/retention proof and does not explain or close the historical process growth/native exit.

## Local evidence

Six relevant test files were selected, covering the contract, observation-time owner, geometry hook/client admission, actual page action callbacks, and ruler behavior. The first root-directory invocation produced 55 passing tests; `sky-page-action-ownership.test.ts` failed to load because the `@/utils` alias was not resolved from that working directory. Running that file from its owning `apps/wechat-miniapp` directory produced **30/30 passes**. Thus **85 tests actually passed**, with the invocation failure preserved separately; no product-code change was made to get that result.

These fixtures exercise real owner functions and selected page expressions/callbacks. They do not execute the complete React/native target. Backend HTTP tests were read but not rerun here; the parent's service/type/build checks retain their own evidence.

## Remaining delivery boundary

The phone candidate must use the updated backend: an older controller can ignore `window=TWO_HOURS` and return NIGHT, which the new client correctly rejects. Confirm service identity before interpreting candidate results. Actual continuous visible/accepted progress, final time correctness, full Play, target pending/error presentation, and sustained/lifecycle memory behavior remain required. This review does not close either of the user's two priority outcomes or the complete Goal.
