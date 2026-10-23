# R25 obsolete aggregate: next owner observation

2026-10-22. Independent source investigation after root's r25/gen29 phone checkpoint run. No phone, IDE, service, build, Git or production source operation was performed. This report and one private scalar local-experiment result are the only writes. The [performance method](../../skills/starward-miniapp-development/references/performance-investigation.md) and current PLAN retain the evidence boundaries.

## Decision

**The next useful boundary is the actual framework-owned frame graph, reached through the installed Taro renderer's exported host-Fiber link.** A small local execution of the complete installed renderer confirms that this link can expose exact object identity in React hook state. This is a concrete alternative to another failed heap capture, not a proposal to disable React state, change Query GC globally, or patch Taro's stale-props branch without a target association.

No production defect or retaining root has been established by this investigation. Root's new phone association already distinguishes obsolete objects from a legitimate latest-per-tile cache: each of the 8 selected keys was written 273 times, its initial value was replaced 272 times, yet the initial entries/transforms remained alive; aggregate 1 records direct membership of those eight initial entries. Aggregates 1/2/4/6/7 survive while 3/5/8 are collected. These phone counts are root's current captured result, not a second capture by this reviewer. The relevant remaining question is **which live outer owner can still reach those exact obsolete aggregate identities**.

The split between surviving and collected first aggregates makes accepted-publication association valuable, but does not itself prove that the surviving five were accepted. Add that identity relation to the same finite observation rather than guessing from counts or rerunning the earlier direct-action experiment.

## Existing source narrows the question

The supplement aggregate is stored directly by a short set of actual consumers:

- `use-sky-stellar-supplement.ts` returns the memoized `resolved.frame`.
- `sky-star-draw-preparation.ts:32,77–89` stores one current supplement/frame plus prepared points, replaces it on input change and exposes reset. The page creates one owner at `spot-sky-page.tsx:1559` and resets it at suspension, release and invalidation.
- `sky-canvas-lifecycle.ts:131,223–252` holds the latest requested/resolved frame and one paint completion. Hide/dispose clear latest. These source slots do not append history.
- `spot-sky-page.tsx:1616–1628,1903–1948` keeps accepted React state and its command ref. The accepted record directly includes `stellarSupplement`. Actual null resets remain at suspension/invalidation/failure and disposal remains at `2518`.
- `spot-sky-page.tsx:2544–2575` creates `draw`, whose closure references the current supplement wrapper, and replaces `browsingDrawRef.current`. Page-render callbacks can also close over that wrapper, for example the conditional `onRetrySky` callbacks. This is a potential closure edge, not a proven surviving root.

The existing r17 instrumentation does not add a frame history: `r17-phone-probe-v3-runtime.ts:93,120–123` uses a WeakMap keyed by frame and stores scalar `FrameFacts`; bounded rings contain scalar preparation/intent facts. The new r25 owner observer also keeps weak keys/references only. The successful local resolver controls remain applicable.

The prior fine-target Query distinction and Taro children-only stale-props finding retain their limits. Fine-target queries are disabled while Play is active, and their count/closure retention has not been linked to these five aggregate identities. A fixed stale props holder is not evidence of an unbounded history. The earlier gen23 direct-action and Page-ack controls are not repeated.

## An available graph entrypoint in the actual installed package

The selected `@tarojs/react` is 4.2.1 and React is 18.3.1. The adapter exports `internalInstanceKey` publicly (`dist/react.esm.js:986,989`), and its real `createInstance`/`createTextInstance` writes the corresponding host Fiber onto Taro nodes (`97–98,621–624,647–650`). `@tarojs/runtime` exports `document` and `eventSource`. The latter is a strong Map of host nodes, with explicit node/subtree removal in `dist/dom/event-source.js`.

This allows a version-bound, read-only path entirely inside the application's installed framework objects:

`eventSource → known Sky host node → node[internalInstanceKey] → parent function Fiber → hook state / queue / ref → stellarSupplement`

