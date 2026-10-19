// TASK ONLY: compare memo association lifetime, never star content or scheduling.
// Call own() only on attachSkyCatalog's freshly created local scene object.
// The cell is non-enumerable; its scene/frame cycle has no global strong root.
export function createR17SceneOwnedMemo<Scene extends object, Frame>() {
  const key = Symbol("r17-local-stellar-frame-memo");
  type Cell = { frame: Frame | undefined };
  const legacy = new WeakMap<Scene, Frame>();
  const cap = (value: number) => Math.min(1e12, value + 1);
  const empty = () => ({ ownedScenesCreated: 0, ownRejected: 0, ownedReads: 0,
    ownedValueReads: 0, ownedWrites: 0, fallbackReads: 0, fallbackValueReads: 0,
    fallbackWrites: 0, sameAtReuses: 0 });
  let counts = empty(), lifetimeOwnedScenesCreated = 0, observationResets = 0;
  const cell = (scene: Scene): Cell | undefined => {
    // Legacy/controlled objects need not carry our private local ownership.
    // A reflective trap must not introduce a new failure before their old memo.
    try { return Object.getOwnPropertyDescriptor(scene, key)?.value as Cell | undefined; }
    catch { return undefined; }
  };
  const memo = {
    own(scene: Scene): Scene {
      if (cell(scene)) return scene;
      try {
        Object.defineProperty(scene, key, { value: { frame: undefined } satisfies Cell,
          enumerable: false, configurable: false, writable: false });
      } catch { counts.ownRejected = cap(counts.ownRejected); return scene; }
      counts.ownedScenesCreated = cap(counts.ownedScenesCreated);
      lifetimeOwnedScenesCreated = cap(lifetimeOwnedScenesCreated);
      return scene;
    },
    get(scene: Scene): Frame | undefined {
      const owned = cell(scene);
      if (owned) {
        counts.ownedReads = cap(counts.ownedReads);
        if (owned.frame !== undefined) counts.ownedValueReads = cap(counts.ownedValueReads);
        return owned.frame;
      }
      counts.fallbackReads = cap(counts.fallbackReads);
      const frame = legacy.get(scene);
      if (frame !== undefined) counts.fallbackValueReads = cap(counts.fallbackValueReads);
      return frame;
    },
    reused() { counts.sameAtReuses = cap(counts.sameAtReuses); },
    set(scene: Scene, frame: Frame): void {
      const owned = cell(scene);
      if (owned) {
        owned.frame = frame;
        counts.ownedWrites = cap(counts.ownedWrites);
      } else {
        legacy.set(scene, frame);
        counts.fallbackWrites = cap(counts.fallbackWrites);
      }
    },
    resetObservation() { counts = empty(); observationResets = cap(observationResets); },
    stats() { return { ...counts, lifetimeOwnedScenesCreated, observationResets }; },
  };
  return memo;
}
