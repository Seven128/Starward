# Current Mini Program test inventory — 2026-10-18

## Bound run

Ran the existing `npm run test --workspace @starward/wechat-miniapp` entry **once**, after the recursive glob was quoted. Node 24.16.0 ran 2,586 tests: **2,445 passed, 140 failed, 1 skipped, 0 cancelled**, in 116,561.9457 ms; exit code 1. This replaces the historical 1,824/52 figures for this particular workspace/run, not for the whole release pipeline.

Base HEAD: `32ec61a4f5321e571d499be6430a09918d65242e`, with the current uncommitted implementation. A pre-run manifest hashes 1,421 relevant Mini Program/shared source files; the post-run comparison found **zero changed files**. The supplied test discovery audit identified 496 test files. No test/source edits, IDE/device operations, Git mutations, or additional full runs were performed by this audit.

- Complete ignored output: `tmp/miniapp-current.log`; SHA-256 `b12a26f0d03aaf57bc318d7db403d44ba9015b905869e8f17d31cb277a782f43`.
- Source identity and result: `tmp/miniapp-current-identity.json`; SHA-256 `76957152b618da83a5fcd84be30d26346c408020d11258548076e7e2815bc7da`.
- Parsed 140 failure records with complete individual diagnostics: `tmp/miniapp-failure-details.json`.
- The existing skip is `features/sky/sky-sdss-optical-page.test.ts:113`, “science source consumers keep an independently live actual coarse field and original publication.” It remains unverified; this audit did not add or remove skips.

Counts below are Node failure records, including the two failed module-load records and failed parent/child records. They are **not 140 distinct product defects**. A first fixture exception can hide later issues; repairs must retain behavior assertions and rerun the affected group before any pass claim.

## Ownership and immediate result

| Responsibility | Failed records | Current interpretation |
| --- | ---: | --- |
| This task's Map/Sky boundary, Map integration and package adapters | 37 | Missing VM dependencies and outdated source/resource/route assumptions, detailed below |
| Shared contribution, plan, account navigation and App harness | 20 | Missing dependencies introduced by existing shared recovery, account and error-reporting owners |
| Sky internal owner | 83 | Primarily stale VM/AST/menu/time fixtures; three explicit display tuning assumptions; one infrared fallback/readiness contract still requires its owner to resolve |

No production defect is established merely by the observed ReferenceErrors or AST lookup failures. The Map/Sky boundary and ordinary business tests are this Goal's shared-check responsibility. Sky internal failures stay visible and must be handed to their existing owner; they are not waived or converted to passes. No claim of device behavior, runtime acceptance, or a green release pipeline follows from this classification.

## Map/Sky boundary and package adapter failures — 37

All paths in the tables are under `apps/wechat-miniapp/src/`.

