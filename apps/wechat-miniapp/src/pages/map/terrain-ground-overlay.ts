export interface TerrainGroundOverlayTarget {
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

export interface TerrainGroundOverlayContext {
  addGroundOverlay(options: TerrainGroundOverlayTarget & NativeCallbacks & { id: number; visible: true }): unknown;
  updateGroundOverlay(options: TerrainGroundOverlayTarget & NativeCallbacks & { id: number; visible: true }): unknown;
  removeGroundOverlay(options: NativeCallbacks & { id: number }): unknown;
}

export interface TerrainGroundOverlayResult {
  error: unknown | null;
  target: TerrainGroundOverlayTarget | null;
  phase?: "display" | "cleanup";
  requiresMapRecovery?: boolean;
  isCurrent(): boolean;
}

export function terrainGroundOverlayKey(target: TerrainGroundOverlayTarget | null) {
  return target ? JSON.stringify([target.src, target.bounds, target.opacity, target.zIndex]) : null;
}

class NativeTerrainRecoveryRequired extends Error {}
class NativeTerrainTimeout extends NativeTerrainRecoveryRequired {}

// A timeout ends visible waiting, but cannot establish whether a native command
// eventually ran. Keep that slot reserved until its real callback settles.
function nativeCommand(action: (callbacks: NativeCallbacks) => unknown, settled: (success: boolean, late: boolean) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finished = false, timedOut = false;
  return new Promise<void>((success, fail) => {
    const complete = (ok: boolean, error?: unknown) => {
      if (finished) return;
      finished = true; clearTimeout(timer); settled(ok, timedOut);
      if (!timedOut) { if (ok) success(); else fail(error); }
    };
    timer = setTimeout(() => { timedOut = true; fail(new NativeTerrainTimeout("地形叠加超时，请重试或重新加载地图")); }, 10000);
    try {
      const returned = action({ success: () => complete(true), fail: error => complete(false, error) });
      if (returned && typeof (returned as PromiseLike<unknown>).then === "function")
        (returned as PromiseLike<unknown>).then(() => complete(true), error => complete(false, error));
    } catch (error) { complete(false, error); }
  }).finally(() => clearTimeout(timer));
}

export function createTerrainGroundOverlayCoordinator(
  id: number,
  createContext: () => TerrainGroundOverlayContext,
  onResult: (result: TerrainGroundOverlayResult) => void,
) {
  type Slot = { id: number; target: TerrainGroundOverlayTarget | null; confirmed: boolean; adding: boolean; removing: boolean };
  const slots: Slot[] = [id, id + 1].map(value => ({ id: value, target: null, confirmed: false, adding: false, removing: false }));
  let displayed: Slot | null = null;
  let generation = 0;
  let queue = Promise.resolve();
  let disposed = false;

  const remove = async (slot: Slot) => {
    if (!slot.target) return;
    if (slot.adding || slot.removing) throw new NativeTerrainTimeout("地形原生操作尚未结束，请重新加载地图");
    slot.removing = true;
    try {
      await nativeCommand(callbacks => createContext().removeGroundOverlay({ id: slot.id, ...callbacks }), (ok) => {
        slot.removing = false;
        if (ok) {
          slot.target = null; slot.confirmed = false;
          if (displayed === slot) displayed = null;
        }
      });
    } catch (error) {
      // A failed removal cannot prove absence (including an unconfirmed add).
      // Keep the id reserved and offer the existing new-Map recovery path.
      throw new NativeTerrainRecoveryRequired("旧地形未能清理，请重新加载地图", { cause: error });
    }
  };

  const cleanupLateAdd = (slot: Slot) => {
    // An overdue obsolete add is never adopted or allowed to overwrite a reused
    // id. Its reserved slot is cleaned once its actual acknowledgment arrives.
    queue = queue.catch(() => undefined).then(() => remove(slot)).catch(() => undefined);
  };

  const apply = (target: TerrainGroundOverlayTarget | null, intent: "display" | "suspend" = "display") => {
    if (disposed) return queue;
    if (intent === "suspend") target = null;
    const currentGeneration = ++generation;
    queue = queue.catch(() => undefined).then(async () => {
      if (currentGeneration !== generation) return;
      const report = (error: unknown | null, phase: "display" | "cleanup" = "display") => {
        if (currentGeneration === generation && intent === "display") onResult({ error, target,
          phase, requiresMapRecovery: error instanceof NativeTerrainRecoveryRequired,
          isCurrent: () => !disposed && currentGeneration === generation });
      };
      try {
        if (!target) {
          // Try both even if one uncertain operation cannot yet be retired.
          let failure: unknown;
          for (const slot of slots) try { await remove(slot); } catch (error) { failure ??= error; }
          if (failure) throw failure;
          report(null); return;
        }
        if (displayed?.confirmed && terrainGroundOverlayKey(displayed.target) === terrainGroundOverlayKey(target)) {
          report(null);
          for (const slot of slots) if (slot !== displayed) try { await remove(slot); } catch (error) { report(error, "cleanup"); }
          return;
        }
        // Never mutate the currently visible bounds. Reserve one other id,
        // remove any failed predecessor there, then add and await a new image.
        const next = slots.find(slot => slot !== displayed && !slot.target && !slot.adding && !slot.removing)
          ?? slots.find(slot => slot !== displayed && !slot.adding && !slot.removing);
        if (!next) throw new NativeTerrainTimeout("地形原生操作尚未结束，请重新加载地图");
        await remove(next);
        if (currentGeneration !== generation) return;
        next.target = target; next.confirmed = false; next.adding = true;
        await nativeCommand(callbacks => createContext().addGroundOverlay({ id: next.id, ...target!, visible: true, ...callbacks }), (_ok, late) => {
          next.adding = false;
          if (late) cleanupLateAdd(next);
        });
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
