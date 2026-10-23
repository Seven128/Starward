import * as SQLite from "expo-sqlite";
import type { PreferenceRuntimeStorage } from "@starward/domain/preferences/runtime";

export async function createPreferenceStorage(): Promise<PreferenceRuntimeStorage> {
  const database = await SQLite.openDatabaseAsync("starward-preferences.db");
  await database.execAsync("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS preference_runtime_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL)");
  return {
    kind: "sqlite",
    async read(key) {
      const row = await database.getFirstAsync<{ value: string }>("SELECT value FROM preference_runtime_state WHERE key = ?", key);
      return row?.value ?? null;
    },
    async compareAndSwap(key, expected, value) {
      // The comparison is part of the write statement. A transaction around an
      // unconditional write would still lose updates from another connection.
      const result = expected === null
        ? await database.runAsync("INSERT INTO preference_runtime_state(key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO NOTHING", key, value, new Date().toISOString())
        : await database.runAsync("UPDATE preference_runtime_state SET value = ?, updated_at = ? WHERE key = ? AND value = ?", value, new Date().toISOString(), key, expected);
      return result.changes === 1;
    },
    close: () => database.closeAsync(),
  };
}
