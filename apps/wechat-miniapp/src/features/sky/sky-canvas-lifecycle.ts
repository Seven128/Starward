export interface CanvasSize { width: number; height: number }
export interface CanvasClock {
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
}
const nativeClock: CanvasClock = {
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

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
  createContext(measurement: unknown, size: CanvasSize): Context;
  paint(context: Context, frame: Frame, size: CanvasSize, done: () => void): void;
  sameScene?(completed: Frame, latest: Frame): boolean;
  presented(frame: Frame, size: CanvasSize): void;
  invalidated(): void;
  failed(error: unknown, frame: Frame | undefined): void;
}, clock: CanvasClock = nativeClock) {
  let ready = false, visible = true, mounted = true, disposed = false;
  let epoch = 0, visibilityEpoch = 0, revision = 0, dirty = false, busy = false;
  let latest: Frame | undefined;
  let size: CanvasSize | undefined, context: Context | undefined;
  let scheduled: unknown, deadline: unknown;
  const active = () => ready && visible && mounted && !disposed;
  const cancelTimers = () => {
    if (scheduled !== undefined) clock.cancel(scheduled);
    if (deadline !== undefined) clock.cancel(deadline);
    scheduled = deadline = undefined;
  };
  function reset() {
    epoch++;
    cancelTimers();
    busy = false;
    size = undefined;
    context = undefined;
    dirty = latest !== undefined;
    if (!disposed) port.invalidated();
  }
  function fail(error: unknown) {
    if (!active()) return;
    reset();
    dirty = false;
    port.failed(error, latest);
  }
  function schedule() {
    if (!active() || !dirty || busy || scheduled !== undefined) return;
    // React already commits a coalesced sensor value. Yield once so multiple
    // report/time/pose effects share the same next native submission.
    scheduled = clock.schedule(() => { scheduled = undefined; render(); }, 0);
  }
  function render() {
    if (!active() || busy || !dirty || latest === undefined) return;
    busy = true;
    const generation = epoch;
    deadline = clock.schedule(() => {
      if (active() && generation === epoch) fail(new Error("sky_canvas_callback_timeout"));
    }, 5000);
    if (!size || context === undefined) {
      let measured = false;
      try {
        port.measure(result => {
          if (measured || !active() || generation !== epoch || !busy) return;
          measured = true;
          try {
            size = measuredCanvasSize(result);
            context = port.createContext(result, size);
            paint(generation);
          } catch (error) { fail(error); }
        });
      } catch (error) { fail(error); }
    } else paint(generation);
  }
  function paint(generation: number) {
    if (!active() || generation !== epoch || latest === undefined || !size || context === undefined) return;
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
    request(frame: Frame, hideUntilPresented = false) {
      if (disposed) return;
      latest = frame;
      revision++;
      dirty = true;
      if (hideUntilPresented) { visibilityEpoch++; port.invalidated(); }
      schedule();
    },
    ready() { if (!disposed) { ready = true; schedule(); } },
    resize() { if (!disposed) { reset(); schedule(); } },
    setMounted(value: boolean) { if (mounted !== value && !disposed) { mounted = value; reset(); schedule(); } },
    hide() { if (!disposed) { visible = false; reset(); latest = undefined; dirty = false; } },
    show() { if (!disposed) { visible = true; schedule(); } },
    fail,
    dispose() { disposed = true; reset(); latest = undefined; dirty = false; },
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
