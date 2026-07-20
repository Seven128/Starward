import { Directory, File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import type { ObservationPack, QueueItem } from "@starward/domain/offline";

const DB_NAME = "starward-offline.db";
const PACK_KEY_PREFIX = "starward.pack-key.";

export async function openOfflineDatabase() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS offline_pack_manifest (
      id TEXT PRIMARY KEY NOT NULL, revision INTEGER NOT NULL, state TEXT NOT NULL,
      manifest_json TEXT NOT NULL, activated_at TEXT, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS offline_sync_queue (
      id TEXT PRIMARY KEY NOT NULL, idempotency_key TEXT UNIQUE NOT NULL, revision INTEGER NOT NULL,
      depends_on_json TEXT NOT NULL, state TEXT NOT NULL, payload_ref TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS offline_sync_state_created ON offline_sync_queue(state, created_at);`);
  return db;
}

export async function savePackManifest(pack: ObservationPack, state: "staging" | "active" | "rollback") {
  const db = await openOfflineDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO offline_pack_manifest(id, revision, state, manifest_json, activated_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, state=excluded.state, manifest_json=excluded.manifest_json, activated_at=excluded.activated_at, updated_at=excluded.updated_at`,
    pack.id, pack.revision, state, JSON.stringify(pack), state === "active" ? now : null, now,
  );
}

export async function activatePackFiles(packId: string, revision: number, manifestJson: string) {
  const root = new Directory(Paths.document, "offline-packs", packId);
  root.create({ idempotent: true, intermediates: true });
  const staging = new File(root, `manifest-${revision}.staging.json`);
  staging.create({ overwrite: true, intermediates: true });
  staging.write(manifestJson);
  const active = new File(root, "manifest.active.json");
  const rollback = new File(root, "manifest.rollback.json");
  if (rollback.exists) rollback.delete();
  if (active.exists) await active.move(rollback);
  await staging.move(active);
  return active.uri;
}

export async function enqueueOfflineWrite(item: QueueItem, encryptedPayloadReference: string) {
  const db = await openOfflineDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO offline_sync_queue(id, idempotency_key, revision, depends_on_json, state, payload_ref, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(idempotency_key) DO UPDATE SET state=excluded.state, updated_at=excluded.updated_at`,
    item.id, item.idempotencyKey, item.revision, JSON.stringify(item.dependsOn), item.state, encryptedPayloadReference, item.createdAt, now,
  );
}

export async function loadReplayQueue() {
  const db = await openOfflineDatabase();
  const rows = await db.getAllAsync<{ id: string; idempotency_key: string; revision: number; depends_on_json: string; state: QueueItem["state"]; created_at: string }>(
    "SELECT id, idempotency_key, revision, depends_on_json, state, created_at FROM offline_sync_queue WHERE state != 'published' ORDER BY created_at",
  );
  return rows.map((row) => ({ id: row.id, idempotencyKey: row.idempotency_key, revision: row.revision, dependsOn: JSON.parse(row.depends_on_json) as string[], state: row.state, createdAt: row.created_at }));
}

export async function provisionPackEncryptionKey(packId: string) {
  const keyName = `${PACK_KEY_PREFIX}${packId}`;
  const existing = await SecureStore.getItemAsync(keyName);
  if (existing) return existing;
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  const key = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  await SecureStore.setItemAsync(keyName, key, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return key;
}

export async function revokePackEncryptionKey(packId: string) {
  await SecureStore.deleteItemAsync(`${PACK_KEY_PREFIX}${packId}`);
}
