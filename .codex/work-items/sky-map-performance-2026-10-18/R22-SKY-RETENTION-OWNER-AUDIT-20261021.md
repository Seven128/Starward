# r22 Sky retention owner audit

2026-10-21. Independent offline source/evidence review during environment recovery. No device, IDE, service, build, Git operation, product change, new profile, or stress run was performed. This note does not supersede PLAN/HANDOFF or certify B.

## Result

The inspected current code does **not establish an unintended unbounded strong retention path** for successive exact-time stellar frames. The r7 surviving-allocation attribution remains valid; it identifies creation owners rather than roots. The earlier local Node result already exercises the actual Scene with current-slot replacement and found bounded post-GC retention, while explicitly excluding React/Taro/native owners. Repeating that experiment would not resolve the remaining target question.

The current full-sky/native allocation failures therefore remain unexplained. Source bounds, completed retirement callbacks, sampling weights and PSS cannot supply a whole-product no-leak result. Do not resume gen24 or an adjacent disable experiment on the basis of this audit.

## Current ownership traced

| Owner | Source finding | Limit of the finding |
| --- | --- | --- |
| BSC transform | `sky-stellar-scene.ts:38,119-141` stores one value per weak scene key, deleting the prior entry before resolving another geometry. The derived frame lazily owns vector/position/direction/transmission arrays and point tuples. | A value-to-key closure cycle is not itself a strong root. An external retained scene/frame can retain these arrays; no target retaining graph identifies such a root yet. |
| SAO transform | `sky-stellar-supplement-scene.ts:21,42-56` stores the latest geometry transform per weak tile key. Each aggregate owns only its selected spans. `sky-stellar-tile-loader.ts:25,42,71,85` limits active requests, drops unwanted loaded tiles, and clears the view on disposal. | The published byte budget is not a decoded-heap bound. Old aggregate frames could retain prior transforms if an outer consumer retains them. |
| r21 draw preparation | `sky-star-draw-preparation.ts:33,65-83` replaces one current-view key/catalog/supplement; old lists clear before a changed build. Page suspension, context release and invalidation reset it (`spot-sky-page.tsx:1712,1755,2051`). | This is bounded source ownership, not measured target collection or an ordinary-Play cost pass. |
| Canvas/accepted state | `sky-canvas-lifecycle.ts:131,223` holds latest plus one in-flight snapshot; hide/dispose clear latest (`272,279`). `spot-sky-page.tsx:1955-1961,2027-2030` fences and clears the one pending paint slot. Accepted frame state is replaced rather than appended. | Native callback retention, React scheduling and host ownership are outside the static slot count. Existing gen23 direct-action and Page-ack evidence already limit those particular prior hypotheses; do not repeat them. |
| Response cache | `response-cache.ts:126` enforces 24 serialized entries/6 MiB. Its persistence writer is single-flight and one pending batch; `api-client.ts:386-403,472-482` releases each request fence on finish, cancellation, exception or bounded watchdog. `response-cache.ts:335-342` clears the fence's body references and removes it. | Serialized bytes do not bound the expanded JS graph or host storage work. No current source path was found that appends completed fences indefinitely. A stalled native storage operation can retain one batch, not a new batch per frame. |
| Geometry Query | `use-sky-time-geometry.ts:76` explicitly uses `gcTime:0`; a single `retained` ref carries the admitted model. | Response-cache lifetime remains separate; no claim that the model is immediately collected. |

## Specific outer boundary worth distinguishing

The fine-target Query differs from geometry. `spot-sky-page.tsx:2190-2203` keys a Query by each settled exact `at`, uses the page-created `queryFn`, and inherits the global **30-minute** `gcTime` (`services/query-client.ts:18`). The installed TanStack implementation stores options/queryFn on the Query and removes an inactive idle Query only after its GC timer (`query-core/src/query.ts:203-226,377`; `removable.ts:14-29`). `use-resource-query.ts:70-75` adds its own wrapper around the supplied function. Thus different observed fine-time keys and their query functions can intentionally remain after the view moves elsewhere, independently of the 24-entry response cache.

This is a concrete lifetime distinction, **not a diagnosed leak**. It has no current cardinality/byte evidence, and JavaScript closure syntax alone does not establish the runtime's retained-context graph. Ordinary Play makes `fineTargetBinding` null, so increasing counts of fine-target requests cannot be assumed to explain its continued growth. The current page's image/accepted callbacks likewise cannot be called historical-frame chains without actual retaining edges.

If the one authorized Stable comparison produces useful graphs, inspect the measured obsolete BSC/SAO transform generations' retaining paths first; specifically distinguish Query options/observers, current and alternate React state, Page callbacks, debug resources, and deliberate current tile/accepted ownership. Keep private strings/identities inside the private evidence owner.

If graph capture fails, the least intrusive independent check for the **fine-target cardinality hypothesis only** is a bounded scalar summary from the existing Query owner during the next necessary real interaction: total/inactive/fetching `spot-sky-target-instant` entries and current geometry entries before input, after settled input, and after leaving Sky. It should record no keys, payloads or historical frames and needs no new standalone profiler or stress run. A stable count during growing memory rejects query-count growth as that episode's explanation; a growing count identifies a cache-policy decision to investigate but still does not show retained stellar arrays. Do not lower all Query GC policies or clear user caches as a diagnostic substitute.

No new tests were run: the audit found no proposed code change, and the known local Scene/retirement checks cannot answer target root retention. A retained-graph or other genuinely discriminating target ownership result remains required before claiming a B repair.

## Evidence reused

- `R17-NORMAL-R7-ALLOCATION-RESULT.md`: actual surviving sample and two-level source mapping; no retaining roots.
- `R17-JS-HEAP-DIAGNOSIS.md`: bounded actual local Scene evidence and explicit React/Taro/native exclusions.
- `R17-TARGET-HEAP-DIAGNOSIS.md`: one historical initial normal Sky heap; no comparable second graph.
- `R17-PAGE-BRIDGE-RESULT.md`, `R17-ACCEPTED-ACTION-RESULT.md`: existing negative controls and scope limits.
- `R17-NORMAL-R9-RETIREMENT-OBSERVATION.md`, current HANDOFF: actual retirement boundary remains separate from driver/whole-process reclamation.
- `R21-PLAY-EXIT-RESULT.md`: current native failure persists without a new attributable root.
