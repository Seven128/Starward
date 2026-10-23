import type { PreferenceBoundary, PreferenceRuntimeInput, PreferenceRuntimeRecord, PreferenceRuntimeRequest, PreferenceRuntimeStorage } from "./runtime-contract";
import { canonicalJson, defaultDigest } from "./runtime-json";
import { applyRecord, parseState, projectionOf, STATE_KEY, validateEnvelope, validatePayload, type PreferenceState, type RetainedReceipt } from "./runtime-state";
import { createNodeSqliteStorage } from "./sqlite-storage";
export type { PreferenceBoundary, PreferenceDestination, PreferenceLocation, PreferenceProjection, PreferenceRuntimeInput, PreferenceRuntimeRecord, PreferenceRuntimeRequest, PreferenceRuntimeStorage } from "./runtime-contract";
export { restorePreferenceLocation } from "./runtime-state";

interface RuntimeOptions {
  dataDir?: string;
  storage?: PreferenceRuntimeStorage;
  boundary?: PreferenceBoundary;
  releaseProfile?: { id: string; productionTrafficAllowed: boolean };
  digest?: (value: string) => Promise<string> | string;
  now?: () => Date;
}

export async function createPreferencesRuntime(options: RuntimeOptions = {}) {
  if (options.releaseProfile && (options.releaseProfile.id !== "individual-personal-trial" || options.releaseProfile.productionTrafficAllowed !== false)) {
    throw new Error("preference_runtime_release_profile_invalid");
  }
  const storage = options.storage ?? await createNodeSqliteStorage(options.dataDir ?? "");
  if (typeof storage.compareAndSwap !== "function") throw new Error("preference_runtime_atomic_storage_required");
  const digest = options.digest ?? defaultDigest;
  const now = options.now ?? (() => new Date());
  let closed = false;
  let serial: Promise<unknown> = Promise.resolve();

  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const task = serial.then(() => { if (closed) throw new Error("preference_runtime_closed"); return work(); });
    serial = task.then(() => undefined, () => undefined);
    return task;
  }

  async function loadState(): Promise<{ state: PreferenceState; raw: string | null }> {
    const raw = await storage.read(STATE_KEY);
    const parsed = parseState(raw);
    if (!parsed.migration) return { state: parsed.state, raw };
    // Exact original bytes are recovery material, never a second current state.
    const archiveKey = STATE_KEY + ":legacy:" + await digest(raw!);
    let archived: string | null;
    try {
      await storage.compareAndSwap(archiveKey, null, raw!);
      archived = await storage.read(archiveKey);
    } catch {
      try { archived = await storage.read(archiveKey); } catch { throw new Error("preference_runtime_commit_unknown"); }
    }
    if (archived !== raw) throw new Error("preference_runtime_archive_conflict");
    const nextRaw = JSON.stringify(parsed.state);
    let changed: boolean;
    try { changed = await storage.compareAndSwap(STATE_KEY, raw, nextRaw); }
    catch {
      const current = await storage.read(STATE_KEY).catch(() => { throw new Error("preference_runtime_commit_unknown"); });
      if (current === raw) throw new Error("preference_runtime_commit_unknown");
      const recovered = parseState(current);
      if (recovered.migration || recovered.state.revision < parsed.state.revision) throw new Error("preference_runtime_commit_unknown");
      return { state: recovered.state, raw: current };
    }
    if (changed) return { state: parsed.state, raw: nextRaw };
    const current = await storage.read(STATE_KEY);
    const recovered = parseState(current);
    if (recovered.migration || recovered.state.revision < parsed.state.revision) throw new Error("preference_runtime_conflict");
    return { state: recovered.state, raw: current };
  }

  async function prepare(input: PreferenceRuntimeInput): Promise<PreferenceRuntimeRequest> {
    validateEnvelope(input);
    validatePayload(input.operation, input.payload);
    // Snapshot before awaiting storage; mutation cannot change this intent.
    const copy = JSON.parse(canonicalJson(input)) as PreferenceRuntimeInput;
    return enqueue(async () => {
      const { state } = await loadState();
      return { ...copy, baseRevision: state.revision, idempotencyKey: "preferences-v2:" + state.revision + ":" + copy.idempotencyKey };
    });
  }

  const findReceipt = (state: PreferenceState, key: string) => state.actors.flatMap(a => a.receipts).find(r => r.record.idempotencyKey === key);
  const inputOf = (request: PreferenceRuntimeRequest) => ({ outcome: request.outcome, actorId: request.actorId, operation: request.operation, payload: request.payload });
  async function replay(receipt: RetainedReceipt, request: PreferenceRuntimeRequest, state: PreferenceState) {
    const record = receipt.record;
    // Preserve legacy identity; serialized payload may have lost undefined fields.
    if ((!receipt.legacy && (!Number.isSafeInteger(request.baseRevision)
      || request.baseRevision !== record.stateVersion - 1
      || !request.idempotencyKey.startsWith("preferences-v2:" + request.baseRevision + ":")))
      || record.actorId !== request.actorId || record.operation !== request.operation
      || record.inputDigest !== await digest(canonicalJson(inputOf(request), receipt.legacy))) throw new Error("preference_runtime_idempotency_conflict");
    return { ...structuredClone(record), status: "replayed" as const, replayed: true,
      projection: projectionOf(state, request.actorId), sideEffects: [] as Array<Record<string, unknown>> };
  }

  async function execute(input: PreferenceRuntimeRequest) {
    validateEnvelope(input);
    canonicalJson(input, input.baseRevision === undefined);
    const request = structuredClone(input);
    return enqueue(async () => {
      const { state, raw } = await loadState();
      const retained = findReceipt(state, request.idempotencyKey);
      if (retained) return replay(retained, request, state);
      const prefix = "preferences-v2:" + request.baseRevision + ":";
      if (!Number.isSafeInteger(request.baseRevision) || request.baseRevision !== state.revision
        || !request.idempotencyKey.startsWith(prefix) || !request.idempotencyKey.slice(prefix.length).trim()) throw new Error("preference_runtime_stale_command");
      validatePayload(request.operation, request.payload);
      if (state.revision >= Number.MAX_SAFE_INTEGER) throw new Error("preference_runtime_revision_exhausted");
      const inputDigest = await digest(canonicalJson(inputOf(request)));
      const entityId = "preference-" + await digest(request.idempotencyKey);
      const committedAt = now().toISOString();
      const record: PreferenceRuntimeRecord = {
        outcome: request.outcome, actorId: request.actorId, operation: request.operation,
        idempotencyKey: request.idempotencyKey, entityId, inputDigest, stateVersion: state.revision + 1, committedAt,
        result: { token: request.payload.token, payload: structuredClone(request.payload), committedAt },
      };
      const next = structuredClone(state);
      applyRecord(next, record);
      next.revision = record.stateVersion;
      let changed: boolean;
      try { changed = await storage.compareAndSwap(STATE_KEY, raw, JSON.stringify(next)); }
      catch {
        // A thrown reply can follow commit. Do not silently rebase an unknown write.
        let recovered: PreferenceState;
        try { recovered = parseState(await storage.read(STATE_KEY)).state; }
        catch { throw new Error("preference_runtime_commit_unknown"); }
        const receipt = findReceipt(recovered, request.idempotencyKey);
        if (receipt) return replay(receipt, request, recovered);
        throw new Error("preference_runtime_commit_unknown");
      }
      if (!changed) {
        const recovered = (await loadState()).state;
        const receipt = findReceipt(recovered, request.idempotencyKey);
        if (receipt) return replay(receipt, request, recovered);
        throw new Error("preference_runtime_conflict");
      }
      return { ...structuredClone(record), status: "succeeded" as const, replayed: false,
        projection: projectionOf(next, request.actorId),
        sideEffects: [{ kind: storage.kind, status: "committed", receiptId: entityId + ":" + record.stateVersion }] as Array<Record<string, unknown>> };
    });
  }

  async function getProjection(query: { actorId: string }) {
    return enqueue(async () => projectionOf((await loadState()).state, query.actorId));
  }
  async function read(query: { outcome: string; actorId: string; entityId: string }) {
    return enqueue(async () => {
      const { state } = await loadState();
      const record = state.actors.find(a => a.actorId === query.actorId)?.receipts.find(r => r.record.entityId === query.entityId)?.record;
      if (!record || record.outcome !== query.outcome) return { status: "not-found" as const, entityId: query.entityId };
      return { ...structuredClone(record), projection: projectionOf(state, query.actorId), status: "succeeded" as const };
    });
  }
  async function list(query: { actorId: string }) {
    return enqueue(async () => structuredClone((await loadState()).state.actors.find(a => a.actorId === query.actorId)?.receipts.map(r => r.record) ?? []));
  }
  async function close() {
    await serial;
    if (closed) return;
    closed = true;
    await storage.close?.();
  }
  return { prepare, execute, getProjection, read, list, close };
}