| Test file | Count | Observed failure and existing production owner |
| --- | ---: | --- |
| `components/native-back-boundary.test.ts` | 1 | Source regexp still requires Sky Back active only while a disclosure is visible. Current `spot-sky-page.tsx` owns one route-wide `NativeBackBoundary` for disclosure dismissal and Map return. Keep uniqueness and actual Back priority assertions; do not restore the obsolete activation expression. |
| `components/shared-rendering-regression.test.ts` | 2 | Import-stripping VM omits `mainBIcons`, so module evaluation throws before rendering. The JSON declaration is imported by real `semantic-asset.tsx`. Secondary expectations are also stale: shared `arrow-left` uses `/assets/b-icons/`, and shared `search` no longer changes package under the old route mutation. Preserve tests for shared main assets and genuinely package-owned variants, including retained-page route identity. |
| `pages/map/context-restore.test.ts` | 2 | Extracted cold-selection scope omits `nativeViewport`, now read by the real focus/camera handoff. Preserve Context identity/recovery assertions and bind the real current camera/focus dependencies. |
| `pages/map/map-calendar-back.test.ts` | 2 | Extracted Back callback omits `mapReturnPhase`; current page checks return lifecycle before calendar/panel routing. Preserve calendar priority and busy-calendar consumption. |
| `pages/map/map-data-recovery.test.ts` | 2 | Old UI/AST assumptions: EMPTY no longer renders the generic StatusPanel; ERROR renders `SoftButton` “刷新观星点”; the retained-loading condition now includes a nested ERROR branch. Existing extraction evaluates a StatusPanel detail in states that cannot render it, then fails to find the new nested condition. Preserve real actionable recovery and no provider-diagnostic leakage. |
| `pages/map/map-native-compatibility.test.ts` | 2 | Back-expression VM omits `mapReturnPresentation`; terrain assertion still looks for `Taro.createMapContext(mapId)` directly in `index.tsx`. Current Map uses `useMapRasterInstallation`, which owns `Taro.createMapContext(nativeMap.mapId)` and native ground overlays. |
| `pages/map/map-page-lifecycle.test.ts` | 1 | Extracted lifecycle callbacks omit `spotMapFocus` (and must account for the current return lifecycle). Keep hide cancellation, retired editor scope and late navigation checks. |
| `pages/map/native-map-recovery.test.ts` | 1 | Extracted native callbacks omit `revealReturnedMap`; preserve actual map-id replacement, retained viewport, and rejection of old callbacks. |
| `pages/map/navigation.test.ts` | 1 | Old extracted callback omits `spotNavigation`; page now delegates to `useSpotNavigationCommand`. Test the actual shared command with warning cancellation and selection retirement, rather than rebuilding obsolete inline navigation. |
| `pages/map/panel-drag-cancel.test.ts` | 3 | Two subcases throw for missing `spotMapFocus`; the parent is also counted failed. Preserve touch cancellation/multi-touch no-commit and scroll ownership; feed the focus cancellation boundary. |
| `pages/map/spot-context-race.test.ts` | 14 | Assertions about request count/settlers fail after asynchronous `ReferenceError: setViewport is not defined`. The extracted `resolveSpotContext` now also stages camera/focus; no request starts in the incomplete harness. Preserve A–B–A, retired Context, cancellation and retry effects after wiring the real current dependencies. |
| `pages/map/spot-editor-exit.test.ts` | 3 | Extracted Back callback omits `mapReturnPhase`. Preserve the editor leave guard and cancelled/approved-close behavior. |
| `pages/map/terrain-ground-overlay.test.ts` | 1 | Searches for retired `terrainOverlayResult.current` in Map root. Current corresponding callback is `resultHandler.current` in `use-map-raster-installation.ts`, shared by terrain and nightlight. Verify native failure preserves a valid image, late decode failure cannot evict recovered image, and actual decode failure retires the bad path at that owner. |
| `features/sky/sky-return-entry.test.ts` | 1 | Extracted return callback omits `skyExit`. More substantially, the old assertion always requires `navigateBack` before Map fallback; current authorized lifecycle unloads Map on entry and returns through the shared exit owner. Preserve usable recovery and the real Map destination instead of restoring the retained Map stack. |
| `services/sdss-optical-client.test.ts` | 1 | `deepSkyManifestUrl` source extraction still reads `api-client.ts`; the package optimization moved the actual owner to `sky-celestial-client.ts`. Preserve immutable real-target URLs and forged-identity rejection. |

## Shared ordinary business/App fixture failures — 20

| Test file | Count | Observed failure and existing production owner |
| --- | ---: | --- |
| `content/contribution/editor-readonly.test.ts` | 5 | Component VM omits imported `ContributionSubmitRecovery`; actual editor imports it from `contribution-media-history`. Record/owner/terminal read-only assertions have not run to completion. |
| `content/contribution/local-draft-storage.test.ts` | 5 | Extracted `applyDraft` omits `setSubmissionRetryAvailable`, defined by the real form's recovery state. Retain each supported persisted draft representation and clean/dirty semantics. |
| `content/plan/detail/plan-reminder-render.test.ts` | 1 | JSX VM omits current `mode`; actual page obtains it from the app store. Preserve saved title, offset, status explanation and checklist ownership. |
| `content/spot-feedback/formal-image-selection.test.ts` | 6 | `addPhoto` now checks real `pendingSubmit.current`; VM omits that ref. Native-call count assertions fail and asynchronous ReferenceErrors confirm the missing dependency. Preserve media lock, user cancellation, successful upload, late-account rejection and hidden-feedback rules. |
| `features/my/navigation.test.ts` | 1 | Extracted `openPage` omits `login`; actual My page owns `useWechatLogin`. Preserve competing-navigation serialization and retry after native failure through the supported authenticated entry. |
| `features/spot/spot-plan-route.test.ts` | 1 | Import-stripping component VM omits `useAccountOperation`, imported by the real `SpotPlanEntry`. Preserve layout notification only when labels/count/recovery actually change. |
| `services/sky-image-file-session.test.ts` | 1 | App extraction omits `useError` (also inspect `useUnhandledRejection`/reporting binding after repair). The real `app.tsx` imports the Taro hooks. Shared App startup cleanup must still preserve independent native chrome/cache initialization and report each actual failure. |

## Sky internal failures — 83

These are classified for the existing Sky owner, without editing or rerunning its internals.

