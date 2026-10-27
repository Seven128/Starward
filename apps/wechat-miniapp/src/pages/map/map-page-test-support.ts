import type { AnalysisOverlay } from "../../state/app-store";
import { mapLayerKindForOverlay, mapSceneLayerForOverlay } from "./map-layer-selection";
import { createPrimaryNavigationController } from "../../navigation/primary-navigation-controller";
import { userMapRegionEnded } from "./map-region-event";

/** Scene admission is a callback boundary in tests of unrelated Map effects.
 * The full Map-intent runtime separately executes the actual admission owner. */
export function createMapSceneAdmissionTestBoundaries() {
  const pending = { current: null as { intent: number; gesture: boolean } | null };
  return {
    mapSceneRegionIntent: pending,
    beginMapSceneRegion: (intent: number, gesture = false) => { pending.current = { intent, gesture }; },
    finishMapSceneRegion: (intent: number | null) => { if (pending.current?.intent === intent) pending.current = null; },
    userMapRegionEnded,
  };
}

/** Query-owner dependencies used by the existing focused Map callback tests.
 * Use the real layer policy; static reads require an explicit response adapter. */
export function createMapSceneTestBoundaries(options: {
  overlay?: AnalysisOverlay;
  refetchLight?: () => Promise<unknown>;
} = {}) {
  return { scope: {
    mapSceneRegionPending: false,
    mapRegionScaleRead: { current: null as null | { controller: AbortController; isCurrent(): boolean } },
    mapLayerKindForOverlay,
    mapSceneLayerForOverlay,
    analysisOverlay: options.overlay ?? "NONE",
    nativeViewport: { bounds: null, error: null },
    nightLight: { refetch: options.refetchLight ?? (async () => { throw new Error("unexpected_test_nightlight_read"); }) },
  } };
}

/** Explicit idle page boundaries for tests that execute selected Map callbacks.
 * Unknown globals are deliberately not supplied: a new dependency must be
 * understood by the consumer, rather than becoming a permissive no-op mock.
 */
export function createMapPageTestBoundaries() {
  const calls: string[] = [];
  const nativePage = { route: "pages/map/index" };
  const controller = createPrimaryNavigationController({ currentPage: () => nativePage });
  controller.show(nativePage);
  return {
    calls,
    nativePage,
    scope: {
      ...createMapSceneAdmissionTestBoundaries(),
      mapRegionScaleRead: { current: null as null | { controller: AbortController; isCurrent(): boolean } },
      pageVisible: true,
      primaryNavigation: { controller, get presentation() { return controller.getSnapshot(); } },
      mapReturnPhase: { current: null as "waiting" | "revealing" | null },
      mapReturnPresentation: null as "waiting" | "revealing" | null,
      skyEntryPresentation: null as number | null,
      skyEntry: {
        isActive: () => false,
        show: () => calls.push("sky-show"),
        hide: () => calls.push("sky-hide"),
        cancel: () => calls.push("sky-cancel"),
      },
      login: { open: false },
      spotMapFocus: {
        begin: (identity: string) => calls.push(`focus:${identity}`),
        cancel: () => calls.push("focus-cancel"),
      },
      cancelLocation: () => calls.push("location-cancel"),
      revealReturnedMap: (ready: boolean) => calls.push(`map-return:${ready}`),
    },
  };
}
