type Journey = {
  id: number;
  phase: "entering" | "sky" | "returning" | "complete";
  entryStartedAt: number;
  mapUnloadedAt?: number;
  skyMountedAt?: number;
  skyReadyAt?: number;
  returnStartedAt?: number;
  mapMountedAt?: number;
  mapReadyAt?: number;
  returnCompletedAt?: number;
};

/** One route handoff, with no account, Context, component or native resources.
 * Readiness timestamps are supplied by the actual rendering owners. */
export function createSkyMapLifecycle(now: () => number = Date.now) {
  let serial = 0;
  let returnSerial = 0;
  const pendingReturns = new Set<number>();
  let journey: Journey | null = null;
  return {
    beginEntry() {
      pendingReturns.clear();
      journey = { id: ++serial, phase: "entering", entryStartedAt: now() };
      return journey.id;
    },
    cancelEntry(id: number) {
      if (journey?.id === id && journey.phase === "entering") journey = null;
    },
    mapUnloaded() {
      if (journey && (journey.phase === "entering" || journey.phase === "sky") && journey.mapUnloadedAt === undefined)
        journey.mapUnloadedAt = now();
    },
    skyMounted() {
      if (!journey || journey.phase !== "entering") return false;
      journey.phase = "sky";
      journey.skyMountedAt = now();
      return true;
    },
    skyReady() {
      if (journey?.phase === "sky" && journey.skyReadyAt === undefined) journey.skyReadyAt = now();
    },
    beginReturn() {
      if (!journey || (journey.phase !== "sky" && journey.phase !== "returning")) return null;
      if (journey.phase === "sky") {
        journey.phase = "returning";
        journey.returnStartedAt = now();
        delete journey.mapMountedAt;
        delete journey.mapReadyAt;
      }
      const ticket = ++returnSerial;
      pendingReturns.add(ticket);
      return ticket;
    },
    cancelReturn(ticket: number | null) {
      if (ticket === null || !pendingReturns.delete(ticket)) return;
      if (journey?.phase === "returning" && journey.mapMountedAt === undefined && pendingReturns.size === 0)
        journey.phase = "sky";
    },
    mapReturnPending: () => journey?.phase === "returning",
    mapMounted() {
      if (journey?.phase === "returning" && journey.mapMountedAt === undefined) {
        journey.mapMountedAt = now();
        pendingReturns.clear();
      }
    },
    mapReady() {
      if (journey?.phase === "returning" && journey.mapMountedAt !== undefined && journey.mapReadyAt === undefined)
        journey.mapReadyAt = now();
    },
    finishMapReturn() {
      if (journey?.phase !== "returning") return;
      journey.returnCompletedAt = now();
      journey.phase = "complete";
      pendingReturns.clear();
    },
    snapshot: () => journey ? { ...journey } : null,
  };
}

export const skyMapLifecycle = createSkyMapLifecycle();
