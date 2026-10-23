# R25 outer retention boundary investigation

2026-10-22. Independent, bounded read-only investigation of two responsibilities: (1) Taro host-node/event/props ownership, and (2) lifecycle/publication callbacks used by SpotSky. No phone, IDE, service, build, Git operation, production source or dependency was changed. The only repository write is this report; one small scalar result was saved in the existing private evidence directory.

## Decision

**No reproduced unbounded history or proven retaining path to the phone's surviving SAO arrays was found in these two boundaries.** There is a concrete stale-props retention mechanism in the installed and built Taro adapter: a children-only commit can leave an earlier `__reactProps` object on a still-live host node. A small execution of the actual installed methods confirms this. It is a possible finite old-render holder, not an established explanation for all historical transforms or the approximately 1.35 GB V8 heap at the fatal GC.

Do not patch the vendor renderer, upgrade dependencies, disable publication, or rewrite stellar caches based on this result alone. Keep the existing next question: whether the old aggregate/tile/current-cache relation shows an external obsolete-frame holder. Only if that association points toward a host-node/props owner should this particular stale-props mechanism become the next target observation. The [phone OOM](R25-MEMORY-PHONE-RESULT-20261022.md) and [real resolver experiment](R25-STELLAR-RETENTION-INVESTIGATION-20261022.md) retain their existing scope.

## Actual versions selected by the Mini Program

Resolution was performed from `apps/wechat-miniapp/package.json`, not from the repository's unrelated root React installation. Installed package metadata and `package-lock.json` agree:

| Package | Selected version |
| --- | --- |
| @tarojs/runtime | 4.2.1 |
| @tarojs/react | 4.2.1 |
| @tarojs/taro | 4.2.1 |
| react | 18.3.1 |
| react-reconciler | 0.29.0 |
| @tanstack/react-query | 5.90.21 |

Root React 19.2.3 and root React Query 5.101.4 also exist in the lock, but were not the Mini Program-resolved versions. The finite upstream search did not return a usable primary-source issue matching the exact stale-props mechanism; no upgrade/fix claim is based on search results or third-party explanations.

## Boundary 1: host nodes, event handlers and props

The installed sources establish the following distinct ownership:

- `node_modules/@tarojs/runtime/dist/dom/node.js:13–20` registers each node in the strong `eventSource` map. Actual `removeChild` calls `eventSource.removeNodeTree` unless it is an intentional move (`cleanRef:false`); `event-source.js:2–11` deletes both IDs and recurses into the removed subtree. This is not an append-only index by design. It does not prove that every target deletion happens or that native owners release the detached node.
- `apps/wechat-miniapp/node_modules/@tarojs/react/dist/react.esm.js:381–412` removes the previous normal WEAPP event handler before adding its replacement. `runtime/dist/dom/event-target.js` wraps the handler but keeps `oldHandler` so removal can find the wrapper. No new historical-handler list was found in that replacement path.
- The React adapter sets `__reactProps$…` on host creation and normal prop commits (`react.esm.js:80,135–136,621–624,702–709`). **Its `commitUpdate` returns early for the two-item `['children', newChildren]` payload before calling `updateFiberProps`.** A live node can consequently retain its previous props and previous `children` descriptions until a later non-children prop update or node collection. If those descriptions contain callbacks, those particular callbacks remain reachable through that old props object.
- The same children-only early return exists in the current r24/gen28 external source map `taro.js.map`, source `.._src_reconciler.ts`. That mapped source is 6,242 B, SHA-256 `6673356a137818cc628cb772cb2a899b954bf27a131b93b5c3359284004fb34c`. This is a candidate-bound adapter fact, not an unused dependency observation.

One finite method check used TypeScript AST boundaries to select the actual installed `commitUpdate`, `updateFiberProps` and `setEvent`, plus the actual runtime `TaroEventTarget` module. It ran in a local VM with WEAPP/mini/production branch constants and minimal boundary dependencies:

1. A children-only commit left `node.__reactProps` strictly equal to its old object; its child callback still referred to the old explicit payload.
2. A commit with another changed prop updated the props pointer to the new children.
3. Three normal handler replacements kept actual wrapper-list lengths `[1,1,1]` and dispatched the current handler; removal left length zero.

