export interface SkyObservationTimeState {
  binding: string;
  committedAt: string;
  at: string;
  mode: "FIXED" | "PREVIEW" | "PLAYING" | "PAUSED";
  reachedEnd: boolean;
  runStartAt: string | null;
  playRequested: boolean;
}
export interface SkyTimeCoverage { startAt: string; endAt: string }

const canonical = (at: string) => Number.isFinite(Date.parse(at)) && new Date(at).toISOString() === at;

/** Canvas completion may lag the requested instant during 1x play. Allow
 * its actual painted instant until the next paint, but never a preceding run
 * or a future frame. Source, mode and native surface identity are fenced by
 * the caller before evaluating this temporal bound. */
export function skyPresentedTimeCurrent(requestedAt: string, paintedAt: string | undefined,
  playing: boolean, runStartAt: string | null): boolean {
  if (!paintedAt || !canonical(requestedAt) || !canonical(paintedAt)) return false;
  if (!playing) return paintedAt === requestedAt;
  if (!runStartAt || !canonical(runStartAt)) return false;
  return Date.parse(paintedAt) >= Date.parse(runStartAt) && Date.parse(paintedAt) <= Date.parse(requestedAt);
}

/** One public Sky presentation-time intent. The app store/API still own the
 * committed Context. Elapsed time comes from the caller's scheduling clock;
 * zoom, camera, ephemeris and network effects do not live in this owner. */
export function createSkyObservationTime(options: { latestInstant?: () => number } = {}) {
  let state: SkyObservationTimeState = { binding: "", committedAt: "", at: "", mode: "FIXED", reachedEnd: false, runStartAt: null,
    playRequested: false };
  let coverage: SkyTimeCoverage | null = null;
  let anchor: { elapsedAt: number; instant: number; latestElapsed: number } | null = null;
  const latest = () => options.latestInstant?.() ?? Infinity;
  const covered = (at: string) => Boolean(coverage && canonical(at) &&
    Date.parse(at) >= Date.parse(coverage.startAt) && Date.parse(at) <= Math.min(Date.parse(coverage.endAt), latest()));
  const publish = (change: Partial<SkyObservationTimeState>) => { state = { ...state, ...change }; return state; };
  const pause = () => { anchor = null; return state.mode === "PLAYING" || state.playRequested
    ? publish({ ...(state.mode === "PLAYING" ? { mode: "PAUSED" as const } : {}), runStartAt: null, playRequested: false }) : state; };
  return {
    snapshot: () => state,
    bind(binding: string, committedAt: string, nextCoverage: SkyTimeCoverage | null) {
      if (!binding || !canonical(committedAt)) throw new TypeError("sky_time_binding_invalid");
      coverage = nextCoverage && canonical(nextCoverage.startAt) && canonical(nextCoverage.endAt) &&
        Date.parse(nextCoverage.endAt) > Date.parse(nextCoverage.startAt) ? nextCoverage : null;
      if (binding !== state.binding || committedAt !== state.committedAt) {
        anchor = null;
        return publish({ binding, committedAt, at: committedAt, mode: "FIXED", reachedEnd: false, runStartAt: null, playRequested: false });
      }
      // Geometry supply can lag a newer cross-window preview or be withdrawn.
      // It controls playback eligibility, never the user's pending time intent.
      // Context replacement and explicit cancel remain the reset owners.
      if (!covered(state.at) && state.mode === "PLAYING") pause();
      return state;
    },
    preview(at: string) {
      if (!state.binding || !canonical(at)) return state;
      const limit = latest();
      if (!Number.isFinite(limit) && limit !== Infinity) return state;
      if (Date.parse(at) > limit) at = new Date(limit).toISOString();
      anchor = null;
      return publish({ at, mode: at === state.committedAt ? "FIXED" : "PREVIEW", reachedEnd: false, runStartAt: null, playRequested: false });
    },
    /** The same time intent owns asynchronous playback preparation. Supply
     * arrival cannot start a request retired by preview, cancel or lifecycle. */
    requestPlay() {
      const limit = latest();
      if (state.mode === "PLAYING" || !state.binding || !canonical(state.at) || (!Number.isFinite(limit) && limit !== Infinity) ||
        Date.parse(state.at) >= limit) return state;
      anchor = null;
      return publish({ playRequested: true, reachedEnd: false, runStartAt: null });
    },
    play(elapsedAt: number) {
      if (!Number.isFinite(elapsedAt) || !covered(state.at) || Date.parse(state.at) >= Math.min(Date.parse(coverage!.endAt), latest())) return state;
      anchor = { elapsedAt, instant: Date.parse(state.at), latestElapsed: elapsedAt };
      return publish({ mode: "PLAYING", reachedEnd: false, runStartAt: state.at, playRequested: false });
    },
    tick(elapsedAt: number) {
      if (state.mode !== "PLAYING" || !anchor || !coverage || !Number.isFinite(elapsedAt)) return state;
      // A backwards scheduling clock cannot move observation time backwards.
      anchor.latestElapsed = Math.max(anchor.latestElapsed, elapsedAt);
      const limit = Math.min(Date.parse(coverage.endAt), latest());
      if (!Number.isFinite(limit)) return pause();
      const instant = Math.min(limit, anchor.instant + anchor.latestElapsed - anchor.elapsedAt);
      const at = new Date(Math.floor(instant)).toISOString();
      const ended = instant >= limit;
      if (ended) anchor = null;
      if (at === state.at && !ended) return state;
      return publish({ at, ...(ended ? { mode: "PAUSED" as const, reachedEnd: true, runStartAt: null } : {}) });
    },
    pause,
    hide(elapsedAt: number) { this.tick(elapsedAt); return pause(); },
    cancel() { anchor = null; return publish({ at: state.committedAt, mode: "FIXED", reachedEnd: false, runStartAt: null, playRequested: false }); },
  };
}
