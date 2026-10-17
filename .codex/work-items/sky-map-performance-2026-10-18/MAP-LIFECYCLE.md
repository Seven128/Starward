# Map unload and return implementation

## Delivered responsibility

- Map's formal and authorized pending-proposal Sky actions use `redirectTo` after the existing source blackout. Other Map destinations retain their navigation behavior.
- Camera/zoom, selected formal identity, filters/layers, preferences and Observation Context remain with `app-store`; existing resource queries retain their own cache and restoration responsibility. No alternate Context/camera copy is installed.
- `pages/map/sky-return-state.ts` holds one in-memory return presentation: the four account/reset/selection/open-request scope scalars, selected summary or owner-scoped pending submission, panel extent, and document/gallery pixel offsets. The scope explicitly picks these four fields even when supplied the full store. It holds no component, native map, query client, timer, request or callback from Map.
- The scope listener exists only from save until take/discard/invalidation. Account changes, map reset, new selection or explicit open retire the saved return immediately, including A→B→A. A failed native route discards only its own ticket. A fresh Map consumes a matching snapshot once and initializes its existing selection/panel owners, bypassing the normal `openDetail` camera recenter/medium-extent reset.
- Both formal and pending panels reuse their existing document/gallery hooks through `use-panel-return-position`. The return command waits for actual content readiness, restores each axis once, rejects changed media identity and late callbacks, and then returns ownership to ordinary scrolling/viewer returns. It does not replay scroll commands on every user event.
- Returned Map keeps a black frame until its actual native map `onUpdated`, then fades that frame out for the inverse 220 ms transition. Native error or the existing 10-second recovery horizon releases the frame and leaves the native-map retry control; neither records map-ready. Reduced motion skips the fade. `map-sky-lifecycle` exposes phase and only the shared lifecycle's numeric timestamps for runtime observation.
- A pending formal date/time write cannot initiate Sky replacement: the action is disabled while `timeSaving`, and the synchronous handler checks the shared pending Context edit. This avoids unloading and retiring a writable Context while opening Sky with that identity.

## Checks completed

- `sky-entry-transition.test.ts`: 11 passed, including actual extracted formal/private entry commands, redirect routing, repeated intents, native failure, and pending Context edit admission.
- `sky-return-state.test.ts`: 5 passed, including selective store scope, one-time restoration, owner/reset/selection invalidation, subscription lifetime and old-failure/new-ticket isolation.
- `use-panel-return-position.test.ts`: 2 passed using the production shared scroll hooks and return hook, checking delayed content, document/photo offsets, later user movement, replacement identity and stale callback rejection. These establish command ownership, not native rendered scroll geometry.
- Existing `candidate-map-focus.test.ts`: 6 passed. Existing `map-point-intent.test.ts`: 8 passed.
- Mini Program `typecheck` passed after the return implementation/test type repair. The final small pending-edit guard is type-preserving; the root's final integrated check owns the settled candidate result.

## Current evidence limits

Root owns the actual DevTools entry/unload/return observation, rendered scroll restoration, native readiness timing, reverse animation and target-device evidence. This task did not compile an independent runtime or operate DevTools.

Extra existing source-extraction suites were inspected while checking affected selection/Context responsibilities. `spot-context-race.test.ts` currently lacks the existing `setViewport`/camera/focus dependencies and fails before its intended request; `navigation.test.ts`'s old travel-warning test lacks the current `spotNavigation` owner; two `context-restore.test.ts` scene fixtures omit the existing native viewport/layer dependencies. These suites were not counted as passing and production behavior was not altered to satisfy obsolete fixture assumptions. The actual new Map dependency that initially surfaced in extracted `openDetail` checks was removed by placing one-time scroll-command retirement in the existing presentation coordinator; the camera and map-point suites then passed.
