export interface SkyObservationTimeState {
  binding: string;
  committedAt: string;
  restoreAt: string;
  /** Exact requested target; previewAt is only the current presentation sample. */
  at: string;
  previewAt: string | null;
  previewFromAt: string | null;
  previewMotion: "waiting" | "moving" | null;
  presentationGeneration: number;
  mode: "FIXED" | "PREVIEW" | "PLAYING" | "PAUSED";
  reachedEnd: boolean;
  runStartAt: string | null;
  playRequested: boolean;
  editing: readonly SkyTimeEditSource[];
  editingGeneration: number;
}
export type SkyTimeEditSource = "ruler" | "fields";
export interface SkyTimeCoverage { startAt: string; endAt: string }
export const SKY_TIME_PREVIEW_SETTLE_MS = 160;
export interface SkyTimePreviewMotion { fromAt: string; elapsedAt: number; reducedMotion?: boolean }
export interface SkyTimeHeldEdit { readonly generation: number; readonly fromAt: string; readonly direction: 1 | -1 }
export interface SkyTimePreparationDemand {
  at: string; fullWindow: boolean; generation: number; editing: boolean; hold?: SkyTimeHeldEdit;
}

const canonical = (at: string) => Number.isFinite(Date.parse(at)) && new Date(at).toISOString() === at;
const validCoverage = (value: SkyTimeCoverage | null): value is SkyTimeCoverage => Boolean(value &&
  canonical(value.startAt) && canonical(value.endAt) && Date.parse(value.endAt) > Date.parse(value.startAt));

/** Only connected, already qualified windows can supply a continuous path. */
export function skyContinuousTimeCoverage(primary: SkyTimeCoverage | null, accepted: SkyTimeCoverage | null): SkyTimeCoverage | null {
  if (!validCoverage(primary)) return null;
  if (!validCoverage(accepted) || Date.parse(primary.startAt) > Date.parse(accepted.endAt) ||
    Date.parse(accepted.startAt) > Date.parse(primary.endAt)) return primary;
  return { startAt: Date.parse(primary.startAt) < Date.parse(accepted.startAt) ? primary.startAt : accepted.startAt,
    endAt: Date.parse(primary.endAt) > Date.parse(accepted.endAt) ? primary.endAt : accepted.endAt };
}

export const skyObservationFrameAt = (time: Pick<SkyObservationTimeState, "at" | "previewAt">) => time.previewAt ?? time.at;

/** A frame/gesture belongs to one time intent, including a reverse preview.
 * The native writer may supply its preceding accepted time to prevent rewind. */
export function skyObservationFrameCurrent(time: SkyObservationTimeState, paintedAt: string | undefined,
  generation: number | undefined, previousAt?: string): boolean {
  if (!Number.isSafeInteger(generation) || generation !== time.presentationGeneration || !paintedAt || !canonical(paintedAt)) return false;
  // During one held field edit, the native writer may complete a real earlier
  // sample after another step retargets the motion. Bound it by the exact live
  // target and the actual origin; the writer also enforces monotonic copies.
  const currentAt = time.editing.includes("fields") ? time.at : skyObservationFrameAt(time);
  if (time.previewFromAt) {
    if (!canonical(time.previewFromAt) || !canonical(time.at) || !canonical(currentAt) || previousAt && !canonical(previousAt)) return false;
    const from = Date.parse(time.previewFromAt), target = Date.parse(time.at), current = Date.parse(currentAt), painted = Date.parse(paintedAt);
    if (painted < Math.min(from, current) || painted > Math.max(from, current)) return false;
    return !previousAt || (target >= from ? painted >= Date.parse(previousAt) : painted <= Date.parse(previousAt));
  }
  return skyPresentedTimeCurrent(currentAt, paintedAt, time.mode === "PLAYING", time.runStartAt) &&
    (!previousAt || time.mode !== "PLAYING" || Date.parse(paintedAt) >= Date.parse(previousAt));
}

/** Read-only eligibility of the actual currently copied frame. An existing
 * origin stays usable while the first new run/preview frame is pending; it
 * keeps its original receipt. Late submissions still require current(). */
