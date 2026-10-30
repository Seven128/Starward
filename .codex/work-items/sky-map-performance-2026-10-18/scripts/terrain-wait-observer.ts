// TASK ONLY. Inject into a disposable complete source build; never ship normally.
// One bounded sequence of real actions, no coordinates, URLs, paths or payloads
// in the receipt. Retaining a source/response here would change this contract.
type Action = "enable" | "gesture";
type Fields = Record<string, number | boolean | string | null>;
type Row = Fields & { seq: number; phase: string; wallMs: number | null; relativeMs: number | null; clockEpoch: number };
type Resources = { observed: boolean; entries: number | null; readyBytes: number | null; activeDownloads: number | null;
  queued: number | null; nativePins: number | null; failedRemovals: number | null; activeReaders: number | null; physicalFiles: number | null };
const resourceKeys = ["entries", "readyBytes", "activeDownloads", "queued", "nativePins", "failedRemovals", "activeReaders", "physicalFiles"] as const;
export const TERRAIN_WAIT_STORAGE_KEY = "starward.task.terrain-wait.v3";
export function createTerrainWaitObserver(options: {
  action: Action; sourceSha256: string; now?: () => number;
  runId?: string; armRequired?: boolean;
  later?: (callback: () => void, delay: number) => unknown;
  cancel?: (timer: unknown) => void;
}) {
  const readClock = options.now ?? Date.now;
  const later = options.later ?? ((callback, delay) => setTimeout(callback, delay));
  const cancel = options.cancel ?? (timer => clearTimeout(timer as ReturnType<typeof setTimeout>));
  const refs = new Map<string, number>(), pathAssets = new Map<number, number>();
  const requestInputs = new Map<number, number>(), assetInputs = new Map<number, number>();
  const nativeOperations = new Set<number>();
  const listeners = new Set<() => void>();
  const rows: Row[] = [];
  // The existing HTTP owner admits 32 KiB. Reserve 2 KiB for the strictly
  // scalar envelope (including maximum-width safe integers), without walking
  // or serializing the growing record at each boundary.
  let rowBytes = 0;
  let started = false, active = false, sealed = false, overflow = false, armed = !options.armRequired;
  let inputSeq = 0, nativeSequence = 0, ownerSequence = 0, nativePendingAtSeal = 0;
  const runId = options.runId ?? `tw-${Date.now().toString(36)}-${Math.floor(Math.random() * 0x1_0000_0000).toString(36)}`;
  let readResources: (() => unknown) | null = null, finalResources: Resources | null = null;
  let firstWall: number | null = null, previousWall: number | null = null, epoch = 0, clockInvalid = 0, backward = 0;
  let timer: unknown, requestSequence = 0, stopReason = "not_started";
  let persist: ((value: unknown) => void) | null = null;
  const resources = (): Resources => {
    let source: Partial<Record<typeof resourceKeys[number], unknown>> | null = null;
    try { source = readResources?.() as typeof source; } catch {}
    const observed = source !== null && resourceKeys.every(key => Number.isSafeInteger(source?.[key]) && Number(source?.[key]) >= 0);
    return { observed, ...Object.fromEntries(resourceKeys.map(key => [key, observed ? source![key] : null])) } as Resources;
  };
  const resourceFields = (): Fields => Object.fromEntries(Object.entries(resources()).map(([key, value]) => [`resource_${key}`, value]));
  const requestInput = (asset: number | null) => asset === null ? null : assetInputs.get(asset) ?? null;
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
    const row = { seq: rows.length + 1, phase, ...clock(), inputSeq, ...fields };
    const bytes = JSON.stringify(row).length + (rows.length ? 1 : 0);
    if (rowBytes + bytes > 32768 - 2048) {
      if (phase === "action") inputSeq--;
      overflow = true; seal("byte_limit"); return;
    }
    rowBytes += bytes; rows.push(row); notify();
  };
  const snapshot = () => ({ schemaVersion: "starward-terrain-wait-v3", variant: "terrain-wait", runId, sourceSha256: options.sourceSha256,
    action: options.action, started, active, sealed, stopReason, overflow, inputCount: inputSeq,
    nativePending: sealed ? nativePendingAtSeal : nativeOperations.size, resources: { ...(finalResources ?? resources()) },
    clock: { source: "Date.now", unit: "ms", kind: "wall-elapsed", monotonic: false,
      nominalResolutionMs: 1, effectiveResolutionMs: null, invalidReads: clockInvalid, backwardReads: backward, originWallMs: firstWall },
    rows: rows.map(row => ({ ...row })),
    limits: { eventCount: 80, identityCount: 64, observationDeadlineMs: 15000, serializedBytes: 32768 },
    interpretation: "native_ack_is_not_visible; native_returned_is_not_physical_release; inputSeq_is_latest_observed_input; requestInputSeq_is_request_start_or_null; resource_counts_cover_shared_map_files; async_marker_order_unknown" });
  function seal(reason: "deadline" | "event_limit" | "byte_limit" | "hidden" | "unmount" | "manual") {
    armed = false;
    if (!active) { notify(); return; }
    active = false; sealed = true; stopReason = reason;
    if (timer !== undefined) cancel(timer);
    finalResources = resources(); readResources = null; nativePendingAtSeal = nativeOperations.size;
    refs.clear(); pathAssets.clear(); requestInputs.clear(); assetInputs.clear(); nativeOperations.clear();
    try { persist?.(snapshot()); } catch {}
    notify();
  }
  return {
    snapshot, seal,
    arm() { if (started) return false; armed = true; notify(); return true; },
    configureResources(reader: () => unknown) { if (!sealed) readResources = reader; },
    configureWriter(writer: (value: unknown) => void) { persist = writer; },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    marker() {
      const last = rows[rows.length - 1];
      return last ? `TW I${last.inputSeq} ${last.seq} ${last.phase} A${last.asset ?? "?"} ${last.relativeMs ?? "?"}ms${sealed ? " END" : ""}` : `TW ${armed ? "armed" : "idle"} ${options.action}`;
    },
    start(action: Action, request: string, imageKey: string | null, imagePath: string | null,
      facts: { metadataAvailable: boolean; fetching: boolean; imageReady: boolean; imagePending: boolean }) {
      if (sealed || !armed || action !== options.action) return;
      if (!started) {
        started = active = true; stopReason = "running";
        const stamp = clock(); firstWall = stamp.wallMs;
        timer = later(() => seal("deadline"), 15000);
      }
      if (rows.length >= 80) { overflow = true; seal("event_limit"); return; }
      inputSeq++;
      const asset = opaque("asset", imageKey), file = opaque("path", imagePath);
      if (asset !== null && file !== null) pathAssets.set(file, asset);
      append("action", { request: opaque("request", request), asset, ...resourceFields(),
        metadataAvailable: facts.metadataAvailable, fetching: facts.fetching,
        imageReady: facts.imageReady, imagePending: facts.imagePending });
    },
    metadataStart(identity: string, kind: "fine" | "preview" = "fine") {
      if (!active) return null;
      const attempt = ++requestSequence;
      requestInputs.set(attempt, inputSeq);
      append("metadata_start", { attempt, request: opaque("request", identity), kind, requestInputSeq: inputSeq }); return attempt;
    },
    metadataEnd(attempt: number | null, identity: string, imageKey: string | null, ok: boolean, kind: "fine" | "preview" = "fine") {
      if (!active) return;
      const origin = attempt === null ? null : requestInputs.get(attempt) ?? null;
      const asset = opaque("asset", imageKey);
      if (asset !== null && origin !== null) assetInputs.set(asset, origin);
      if (attempt !== null) requestInputs.delete(attempt);
      append(ok ? "metadata_returned" : "metadata_failed", {
        attempt, inherited: attempt === null, request: opaque("request", identity), asset, kind, requestInputSeq: origin,
      });
    },
    cacheAcquire(imageKey: string, state: "miss" | "queued" | "loading" | "ready") {
      if (active) { const asset = opaque("asset", imageKey); append("file_acquire", { asset, cache: state, requestInputSeq: requestInput(asset) }); }
    },
    downloadReturned(imageKey: string, statusCode: number) {
      if (active) { const asset = opaque("asset", imageKey); append("download_returned", { asset, ok: statusCode >= 200 && statusCode < 300, requestInputSeq: requestInput(asset) }); }
    },
    fileReady(imageKey: string, imagePath: string, admitted?: { bytes?: number; sha256?: string }) {
      if (!active) return;
      const asset = opaque("asset", imageKey), file = opaque("path", imagePath);
      if (asset !== null && file !== null) pathAssets.set(file, asset);
      const bytes = admitted?.bytes;
      const fileBytes = typeof bytes === "number" && Number.isSafeInteger(bytes) && bytes > 0 ? bytes : null;
      const fileSha256 = typeof admitted?.sha256 === "string" && /^[a-f0-9]{64}$/iu.test(admitted.sha256)
        ? admitted.sha256.toLowerCase() : null;
      append("file_ready", { asset, file, fileBytes, fileSha256, requestInputSeq: requestInput(asset) });
    },
    nativeOwner() { return opaque("native-owner", String(++ownerSequence)); },
    nativeDispatch(owner: number, slot: number, operation: "add" | "update" | "remove", imagePath: string | null) {
      if (!active) return null;
      const opToken = ++nativeSequence, file = opaque("path", imagePath), asset = file === null ? null : pathAssets.get(file) ?? null;
      nativeOperations.add(opToken);
      append("native_dispatch", { opToken, nativeOwner: owner, nativeSlot: slot, operation, file, asset, requestInputSeq: requestInput(asset) });
      return opToken;
    },
    nativeReturned(opToken: number | null | undefined, ok: boolean, late: boolean) {
      if (!active || opToken == null || !nativeOperations.delete(opToken)) return;
      append("native_returned", { opToken, ok, late, ...resourceFields() });
    },
    nativeTimeout(opToken: number | null | undefined) {
      if (active && opToken != null && nativeOperations.has(opToken)) append("native_timeout", { opToken });
    },
    nativeResult(mapId: string, imagePath: string | null, ok: boolean, current: boolean, phase: string, presentationUnknown = false) {
      if (!active) return;
      const file = opaque("path", imagePath);
      const asset = file === null ? null : pathAssets.get(file) ?? null;
      append(phase === "pending" ? "native_pending" : !ok ? "native_failure" : presentationUnknown ? "native_presentation_unknown" : "native_ack",
        { map: opaque("map", mapId), file, asset, requestInputSeq: requestInput(asset), current, cleanup: phase === "cleanup", presentationUnknown });
    },
  };
}
export const terrainWait = createTerrainWaitObserver({ action: "__TERRAIN_WAIT_ACTION__" as Action,
  sourceSha256: "__TERRAIN_WAIT_SOURCE_SHA256__", armRequired: true });

/** Same single-flight, sealed-byte retry responsibility as R17's manual export.
 * The transport is injected; importing this module never sends anything. */
export function createTerrainWaitExporter(read: () => ReturnType<typeof terrainWait.snapshot>,
  post: (body: string) => Promise<{ statusCode: number; data: unknown }>) {
  let body: string | null = null, flight: Promise<void> | null = null, status = "not_exported";
  return { status: () => status, export(): Promise<void> {
    if (flight) return flight;
    if (status === "stored") return Promise.resolve();
    if (body === null) {
      const value = read();
      if (!value.sealed || !value.started) { status = "not_sealed"; return Promise.resolve(); }
      body = JSON.stringify(value);
      if (body.length > 32768) { body = null; status = "too_large"; return Promise.resolve(); }
    }
    const immutable = body; status = "exporting";
    flight = Promise.resolve().then(() => post(immutable)).then(result => {
      status = result.statusCode === 200 && (result.data as { stored?: unknown } | null)?.stored === true ? "stored" : "unacknowledged";
    }, () => { status = "unacknowledged"; }).finally(() => { flight = null; });
    return flight;
  } };
}
