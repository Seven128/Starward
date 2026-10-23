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
  updateGroundOverlay?(options: MapGroundOverlayTarget & NativeCallbacks & { id: number; visible: true }): unknown;
  removeGroundOverlay(options: NativeCallbacks & { id: number }): unknown;
}

export interface MapGroundOverlayResult {
  error: unknown | null;
  target: MapGroundOverlayTarget | null;
  phase?: "display" | "cleanup" | "pending";
  /** A dispatched same-id mutation is not proof that the old image survived. */
  presentationUnknown?: boolean;
  requiresMapRecovery?: boolean;
  isCurrent(): boolean;
}

export interface MapGroundOverlayDisposal {
  complete: boolean;
  /** These ids and their files still belong to this exact native Map owner. */
  remainingIds: number[];
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
  type File = { target: MapGroundOverlayTarget; release?: (() => void) | undefined };
  type Slot = { id: number; file: File | null; replacement: File | null; confirmed: boolean;
    operation: "add" | "update" | "remove" | null; mustRemove: boolean };
  const slots: Slot[] = [id, id + 1].map(value => ({ id: value, file: null, replacement: null,
    confirmed: false, operation: null, mustRemove: false }));
  let displayed: Slot | null = null;
  let generation = 0;
  let queue = Promise.resolve();
  let disposed = false;
  let queuedFile: File | null = null;
  let sameIdUpdateSupported = false;
  const context = () => {
    const current = createContext();
    sameIdUpdateSupported = typeof current.updateGroundOverlay === "function";
    return current;
  };

  const release = (file: File | null) => { file?.release?.(); if (file) file.release = undefined; };

  const remove = async (slot: Slot) => {
    if (!slot.file) return;
    if (slot.operation) throw new NativeMapTimeout(`${label}原生操作尚未结束，请重新加载地图`);
    slot.operation = "remove"; slot.confirmed = false;
    slot.mustRemove ||= slot === displayed || Boolean(slot.replacement);
    try {
      await nativeCommand(callbacks => context().removeGroundOverlay({ id: slot.id, ...callbacks }), (ok) => {
        slot.operation = null;
        if (ok) {
          release(slot.file); release(slot.replacement);
          slot.file = slot.replacement = null; slot.mustRemove = false;
          if (displayed === slot) displayed = null;
        }
      }, label);
    } catch (error) {
      // A failed removal cannot prove absence (including an unconfirmed add).
      // Keep the id reserved and offer the existing new-Map recovery path.
      throw new NativeMapRecoveryRequired(`旧${label}未能清理，请重新加载地图`, { cause: error });
    }
  };

  const cleanupLateMutation = (slot: Slot) => {
    // An overdue mutation is never adopted or allowed to overwrite a reused
    // id. Its reserved slot is cleaned once its actual acknowledgment arrives.
    const file = slot.file, replacement = slot.replacement;
    queue = queue.catch(() => undefined).then(() => {
      if (slot.file === file && slot.replacement === replacement) return remove(slot);
    }).catch(() => undefined);
  };