The exported key is an available locator; the Fiber field layout is still an internal implementation contract and must be bound to the actual installed/build version. It is not a WeChat private debugging API or a supported cross-version heap-inspection API. Do not inspect private WeChat IPC/CDP or call platform-private methods to obtain it.

**Correction to the initial source hypothesis:** React's production JSX object has an `_owner` field in source, but in this actual local production-renderer execution it was `null`. Therefore `props.children._owner` is not a qualified entrypoint here. The usable local result is the host-node Fiber link, not the presence of an `_owner` field.

## Executed finite local feasibility check

One controlled component was mounted, updated once and unmounted through the complete installed Taro renderer, with the real runtime document/eventSource, React hooks and reconciler. The adapter was transpiled from its complete installed ESM file to CommonJS for local Node loading; logic was not extracted or patched. Build-time runtime constants used the current runner's defaults. Only the native `setData` boundary was controlled and the aggregate was a small synthetic object.

The result established:

1. A rendered host node was in the real eventSource Map and its exported-key Fiber referred back to that exact node.
2. Following `return` reached the component Fiber; `memoizedState.memoizedState.stellarSupplement` was strictly equal to the known aggregate.
3. After the actual state update, the current/alternate pair exposed the replacement aggregate by exact identity.
4. After actual renderer unmount, the node was removed from eventSource and both component hook-state fields were cleared.
5. The production element `_owner` was unavailable (`null`), and is explicitly excluded.

This proves a useful local graph entrance and its ordinary cleanup, **not** phone support, native teardown, retained Starward frames or a framework leak. The first local attempt stopped at the incorrect `_owner` assertion; the corrected run retained that unavailable result instead of assuming an edge.

Private result: `performance-alternatives/r25-taro-fiber-owner-path.private.json`, SHA-256 `1c608f543de19ba033b4f3c1242bc11242155bfb2a0dbc14f1b5ed58210049ef`. Installed adapter SHA-256 `f3faccd2da12c071d7b0fe91777788d53588a733a11a96e9885f399ab767a47f`. No raw framework/product object graph was saved; only the fixed scalar findings and fixed path labels were exported.

## Smallest target extension and stop conditions

Reuse the existing eight aggregate IDs, bounded checkpoint protocol and successful early export. Keep one normal product path and the current automatic Pause owner.

1. At real request/paint/accepted boundaries, mark which already-selected aggregate IDs actually passed each boundary. Store numeric counts/flags only. Also record the selected IDs occupying the existing hook/latest/draw-preparation/accepted slots when those owners change or clear. Do not retain a new callback or product object to inspect later.
2. At one useful checkpoint after old values have been replaced, inspect the known Sky host/Fiber entrance synchronously. Traverse only the needed version-verified fields (`return`, `alternate`, hook `next`, `memoizedState`, `baseState`, known queue state and ref `current`), with finite node/edge/depth limits and descriptor-only reads. Match objects against the existing sampled-ID WeakMap. Record only fixed owner/path labels, sample IDs, counts and truncation/error flags. Do not serialize props, arbitrary keys, URLs, text, native objects or function source; do not invoke getters or attempt JavaScript closure introspection.
3. Include the current/alternate distinction and current slot IDs. A match in a legitimate current slot is different from a sampled obsolete frame found in a queue/base state or stale subtree. A successful pause or `retire` entry alone still does not prove every cleanup has completed.
4. If a matching strong edge is found, stop tool expansion and repair that responsible lifetime under the full product invariants. Verify that same edge retires and the relevant repeated-use result improves. If no edge is found, report only the inspected roots/fields and coverage; opaque callback contexts, unvisited roots and a reached cap remain gaps. Do not claim no leak or expand into a generic whole-heap walker.

The old aggregate identity, observed replacement, actual accepted-use flags and a specific strong edge can form a repair-guiding result without requiring a universal heap snapshot. Conversely, a successful bounded scan with no matching path is not a substitute for the still-unanswered root question. Current tool qualification and the unresolved production OOM remain separate decisions.
