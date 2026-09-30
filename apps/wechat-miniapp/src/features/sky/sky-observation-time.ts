export interface SkyObservationTimeState {
  binding: string;
  committedAt: string;
  at: string;
  mode: "FIXED" | "PREVIEW" | "PLAYING" | "PAUSED";
  reachedEnd: boolean;
  runStartAt: string | null;
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
export function createSkyObservationTime() {
  let state: SkyObservationTimeState = { binding: "", committedAt: "", at: "", mode: "FIXED", reachedEnd: false, runStartAt: null };
  let coverage: SkyTimeCoverage | null = null;
  let anchor: { elapsedAt: number; instant: number; latestElapsed: number } | null = null;
  const covered = (at: string) => Boolean(coverage && canonical(at) &&
    Date.parse(at) >= Date.parse(coverage.startAt) && Date.parse(at) <= Date.parse(coverage.endAt));
  const publish = (change: Partial<SkyObservationTimeState>) => { state = { ...state, ...change }; return state; };
  const pause = () => { anchor = null; return state.mode === "PLAYING" ? publish({ mode: "PAUSED", runStartAt: null }) : state; };
  return {
    snapshot: () => state,
    bind(binding: string, committedAt: string, nextCoverage: SkyTimeCoverage | null) {
      if (!binding || !canonical(committedAt)) throw new TypeError("sky_time_binding_invalid");
      coverage = nextCoverage && canonical(nextCoverage.startAt) && canonical(nextCoverage.endAt) &&
        Date.parse(nextCoverage.endAt) > Date.parse(nextCoverage.startAt) ? nextCoverage : null;
      if (binding !== state.binding || committedAt !== state.committedAt) {
        anchor = null;
        return publish({ binding, committedAt, at: committedAt, mode: "FIXED", reachedEnd: false, runStartAt: null });
      }
      if (!covered(state.at) && state.at !== committedAt) {
        anchor = null;
        return publish({ at: committedAt, mode: "FIXED", reachedEnd: false, runStartAt: null });
      }
      if (!covered(state.at)) pause();
      return state;
    },
    preview(at: string) {
      if (!state.binding || !canonical(at)) return state;
      anchor = null;
      return publish({ at, mode: at === state.committedAt ? "FIXED" : "PREVIEW", reachedEnd: false, runStartAt: null });
    },
    play(elapsedAt: number) {
      if (!Number.isFinite(elapsedAt) || !covered(state.at) || Date.parse(state.at) >= Date.parse(coverage!.endAt)) return state;
      anchor = { elapsedAt, instant: Date.parse(state.at), latestElapsed: elapsedAt };
      return publish({ mode: "PLAYING", reachedEnd: false, runStartAt: state.at });
    },
    tick(elapsedAt: number) {
      if (state.mode !== "PLAYING" || !anchor || !coverage || !Number.isFinite(elapsedAt)) return state;
      // A backwards scheduling clock cannot move observation time backwards.
      anchor.latestElapsed = Math.max(anchor.latestElapsed, elapsedAt);
      const instant = Math.min(Date.parse(coverage.endAt), anchor.instant + anchor.latestElapsed - anchor.elapsedAt);
      const at = new Date(Math.floor(instant)).toISOString();
      const ended = instant >= Date.parse(coverage.endAt);
      if (ended) anchor = null;
      if (at === state.at && !ended) return state;
      return publish({ at, ...(ended ? { mode: "PAUSED" as const, reachedEnd: true, runStartAt: null } : {}) });
    },
    pause,
    hide(elapsedAt: number) { this.tick(elapsedAt); return pause(); },
    cancel() { anchor = null; return publish({ at: state.committedAt, mode: "FIXED", reachedEnd: false, runStartAt: null }); },
  };
}
