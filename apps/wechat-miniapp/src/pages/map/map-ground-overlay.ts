export interface MapGroundOverlayTarget {
  src: string;
  bounds: {
    southwest: { latitude: number; longitude: number };
    northeast: { latitude: number; longitude: number };
  };
  opacity: number;
  zIndex: number;
}

interface NativeCallbacks {
  success(): void;
  fail(error: unknown): void;
}

export interface MapGroundOverlayContext {
  addGroundOverlay(options: MapGroundOverlayTarget & NativeCallbacks & { id: number; visible: true }): unknown;
  updateGroundOverlay(options: MapGroundOverlayTarget & NativeCallbacks & { id: number; visible: true }): unknown;
  removeGroundOverlay(options: NativeCallbacks & { id: number }): unknown;
}

export interface MapGroundOverlayResult {
  error: unknown | null;
  target: MapGroundOverlayTarget | null;
  phase?: "display" | "cleanup";
  requiresMapRecovery?: boolean;
  isCurrent(): boolean;
}

export function mapGroundOverlayKey(target: MapGroundOverlayTarget | null) {
  return target ? JSON.stringify([target.src, target.bounds, target.opacity, target.zIndex]) : null;
}

class NativeMapRecoveryRequired extends Error {}
class NativeMapTimeout extends NativeMapRecoveryRequired {}

// A timeout ends visible waiting, but cannot establish whether a native command
// eventually ran. Keep that slot reserved until its real callback settles.
function nativeCommand(action: (callbacks: NativeCallbacks) => unknown, settled: (success: boolean, late: boolean) => void, label: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finished = false, timedOut = false;
  return new Promise<void>((success, fail) => {
    const complete = (ok: boolean, error?: unknown) => {
      if (finished) return;
      finished = true; clearTimeout(timer); settled(ok, timedOut);
      if (!timedOut) { if (ok) success(); else fail(error); }
    };
    timer = setTimeout(() => { timedOut = true; fail(new NativeMapTimeout(`${label}叠加超时，请重试或重新加载地图`)); }, 10000);
    try {
      const returned = action({ success: () => complete(true), fail: error => complete(false, error) });
      if (returned && typeof (returned as PromiseLike<unknown>).then === "function")
        (returned as PromiseLike<unknown>).then(() => complete(true), error => complete(false, error));
    } catch (error) { complete(false, error); }
  }).finally(() => clearTimeout(timer));
}

export function createMapGroundOverlayCoordinator(
  id: number,
  createContext: () => MapGroundOverlayContext,
  onResult: (result: MapGroundOverlayResult) => void,
  resources?: { retainPath(path: string): () => void },
  label = "地图图层",
) {
  type Slot = { id: number; target: MapGroundOverlayTarget | null; confirmed: boolean; adding: boolean; removing: boolean; releaseFile?: (() => void) | undefined };
  const slots: Slot[] = [id, id + 1].map(value => ({ id: value, target: null, confirmed: false, adding: false, removing: false }));
  let displayed: Slot | null = null;
  let generation = 0;
  let queue = Promise.resolve();
  let disposed = false;

  const remove = async (slot: Slot) => {
    if (!slot.target) return;
    if (slot.adding || slot.removing) throw new NativeMapTimeout(`${label}原生操作尚未结束，请重新加载地图`);
    slot.removing = true;
    try {
      await nativeCommand(callbacks => createContext().removeGroundOverlay({ id: slot.id, ...callbacks }), (ok) => {
        slot.removing = false;
        if (ok) {
          slot.releaseFile?.(); slot.releaseFile = undefined;
          slot.target = null; slot.confirmed = false;
          if (displayed === slot) displayed = null;
        }
      }, label);
    } catch (error) {
      // A failed removal cannot prove absence (including an unconfirmed add).
      // Keep the id reserved and offer the existing new-Map recovery path.
      throw new NativeMapRecoveryRequired(`旧${label}未能清理，请重新加载地图`, { cause: error });
    }
  };

  const cleanupLateAdd = (slot: Slot) => {
    // An overdue obsolete add is never adopted or allowed to overwrite a reused
    // id. Its reserved slot is cleaned once its actual acknowledgment arrives.
    queue = queue.catch(() => undefined).then(() => remove(slot)).catch(() => undefined);
  };

  const apply = (target: MapGroundOverlayTarget | null, intent: "display" | "suspend" = "display") => {
    if (disposed) return queue;
    if (intent === "suspend") target = null;
    let releaseRequestedFile: (() => void) | undefined, resourceError: unknown;
    try { if (target) releaseRequestedFile = resources?.retainPath(target.src); }
    catch (error) { resourceError = error; }
    const currentGeneration = ++generation;
    queue = queue.catch(() => undefined).then(async () => {
      if (currentGeneration !== generation) { releaseRequestedFile?.(); return; }
      const report = (error: unknown | null, phase: "display" | "cleanup" = "display") => {
        if (currentGeneration === generation && intent === "display") onResult({ error, target,
          phase, requiresMapRecovery: error instanceof NativeMapRecoveryRequired,
          isCurrent: () => !disposed && currentGeneration === generation });
      };
      try {
        if (resourceError) throw resourceError;
        if (!target) {
          // Try both even if one uncertain operation cannot yet be retired.
          let failure: unknown;
          for (const slot of slots) try { await remove(slot); } catch (error) { failure ??= error; }
          if (failure) throw failure;
          report(null); return;
        }
        if (displayed?.confirmed && mapGroundOverlayKey(displayed.target) === mapGroundOverlayKey(target)) {
          report(null);
          for (const slot of slots) if (slot !== displayed) try { await remove(slot); } catch (error) { report(error, "cleanup"); }
          return;
        }
        // Never mutate the currently visible bounds. Reserve one other id,
        // remove any failed predecessor there, then add and await a new image.
        const next = slots.find(slot => slot !== displayed && !slot.target && !slot.adding && !slot.removing)
          ?? slots.find(slot => slot !== displayed && !slot.adding && !slot.removing);
        if (!next) throw new NativeMapTimeout(`${label}原生操作尚未结束，请重新加载地图`);
        await remove(next);
        if (currentGeneration !== generation) return;
        next.target = target; next.confirmed = false; next.adding = true;
        next.releaseFile = releaseRequestedFile; releaseRequestedFile = undefined;
        await nativeCommand(callbacks => createContext().addGroundOverlay({ id: next.id, ...target!, visible: true, ...callbacks }), (_ok, late) => {
          next.adding = false;
          if (late) cleanupLateAdd(next);
        }, label);
        if (currentGeneration !== generation || disposed) {
          // A newer request already owns presentation. Keep the confirmed old
          // image; this obsolete candidate must not retire it or change source.
          await remove(next); return;
        }
        next.confirmed = true; displayed = next;
        report(null);
        // Loading ends only after the add acknowledgment. A failed old-image
        // removal stays owned and blocks its id from being reused or growing.
        for (const slot of slots) if (slot !== displayed) {
          try { await remove(slot); } catch (error) { report(error, "cleanup"); }
        }
      } catch (error) { report(error); }
      finally { releaseRequestedFile?.(); }
    });
    return queue;
  };

  const dispose = () => {
    disposed = true; ++generation;
    queue = queue.catch(() => undefined).then(async () => {
      for (const slot of slots) try { await remove(slot); } catch { /* Reserved late adds still own their eventual cleanup. */ }
    });
    return queue;
  };

  return { apply, dispose };
}
