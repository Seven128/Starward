export interface TerrainGroundOverlayTarget {
  src: string;
  bounds: {
    southwest: { latitude: number; longitude: number };
    northeast: { latitude: number; longitude: number };
  };
  opacity: number;
  zIndex: number;
}

export interface TerrainGroundOverlayContext {
  addGroundOverlay(options: TerrainGroundOverlayTarget & { id: number; visible: true }): unknown;
  updateGroundOverlay(options: TerrainGroundOverlayTarget & { id: number; visible: true }): unknown;
  removeGroundOverlay(options: { id: number }): unknown;
}

export interface TerrainGroundOverlayResult {
  error: unknown | null;
  target: TerrainGroundOverlayTarget | null;
}

export function createTerrainGroundOverlayCoordinator(
  id: number,
  createContext: () => TerrainGroundOverlayContext,
  onResult: (result: TerrainGroundOverlayResult) => void,
) {
  let installed = false;
  let generation = 0;
  let queue = Promise.resolve();

  const apply = (target: TerrainGroundOverlayTarget | null, intent: "display" | "suspend" = "display") => {
    // Hidden-page cleanup does not describe the next visible presentation.
    // Keep installed state on failure so resuming can still update/remove it.
    if (intent === "suspend") target = null;
    const currentGeneration = ++generation;
    queue = queue.catch(() => undefined).then(async () => {
      if (currentGeneration !== generation) return;
      try {
        if (!target && !installed) {
          if (intent === "display") onResult({ error: null, target });
          return;
        }
        const context = createContext();
        if (!target) {
          if (installed) {
            await context.removeGroundOverlay({ id });
            installed = false;
          }
        } else if (installed) {
          await context.updateGroundOverlay({ id, ...target, visible: true });
        } else {
          await context.addGroundOverlay({ id, ...target, visible: true });
          installed = true;
        }
        if (currentGeneration === generation && intent === "display") onResult({ error: null, target });
      } catch (error) {
        if (currentGeneration === generation && intent === "display") onResult({ error, target });
      }
    });
    return queue;
  };

  const dispose = () => {
    ++generation;
    queue = queue.catch(() => undefined).then(async () => {
      if (!installed) return;
      try {
        await createContext().removeGroundOverlay({ id });
        installed = false;
      } catch {
        // The page is gone, so there is no mounted recovery surface to update.
      }
    });
    return queue;
  };

  return { apply, dispose };
}
