# Map test consumer repair — 2026-10-18

Scope: H7's current `pages/map` failures only. No production implementation, design, device, Git or plan changes.

## Findings and repairs

- Map/Sky return, native focus and location cancellation added explicit page dependencies that older callback VMs did not provide. `map-page-test-support.ts` supplies one named idle boundary adapter, records calls and leaves unknown globals/dependencies unsupported. Calendar/editor Back, native recovery, panel drag and show/hide tests still execute actual production callbacks. Hide and drag assertions also verify retirement of pending focus; hide verifies location cancellation.
- Context restoration's Scene query now consumes real native viewport bounds and the shared overlay-kind projection. The two affected fixtures provide those inputs while retaining all safe bootstrap, cached markers and forbidden stale-Context request assertions.
- Formal-selection race fixtures now have the camera/coordinate inputs required by `openDetail`, including the production `spotNeighborhoodCamera` helper. All original selection, restore, replacement, cancellation and owned retry assertions remain; no production focus rule or 4 km requirement changed.
- Navigation moved to `useSpotNavigationCommand`. The Map test executes its actual `spotNavigation` snapshot and `onPanelNavigate`, the actual hook and controller, with explicit platform/store seams that reject unknown imports. Existing confirm/cancel/change/hide/native-failure/red-handoff outcomes are preserved; a successful open also checks the actual coordinates.
- Scene errors now render the existing compact refresh button and ordinary emptiness uses the availability notice with the persistent search control. Tests exercise the current rendered branch, invoke the real retry/search handlers, check their effects and keep provider diagnostics absent. Pending/failed selected-Context ownership assertions still run against that rendered branch.
- Terrain native installation moved from an inline page callback to `useMapRasterInstallation` and `map-ground-overlay`. Tests now execute the shared result callback with the actual Map terrain options. They retain valid-image preservation, successful retry, stale image-failure rejection and genuine bad-image eviction assertions. The API assertion follows the current add/ack/remove strategy, which deliberately avoids mutating installed bounds via `updateGroundOverlay`; existing coordinator behavior tests verify retention until replacement acknowledgment.

## Verification

- Existing 11 affected test files: **88 tests passed, 0 failed, 0 skipped**. Final command ran from `apps/wechat-miniapp`, using `../../tools/run-node.cjs --import tsx --test` and explicit file arguments. Log: `tmp/map-test-repair-final.log`.
- Initial invocation from repository root encountered the existing `@/` alias resolution boundary in `panel-spring.ts`; rerunning at the declared Mini Program package working directory resolved it. This was runner setup, not a product failure.
- Package `npm run typecheck` completed with one diagnostic outside this scope: `src/features/sky/sky-context-session.test.ts:9` imports non-exported `observationNightForInstant` from contracts. No Map diagnostic. Parent notified so the concurrent Sky repair can use the correct owner. Log: `tmp/map-test-types-final.log`. The first root compiler invocation used root TypeScript 6 and stopped at its `baseUrl` deprecation check before checking sources; that wrong entrypoint result is not a code regression.
- `git diff --check` on the affected Map paths found no whitespace errors.

## Bounded observation

The actual native Map JSX calls `revealReturnedMap(false)` from an old `onError` closure even after the native handle becomes obsolete; `onUpdated` checks the handle first. This is only a call-path observation, not a demonstrated reachable user defect: the return waiting shield ordinarily prevents a manual retry until it has revealed. Reported to the parent owner for lifecycle assessment; no production change or new acceptance matrix was made from this observation.

These callback/source checks do not establish physical Map centering, 4 km range, continuous native terrain registration or handset animation acceptance.
