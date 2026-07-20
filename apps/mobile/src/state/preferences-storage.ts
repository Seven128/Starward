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
    async write(key, value) {
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.runAsync("INSERT INTO preference_runtime_state(key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at", key, value, new Date().toISOString());
      });
    },
    close: () => database.closeAsync(),
  };
}
