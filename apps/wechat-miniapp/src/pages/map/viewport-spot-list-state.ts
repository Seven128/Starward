import type { SpotSummary, TerrainBounds } from "@starward/miniapp-contracts";
import { mediaIsRenderable } from "../../utils/spot-media";

export const VIEWPORT_SPOTS_PER_PAGE = 4;
export const VIEWPORT_SPOT_MAX_PAGES = 5;
export const VIEWPORT_SPOT_CARD_MOTION_MS = 160;
export const VIEWPORT_SPOT_CARD_STAGGER_MS = 35;
export const VIEWPORT_SPOT_PAGE_MOTION_MS = 180;
// Reuse the primary-navigation owner's bridge allowance only as recovery when
// the native animation endpoint is absent, never as an observed start time.
const ANIMATION_EVENT_ALLOWANCE_MS = 32;

export interface ViewportSpotResult {
  /** Identity of the accepted Map query and its native visible bounds. Never
   * relabel an earlier query's data with the latest requested identity. */
  requestKey: string;
  revision: string;
  spots: readonly SpotSummary[];
  /** Actual returned places inside the visible bounds, before the display cap. */
  total: number;
}

/** Presentation-only projection of the existing Map scene, in its server order.
 * Missing native bounds is unknown coverage, not a successful empty viewport. */
export function projectViewportSpots(requestKey: string, spots: readonly SpotSummary[], bounds: TerrainBounds | null): ViewportSpotResult | null {
  if (!bounds || ![bounds.west, bounds.east, bounds.south, bounds.north].every(Number.isFinite)
    || bounds.west >= bounds.east || bounds.south >= bounds.north) return null;
  const ids = new Set<string>();
  const visible: SpotSummary[] = [];
  let total = 0;
  for (const spot of spots) {
    const { latitude, longitude } = spot.gcj02;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || ids.has(spot.spotId)
      || latitude < bounds.south || latitude > bounds.north || longitude < bounds.west || longitude > bounds.east) continue;
    ids.add(spot.spotId);
    total++;
    if (visible.length < VIEWPORT_SPOTS_PER_PAGE * VIEWPORT_SPOT_MAX_PAGES) visible.push(spot);
  }
  // Only fields consumed by the shared identity card need to restart its motion.
  const revision = JSON.stringify([total, visible.map(spot => {
    const media = spot.media.find(item => mediaIsRenderable(item));
    return [spot.spotId, spot.name, spot.region, spot.address, media ? [media.thumbnailPath, media.localPath, media.alt] : null];
  })]);
  return { requestKey, revision, spots: visible, total };
}

export type ViewportSpotPhase = "idle" | "leaving" | "waiting" | "entering" | "paging";
export interface ViewportSpotPresentation {
  active: boolean;
  wantedKey: string;
  result: ViewportSpotResult | null;
  page: number;
  phase: ViewportSpotPhase;
  direction: -1 | 1;
  transition: number;
}

interface MotionClock {
  setTimeout(callback: () => void, delay: number): unknown;
  clearTimeout(handle: unknown): void;
}

