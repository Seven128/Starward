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
  isCurrent(): boolean;
}

// Accept actual callbacks or a returned Promise; void alone is not success.
// Both native acknowledgment forms use the existing 10s Map recovery window.
function nativeCommand(action: (callbacks: NativeCallbacks) => unknown) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return new Promise<void>((success, fail) => {
    timer = setTimeout(() => fail(new Error("地形叠加超时")), 10000);
    const returned = action({ success, fail });
    if (returned && typeof (returned as PromiseLike<unknown>).then === "function")
      (returned as PromiseLike<unknown>).then(() => success(), fail);
  }).finally(() => clearTimeout(timer));
}

export function createTerrainGroundOverlayCoordinator(
  id: number,
  createContext: () => TerrainGroundOverlayContext,
  onResult: (result: TerrainGroundOverlayResult) => void,
) {
  let installed = false;
  let needsCleanup = false;
  let generation = 0;
  let queue = Promise.resolve();

  const apply = (target: TerrainGroundOverlayTarget | null, intent: "display" | "suspend" = "display") => {
    // Hidden-page cleanup does not describe the next visible presentation.
    // Keep installed state on failure so resuming can still update/remove it.
    if (intent === "suspend") target = null;
    const currentGeneration = ++generation;
    queue = queue.catch(() => undefined).then(() => {
      if (currentGeneration !== generation) return;
      const report = (error: unknown | null) => {
        if (currentGeneration === generation && intent === "display") onResult({ error, target,
          isCurrent: () => currentGeneration === generation });
      };
      if (!target && !needsCleanup) {
        report(null);
        return;
      }
      return nativeCommand(callbacks => {
        const context = createContext();
        if (!target) {
          return context.removeGroundOverlay({ id, ...callbacks });
        } else if (installed) {
          return context.updateGroundOverlay({ id, ...target, visible: true, ...callbacks });
        } else {
          // A missing callback leaves presence uncertain, so cleanup must still
          // try to remove this id before retiring the owning page.
          needsCleanup = true;
          return context.addGroundOverlay({ id, ...target, visible: true, ...callbacks });
        }
      }).then(() => {
        installed = Boolean(target);
        needsCleanup = installed;
        report(null);
      }, report);
    });
    return queue;
  };

  const dispose = () => {
    ++generation;
    queue = queue.catch(() => undefined).then(() => {
      if (!needsCleanup) return;
      return nativeCommand(callbacks => createContext().removeGroundOverlay({ id, ...callbacks })).then(() => {
        installed = false;
        needsCleanup = false;
      }, () => {
        // The page is gone, so there is no mounted recovery surface to update.
      });
    });
    return queue;
  };

  return { apply, dispose };
}
