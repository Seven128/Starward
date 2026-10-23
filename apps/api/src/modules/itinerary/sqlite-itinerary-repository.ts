import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ItineraryDraft, ItineraryDraftLibrary, ItineraryDraftResult } from "../../../../../packages/domain/src/itinerary/draft";
import { ItineraryCommandError } from "./draft-command";

interface BodyRow { body: string }
export interface ItineraryDraftRepository {
  read(actorId: string, id: string, revision?: number): ItineraryDraft | null;
  list(actorId: string, cursor?: number): ItineraryDraftLibrary;
  commit(input: { actorId: string; key: string; digest: string; id: string }, mutate: (current: ItineraryDraft | null) => ItineraryDraft): ItineraryDraftResult;
  close(): void;
}

/** Node-only storage. Domain effects, history and replay receipts share one transaction. */
export class SqliteItineraryRepository implements ItineraryDraftRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.database = new DatabaseSync(path);
    this.database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS itinerary_draft_schema (version INTEGER NOT NULL);
      INSERT INTO itinerary_draft_schema(version) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM itinerary_draft_schema);
      CREATE TABLE IF NOT EXISTS itinerary_drafts (
        id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, revision INTEGER NOT NULL, body TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS itinerary_drafts_actor ON itinerary_drafts(actor_id);
      CREATE TABLE IF NOT EXISTS itinerary_draft_versions (
        id TEXT NOT NULL, actor_id TEXT NOT NULL, revision INTEGER NOT NULL, body TEXT NOT NULL,
        PRIMARY KEY(id, revision), FOREIGN KEY(id) REFERENCES itinerary_drafts(id)
      );
      CREATE TABLE IF NOT EXISTS itinerary_draft_receipts (
        actor_id TEXT NOT NULL, command_key TEXT NOT NULL, input_digest TEXT NOT NULL, body TEXT NOT NULL,
        PRIMARY KEY(actor_id, command_key)
      );`);
    const version = this.database.prepare("SELECT version FROM itinerary_draft_schema").all() as Array<{ version: number }>;
    if (version.length !== 1 || version[0].version !== 1) { this.database.close(); throw new Error("itinerary_storage_schema_unsupported"); }
    // Historical business_records/runtime_meta are deliberately retained. Their
    // command tokens contain no authoritative plan and cannot seed a real draft.
  }
  read(actorId: string, id: string, revision?: number): ItineraryDraft | null {
    const row = (revision === undefined
      ? this.database.prepare("SELECT body FROM itinerary_drafts WHERE id = ? AND actor_id = ?").get(id, actorId)
      : this.database.prepare("SELECT body FROM itinerary_draft_versions WHERE id = ? AND actor_id = ? AND revision = ?").get(id, actorId, revision)) as BodyRow | undefined;
    return row ? JSON.parse(row.body) as ItineraryDraft : null;
  }
  list(actorId: string, cursor = Number.MAX_SAFE_INTEGER): ItineraryDraftLibrary {
    const rows = this.database.prepare("SELECT rowid AS cursor, id, revision, json_extract(body, '$.title') AS title, json_extract(body, '$.updatedAt') AS updatedAt FROM itinerary_drafts WHERE actor_id = ? AND rowid < ? ORDER BY rowid DESC LIMIT 51").all(actorId, cursor) as Array<{ cursor: number; id: string; title: string; revision: number; updatedAt: string }>;
    const page = rows.slice(0, 50);
    return { schemaVersion: "starward-itinerary-v2", items: page.map(({ cursor: _cursor, ...item }) => item), nextCursor: rows.length > 50 ? String(page.at(-1)!.cursor) : null, scope: "local-owner-poc" };
  }
  commit(input: { actorId: string; key: string; digest: string; id: string }, mutate: (current: ItineraryDraft | null) => ItineraryDraft): ItineraryDraftResult {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const receipt = this.database.prepare("SELECT input_digest, body FROM itinerary_draft_receipts WHERE actor_id = ? AND command_key = ?").get(input.actorId, input.key) as (BodyRow & { input_digest: string }) | undefined;
      if (receipt) {
        if (receipt.input_digest !== input.digest) throw new ItineraryCommandError("itinerary_idempotency_conflict", 409);
        this.database.exec("COMMIT");
        return { ...JSON.parse(receipt.body) as ItineraryDraftResult, replayed: true };
      }
      const current = this.read(input.actorId, input.id);
      const next = mutate(current);
      if (next.id !== input.id || next.ownerId !== input.actorId) throw new Error("itinerary_storage_owner_mismatch");
      const body = JSON.stringify(next);
      if (!current) this.database.prepare("INSERT INTO itinerary_drafts(id, actor_id, revision, body) VALUES (?, ?, ?, ?)").run(next.id, input.actorId, next.revision, body);
      else {
        const result = this.database.prepare("UPDATE itinerary_drafts SET revision = ?, body = ? WHERE id = ? AND actor_id = ? AND revision = ?").run(next.revision, body, next.id, input.actorId, current.revision);
        if (result.changes !== 1) throw new ItineraryCommandError("itinerary_revision_conflict", 409);
      }
      this.database.prepare("INSERT INTO itinerary_draft_versions(id, actor_id, revision, body) VALUES (?, ?, ?, ?)").run(next.id, input.actorId, next.revision, body);
      const result: ItineraryDraftResult = { schemaVersion: "starward-itinerary-v2", status: "saved", replayed: false, itinerary: next, receipt: { idempotencyKey: input.key, itineraryId: next.id, revision: next.revision, committedAt: next.updatedAt } };
      this.database.prepare("INSERT INTO itinerary_draft_receipts(actor_id, command_key, input_digest, body) VALUES (?, ?, ?, ?)").run(input.actorId, input.key, input.digest, JSON.stringify(result));
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      // A failed/unknown COMMIT must not become a success receipt or destructive
      // compensation. The exact command can be retried against durable state.
      try { this.database.exec("ROLLBACK"); } catch { /* Preserve the original failure. */ }
      throw error;
    }
  }
  close() { this.database.close(); }
}