This is source-extracted installed-method behavior, not a full React/Taro renderer, native node lifetime, target heap or phone-GC test. It does not connect the synthetic payload to an actual SAO aggregate. Result: private `performance-alternatives/r25-taro-host-boundary.private.json`. Installed adapter SHA-256 is `f3faccd2da12c071d7b0fe91777788d53588a733a11a96e9885f399ab767a47f`; runtime event-target SHA-256 is `892de64400896a53cc727a0e6278ff6f264d48d74a07710fb6fbf8e163ed7992`.

SpotSky does contain children-only container candidates, such as its outer page View around `spot-sky-page.tsx:3706`, but the initial render can precede SAO availability. Other nodes, including the Canvas touch handlers around `3750`, change function props and take the normal replacement branch. Thus stale props existing in the framework does **not** show that the observed first-after-Play cohort is the payload retained by those props. A fixed old props pointer per fixed live node is not itself an unbounded frame history; actual node cardinality and retained object identities are missing.

## Boundary 2: lifecycle, scheduled work and publication callbacks

The selected framework lifecycle implementation is `apps/wechat-miniapp/node_modules/@tarojs/plugin-framework-react/dist/runtime.js:45–89`. Each hook keeps the latest callback in `fnRef.current`, registers one immutable wrapper in a layout effect with empty dependencies, and removes that exact wrapper during cleanup. SpotSky's `useReady`, `useResize`, `useDidHide` and `useDidShow` use this owner. The inspected mechanism is not one additional page-lifecycle callback per ordinary render. No target registration count was measured here.

For the page's scheduled work and publication:

- `spot-sky-page.tsx:2231–2245` installs the Play interval only for its active lifecycle conditions and clears it in the effect cleanup. It can retain that effect's callback until Pause/cleanup; this source lifetime does not establish which other lexical values a particular engine retains with it. Existing per-frame refs such as `browsingDrawRef.current`, `hideSkyPageRef.current` and `showSkyPageRef.current` are assignments, not history appends (`2575,2614–2615`).
- `sky-canvas-lifecycle.ts:128–136,223–240,246–252` has one latest frame and one in-flight completion. Successful completion cancels the deadline and clears `busy`. Hide/dispose clear latest and cancel scheduling (`265–279`). An unresolved native callback could retain its in-flight frame, but this source does not accumulate one callback per successful completed frame.
- The page's `pendingSkyPaintRef` is cleared before publication and in `finally` around completion (`spot-sky-page.tsx:1954–1961,2025–2030`). The accepted object copies the current frame's supplement; it contains no explicit previous-frame pointer (`1936–1945`). `sky-command-state.ts` dispatches a closure returning the newly computed value. No previous-frame chain was added by these inspected fields. The already completed direct-action/Page-ack controls were not rerun.
- Taro `nextTick` can enqueue a callback while a root update is pending (`runtime/dist/next-tick.js:24–34`); root update completion copies then clears `updateCallbacks` before invoking them (`dom/root.js:155–170`). SpotSky uses this for ruler positioning and stable `measureBottomControls`, whose callback is guarded by a revision (`spot-sky-page.tsx:1656–1684`). These source facts do not certify native delivery or eliminate every stalled-queue case, but no new per-frame unbounded queue was demonstrated. They do not justify repeating the prior Page-ack experiment.
- Reconciler 0.29.0's deleted-fiber cleanup clears children, siblings, return links, memoized props/state and update queues. The production minified `Qg` function contains the same clearing as development `detachFiberAfterEffects` (`react-reconciler.development.js:15324–15382`). Taro's `detachDeletedInstance` is a no-op, so external owners can still matter for the host node itself; no claim that React's cleanup alone frees native objects follows.

## Stop condition and remaining observation

The two selected boundaries have been traced; no additional mechanism was established that warrants another local pressure loop. The diagnostic result is a specific finite stale-props holder and otherwise bounded source owners, not a whole-program no-leak proof.

The minimum useful target association remains the old aggregate, its tile key and whether the tile's current cache value was replaced, observed with finite weak witnesses and a result preserved before the known crash interval. If an old aggregate survives after confirmed cache replacement, actual retirement and a useful later collection opportunity, a host/outer holder becomes the focused question. The stale-props path is relevant only with an actual matching old-props/aggregate identity or retaining edge, or another discriminating target observation. Scalar DOM counts alone cannot establish that edge; a successful target exit alone cannot prove collection.

No production repair, dependency update, new profiler framework, repeated gen22/23 experiment or memory-safety verdict is proposed by this audit. The logic-V8 OOM and incomplete target retirement remain unresolved.
