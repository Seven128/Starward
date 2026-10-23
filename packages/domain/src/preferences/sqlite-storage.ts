import type { PreferenceRuntimeStorage } from "./runtime-contract";

/** Node-only carrier; mobile supplies its Expo/Web adapter at the same CAS port. */
export async function createNodeSqliteStorage(dataDir: string): Promise<PreferenceRuntimeStorage> {
  const processRuntime = (globalThis as { process?: { getBuiltinModule?: (name: string) => any } }).process;
  const fs = processRuntime?.getBuiltinModule?.("node:fs")?.promises;
  const sqlite = processRuntime?.getBuiltinModule?.("node:sqlite");
  if (!dataDir || !fs || !sqlite?.DatabaseSync) throw new Error("preference_runtime_storage_required");
  await fs.mkdir(dataDir, { recursive: true });
  const db = new sqlite.DatabaseSync(`${dataDir.replace(/[\\/]$/u, "")}/preferences.sqlite`);
  db.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS preference_runtime_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)");
  const read = db.prepare("SELECT value FROM preference_runtime_state WHERE key = ?");
  const insert = db.prepare("INSERT INTO preference_runtime_state(key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO NOTHING");
  const update = db.prepare("UPDATE preference_runtime_state SET value=?, updated_at=? WHERE key=? AND value=?");
  return {
    kind: "sqlite",
    async read(key) { return (read.get(key) as { value: string } | undefined)?.value ?? null; },
    async compareAndSwap(key, expected, value) {
      // Each conditional statement is one SQLite transaction across connections.
      const at = new Date().toISOString();
      const result = expected === null ? insert.run(key, value, at) : update.run(value, at, key, expected);
      return Number(result.changes) === 1;
    },
    close() { db.close(); },
  };
}