  const apply = (target: MapGroundOverlayTarget | null, intent: "display" | "suspend" = "display",
    replacement: "compatible" | "same-id-only" = "compatible") => {
    if (disposed) return queue;
    if (intent === "suspend") target = null;
    // A newer queued intent releases its predecessor before a slow native
    // operation settles. Only files already handed to a slot must stay pinned.
    release(queuedFile); queuedFile = null;
    let requestedFile: File | null = null, resourceError: unknown;
    try { if (target) requestedFile = { target, release: resources?.retainPath(target.src) }; }
    catch (error) { resourceError = error; }
    queuedFile = requestedFile;
    const currentGeneration = ++generation;
    queue = queue.catch(() => undefined).then(async () => {
      if (currentGeneration !== generation) { release(requestedFile); return; }
      const report = (error: unknown | null, phase: "display" | "cleanup" | "pending" = "display", presentationUnknown = false,
        actual = target) => {
        if (!disposed && currentGeneration === generation && intent === "display") onResult({ error, target: actual,
          phase, presentationUnknown, requiresMapRecovery: error instanceof NativeMapRecoveryRequired,
          isCurrent: () => !disposed && currentGeneration === generation });
      };
      const takeRequestedFile = () => {
        const file = requestedFile!;
        if (queuedFile === file) queuedFile = null;
        requestedFile = null; return file;
      };
      try {
        if (resourceError) throw resourceError;
        if (!target) {
          // Try both even if one uncertain operation cannot yet be retired.
          let failure: unknown;
          for (const slot of slots) try { await remove(slot); } catch (error) { failure ??= error; }
          if (failure) { report(failure, "display", true); return; }
          report(null); return;
        }
        // A failed update/remove cannot establish what this id now displays.
        // Retire it before accepting more files or publishing another image.
        for (const slot of slots) if (slot.mustRemove) await remove(slot);
        if (currentGeneration !== generation) return;
        if (displayed?.confirmed && mapGroundOverlayKey(displayed.file!.target) === mapGroundOverlayKey(target)) {
          report(null);
          for (const slot of slots) if (slot !== displayed) try { await remove(slot); } catch (error) { report(error, "cleanup"); }
          return;
        }
        if (displayed?.confirmed) {
          const currentContext = context();
          if (typeof currentContext.updateGroundOverlay === "function") {
            // Keep a single coverage id and both files until the actual update
            // ack. Neither a fail nor a timeout proves the old src/bounds remain.
            const current = displayed;
            for (const slot of slots) if (slot !== current) await remove(slot);
            if (currentGeneration !== generation) return;
            current.replacement = takeRequestedFile(); current.confirmed = false; current.operation = "update";
            report(null, "pending", true);
            try {
              await nativeCommand(callbacks => currentContext.updateGroundOverlay!({ id: current.id, ...target!, visible: true, ...callbacks }), (ok, late) => {
                current.operation = null;
                if (ok) {
                  release(current.file); current.file = current.replacement; current.replacement = null;
                  current.confirmed = true;
                }
                if (late) cleanupLateMutation(current);
              }, label);
            } catch (error) {
              current.mustRemove = true;
              throw new NativeMapRecoveryRequired(`${label}替换结果未确认，请重试或重新加载地图`, { cause: error });
            }
            if (currentGeneration === generation) report(null);
            return;
          }
          if (replacement === "same-id-only") {
            // Optional coarse coverage must not fall back to overlapping
            // translucent ids if the capability changed after admission.
            report(null, "display", false, displayed.file!.target);
            return;
          }
        }
        // An actually absent update API retains the existing two-slot fallback.
        // Calling update and receiving fail is not evidence that it did nothing.
        const next = slots.find(slot => slot !== displayed && !slot.file && !slot.operation)
          ?? slots.find(slot => slot !== displayed && !slot.operation);
        if (!next) throw new NativeMapTimeout(`${label}原生操作尚未结束，请重新加载地图`);
        await remove(next);
        if (currentGeneration !== generation) return;
        next.file = takeRequestedFile(); next.confirmed = false; next.operation = "add";
        await nativeCommand(callbacks => context().addGroundOverlay({ id: next.id, ...target!, visible: true, ...callbacks }), (_ok, late) => {
          next.operation = null;
          if (late) cleanupLateMutation(next);
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
      } catch (error) { report(error, "display", Boolean(displayed && !displayed.confirmed)); }
      finally { if (queuedFile === requestedFile) queuedFile = null; release(requestedFile); }
    });
    return queue;
  };

  const dispose = () => {
    disposed = true; ++generation;
    release(queuedFile); queuedFile = null;
    queue = queue.catch(() => undefined).then(async () => {
      for (const slot of slots) try { await remove(slot); } catch { /* Remaining ids are returned; late callbacks still own cleanup. */ }
    });
    return queue.then((): MapGroundOverlayDisposal => {
      const remainingIds = slots.filter(slot => slot.file).map(slot => slot.id);
      return { complete: remainingIds.length === 0, remainingIds };
    });
  };

  /** A controlled departure keeps this owner usable until navigation/reload
   * actually succeeds. A newer apply invalidates this clearance, even when a
   * preceding remove happens to finish before the newer image is installed. */
  const suspend = () => {
    const pending = apply(null, "suspend"), requestedGeneration = generation;
    return pending.then((): MapGroundOverlayDisposal => {
      const remainingIds = slots.filter(slot => slot.file).map(slot => slot.id);
      return { complete: !disposed && requestedGeneration === generation && remainingIds.length === 0, remainingIds };
    });
  };

  return { apply, suspend, dispose,
    // This is the actual context used by native commands, not an SDK version
    // guess. Unknown/in-flight ownership cannot authorize a coarse takeover.
    canReplace: () => !disposed && sameIdUpdateSupported && Boolean(displayed?.confirmed)
      && slots.every(slot => !slot.operation && !slot.mustRemove) };
}
