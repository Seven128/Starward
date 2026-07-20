export interface BusinessBoundary { invoke(request: { kind: string; outcome: string; operation: string; payload: Record<string, unknown> }): Promise<unknown> }
export interface DurableBusinessRuntimeOptions { dataDir: string; boundary?: BusinessBoundary; releaseProfile?: { id: string; externalServicesBudgetCny?: number; productionTrafficAllowed: boolean } }

export interface SkyRuntimeStorage {
  kind: "sqlite" | "web-key-value";
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  close?(): Promise<void> | void;
}

interface MobileOptions extends Omit<DurableBusinessRuntimeOptions, "dataDir"> {
  storage: SkyRuntimeStorage;
  digest(value: string): Promise<string>;
}

type Request = { outcome: "sky-orientation-ar"; actorId: string; operation: "sky.resolve"; idempotencyKey: string; payload: Record<string, unknown> };
type RecordValue = { outcome: string; actorId: string; operation: string; entityId: string; idempotencyKey: string; inputDigest: string; stateVersion: number; result: Record<string, unknown>; committedAt: string };
type State = { revision: number; records: Record<string, RecordValue>; idempotency: Record<string, string> };

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
function canonical(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (object(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

async function createMobileRuntime(options: MobileOptions) {
  if (options.releaseProfile && (options.releaseProfile.id !== "individual-personal-trial" || options.releaseProfile.productionTrafficAllowed !== false || (options.releaseProfile.externalServicesBudgetCny ?? 0) > 200)) throw new Error("sky_release_profile_invalid");
  const boundary: BusinessBoundary | undefined = options.boundary;
  let serial = Promise.resolve();
  let closed = false;
  const load = async (): Promise<State> => JSON.parse(await options.storage.read("sky-runtime-v1") ?? '{"revision":0,"records":{},"idempotency":{}}') as State;
  const execute = (request: Request) => {
    const task = serial.then(async () => {
      if (closed) throw new Error("sky_runtime_closed");
      if (request.outcome !== "sky-orientation-ar" || request.operation !== "sky.resolve" || !request.actorId || !request.idempotencyKey || typeof request.payload.token !== "string" || !request.payload.token) throw new Error("sky_runtime_request_invalid");
      const state = await load();
      const inputDigest = await options.digest(canonical({ outcome: request.outcome, actorId: request.actorId, operation: request.operation, payload: request.payload }));
      const existingId = state.idempotency[request.idempotencyKey];
      if (existingId) {
        const existing = state.records[existingId];
        if (!existing || existing.inputDigest !== inputDigest) throw new Error("sky_runtime_idempotency_conflict");
        return { ...existing, status: "replayed" as const, replayed: true, sideEffects: [] };
      }
      if (!boundary) throw new Error("sky_runtime_boundary_required");
      const astronomy = await boundary.invoke({ kind: "astronomy", outcome: request.outcome, operation: request.operation, payload: request.payload });
      const orientation = await boundary.invoke({ kind: "orientation", outcome: request.outcome, operation: request.operation, payload: request.payload });
      const entityId = `sky-${(await options.digest(request.idempotencyKey)).slice(0, 20)}`;
      const committedAt = new Date().toISOString();
      const record: RecordValue = { outcome: request.outcome, actorId: request.actorId, operation: request.operation, entityId, idempotencyKey: request.idempotencyKey, inputDigest, stateVersion: state.revision + 1, result: { token: request.payload.token, payload: request.payload, astronomy, orientation, committedAt }, committedAt };
      await options.storage.write("sky-runtime-v1", JSON.stringify({ revision: record.stateVersion, records: { ...state.records, [entityId]: record }, idempotency: { ...state.idempotency, [request.idempotencyKey]: entityId } }));
      return { ...record, status: "succeeded" as const, sideEffects: [{ kind: options.storage.kind, status: "committed" }, { kind: "native-invocation", status: "committed" }] };
    });
    serial = task.then(() => undefined, () => undefined);
    return task;
  };
  const read = async (query: { outcome: string; actorId: string; entityId: string }) => { await serial; const value = (await load()).records[query.entityId]; return value?.outcome === query.outcome && value.actorId === query.actorId ? { ...value, status: "succeeded" as const } : { status: "not-found" as const, entityId: query.entityId }; };
  const list = async (query: { actorId: string }) => { await serial; return Object.values((await load()).records).filter((record) => record.actorId === query.actorId); };
  const close = async () => { await serial; closed = true; await options.storage.close?.(); };
  return { execute, read, list, close };
}

async function createNodeRuntime(options: DurableBusinessRuntimeOptions) {
  if (!options.dataDir?.trim()) throw new Error("sky_data_dir_required");
  const runtimeProcess = (globalThis as { process?: { getBuiltinModule?: (name: string) => any } }).process;
  const fs = runtimeProcess?.getBuiltinModule?.("node:fs");
  const path = runtimeProcess?.getBuiltinModule?.("node:path");
  const crypto = runtimeProcess?.getBuiltinModule?.("node:crypto");
  const sqlite = runtimeProcess?.getBuiltinModule?.("node:sqlite");
  if (!fs || !path || !crypto || !sqlite?.DatabaseSync) throw new Error("sky_node_runtime_unavailable");
  await fs.promises.mkdir(options.dataDir, { recursive: true });
  const database = new sqlite.DatabaseSync(path.join(options.dataDir, "sky-orientation-ar.sqlite"));
  database.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sky_runtime_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  const readStatement = database.prepare("SELECT value FROM sky_runtime_state WHERE key = ?");
  const writeStatement = database.prepare("INSERT INTO sky_runtime_state(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  const storage: SkyRuntimeStorage = {
    kind: "sqlite",
    async read(key) { return (readStatement.get(key) as { value?: string } | undefined)?.value ?? null; },
    async write(key, value) {
      database.exec("BEGIN IMMEDIATE");
      try { writeStatement.run(key, value); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; }
    },
    close() { database.close(); },
  };
  return createMobileRuntime({ storage, digest: async (value) => crypto.createHash("sha256").update(value).digest("hex") as string, boundary: options.boundary, releaseProfile: options.releaseProfile });
}

export async function createSkyRuntime(options: DurableBusinessRuntimeOptions | MobileOptions) {
  if ("storage" in options) return createMobileRuntime(options);
  return createNodeRuntime(options);
}
