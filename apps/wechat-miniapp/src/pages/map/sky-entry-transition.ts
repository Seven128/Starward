export const SKY_ENTRY_FADE_MS = 220;
// Match the existing 10 s native request recovery horizon. This only releases
// Map's shield; a native navigateTo already issued has no cancellation API.
export const SKY_ENTRY_RECOVERY_MS = 10_000;
const BRIDGE_FRAME_MS = 32;
type Schedule = (callback: () => void, milliseconds: number) => () => void;
type SkyEntryOptions = {reducedMotion: boolean; navigate(isCurrent: () => boolean): Promise<boolean>; onTimeout(): void};
const scheduleTimeout: Schedule = (callback, milliseconds) => {
  const timer = setTimeout(callback, milliseconds);
  return () => clearTimeout(timer);
};

/** Map owns the source blackout, not Sky's state or the global router. */
export function createSkyEntryTransition({getScope, onPresentation, schedule = scheduleTimeout}: {
  getScope(): string | null;
  onPresentation(id: number | null): void;
  schedule?: Schedule;
}) {
  let serial = 0, visible = true, disposed = false;
  let pending: {id: number; scope: string; presented: boolean; issued: boolean; options: SkyEntryOptions | null} | null = null;
  let cancelTimer: (() => void) | null = null;
  const clearTimer = () => { cancelTimer?.(); cancelTimer = null; };
  const cancel = () => {
    clearTimer();
    if (!pending) return;
    pending = null;
    if (!disposed) onPresentation(null);
  };
  const finishFade = (id: number) => {
    const request = pending;
    if (!request || request.id !== id || !request.options || request.issued || disposed || !visible) return;
    const options = request.options;
    if (getScope() !== request.scope) { cancel(); return; }
    clearTimer(); request.issued = true;
    const current = () => !disposed && visible && pending === request && getScope() === request.scope;
    cancelTimer = schedule(() => {
      if (pending !== request) return;
      const warn = current();
      cancel();
      if (warn) options.onTimeout();
    }, SKY_ENTRY_RECOVERY_MS);
    // Keep the black frame until hide. Native success may precede hide, and
    // clearing here would flash the source Map between the two pages.
    void Promise.resolve().then(() => current() ? options.navigate(current) : false).then(opened => {
      if (pending === request && (!opened || !current())) cancel();
    }).catch(() => { if (pending === request) cancel(); });
  };
  const prepare = () => {
    if (disposed || !visible) return null;
    const scope = getScope();
    if (pending && pending.scope !== scope) cancel();
    if (pending || scope === null) return null;
    const request = {id: ++serial, scope, presented: false, issued: false, options: null as SkyEntryOptions | null};
    pending = request;
    const current = () => !disposed && visible && pending === request && getScope() === request.scope;
    return {
      isCurrent: current,
      start(options: SkyEntryOptions, acceptContext?: () => void) {
        if (!current() || request.options) { if (pending === request && !request.options) cancel(); return false; }
        // Only the current prepared intent may accept a resolved public Context.
        // Rebase after that synchronous commit; unrelated changes while awaiting
        // the response cannot get through the preceding scope check.
        acceptContext?.();
        if (disposed || !visible || pending !== request) return false;
        const nextScope = getScope();
        if (nextScope === null) { cancel(); return false; }
        request.scope = nextScope; request.options = options;
        onPresentation(request.id);
        return true;
      },
      cancelPreparation() { if (pending === request && !request.options) cancel(); },
    };
  };
  return {
    prepare,
    start(options: SkyEntryOptions) { return prepare()?.start(options) ?? false; },
    presented(id: number) {
      const request = pending;
      if (!request || request.id !== id || !request.options || request.presented) return;
      request.presented = true;
      // Start the fallback after React commits the actual shield. An animation
      // endpoint can finish sooner; both consume this same request only once.
      cancelTimer = schedule(() => finishFade(id), request.options.reducedMotion ? 0 : SKY_ENTRY_FADE_MS + BRIDGE_FRAME_MS);
    },
    finishFade,
    isActive: () => pending !== null,
    cancel,
    show() { visible = true; cancel(); },
    hide() { visible = false; cancel(); },
    dispose() { disposed = true; cancel(); },
  };
}