| Test file | Count | Observed cause / remaining interpretation |
| --- | ---: | --- |
| `features/sky/orientation-time-ruler.test.ts` | 1 | Extracted page declaration omits `carriedReport`, now bound by `timeCommitContinuity.read(...)`. |
| `features/sky/sky-calibration-mode.test.ts` | 1 | Module-level extractor finds zero of the two old `Button data-od-id` manual/follow controls, fails `0 !== 2` before registering cases. Current controls use newer shared composition. |
| `features/sky/sky-canvas-time.test.ts` | 1 | Invalidated-callback VM omits current `canvasSurfaceRef`; synchronous clear assertions are not reached. |
| `features/sky/sky-catalog-information-recovery.test.ts` | 2 | The source link now resides in `SkyObjectDialog`'s `priority` ReactNode prop; test tree traversal only visits `children`, so it reports the still-rendered source action absent. Preserve painted publication binding, source navigation, retained facts and retry. |
| `features/sky/sky-context-entry-recovery.test.ts` | 1 | Exact copy mismatch `重试` versus old `重试恢复`; keep lookup-owner retry and available return behavior. |
| `features/sky/sky-context-session.test.ts` | 15 | Extractor exports retired `commitCivilDate` from `SpotSkyPage`, causing a ReferenceError before cases reach effects. Current time controls/commit owners must be wired coherently; do not reinstate obsolete page functions. |
| `features/sky/sky-deep-sky-region.test.ts` | 1 | Extracted Scene call omits the new `readyImages` argument. Retain exact ICRS/catalog submission binding. |
| `features/sky/sky-dome-integration.test.ts` | 42 | Common calibration fixture asks `skyMenuProps(...).headings.get('取消并收起校准')`, now absent, then `expression()` reads `.properties` from undefined. All 42 stop at the same obsolete UI extraction. Reconnect the shared current calibration control before judging the camera/state assertions. |
| `features/sky/sky-full-sphere.test.ts` | 1 | Fixture assumes magnitude 6 exits at 270°; current ordinary display explicitly retains a 6.5-magnitude overview floor. Therefore the returned pick identity is still eligible. Choose a real eligibility transition for the existing fade/no-stale-pick requirement; do not restore the older display cutoff just to satisfy it. |
| `features/sky/sky-location-preview.test.ts` | 2 | First VM omits `paintedSkyObjectsRef`; second counts nine old declarations but only eight remain because `selectedCivilDate` moved out of that page structure. |
| `features/sky/sky-ready-presentation.test.ts` | 1 | Fixture calls 115° “half-faded scale”; current `constellationVisibility` reaches full artwork opacity above 25°. Thus measured half-readiness alpha .1 is consistent with current .2 target, rather than old .05. Retain a genuine half-target × half-readiness case under the adopted current curve. |
| `features/sky/sky-render-invalidation.test.ts` | 1 | Retained draw callback VM omits `zoomRef`; actual page owns that ref. |
| `features/sky/sky-route-date-recovery.test.ts` | 1 | Module-load AST assertion expects `selectedCivilDate` and `dateOptions` declarations in the page, now zero; cases do not register. |
| `features/sky/sky-sdss-science-scene.test.ts` | 2 | One controlled module loader rejects the new `./sky-ready-artwork` import. The other is a **remaining contract question**: it expects an immediate infrared source credit with a new readiness clock, while current `drawInfraredCutout` sends the single field through shared levels/readiness and returns no painted source at initial zero display. Its test's fake `artworkLevels` only describes the optical offscreen outcome. Sky owner must distinguish valid retained fallback readiness from first preparation and verify the actual effects; this audit does not mark that behavior correct. |
| `features/sky/sky-stellar-query.test.ts` | 1 | Extracted real `useResourceQuery` hook omits imported `useQueryClient`; immutable publication behavior is not reached. |
| `features/sky/use-sky-sdss-science-optical.test.ts` | 9 | Controlled module binding table rejects current `./sky-native-image-levels`. Shared source-level selection must be represented by its actual module, retaining metadata retirement/identity, coarse recovery and native-pixel assertions. |
| `services/stellar-catalog-client.test.ts` | 1 | Test assumes magnitude 4 is hidden at Sun altitude −10°. Current explicit ordinary nautical endpoint is 5.5, so all 1,630 supplied stars are eligible rather than only 100 magnitude-1 rows. Use fixture magnitudes on both sides of the actual eligibility boundary while retaining sorted/unsorted identity assertions. |

## Bounded follow-up

Repair tests at the shared owner rather than copying more partial VM state into every consumer. Reuse current harness/modules where feasible, keep production effect assertions, and retain focused failure reproduction for an actual defect if one emerges. Batch the Map/package group and ordinary business/App group separately; rerun their affected files after repair. Sky internal fixture work and the explicit fallback/readiness question remain with the Sky owner. A later full integrated pass is justified only after these actual failures are resolved; this audit intentionally did not repeat it.

The 4 km selection requirement, native terrain registration/continuous gestures, actual account/draft/share/file journeys, package size and phone transition appearance still require their own existing evidence. This deterministic run does not replace them.
