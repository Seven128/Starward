// TASK ONLY. Inject into a disposable complete source build; never ship normally.
// One real action, boundary events only, no coordinates, URLs, paths or payloads
// in the receipt. Retaining a source/response here would change this contract.
type Action = "enable" | "gesture";
type Fields = Record<string, number | boolean | string | null>;
type Row = Fields & { seq: number; phase: string; wallMs: number | null; relativeMs: number | null; clockEpoch: number };
export const TERRAIN_WAIT_STORAGE_KEY = "starward.task.terrain-wait.v1";
export function createTerrainWaitObserver(options: {
  action: Action; sourceSha256: string; now?: () => number;
  later?: (callback: () => void, delay: number) => unknown;
  cancel?: (timer: unknown) => void;
}) {
  const readClock = options.now ?? Date.now;
  const later = options.later ?? ((callback, delay) => setTimeout(callback, delay));
  const cancel = options.cancel ?? (timer => clearTimeout(timer as ReturnType<typeof setTimeout>));
  const refs = new Map<string, number>(), pathAssets = new Map<number, number>();
  const listeners = new Set<() => void>();
  const rows: Row[] = [];
  let started = false, active = false, sealed = false, overflow = false;
  let firstWall: number | null = null, previousWall: number | null = null, epoch = 0, clockInvalid = 0, backward = 0;
  let timer: unknown, requestSequence = 0, stopReason = "not_started";
  let persist: ((value: unknown) => void) | null = null;
  const opaque = (kind: string, value: string | null | undefined): number | null => {
    if (!value) return null;
    const key = `${kind}:${value}`;
    const known = refs.get(key); if (known) return known;
    if (refs.size >= 64) { overflow = true; return null; }
    const id = refs.size + 1; refs.set(key, id); return id;
  };
  const clock = () => {
    let wall: number | null = null;
    try { const value = readClock(); if (Number.isSafeInteger(value) && value >= 0) wall = value; } catch {}
    if (wall === null) { epoch++; clockInvalid++; }
    else if (previousWall !== null && wall < previousWall) { epoch++; backward++; }
    previousWall = wall;
    return { wallMs: wall, clockEpoch: epoch,
      relativeMs: epoch === 0 && wall !== null && firstWall !== null && wall >= firstWall ? wall - firstWall : null };
  };
  const notify = () => { for (const listener of listeners) try { listener(); } catch {} };
  const append = (phase: string, fields: Fields = {}) => {
    if (!active) return;
    if (rows.length >= 80) { overflow = true; seal("event_limit"); return; }
    rows.push({ seq: rows.length + 1, phase, ...clock(), ...fields }); notify();
  };
  const snapshot = () => ({ schema: "starward-terrain-wait-v1", sourceSha256: options.sourceSha256,
    action: options.action, started, active, sealed, stopReason, overflow,
    clock: { source: "Date.now", unit: "ms", kind: "wall-elapsed", monotonic: false,
      nominalResolutionMs: 1, effectiveResolutionMs: null, invalidReads: clockInvalid, backwardReads: backward },
    rows: rows.map(row => ({ ...row })),
    limits: { eventCount: 80, identityCount: 64, observationDeadlineMs: 15000 },
    interpretation: "native_ack_is_not_visible; async_marker_only_proves_ready_before_observed_blank; no_marker_order_is_unknown" });
  function seal(reason: "deadline" | "event_limit" | "hidden" | "unmount") {
    if (!active) return;
    active = false; sealed = true; stopReason = reason;
    if (timer !== undefined) cancel(timer);
    refs.clear(); pathAssets.clear();
    try { persist?.(snapshot()); } catch {}
    notify();
  }
  return {
    snapshot, seal,
    configureWriter(writer: (value: unknown) => void) { persist = writer; },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    marker() {
      const last = rows[rows.length - 1];
      return last ? `TW ${last.seq} ${last.phase} A${last.asset ?? "?"} ${last.relativeMs ?? "?"}ms${sealed ? " END" : ""}` : `TW armed ${options.action}`;
    },
    start(action: Action, request: string, imageKey: string | null, imagePath: string | null,
      facts: { metadataAvailable: boolean; fetching: boolean; imageReady: boolean; imagePending: boolean }) {
      if (started || action !== options.action) return;
      started = active = true; stopReason = "running";
      const stamp = clock(); firstWall = stamp.wallMs;
      const asset = opaque("asset", imageKey), file = opaque("path", imagePath);
      if (asset !== null && file !== null) pathAssets.set(file, asset);
      append("action", { request: opaque("request", request), asset,
        metadataAvailable: facts.metadataAvailable, fetching: facts.fetching,
        imageReady: facts.imageReady, imagePending: facts.imagePending });
      timer = later(() => seal("deadline"), 15000);
    },
    metadataStart(identity: string) {
      if (!active) return null;
      const attempt = ++requestSequence;
      append("metadata_start", { attempt, request: opaque("request", identity) }); return attempt;
    },
    metadataEnd(attempt: number | null, identity: string, imageKey: string | null, ok: boolean) {
      if (!active) return;
      append(ok ? "metadata_returned" : "metadata_failed", {
        attempt, inherited: attempt === null, request: opaque("request", identity), asset: opaque("asset", imageKey),
      });
    },
    cacheAcquire(imageKey: string, state: "miss" | "queued" | "loading" | "ready") {
      if (active) append("file_acquire", { asset: opaque("asset", imageKey), cache: state });
    },
    downloadReturned(imageKey: string, statusCode: number) {
      if (active) append("download_returned", { asset: opaque("asset", imageKey), ok: statusCode >= 200 && statusCode < 300 });
    },
    fileReady(imageKey: string, imagePath: string) {
      if (!active) return;
      const asset = opaque("asset", imageKey), file = opaque("path", imagePath);
      if (asset !== null && file !== null) pathAssets.set(file, asset);
      append("file_ready", { asset, file });
    },
    nativeResult(mapId: string, imagePath: string | null, ok: boolean, current: boolean, phase: string) {
      if (!active) return;
      const file = opaque("path", imagePath);
      append(ok ? "native_ack" : "native_failure", { map: opaque("map", mapId), file,
        asset: file === null ? null : pathAssets.get(file) ?? null, current, cleanup: phase === "cleanup" });
    },
  };
}
export const terrainWait = createTerrainWaitObserver({ action: "__TERRAIN_WAIT_ACTION__" as Action,
  sourceSha256: "__TERRAIN_WAIT_SOURCE_SHA256__" });
