export interface BusinessBoundary { invoke(request: { kind: string; outcome: string; operation: string; payload: Record<string, unknown> }): Promise<unknown> }
export interface DurableBusinessRequest { outcome: string; actorId: string; operation: string; idempotencyKey: string; payload: Record<string, unknown> }
export interface DurableBusinessRuntimeOptions { dataDir: string; boundary?: BusinessBoundary; releaseProfile?: { id: string; externalServicesBudgetCny?: number; productionTrafficAllowed: boolean } }
export interface DurableBusinessRuntimeConfig { outcome: string; operation: string; sideEffects: string[]; boundaries: string[] }

interface StoredRecord {
  outcome: string; actorId: string; operation: string; idempotencyKey: string; entityId: string;
  inputDigest: string; stateVersion: number; result: Record<string, unknown>; committedAt: string;
}

interface RuntimeResources {
  fs: any; path: any; dataDir: string; database: any; findIdempotency: any; findEntity: any; listActor: any; insertRecord: any; nextRevision: any;
}

const artifactKinds = new Set(["filesystem", "object-store", "artifact"]);
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (object(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function nodeModule(name: string): any {
  const runtime = (globalThis as { process?: { getBuiltinModule?: (id: string) => unknown } }).process;
  const module = runtime?.getBuiltinModule?.(name);
  if (!module) throw new Error(`runtime_node_module_unavailable:${name}`);
  return module;
}
const sha256 = (value: string): string => nodeModule("node:crypto").createHash("sha256").update(value).digest("hex");

function validateReleaseProfile(profile: DurableBusinessRuntimeOptions["releaseProfile"]): void {
  if (profile && (profile.id !== "individual-personal-trial" || profile.productionTrafficAllowed !== false || (profile.externalServicesBudgetCny ?? 0) > 200)) throw new Error("runtime_release_profile_invalid");
}
function validateRequest(config: DurableBusinessRuntimeConfig, request: DurableBusinessRequest): void {
  if (request.outcome !== config.outcome || request.operation !== config.operation) throw new Error("runtime_request_contract_invalid");
  if (!request.actorId?.trim() || !request.idempotencyKey?.trim()) throw new Error("runtime_request_identity_invalid");
  if (!object(request.payload) || typeof request.payload.token !== "string" || !request.payload.token.trim()) throw new Error("runtime_request_payload_invalid");
}

async function writeArtifacts(config: DurableBusinessRuntimeConfig, request: DurableBusinessRequest, entityId: string, committedAt: string, resources: RuntimeResources) {
  const effects: Array<Record<string, unknown>> = [];
  for (const kind of config.sideEffects.filter((item) => artifactKinds.has(item))) {
    const relativePath = resources.path.join("artifacts", `${entityId}-${kind}.json`);
    const absolutePath = resources.path.join(resources.dataDir, relativePath);
    await resources.fs.promises.mkdir(resources.path.dirname(absolutePath), { recursive: true });
    const bytes = JSON.stringify({ outcome: config.outcome, entityId, token: request.payload.token, kind, committedAt });
    await resources.fs.promises.writeFile(absolutePath, bytes, "utf8");
    effects.push({ kind, status: "committed", path: relativePath, sha256: sha256(bytes) });
  }
  return effects;
}

function createExecute(config: DurableBusinessRuntimeConfig, options: DurableBusinessRuntimeOptions, resources: RuntimeResources, closed: () => boolean) {
  return async (request: DurableBusinessRequest) => {
    if (closed()) throw new Error("runtime_closed");
    validateRequest(config, request);
    const inputDigest = sha256(canonicalJson({ outcome: request.outcome, actorId: request.actorId, operation: request.operation, payload: request.payload }));
    const existing = resources.findIdempotency.get(request.idempotencyKey) as { value?: string } | undefined;
    if (existing?.value) {
      const record = JSON.parse(existing.value) as StoredRecord;
      if (record.inputDigest !== inputDigest || record.actorId !== request.actorId) throw new Error("runtime_idempotency_conflict");
      return { ...record, status: "replayed" as const, replayed: true, sideEffects: [] as Array<Record<string, unknown>> };
    }
    const boundaryResults: Record<string, unknown> = {};
    for (const kind of config.boundaries) {
      if (!options.boundary) throw new Error(`runtime_boundary_required:${kind}`);
      boundaryResults[kind] = await options.boundary.invoke({ kind, outcome: config.outcome, operation: config.operation, payload: structuredClone(request.payload) });
    }
    const entityId = `${config.outcome}-${sha256(request.idempotencyKey).slice(0, 20)}`;
    const committedAt = new Date().toISOString();
    const artifactEffects = await writeArtifacts(config, request, entityId, committedAt, resources);
    resources.database.exec("BEGIN IMMEDIATE");
    let record: StoredRecord;
    try {
      const revision = resources.nextRevision.get() as { value: number };
      record = { outcome: config.outcome, actorId: request.actorId, operation: request.operation, idempotencyKey: request.idempotencyKey, entityId, inputDigest, stateVersion: revision.value, result: { token: request.payload.token, payload: structuredClone(request.payload), boundaryResults, committedAt }, committedAt };
      resources.insertRecord.run(entityId, request.actorId, request.idempotencyKey, JSON.stringify(record));
      resources.database.exec("COMMIT");
    } catch (error) {
      resources.database.exec("ROLLBACK");
      for (const effect of artifactEffects) await resources.fs.promises.rm(resources.path.join(options.dataDir, String(effect.path)), { force: true });
      throw error;
    }
    const durableEffects = config.sideEffects.filter((item) => !artifactKinds.has(item)).map((kind) => ({ kind, status: "committed", receiptId: `${entityId}:${record.stateVersion}:${kind}` }));
    return { ...record, status: "succeeded" as const, sideEffects: [...durableEffects, ...artifactEffects] };
  };
}

export async function createDurableBusinessRuntime(config: DurableBusinessRuntimeConfig, options: DurableBusinessRuntimeOptions) {
  validateReleaseProfile(options.releaseProfile);
  if (!options.dataDir?.trim()) throw new Error("runtime_data_dir_required");
  const fs = nodeModule("node:fs");
  const path = nodeModule("node:path");
  await fs.promises.mkdir(options.dataDir, { recursive: true });
  const database = new (nodeModule("node:sqlite").DatabaseSync)(path.join(options.dataDir, `${config.outcome}.sqlite`));
  database.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS business_records (entity_id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, idempotency_key TEXT UNIQUE NOT NULL, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS runtime_meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)");
  database.prepare("INSERT OR IGNORE INTO runtime_meta(key, value) VALUES ('revision', 0)").run();
  const resources: RuntimeResources = { fs, path, dataDir: options.dataDir, database, findIdempotency: database.prepare("SELECT value FROM business_records WHERE idempotency_key = ?"), findEntity: database.prepare("SELECT value FROM business_records WHERE entity_id = ? AND actor_id = ?"), listActor: database.prepare("SELECT value FROM business_records WHERE actor_id = ? ORDER BY rowid ASC"), insertRecord: database.prepare("INSERT INTO business_records(entity_id, actor_id, idempotency_key, value) VALUES (?, ?, ?, ?)"), nextRevision: database.prepare("UPDATE runtime_meta SET value = value + 1 WHERE key = 'revision' RETURNING value") };
  let isClosed = false;
  let serial = Promise.resolve();
  const runSerial = <T>(operation: () => Promise<T>) => { const task = serial.then(operation); serial = task.then(() => undefined, () => undefined); return task; };
  const executeNow = createExecute(config, options, resources, () => isClosed);
  const execute = (request: DurableBusinessRequest) => runSerial(() => executeNow(request));
  const read = (query: { outcome: string; actorId: string; entityId: string }) => runSerial(async () => { if (isClosed) throw new Error("runtime_closed"); const row = resources.findEntity.get(query.entityId, query.actorId) as { value?: string } | undefined; const record = row?.value ? JSON.parse(row.value) as StoredRecord : null; return record?.outcome === query.outcome ? { ...record, status: "succeeded" as const } : { status: "not-found" as const, entityId: query.entityId }; });
  const list = (query: { actorId: string }) => runSerial(async () => { if (isClosed) throw new Error("runtime_closed"); return (resources.listActor.all(query.actorId) as Array<{ value: string }>).map((row) => JSON.parse(row.value) as StoredRecord); });
  const close = () => runSerial(async () => { if (!isClosed) { isClosed = true; database.close(); } });
  return { execute, read, list, close };
}
