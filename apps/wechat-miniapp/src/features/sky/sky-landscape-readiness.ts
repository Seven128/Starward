/** A canvas-owned recovery fade. This clock changes display alpha only; it
 * never changes the observation time, source coverage or image identity. */
export function createSkyLandscapeReadiness(deps: {
  now(): number;
  requestFrame(callback: () => void): unknown;
  cancelFrame(handle: unknown): void;
  changed(opacity: number): void;
}) {
  let live = true, available = false, reduced = false, handle: unknown;
  let start = 0, opacity = 0, generation = 0;
  const cancel = () => { generation++; if (handle !== undefined) deps.cancelFrame(handle); handle = undefined; };
  const publish = (next: number) => { if (next !== opacity) { opacity = next; deps.changed(next); } };
  const request = () => { const current = generation; handle = deps.requestFrame(() => tick(current)); };
  const tick = (current: number) => {
    if (!live || !available || current !== generation) return;
    handle = undefined;
    const progress = Math.max(0, Math.min(1, (deps.now() - start) / 240));
    publish(progress * progress * (3 - 2 * progress));
    if (progress < 1) request();
  };
  return {
    setAvailable(next: boolean, reducedMotion = false) {
      if (!live || next === available && reducedMotion === reduced) return;
      if (next === available) {
        reduced = reducedMotion;
        if (available && reduced) { cancel(); publish(1); }
        return;
      }
      available = next; reduced = reducedMotion; cancel();
      if (!available) { publish(0); return; }
      if (reduced) { publish(1); return; }
      start = deps.now(); publish(0); request();
    },
    dispose() { live = false; cancel(); },
  };
}
