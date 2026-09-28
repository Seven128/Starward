export type SpotEditorPhase = "entering" | "open" | "closing";
export const SPOT_EDITOR_ENTER_MS = 300;
export const SPOT_EDITOR_EXIT_MS = 280;
const PRESENTATION_FRAME_MS = 32;

type Schedule = (callback: () => void, milliseconds: number) => () => void;
const scheduleTimeout: Schedule = (callback, milliseconds) => {
  const timer = setTimeout(callback, milliseconds);
  return () => clearTimeout(timer);
};

/** Retains Map's one editor presentation until its approved exit is complete. */
export function createSpotEditorPresentation({getScope, onPhase, schedule = scheduleTimeout}: {
  getScope(): string | null;
  onPhase(phase: SpotEditorPhase): void;
  schedule?: Schedule;
}) {
  let phase: SpotEditorPhase = "open";
  let generation = 0;
  let disposed = false;
  let cancelScheduled: (() => void) | null = null;
  const clear = () => {cancelScheduled?.(); cancelScheduled = null; generation++;};
  const change = (next: SpotEditorPhase) => {
    phase = next;
    if (!disposed) onPhase(next);
  };
  return {
    enter(reducedMotion: boolean) {
      if (disposed) return;
      clear();
      const request = generation;
      if (reducedMotion) {change("open"); return;}
      change("entering");
      cancelScheduled = schedule(() => {
        if (disposed || request !== generation) return;
        cancelScheduled = null;
        // Opening has no business commit. Present the current guarded form even
        // when its owner changed, rather than strand a hidden editor on Map.
        change("open");
      }, PRESENTATION_FRAME_MS);
    },
    close(afterExit: () => void, reducedMotion: boolean) {
      if (disposed || phase === "closing") return false;
      const scope = getScope();
      if (scope === null) return false;
      const beforeEntry = phase === "entering";
      clear();
      const request = generation;
      change("closing");
      const complete = () => {
        if (disposed || request !== generation) return;
        cancelScheduled = null;
        if (getScope() !== scope) {change("open"); return;}
        change("open");
        afterExit();
      };
      // Before the first presented frame there is no visible translation to exit.
      // Retain one bridge frame after the adopted CSS exit instead of cutting it.
      if (reducedMotion || beforeEntry) complete();
      else cancelScheduled = schedule(complete, SPOT_EDITOR_EXIT_MS + PRESENTATION_FRAME_MS);
      return true;
    },
    isClosing: () => phase === "closing",
    cancel() {clear(); if (!disposed) change("open");},
    dispose() {disposed = true; clear();},
  };
}
