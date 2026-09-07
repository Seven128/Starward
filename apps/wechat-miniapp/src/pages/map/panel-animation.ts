import type { PanelSpringFrame } from "./panel-spring";
export interface PanelAnimationHost {
  animate(selector: string, frames: { height: number; offset: number; ease: string }[], duration: number, done: () => void): void;
  clearAnimation(selector: string, done: () => void): void;
}
export function createPanelAnimation(onError: () => void = () => {}) {
  let generation = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const clearTimeoutOwner = () => { if (timeout !== null) clearTimeout(timeout); timeout = null; };
  let active: PanelAnimationHost | null = null;
  const clear = (host: PanelAnimationHost) => {
    try { host.clearAnimation(".spot-panel", () => {}); } catch { onError(); }
  };
  return {
    cancel() {
      generation += 1;
      clearTimeoutOwner();
      const previous = active;
      active = null;
      if (previous) clear(previous);
    },
    start(host: PanelAnimationHost, frames: readonly PanelSpringFrame[], done: () => void) {
      this.cancel();
      const current = generation;
      const duration = frames.reduce((sum, frame) => sum + frame.duration, 0);
      if (!duration || frames.length < 2) { done(); return; }
      let elapsed = 0;
      const keyframes = frames.map(frame => {
        elapsed += frame.duration;
        return { height: frame.height, offset: elapsed / duration, ease: "linear" };
      });
      active = host;
      const finish = () => {
        if (current !== generation || active !== host) return;
        active = null;
        clearTimeoutOwner();
        clear(host);
        done();
      };
      // WEAPP View does not guarantee CSS animationend. Retire the presentation
      // after its declared duration plus a render-frame allowance.
      timeout = setTimeout(finish, duration + 50);
      try { host.animate(".spot-panel", keyframes, duration, finish); }
      catch { onError(); finish(); }
    },
  };
}
