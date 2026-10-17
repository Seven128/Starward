import { reportRuntimeError } from "../../services/runtime-error";

export interface CanvasSize { width: number; height: number }

/** Public scene diagnostics contain only our fixed failure codes. Native
 * exceptions can include file paths or request details and must stay private. */
export function skyCanvasFailureCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  switch (message) {
    case "sky_canvas_measurement_unavailable":
    case "sky_canvas_callback_timeout":
    case "sky_canvas_display_node_unavailable":
    case "sky_canvas_display_context_unavailable":
    case "sky_canvas_webgl_context_unavailable":
    case "sky_canvas_surface_size_invalid":
    case "sky_canvas_surface_invalidated":
    case "sky_canvas_surface_unavailable":
    case "sky_canvas_retirement_failed":
    case "sky_canvas_native_error":
      return message;
    default:
      return "sky_canvas_unknown_failure";
  }
}
export interface CanvasClock {
  schedule(callback: () => void, delayMs: number): unknown;
  /** Next display refresh, with a bounded animation timer when RAF is absent. */
  scheduleFrame?(callback: () => void): unknown;
  cancel(handle: unknown): void;
}
const nativeClock: CanvasClock = {
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
const CANVAS_CALLBACK_TIMEOUT_MS = 5000;

export interface SkyCanvasFrameCanvas {
  requestAnimationFrame?(callback: () => void): number;
  cancelAnimationFrame?(handle: number): void;
}

/** Admit the existing writer on this display's frame callback, without adding
 * a render loop. Timed deadlines retain their clock; unavailable native frame
 * APIs fall back to the original timer. Handles always cancel their own node. */
export function createSkyCanvasFrameClock(readCanvas: () => SkyCanvasFrameCanvas | null,
  timers: CanvasClock = nativeClock): CanvasClock & { resetFailures(): void } {
  let unavailable: SkyCanvasFrameCanvas | null = null, cancelFailed: SkyCanvasFrameCanvas | null = null;
  const schedule = (callback: () => void, delayMs: number, fallbackDelayMs = delayMs) => {
    const canvas = delayMs === 0 ? readCanvas() : null;
    let live = true, nativePending = false, handle: number | undefined, timer: unknown;
    const cancelNative = () => {
      if (!nativePending || handle === undefined || !canvas) return;
      nativePending = false;
      try { canvas.cancelAnimationFrame!(handle); }
      catch (error) {
        unavailable = canvas;
        if (cancelFailed !== canvas) reportRuntimeError("native", "sky_canvas_frame_cancel_failed", error);
        cancelFailed = canvas;
      }
    };
    const run = () => {
      if (!live) return;
      live = false; nativePending = false;
      if (timer !== undefined) timers.cancel(timer);
      timer = undefined;
      callback();
    };
    if (canvas && canvas !== unavailable && typeof canvas.requestAnimationFrame === "function" &&
      typeof canvas.cancelAnimationFrame === "function") {
      try {
        nativePending = true;
        handle = canvas.requestAnimationFrame(run);
        if (live) timer = timers.schedule(() => {
          if (!live) return;
          unavailable = canvas;
          reportRuntimeError("native", "sky_canvas_frame_callback_timeout");
          cancelNative(); run();
        }, CANVAS_CALLBACK_TIMEOUT_MS);
      } catch (error) {
        unavailable = canvas;
        reportRuntimeError("native", "sky_canvas_frame_schedule_failed", error);
        cancelNative();
        if (live) timer = timers.schedule(run, fallbackDelayMs);
      }
    } else timer = timers.schedule(run, fallbackDelayMs);
    return () => {
      if (!live) return;
      live = false;
      if (timer !== undefined) timers.cancel(timer);
      timer = undefined;
      cancelNative();
    };
  };
  return {
    resetFailures() { unavailable = cancelFailed = null; },
    schedule,
    scheduleFrame: callback => schedule(callback, 0, 16),
    cancel(handle) { if (typeof handle === "function") handle(); },
  };
}

export function measuredCanvasSize(result: unknown): CanvasSize {
  const rect = (Array.isArray(result) ? result[0] : result) as Partial<CanvasSize> | null;
  if (!rect || typeof rect.width !== "number" || !Number.isFinite(rect.width) || rect.width <= 0 ||
    typeof rect.height !== "number" || !Number.isFinite(rect.height) || rect.height <= 0) {
    throw new Error("sky_canvas_measurement_unavailable");
  }
  return { width: rect.width, height: rect.height };
}

/** One measured native surface, one outstanding native draw, one latest frame. */
export function createSkyCanvasLifecycle<Frame, Context>(port: {
  measure(done: (result: unknown) => void): void;
  /** A retained Sources surface must be checked against the returned native node. */
  validateContext?(context: Context, measurement: unknown, size: CanvasSize): boolean;
  suspended?(): void;
  createContext(measurement: unknown, size: CanvasSize): Context;
  releaseContext?(context: Context): void;
  /** Resolve live native-owned inputs once, before the immutable paint snapshot.
   * The result also owns this attempt's completion; no additional scheduling. */
  resolveFrame?(frame: Frame): Frame;
  paint(context: Context, frame: Frame, size: CanvasSize, done: () => void): void;
  sameScene?(completed: Frame, latest: Frame): boolean;
  presented(frame: Frame, size: CanvasSize): void;
  invalidated(): void;
  failed(error: unknown, frame: Frame | undefined): void;
}, clock: CanvasClock = nativeClock) {
  let ready = false, visible = true, mounted = true, disposed = false;
  let failed = false, retained = false, validate = false;
  let epoch = 0, visibilityEpoch = 0, revision = 0, dirty = false, busy = false;
  let latest: Frame | undefined;
  let size: CanvasSize | undefined, context: Context | undefined;
  let scheduled: unknown, deadline: unknown, scheduledContinuation = false;
  const active = () => ready && visible && mounted && !disposed && !failed;
  const cancelTimers = () => {
    if (scheduled !== undefined) clock.cancel(scheduled);
    if (deadline !== undefined) clock.cancel(deadline);
    scheduled = deadline = undefined;
    scheduledContinuation = false;
  };
  function reset() {
    epoch++;
    cancelTimers();
    busy = false;
    size = undefined; retained = validate = false;
    const released = context;
    context = undefined;
    // Clear ownership before release: native failure/re-entrant disposal cannot
    // release this generation twice or leave stale callbacks able to use it.
    let releaseFailure: { error: unknown } | undefined;
    try { if (released !== undefined) port.releaseContext?.(released); }
    catch (error) {
      reportRuntimeError("native", "sky_canvas_retirement_failed", error);
      releaseFailure = { error };
    }
    dirty = latest !== undefined;
    if (!disposed) port.invalidated();
    return releaseFailure;
  }
  function resetAndReportFailure() {
    const releaseFailure = reset();
    if (releaseFailure) {
      failed = true; dirty = false;
      port.failed(releaseFailure.error, latest);
    }
    return releaseFailure === undefined;
  }
  function fail(error: unknown) {
    if (!active()) return;
    reportRuntimeError("render", skyCanvasFailureCode(error), error);
    failed = true;
    const releaseFailure = reset();
    dirty = false;
    // Preserve the original frame failure and the independent native cleanup
    // failure; neither establishes successful release or permits stale picks.
    port.failed(releaseFailure ? Object.assign(new Error("sky_canvas_retirement_failed"),
      { cause: error, releaseError: releaseFailure.error }) : error, latest);
  }
  function schedule(continuation = false) {
    if (!active() || !dirty || busy || scheduled !== undefined) return;
    // React already commits a coalesced sensor value. Yield once so multiple
    // report/time/pose effects share the same next native submission.
    scheduledContinuation = continuation;
    const run = () => { scheduled = undefined; scheduledContinuation = false; render(); };
    scheduled = continuation && clock.scheduleFrame ? clock.scheduleFrame(run) : clock.schedule(run, continuation ? 16 : 0);
  }
  function render() {
    if (!active() || busy || !dirty || latest === undefined) return;
    busy = true;
    const generation = epoch;
    deadline = clock.schedule(() => {
      if (active() && generation === epoch) fail(new Error("sky_canvas_callback_timeout"));
    }, CANVAS_CALLBACK_TIMEOUT_MS);
    if (!size || context === undefined || validate) {
      let measured = false;
      try {
        port.measure(result => {
          if (measured || !active() || generation !== epoch || !busy) return;
          measured = true;
          try {
            const nextSize = measuredCanvasSize(result);
            if (validate && context !== undefined) {
              const valid = size?.width === nextSize.width && size?.height === nextSize.height &&
                port.validateContext?.(context, result, nextSize) === true;
              validate = retained = false;
              if (!valid) {
                const released = context; context = undefined; size = undefined;
                port.releaseContext?.(released); port.invalidated();
              }
            }
            size = nextSize;
            if (context === undefined) context = port.createContext(result, size);
            paint(generation);
          } catch (error) { fail(error); }
        });
      } catch (error) { fail(error); }
    } else paint(generation);
  }
  function paint(generation: number) {
    if (!active() || generation !== epoch || latest === undefined || !size || context === undefined) return;
    try { latest = port.resolveFrame?.(latest) ?? latest; }
    catch (error) { fail(error); return; }
    const frame = latest, frameRevision = revision, frameSize = size, visibleGeneration = visibilityEpoch;
    dirty = false;
    let finished = false;
    try {
      port.paint(context, frame, frameSize, () => {
        if (finished || !active() || generation !== epoch) return;
        finished = true;
        if (deadline !== undefined) clock.cancel(deadline);
        deadline = undefined;
        busy = false;
        // A newer pose in the same scene must not starve first visibility when
        // native drawing is slower than the sensor. Scene/visibility changes
        // still fence completion of an expired, differently themed or lost pose.
        try {
          if (visibleGeneration === visibilityEpoch && (frameRevision === revision ||
            (latest !== undefined && port.sameScene?.(frame, latest)))) port.presented(frame, frameSize);
          schedule();
        } catch (error) { fail(error); }
      });
    } catch (error) { fail(error); }
  }
  return {
    request(frame: Frame, hideUntilPresented = false, continuation = false) {
      if (disposed) return;
      latest = frame;
      revision++;
      dirty = true;
      // A real input/resource change takes priority over a fallback animation
      // timer. Both still share one pending admission and the latest frame.
      if (!continuation && scheduledContinuation && scheduled !== undefined) {
        clock.cancel(scheduled); scheduled = undefined; scheduledContinuation = false;
      }
      if (hideUntilPresented) { visibilityEpoch++; port.invalidated(); }
      schedule(continuation);
    },
    ready() { if (!disposed) { ready = true; schedule(); } },
    retry() { if (!disposed) { failed = false; dirty = latest !== undefined; schedule(); } },
    resize() { if (!disposed && resetAndReportFailure()) schedule(); },
    setMounted(value: boolean) { if (mounted !== value && !disposed) {
      mounted = value; failed = false;
      if (resetAndReportFailure()) schedule();
    } },
    hide(keepReady = false) { if (!disposed) {
      visible = false;
      try {
        if (keepReady && context !== undefined && !failed) {
          epoch++; visibilityEpoch++; cancelTimers(); busy = false; retained = true;
          port.suspended?.();
        } else resetAndReportFailure();
      } finally { latest = undefined; dirty = false; }
    } },
    show() { if (!disposed) { if (!visible) failed = false; validate = retained; visible = true; schedule(); } },
    fail,
    dispose() {
      disposed = true;
      try { resetAndReportFailure(); }
      finally { latest = undefined; dirty = false; }
    },
  };
}

/** Coalesce raw motion bursts before React; loss of pose clears immediately. */
export function createPoseFramePublisher<Pose>(publish: (pose: Pose | null) => void, clock: CanvasClock = nativeClock) {
  let pending: unknown, latest: Pose | null = null, disposed = false, generation = 0;
  const cancel = () => {
    generation++;
    if (pending !== undefined) clock.cancel(pending);
    pending = undefined;
  };
  return {
    set(pose: Pose | null) {
      if (disposed) return;
      latest = pose;
      if (pose === null) { cancel(); publish(null); return; }
      if (pending !== undefined) return;
      const epoch = generation;
      pending = clock.schedule(() => {
        if (disposed || epoch !== generation) return;
        pending = undefined;
        publish(latest);
      }, 16);
    },
    dispose() { disposed = true; cancel(); latest = null; },
  };
}
