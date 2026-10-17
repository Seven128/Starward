/** A display envelope never supplies scale/visibility or changes source alpha.
 * Its owner commits this small clock state only after successful presentation. */
export interface SkyReadyProgress {
  readonly startedAt: number;
  readonly progress: number;
  readonly paused: boolean;
}
export const SKY_READY_REVEAL_MS = 160;
export function skyReadyProgress(previous: SkyReadyProgress | undefined, now: number,
  reducedMotion = false, paused = false): SkyReadyProgress {
  if (paused) return { startedAt: now - (previous?.progress ?? 0) * SKY_READY_REVEAL_MS,
    progress: previous?.progress ?? 0, paused: true };
  const startedAt = previous?.paused ? now - previous.progress * SKY_READY_REVEAL_MS : previous?.startedAt ?? now;
  return { startedAt, progress: reducedMotion ? 1 : Math.max(0, Math.min(1, (now - startedAt) / SKY_READY_REVEAL_MS)), paused: false };
}
export function skyReadyOpacity(target: number, progress: SkyReadyProgress): number {
  return Math.max(0, Math.min(1, target)) * progress.progress;
}

export type SkyReadyImageResult = "HIDDEN" | "FAILED" | "PREPARED" | "PAINTED";
interface ReadyImage { readonly ready: SkyReadyProgress; readonly rebase: boolean }

/** Only presentation clocks, bounded to this accepted frame's eligible images.
 * Native identity/retirement, source validity and LOD composition stay with the
 * real consumer. Time/pose changes do not retire an independently valid bitmap.
 * Preparation at zero alpha never means painted or grants source credit. */
export function createSkyReadyImages() {
  let accepted = new Map<object, SkyReadyProgress>(), revision = 0;
  return {
    reset() { accepted.clear(); revision++; },
    prepare(now: number, reducedMotion = false, paused = false) {
      const before = accepted, expectedRevision = revision;
      const images = new Map<object, ReadyImage>();
      let animating = false;
      // A group can inspect several clocks, prepare/composite once, then
      // accept only its actually prepared fields. Proposals alone do not
      // advance a clock or keep an animation alive.
      const image = (identity: object) => {
        const previous = before.get(identity);
        const ready = skyReadyProgress(previous, now, reducedMotion, paused);
        return { progress: ready.progress, accept() {
          if (revision !== expectedRevision) return false;
          images.set(identity, { ready, rebase: !previous || previous.paused || paused });
          if (!paused && ready.progress < 1) animating = true;
          return true;
        } };
      };
      return {
        image,
        draw(identity: object, target: number, prepare: () => boolean,
          paint: (opacity: number) => boolean): SkyReadyImageResult {
          if (!Number.isFinite(target) || target <= 0) return "HIDDEN";
          const proposed = image(identity);
          const opacity = Math.max(0, Math.min(1, target)) * proposed.progress;
          if (!(opacity > 0 ? paint(opacity) : prepare())) return "FAILED";
          proposed.accept();
          return opacity > 0 ? "PAINTED" : "PREPARED";
        },
        get animating() { return animating; },
        commit(presentedAt = now) {
          if (revision !== expectedRevision) return false;
          const next = new Map<object, SkyReadyProgress>();
          for (const [identity, image] of images) next.set(identity, image.rebase
            ? { ...image.ready, startedAt: presentedAt - image.ready.progress * SKY_READY_REVEAL_MS }
            : image.ready);
          accepted = next; revision++; return true;
        },
      };
    },
  };
}

export type SkyReadyImageFrame = ReturnType<ReturnType<typeof createSkyReadyImages>["prepare"]>;
