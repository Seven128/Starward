export type EventBannerMotion = {
  occurrenceId: string | null;
  phase: "idle" | "out" | "in-start" | "in";
  direction: 1 | -1;
};

type Clock = { later(callback: () => void, delay: number): unknown; cancel(handle: unknown): void };
const nativeClock: Clock = {
  later: (callback, delay) => setTimeout(callback, delay),
  cancel: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** One banner owns at most one pending transition; replacement and unmount retire it. */
export function createEventBannerMotion(initialIds: readonly string[], initialId: string | null,
  publish: (state: EventBannerMotion) => void, clock: Clock = nativeClock) {
  let ids = initialIds;
  let state: EventBannerMotion = { occurrenceId: initialId, phase: "idle", direction: 1 };
  let generation = 0, timer: unknown, disposed = false;
  const retire = () => { generation++; if (timer !== undefined) clock.cancel(timer); timer = undefined; };
  const commit = (next: EventBannerMotion) => { state = next; publish(next); };
  const later = (current: number, delay: number, action: () => void) => {
    timer = clock.later(() => { timer = undefined; if (!disposed && current === generation) action(); }, delay);
  };
  return {
    snapshot: () => state,
    replace(nextIds: readonly string[], fallback: string | null) {
      if (disposed) return;
      if (nextIds.length === ids.length && nextIds.every((id, index) => id === ids[index])) return;
      retire(); ids = nextIds;
      commit({ ...state, occurrenceId: state.occurrenceId && ids.includes(state.occurrenceId) ? state.occurrenceId : fallback, phase: "idle" });
    },
    advance(delta: number, reducedMotion = false) {
      if (disposed || ids.length < 2) return;
      retire();
      const current = generation, direction = delta < 0 ? -1 : 1;
      const index = Math.max(0, ids.indexOf(state.occurrenceId ?? ""));
      const occurrenceId = ids[(index + direction + ids.length) % ids.length]!;
      if (reducedMotion) { commit({ occurrenceId, phase: "idle", direction }); return; }
      commit({ ...state, phase: "out", direction });
      later(current, 130, () => {
        commit({ occurrenceId, phase: "in-start", direction });
        later(current, 16, () => {
          commit({ occurrenceId, phase: "in", direction });
          later(current, 180, () => commit({ occurrenceId, phase: "idle", direction }));
        });
      });
    },
    settle() { if (!disposed && state.phase !== "idle") { retire(); commit({ ...state, phase: "idle" }); } },
    dispose() { disposed = true; retire(); },
  };
}