const defaultClock: MotionClock = {
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function viewportSpotPageCount(result: ViewportSpotResult | null) {
  return result ? Math.min(VIEWPORT_SPOT_MAX_PAGES, Math.ceil(result.spots.length / VIEWPORT_SPOTS_PER_PAGE)) : 0;
}

export function viewportSpotPage(state: ViewportSpotPresentation) {
  return state.result?.spots.slice(state.page * VIEWPORT_SPOTS_PER_PAGE, (state.page + 1) * VIEWPORT_SPOTS_PER_PAGE) ?? [];
}

export function viewportSpotMotionDuration(count: number) {
  return count > 0 ? VIEWPORT_SPOT_CARD_MOTION_MS + (count - 1) * VIEWPORT_SPOT_CARD_STAGGER_MS : 0;
}

export function viewportSpotAnimationDelay(phase: ViewportSpotPhase, index: number, count: number) {
  return (phase === "leaving" ? count - 1 - index : phase === "entering" ? index : 0) * VIEWPORT_SPOT_CARD_STAGGER_MS;
}

/** One bounded presentation owner: at most the accepted twenty places, the
 * incoming twenty and one phase timer. Queries, failures and selection effects
 * stay with Map. A newer intent retires queued data; replaced animation phases
 * reject their late callbacks without restarting a still-visible fade. */
export function createViewportSpotPresentation(clock: MotionClock = defaultClock) {
  let state: ViewportSpotPresentation = { active: false, wantedKey: "", result: null, page: 0, phase: "idle", direction: 1, transition: 0 };
  let pending: ViewportSpotResult | null = null;
  let resumePage: { requestKey: string; revision: string; page: number } | null = null;
  let timer: unknown = null;
  let timerVersion = 0;
  let reducedMotion = false;
  const startedCards = new Set<number>();
  const finishedCards = new Set<number>();
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<ViewportSpotPresentation>) => {
    if (patch.transition !== undefined && patch.transition !== state.transition) {
      startedCards.clear(); finishedCards.clear();
    }
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  };
  const stop = () => {
    timerVersion++;
    if (timer !== null) clock.clearTimeout(timer);
    timer = null;
  };
  const schedule = (delay: number, callback: () => void) => {
    stop();
    const run = state.transition;
    const clockRun = timerVersion;
    timer = clock.setTimeout(() => {
      if (clockRun !== timerVersion || !state.active || state.transition !== run) return;
      timer = null;
      callback();
    }, delay);
  };
  const enter = () => {
    const next = pending;
    pending = null;
    if (!next || next.requestKey !== state.wantedKey) { publish({ phase: "waiting" }); return; }
    const count = Math.min(next.spots.length, VIEWPORT_SPOTS_PER_PAGE);
    publish({ result: next, page: 0, phase: reducedMotion || !count ? "idle" : "entering", transition: state.transition + 1 });
  };
  const replace = () => {
    if (!pending) return;
    stop();
    const count = viewportSpotPage(state).length;
    if (!count || reducedMotion) {
      if (!state.result || reducedMotion) {
        const next = pending; pending = null;
        const page = !state.result && resumePage?.requestKey === next.requestKey && resumePage.revision === next.revision
          ? Math.min(resumePage.page, Math.max(0, viewportSpotPageCount(next) - 1)) : 0;
        resumePage = null;
        publish({ result: next, page, phase: "idle", transition: state.transition + 1 });
      } else enter();
    } else publish({ phase: "leaving", transition: state.transition + 1 });
  };
  const finishPhase = () => {
    stop();
    if (state.phase === "leaving") enter();
    else if (pending?.requestKey === state.wantedKey) replace();
    else publish({ phase: "idle" });
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    configure(wantedKey: string, active: boolean, reduceMotion: boolean) {
      const keyChanged = wantedKey !== state.wantedKey;
      const changed = keyChanged || active !== state.active;
      const skipMotion = reduceMotion && !reducedMotion && state.phase !== "idle";
      reducedMotion = reduceMotion;
      if (!changed && !skipMotion) return;
      if (keyChanged) { pending = null; if (resumePage?.requestKey !== wantedKey) resumePage = null; }
      if (!active || !state.active || skipMotion) {
        stop();
        if (!active && state.active) resumePage = state.result?.requestKey === wantedKey
          ? { requestKey: wantedKey, revision: state.result.revision, page: state.page } : null;
        const installingPending = pending?.requestKey === wantedKey;
        const latest = installingPending ? pending : state.result;
        pending = null;
        publish({ wantedKey, active, result: active ? latest : null, page: active && !installingPending ? state.page : 0,
          phase: "idle", transition: state.transition + 1 });
      } else {
        // Let the visible cards finish their current direction. New requests
        // replace only the queued result, so an interrupted fade never jumps
        // back to opaque and an already-entering page is not remounted.
        publish({ wantedKey });
      }
    },
    receive(result: ViewportSpotResult | null) {
      if (!state.active || !result || result.requestKey !== state.wantedKey) return false;
      const bounded = result.spots.length > VIEWPORT_SPOTS_PER_PAGE * VIEWPORT_SPOT_MAX_PAGES
        ? { ...result, spots: result.spots.slice(0, VIEWPORT_SPOTS_PER_PAGE * VIEWPORT_SPOT_MAX_PAGES) } : result;
      const target = pending ?? state.result;
      if (target?.requestKey === bounded.requestKey && target.revision === bounded.revision) {
        if (target === bounded) return false;
        // Revision controls card motion only. The same visible card can carry
        // newer coordinates or other business facts needed by Map selection.
        if (pending) pending = bounded;
        else publish({ result: bounded });
        return true;
      }
      pending = bounded;
      if (state.phase === "waiting") enter();
      else if (state.phase === "idle") replace();
      return true;
    },
    goToPage(page: number) {
      if (!state.active || state.result?.requestKey !== state.wantedKey || state.phase !== "idle" || pending
        || !Number.isInteger(page) || page < 0 || page >= viewportSpotPageCount(state.result) || page === state.page) return false;
      stop();
      pending = null;
      publish({ page, phase: reducedMotion ? "idle" : "paging", direction: page > state.page ? 1 : -1, transition: state.transition + 1 });
      return true;
    },
    /** React commit only arms bounded missing-event recovery. Native start/end
     * below own the observed phase; nextTick is not a native render receipt. */
    presentationCommitted(transition: number, phase: ViewportSpotPhase) {
      if (!state.active || state.transition !== transition || state.phase !== phase || phase === "idle" || phase === "waiting" || startedCards.size) return;
      schedule((phase === "paging" ? VIEWPORT_SPOT_PAGE_MOTION_MS : viewportSpotMotionDuration(viewportSpotPage(state).length)) + ANIMATION_EVENT_ALLOWANCE_MS, finishPhase);
    },
    animationStarted(transition: number, phase: ViewportSpotPhase, index: number) {
      if (!state.active || state.transition !== transition || state.phase !== phase || phase === "idle" || phase === "waiting"
        || index < 0 || index >= viewportSpotPage(state).length || startedCards.has(index)) return;
      startedCards.add(index);
      // Each delayed card starts its own 160 ms timeline. The last native
      // start extends recovery; complete end receipts normally finish first.
      const remaining = phase === "paging" ? VIEWPORT_SPOT_PAGE_MOTION_MS
        : viewportSpotMotionDuration(viewportSpotPage(state).length) - viewportSpotAnimationDelay(phase, index, viewportSpotPage(state).length);
      schedule(remaining + ANIMATION_EVENT_ALLOWANCE_MS, finishPhase);
    },
    animationEnded(transition: number, phase: ViewportSpotPhase, index: number) {
      const count = viewportSpotPage(state).length;
      if (!state.active || state.transition !== transition || state.phase !== phase || phase === "idle" || phase === "waiting" || index < 0 || index >= count) return;
      finishedCards.add(index);
      if (finishedCards.size === count) finishPhase();
    },
    selectedSpot(spotId: string) {
      return state.active && state.phase === "idle" && state.result?.requestKey === state.wantedKey
        ? viewportSpotPage(state).find(spot => spot.spotId === spotId) ?? null : null;
    },
    dispose() {
      stop(); pending = null; resumePage = null;
      state = { ...state, active: false, result: null, phase: "idle", transition: state.transition + 1 };
      listeners.clear();
    },
  };
}
