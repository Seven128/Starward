export interface PreferenceRuntimeStorage {
  kind: "sqlite" | "web-key-value";
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  close?(): Promise<void> | void;
}

export interface PreferenceBoundary {
  invoke(request: unknown): Promise<unknown>;
}

export interface PreferenceRuntimeRequest {
  outcome: "mobile-shell-and-preferences";
  actorId: string;
  operation: "preference.save" | "preference.activate" | "shell.location.set" | "shell.destination.set";
  idempotencyKey: string;
  payload: Record<string, unknown>;
}

export interface PreferenceRuntimeRecord {
  outcome: "mobile-shell-and-preferences";
  actorId: string;
  operation: PreferenceRuntimeRequest["operation"];
  entityId: string;
  idempotencyKey: string;
  inputDigest: string;
  stateVersion: number;
  result: Record<string, unknown>;
  committedAt: string;
}

interface PersistedPreferenceState {
  schemaVersion: "starward-preferences-runtime-v1";
  revision: number;
  records: Record<string, PreferenceRuntimeRecord>;
  idempotency: Record<string, string>;
}

interface RuntimeOptions {
  dataDir?: string;
  storage?: PreferenceRuntimeStorage;
  boundary?: PreferenceBoundary;
  releaseProfile?: {
    id: string;
    productionTrafficAllowed: boolean;
  };
  digest?: (value: string) => Promise<string> | string;
  now?: () => Date;
}

const STATE_KEY = "preferences-runtime-state";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function emptyState(): PersistedPreferenceState {
  return { schemaVersion: "starward-preferences-runtime-v1", revision: 0, records: {}, idempotency: {} };
}

function parseState(value: string | null): PersistedPreferenceState {
  if (!value) return emptyState();
  const parsed = JSON.parse(value) as Partial<PersistedPreferenceState>;
  if (parsed.schemaVersion !== "starward-preferences-runtime-v1" || !Number.isInteger(parsed.revision) || !isObject(parsed.records) || !isObject(parsed.idempotency)) {
    throw new Error("preference_runtime_state_invalid");
  }
  return parsed as PersistedPreferenceState;
}

async function createNodeSqliteStorage(dataDir: string): Promise<PreferenceRuntimeStorage> {
  const processRuntime = (globalThis as { process?: { getBuiltinModule?: (name: string) => any } }).process;
  const fileSystem = processRuntime?.getBuiltinModule?.("node:fs")?.promises;
  const sqlite = processRuntime?.getBuiltinModule?.("node:sqlite");
  if (!fileSystem || !sqlite?.DatabaseSync) throw new Error("preference_runtime_storage_required");
  await fileSystem.mkdir(dataDir, { recursive: true });
  const database = new sqlite.DatabaseSync(`${dataDir.replace(/[\\/]$/u, "")}/preferences.sqlite`);
  database.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS preference_runtime_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)");
  const readStatement = database.prepare("SELECT value FROM preference_runtime_state WHERE key = ?");
  const writeStatement = database.prepare("INSERT INTO preference_runtime_state(key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at");
  return {
    kind: "sqlite",
    async read(key) {
      const row = readStatement.get(key) as { value?: string } | undefined;
      return typeof row?.value === "string" ? row.value : null;
    },
    async write(key, value) {
      database.exec("BEGIN IMMEDIATE");
      try {
        writeStatement.run(key, value, new Date().toISOString());
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    close() {
      database.close();
    },
  };
}

async function defaultDigest(value: string): Promise<string> {
  const processRuntime = (globalThis as { process?: { getBuiltinModule?: (name: string) => any } }).process;
  const nodeCrypto = processRuntime?.getBuiltinModule?.("node:crypto");
  if (nodeCrypto?.createHash) return nodeCrypto.createHash("sha256").update(value).digest("hex");
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const bytes = await subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes), (item) => item.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("preference_runtime_digest_required");
}