export function skyObservationFrameReadable(time: SkyObservationTimeState, paintedAt: string | undefined,
  generation: number | undefined): boolean {
  if (skyObservationFrameCurrent(time, paintedAt, generation)) return true;
  if (!Number.isSafeInteger(generation) || generation! < 0 || generation! >= time.presentationGeneration) return false;
  const origin = time.previewFromAt ?? (time.mode === "PLAYING" ? time.runStartAt : null);
  return Boolean(origin && paintedAt === origin && canonical(origin));
}

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
  let state: SkyObservationTimeState = { binding: "", committedAt: "", restoreAt: "", at: "", previewAt: null, previewFromAt: null,
    previewMotion: null, presentationGeneration: 0, mode: "FIXED", reachedEnd: false, runStartAt: null,
    playRequested: false, editing: [], editingGeneration: 0 };
  let coverage: SkyTimeCoverage | null = null;
  let previewCoverage: SkyTimeCoverage | null = null;
  let preview: { from: number; to: number; elapsedAt: number | null; latestElapsed: number } | null = null;
  let heldPreview: { direction: number; generation: number; fromAt: string } | null = null;
  let anchor: { elapsedAt: number; instant: number; latestElapsed: number } | null = null;
  const latest = () => options.latestInstant?.() ?? Infinity;
  const bounded = (at: string) => {
    const limit = latest();
    return Number.isFinite(limit) && Date.parse(at) > limit ? new Date(limit).toISOString() : at;
  };
  const covered = (at: string) => Boolean(coverage && canonical(at) &&
    Date.parse(at) >= Date.parse(coverage.startAt) && Date.parse(at) <= Math.min(Date.parse(coverage.endAt), latest()));
  const previewCovered = (at: string) => Boolean(previewCoverage && canonical(at) &&
    Date.parse(at) >= Date.parse(previewCoverage.startAt) && Date.parse(at) <= Math.min(Date.parse(previewCoverage.endAt), latest()));
  const publish = (change: Partial<SkyObservationTimeState>) => { state = { ...state, ...change }; return state; };
  // Equal Context/time values after retirement do not revive an earlier
  // continuous gesture. Ordinary previews and geometry supply keep this lease.
  const retiredEditing = () => { heldPreview = null; return { editing: [] as SkyTimeEditSource[], editingGeneration: state.editingGeneration + 1 }; };
  const retirePresentation = () => { preview = null; heldPreview = null; return { previewAt: null, previewFromAt: null, previewMotion: null,
    presentationGeneration: state.presentationGeneration + 1 }; };
  const pause = () => {
    anchor = null;
    return state.mode === "PLAYING" || state.playRequested || preview || heldPreview
      ? publish({ ...(state.mode === "PLAYING" ? { mode: "PAUSED" as const } : {}), runStartAt: null, playRequested: false,
        ...retirePresentation() }) : state;
  };
  return {
    snapshot: () => state,
    preparationDemand: (): SkyTimePreparationDemand => ({ at: state.at,
      fullWindow: state.mode === "PLAYING" || state.playRequested, generation: state.presentationGeneration,
      editing: state.editing.length > 0,
      ...(state.editing.length === 1 && state.editing[0] === "fields" && heldPreview &&
        heldPreview.generation === state.presentationGeneration && (heldPreview.direction === 1 || heldPreview.direction === -1)
        ? { hold: { generation: heldPreview.generation, fromAt: heldPreview.fromAt, direction: heldPreview.direction } } : {}) }),
    latestInstant: latest,
    // Before the binding effect runs, the page must use this same boundary.
    // Once bound, entry/cancel retain one instant while the real Context may
    // still describe a future Map/plan time.
    restoreInstant: (binding: string, committedAt: string) => bounded(
      binding === state.binding && committedAt === state.committedAt ? state.restoreAt : committedAt),
    bind(binding: string, committedAt: string, nextCoverage: SkyTimeCoverage | null,
      motion?: { coverage: SkyTimeCoverage | null; elapsedAt: number }) {
      if (!binding || !canonical(committedAt)) throw new TypeError("sky_time_binding_invalid");
      coverage = validCoverage(nextCoverage) ? nextCoverage : null;
      const suppliedPreview = motion ? motion.coverage : coverage;
      previewCoverage = validCoverage(suppliedPreview) ? suppliedPreview : null;
      if (binding !== state.binding || committedAt !== state.committedAt) {
        anchor = null;
        const restoreAt = bounded(committedAt);
        return publish({ binding, committedAt, restoreAt, at: restoreAt, mode: "FIXED", reachedEnd: false, runStartAt: null,
          playRequested: false, ...retiredEditing(), ...retirePresentation() });
      }
      // Geometry supply can lag a newer cross-window preview or be withdrawn.
      // It controls playback eligibility, never the user's pending time intent.
      // Context replacement and explicit cancel remain the reset owners.
      if (!covered(state.at) && state.mode === "PLAYING") pause();
      if (preview && covered(state.at)) {
        if (!previewCovered(skyObservationFrameAt(state)) || !previewCovered(state.at)) {
          // A newly completed disjoint window ends interpolation, not the
          // user's still-current held edit. Its real frames share that lease.
          if (heldPreview && state.editing.length === 1 && state.editing[0] === "fields") {
            preview = null; publish({ previewAt: null, previewMotion: null });
          } else publish(retirePresentation());
        }
        else if (preview.elapsedAt === null && Number.isFinite(motion?.elapsedAt)) {
          preview.elapsedAt = preview.latestElapsed = motion!.elapsedAt;
          publish({ previewMotion: "moving" });
        }
      } else if (preview && preview.elapsedAt !== null) {
        // Withdrawal cannot keep evaluating an unqualified intermediate time.
        publish(retirePresentation());
      }
      return state;
    },
    preview(at: string, motion?: SkyTimePreviewMotion) {
      if (!state.binding || !canonical(at)) return state;
      const limit = latest();
      if (!Number.isFinite(limit) && limit !== Infinity) return state;
      if (Date.parse(at) > limit) at = new Date(limit).toISOString();
      if (at === state.at && state.mode !== "PLAYING" && !state.playRequested &&
        (!preview || Boolean(motion) && !motion!.reducedMotion)) return state;
      anchor = null;
      const held = state.editing.includes("fields"), direction = Math.sign(Date.parse(at) - Date.parse(state.at));
      const continuingHold = held && direction !== 0 && heldPreview?.direction === direction &&
        heldPreview.generation === state.presentationGeneration;
      // A requested target is not an already copied origin. Reduced motion
      // skips interpolation, but must not repeatedly advance this admission
      // bound past native work that is still completing during the same hold.
      const fromAt = continuingHold ? heldPreview!.fromAt
        : motion && canonical(motion.fromAt) && Date.parse(motion.fromAt) <= limit ? motion.fromAt : skyObservationFrameAt(state);
      const retired = retirePresentation();
      if (continuingHold) retired.presentationGeneration = state.presentationGeneration;
      if (held) heldPreview = { direction, generation: retired.presentationGeneration, fromAt };
      if (motion && !motion.reducedMotion && Number.isFinite(motion.elapsedAt) && canonical(motion.fromAt) &&
        Date.parse(motion.fromAt) <= limit && motion.fromAt !== at) {
        const canMove = covered(at) && previewCovered(motion.fromAt) && previewCovered(at);
        // Await the target's normal geometry request. If its qualified window
        // cannot connect to the accepted one, keep the exact final target.
        if (canMove || !covered(at)) preview = { from: Date.parse(motion.fromAt), to: Date.parse(at),
          elapsedAt: canMove ? motion.elapsedAt : null, latestElapsed: motion.elapsedAt };
      }
      return publish({ at, mode: at === state.restoreAt ? "FIXED" : "PREVIEW", reachedEnd: false, runStartAt: null,
        playRequested: false, ...retired, ...(held ? { previewFromAt: fromAt } : {}),
        ...(preview ? { previewAt: motion!.fromAt, previewFromAt: motion!.fromAt,
          previewMotion: preview.elapsedAt === null ? "waiting" as const : "moving" as const } : {}) });
    },
    /** Ruler settlement and held civil fields share this intent. Keeping the
     * two sources distinct prevents one control's cleanup from settling the
     * other; neither owns a second clock or changes preview precision. */
    edit(source: SkyTimeEditSource, active: boolean) {
      if (!state.binding || state.editing.includes(source) === active) return state;
      if (active) pause();
      if (source === "fields") heldPreview = null;
      return publish({ editing: active ? [...state.editing, source] : state.editing.filter(value => value !== source) });
    },
    /** The same time intent owns asynchronous playback preparation. Supply
     * arrival cannot start a request retired by preview, cancel or lifecycle. */
    requestPlay() {
      const limit = latest();
      if (state.mode === "PLAYING" || !state.binding || !canonical(state.at) || (!Number.isFinite(limit) && limit !== Infinity) ||
        Date.parse(state.at) >= limit) return state;
      anchor = null;
      return publish({ playRequested: true, reachedEnd: false, runStartAt: null, ...retiredEditing(), ...retirePresentation() });
    },
    play(elapsedAt: number) {
      if (!Number.isFinite(elapsedAt) || !covered(state.at) || Date.parse(state.at) >= Math.min(Date.parse(coverage!.endAt), latest())) return state;
      anchor = { elapsedAt, instant: Date.parse(state.at), latestElapsed: elapsedAt };
      return publish({ mode: "PLAYING", reachedEnd: false, runStartAt: state.at, playRequested: false, ...retiredEditing(), ...retirePresentation() });
    },
    tick(elapsedAt: number) {
      if (preview) {
        if (preview.elapsedAt === null || !Number.isFinite(elapsedAt)) return state;
        if (!covered(state.at)) return pause();
        preview.latestElapsed = Math.max(preview.latestElapsed, elapsedAt);
        const progress = Math.min(1, Math.max(0, (preview.latestElapsed - preview.elapsedAt) / SKY_TIME_PREVIEW_SETTLE_MS));
        const previewAt = progress === 1 ? null : new Date(Math.round(preview.from +
          (preview.to - preview.from) * (1 - (1 - progress) ** 3))).toISOString();
        if (progress === 1) preview = null;
        return previewAt === state.previewAt ? state : publish({ previewAt, previewMotion: preview ? "moving" : null });
      }
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
    hide(elapsedAt: number) { this.tick(elapsedAt); pause(); return publish({ ...(state.editing.length ? retiredEditing() : {}), ...retirePresentation() }); },
    cancel() { anchor = null; return publish({ at: bounded(state.restoreAt), mode: "FIXED", reachedEnd: false, runStartAt: null,
      playRequested: false, ...retiredEditing(), ...retirePresentation() }); },
  };
}
