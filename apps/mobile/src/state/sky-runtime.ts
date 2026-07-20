import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";
import { createSkyRuntime, type SkyRuntimeStorage } from "../features/sky/runtime";

let instance: Promise<Awaited<ReturnType<typeof createSkyRuntime>>> | null = null;
async function runtime() {
  instance ??= (async () => {
    const database = await SQLite.openDatabaseAsync("starward-sky.db");
    await database.execAsync("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sky_runtime_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)");
    const storage: SkyRuntimeStorage = {
      kind: "sqlite",
      async read(key) { return (await database.getFirstAsync<{ value: string }>("SELECT value FROM sky_runtime_state WHERE key = ?", key))?.value ?? null; },
      async write(key, value) { await database.withExclusiveTransactionAsync(async (tx) => { await tx.runAsync("INSERT INTO sky_runtime_state(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", key, value); }); },
    };
    return createSkyRuntime({ storage, digest: (value) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value), releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false }, boundary: { async invoke(request) { return { status: "observed", kind: request.kind, token: request.payload.token }; } } });
  })();
  return instance!;
}

export async function persistSkyResolution(payload: Record<string, unknown> & { token: string; at: string; algorithmVersion: string }) {
  return (await runtime()).execute({ outcome: "sky-orientation-ar", actorId: "personal-trial-owner", operation: "sky.resolve", idempotencyKey: `sky:${payload.at}:${payload.algorithmVersion}:${payload.token}`, payload });
}