function validateRequest(request: PreferenceRuntimeRequest): void {
  if (request.outcome !== "mobile-shell-and-preferences") throw new Error("preference_runtime_outcome_invalid");
  if (!request.actorId?.trim()) throw new Error("preference_runtime_actor_required");
  if (!request.idempotencyKey?.trim()) throw new Error("preference_runtime_idempotency_required");
  if (!["preference.save", "preference.activate", "shell.location.set", "shell.destination.set"].includes(request.operation)) throw new Error("preference_runtime_operation_invalid");
  if (!isObject(request.payload) || typeof request.payload.token !== "string" || !request.payload.token.trim()) throw new Error("preference_runtime_payload_invalid");
}

export async function createPreferencesRuntime(options: RuntimeOptions = {}) {
  if (options.releaseProfile && (options.releaseProfile.id !== "individual-personal-trial" || options.releaseProfile.productionTrafficAllowed !== false)) {
    throw new Error("preference_runtime_release_profile_invalid");
  }
  const storage = options.storage ?? await createNodeSqliteStorage(options.dataDir ?? "");
  const calculateDigest = options.digest ?? defaultDigest;
  const now = options.now ?? (() => new Date());
  let closed = false;
  let serial = Promise.resolve();

  async function loadState(): Promise<PersistedPreferenceState> {
    if (closed) throw new Error("preference_runtime_closed");
    return parseState(await storage.read(STATE_KEY));
  }

  async function execute(request: PreferenceRuntimeRequest) {
    const task = serial.then(async () => {
      validateRequest(request);
      const state = await loadState();
      const existingEntityId = state.idempotency[request.idempotencyKey];
      if (existingEntityId) {
        const existing = state.records[existingEntityId];
        if (!existing || existing.actorId !== request.actorId || existing.operation !== request.operation) throw new Error("preference_runtime_idempotency_conflict");
        return { ...existing, status: "replayed" as const, replayed: true, sideEffects: [] as Array<Record<string, unknown>> };
      }

      const input = { outcome: request.outcome, actorId: request.actorId, operation: request.operation, payload: request.payload };
      const inputDigest = await calculateDigest(canonicalJson(input));
      const entityId = `preference-${(await calculateDigest(request.idempotencyKey)).slice(0, 20)}`;
      const stateVersion = state.revision + 1;
      const committedAt = now().toISOString();
      const record: PreferenceRuntimeRecord = {
        outcome: request.outcome,
        actorId: request.actorId,
        operation: request.operation,
        entityId,
        idempotencyKey: request.idempotencyKey,
        inputDigest,
        stateVersion,
        result: { token: request.payload.token, payload: structuredClone(request.payload), committedAt },
        committedAt,
      };
      const next: PersistedPreferenceState = {
        ...state,
        revision: stateVersion,
        records: { ...state.records, [entityId]: record },
        idempotency: { ...state.idempotency, [request.idempotencyKey]: entityId },
      };
      await storage.write(STATE_KEY, JSON.stringify(next));
      return {
        ...record,
        status: "succeeded" as const,
        sideEffects: [{ kind: storage.kind, status: "committed", receiptId: `${entityId}:${stateVersion}` }],
      };
    });
    serial = task.then(() => undefined, () => undefined);
    return task;
  }

  async function read(query: { outcome: string; actorId: string; entityId: string }) {
    await serial;
    const state = await loadState();
    const record = state.records[query.entityId];
    if (!record || record.outcome !== query.outcome || record.actorId !== query.actorId) return { status: "not-found" as const, entityId: query.entityId };
    return { ...structuredClone(record), status: "succeeded" as const };
  }

  async function list(query: { actorId: string }) {
    await serial;
    const state = await loadState();
    return Object.values(state.records).filter((record) => record.actorId === query.actorId).map((record) => structuredClone(record));
  }

  async function close() {
    await serial;
    if (closed) return;
    closed = true;
    await storage.close?.();
  }

  return { execute, read, list, close };
}
