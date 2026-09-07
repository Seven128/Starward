type Storage = { getStorageSync(key: string): unknown; setStorageSync(key: string, value: unknown): void; removeStorageSync(key: string): void };
type Entry = { identity: string; key: string };
const prefix = "starward.import-save.v1:";
const storageKey = (owner: string) => prefix + JSON.stringify([owner]);
export const importSaveBelongsTo = (key: string, owner: string) => key === storageKey(owner);
export function clearImportSaveRecovery(storage: Storage, owner: string) {
  storage.removeStorageSync(storageKey(owner));
}
export class ImportSaveRecoveryError extends Error {}

function identity(kind: "create" | "update", id: string, input: object) {
  const fields = kind === "create" ? ["platform", "originalUrl", "rightsConfirmed"] :
    ["expectedRevision", "rightsConfirmed", "stage", "title", "body", "sourceNote", "visibility", "spotId", "createProposal"];
  const values = fields.map(field => {
    const value = (input as Record<string, unknown>)[field];
    if (value !== undefined && value !== null && !["string", "number", "boolean"].includes(typeof value)) throw new Error("invalid import field");
    return [field, value === undefined ? [] : [value]];
  });
  return JSON.stringify([kind, id, values]);
}
function read(storage: Storage, key: string): Entry[] {
  const raw = storage.getStorageSync(key);
  if (raw === undefined || raw === null || raw === "") return [];
  const value = raw as { schema: number; entries: Entry[] };
  if (!value || value.schema !== 1 || !Array.isArray(value.entries) || value.entries.length > 32 ||
    value.entries.some(entry => !entry || typeof entry.identity !== "string" || entry.identity.length > 100_000 ||
      typeof entry.key !== "string" || !/^[a-zA-Z0-9:_-]{1,180}$/.test(entry.key))) throw new Error("invalid recovery data");
  return value.entries;
}

/** Save only whitelisted editable fields and their request identity, scoped to the owner. */
export function createImportSaveRetry(storage: Storage, makeKey: () => string, definitive: (error: unknown) => boolean) {
  return async <T>(owner: string, kind: "create" | "update", id: string, input: object, operation: (key: string) => Promise<T>): Promise<T> => {
    const localKey = storageKey(owner);
    let entry: Entry;
    try {
      const match = identity(kind, id, input);
      if (match.length > 100_000) throw new Error("oversized recovery data");
      const entries = read(storage, localKey);
      const existing = entries.find(item => item.identity === match);
      if (!existing && entries.length >= 32) throw new Error("too many pending saves");
      entry = existing ?? { identity: match, key: makeKey() };
      if (!existing) entries.push(entry);
      storage.setStorageSync(localKey, { schema: 1, entries });
    } catch {
      throw new ImportSaveRecoveryError("无法保留导入重试信息，尚未发出请求。请检查本机存储后重试。");
    }
    const release = () => {
      try {
        const remaining = read(storage, localKey).filter(item => item.key !== entry.key);
        if (remaining.length) storage.setStorageSync(localKey, { schema: 1, entries: remaining });
        else storage.removeStorageSync(localKey);
      } catch { /* A confirmed server receipt remains valid even if local cleanup fails. */ }
    };
    let result: T;
    try { result = await operation(entry.key); }
    catch (error) { if (definitive(error)) release(); throw error; }
    release();
    return result;
  };
}
