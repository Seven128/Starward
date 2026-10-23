import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "http-test-key" }));
import { createItineraryClient } from "../../../mobile/src/data/itinerary-client";
import { buildApi } from "../server";
import { createItineraryRuntime } from "../modules/itinerary/runtime";
import { resolveLocalItineraryOwner, type ItineraryActorResolver } from "../modules/itinerary/itinerary-routes";

const apps: Awaited<ReturnType<typeof buildApi>>[] = [];
const directories: string[] = [];
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
  for (const directory of directories.splice(0)) {
    const absolute = resolve(directory);
    if (dirname(absolute) !== resolve(tmpdir()) || !basename(absolute).startsWith("starward-itinerary-")) throw new Error("unexpected_test_directory");
    rmSync(absolute, { recursive: true, force: true });
  }
});
function directory() { const path = mkdtempSync(join(tmpdir(), "starward-itinerary-")); directories.push(path); return path; }
async function server(dataDir: string, actor: ItineraryActorResolver = resolveLocalItineraryOwner) {
  const runtime = await createItineraryRuntime({ dataDir });
  const app = await buildApi({ allowedOrigins: ["http://localhost:8081"], nightReports: { create: async () => { throw new Error("not_used"); } }, spots: { getDetail: async () => { throw new Error("not_used"); } }, resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }), itineraries: runtime.service, resolveItineraryActor: actor });
  app.addHook("onClose", runtime.close); apps.push(app);
  const url = await app.listen({ host: "127.0.0.1", port: 0 });
  return { app, url, get: async (path: string) => { const response = await fetch(`${url}${path}`); return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") }; }, post: async (payload: unknown, headers?: Record<string, string>) => { const response = await fetch(`${url}/v2/itineraries/commands`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(payload) }); return { status: response.status, body: await response.json() }; } };
}
function create(key = "create-a", title = "第一份真实输入草稿", origin = "广州", date = "2026-11-01") { return { command: "create-draft", idempotencyKey: key, input: { title, timezone: "Asia/Shanghai", inputs: { date, origin, people: 2, transport: "drive", target: "moon", userType: "family", latestReturnLocal: null, overnight: false, collaborative: false } } }; }
function pendingStorage() { const values = new Map<string, string>(); return { getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } }; }

describe("real itinerary HTTP persistence", () => {
  it("rejects a non-string transport before storing a draft, version or receipt", async () => {
    const path = directory(), host = await server(path), command = create("transport-type");
    expect(await host.post({ ...command, input: { ...command.input, inputs: { ...command.input.inputs, transport: ["drive"] } } })).toMatchObject({ status: 400, body: { code: "invalid_itinerary_input", outcome: "rejected" } });
    expect((await host.get("/v2/itineraries")).body.items).toEqual([]);
    const db = new DatabaseSync(join(path, "itinerary-and-collaboration.sqlite"));
    try {
      for (const table of ["itinerary_drafts", "itinerary_draft_versions", "itinerary_draft_receipts"]) expect(db.prepare(`SELECT count(*) AS count FROM ${table}`).get()).toMatchObject({ count: 0 });
    } finally { db.close(); }
    expect((await host.post(command)).body.itinerary.inputs.transport).toBe("drive");
  });
  it("rejects a non-string stage kind without changing the current draft or consuming the command key", async () => {
    const path = directory(), host = await server(path), saved = (await host.post(create())).body.itinerary;
    const stage = { id: "observing", kind: "observation", startsAt: "2026-11-01T13:00:00Z", endsAt: "2026-11-01T14:00:00Z" };
    const command = { command: "patch-draft", idempotencyKey: "stage-kind-type", itineraryId: saved.id, baseRevision: 1, patch: { stages: [stage] } };
    expect(await host.post({ ...command, patch: { stages: [{ ...stage, kind: ["observation"] }] } })).toMatchObject({ status: 400, body: { code: "invalid_itinerary_stages", outcome: "rejected" } });
    expect((await host.get(`/v2/itineraries/${saved.id}`)).body.itinerary).toEqual(saved);
    const db = new DatabaseSync(join(path, "itinerary-and-collaboration.sqlite"));
    try {
      for (const table of ["itinerary_drafts", "itinerary_draft_versions", "itinerary_draft_receipts"]) expect(db.prepare(`SELECT count(*) AS count FROM ${table}`).get()).toMatchObject({ count: 1 });
    } finally { db.close(); }
    expect((await host.post(command)).body.itinerary.stages).toEqual([{ ...stage, startsAt: "2026-11-01T13:00:00.000Z", endsAt: "2026-11-01T14:00:00.000Z" }]);
  });
  it("lets the real client correct an oversized first command after a proven pre-execution rejection", async () => {
    const path = directory(); const host = await server(path); const storage = pendingStorage(); let next = 0;
    const client = createItineraryClient({ baseUrl: host.url, storage, newKey: () => `body-limit-${++next}` });
    const command = { command: "create-draft" as const, input: { ...create().input, inputs: { ...create().input.inputs, transport: "drive" as const, collaborative: false as const } } };
    const oversized = { ...command, input: { ...command.input, title: "x".repeat(66_000) } };
    await expect(client.command(oversized)).rejects.toMatchObject({ code: "itinerary_request_body_too_large", rejected: true });
    expect(await client.pending()).toBeNull();
    const db = new DatabaseSync(join(path, "itinerary-and-collaboration.sqlite"));
    try {
      for (const table of ["itinerary_drafts", "itinerary_draft_versions", "itinerary_draft_receipts"]) expect(db.prepare(`SELECT count(*) AS count FROM ${table}`).get()).toMatchObject({ count: 0 });
      const corrected = await client.command(command);
      expect(corrected.title).toBe(command.input.title); expect(corrected.revision).toBe(1);
      expect((await client.get(corrected.id))).toEqual(corrected); expect(await client.pending()).toBeNull();
      for (const table of ["itinerary_drafts", "itinerary_draft_versions", "itinerary_draft_receipts"]) expect(db.prepare(`SELECT count(*) AS count FROM ${table}`).get()).toMatchObject({ count: 1 });
      expect(db.prepare("SELECT command_key FROM itinerary_draft_receipts").get()).toMatchObject({ command_key: "body-limit-2" });
      const legacy = await fetch(`${host.url}/v1/itineraries/commands`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(oversized) });
      expect(legacy.status).toBe(413); expect(await legacy.json()).toMatchObject({ code: "itinerary_request_body_too_large", outcome: "rejected" });
    } finally { db.close(); }
  });
  it("keeps the original committed attempt through lost reply, actual authority denial and failed readback", async () => {
    const path = directory(); let authorized = true; let loseReply = true; let denyReadback = false; const posts: string[] = [];
    const host = await server(path, async () => authorized ? { id: "local-owner", scope: "local-owner-poc" } : null);
    const storage = pendingStorage();
    const fetcher = (async (url, init) => {
      const response = await fetch(url, init);
      if (init?.method === "POST") {
        posts.push(String(init.body));
        if (loseReply) { loseReply = false; await response.arrayBuffer(); throw new Error("lost_real_committed_reply"); }
        if (denyReadback) authorized = false;
      }
      return response;
    }) as typeof fetch;
    const options = { baseUrl: host.url, storage, fetcher, newKey: () => "unknown-real-commit" };
    const first = createItineraryClient(options);
    const input = { command: "create-draft" as const, input: { ...create().input, inputs: { ...create().input.inputs, transport: "drive" as const, collaborative: false as const } } };
    await expect(first.command(input)).rejects.toThrow("lost_real_committed_reply");
    const client = createItineraryClient(options); authorized = false;
    await expect(client.retry()).rejects.toThrow("itinerary_owner_required"); expect((await client.pending())?.idempotencyKey).toBe("unknown-real-commit");
    authorized = true; denyReadback = true;
    await expect(client.retry()).rejects.toThrow("itinerary_readback_unconfirmed"); expect((await client.pending())?.idempotencyKey).toBe("unknown-real-commit");
    await expect(client.command({ ...input, input: { ...input.input, title: "different" } })).rejects.toThrow("itinerary_pending_requires_retry");
    authorized = true; denyReadback = false;
    await expect(client.retry()).resolves.toMatchObject({ title: input.input.title, revision: 1 });
    expect(new Set(posts).size).toBe(1); expect(await client.pending()).toBeNull();
    const db = new DatabaseSync(join(path, "itinerary-and-collaboration.sqlite"));
    try { for (const table of ["itinerary_drafts", "itinerary_draft_versions", "itinerary_draft_receipts"]) expect(db.prepare(`SELECT count(*) AS count FROM ${table}`).get()).toMatchObject({ count: 1 }); }
    finally { db.close(); }
  });
  it("persists distinct explicit inputs and recovers exact effects/receipts after server recreation", async () => {
    const path = directory(); const first = await server(path);
    expect((await first.get("/v2/itineraries")).body.items).toEqual([]);
    const a = await first.post(create());
    const b = await first.post(create("create-b", "第二份草稿", "成都", "2026-12-12"));
    expect(a.status).toBe(200); expect(b.status).toBe(200);
    expect(a.body.itinerary.id).not.toBe(b.body.itinerary.id);
    expect(a.body.itinerary.inputs).toMatchObject({ origin: "广州", date: "2026-11-01" });
    expect(b.body.itinerary.inputs).toMatchObject({ origin: "成都", date: "2026-12-12" });
    const changed = await first.post({ command: "patch-draft", idempotencyKey: "rename-a", itineraryId: a.body.itinerary.id, baseRevision: 1, patch: { title: "保留原地点的修改" } });
    expect(changed.body.itinerary).toMatchObject({ revision: 2, inputs: a.body.itinerary.inputs });
    await first.app.close();
    const restarted = await server(path);
    const read = await restarted.get(`/v2/itineraries/${a.body.itinerary.id}`);
    expect(read.cache).toBe("private, no-store"); expect(read.body.itinerary).toEqual(changed.body.itinerary);
    expect((await restarted.get(`/v2/itineraries/${a.body.itinerary.id}/revisions/1`)).body.itinerary).toEqual(a.body.itinerary);
    const replay = await restarted.post(create());
    expect(replay.body).toEqual({ ...a.body, replayed: true });
    expect((await restarted.get(`/v2/itineraries/${a.body.itinerary.id}`)).body.itinerary.revision).toBe(2);
    expect((await restarted.post(create("create-a", "changed"))).status).toBe(409);
    expect((await restarted.get("/v2/itineraries")).body.items).toHaveLength(2);
  });
  it("serializes independent connections at the revision boundary without losing a confirmed write", async () => {
    const path = directory(); const first = await server(path); const second = await server(path);
    const { body: saved } = await first.post(create());
    const patch = (key: string, title: string) => ({ command: "patch-draft", idempotencyKey: key, itineraryId: saved.itinerary.id, baseRevision: 1, patch: { title } });
    const results = await Promise.all([first.post(patch("left", "左侧修改")), second.post(patch("right", "右侧修改"))]);
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    const accepted = results.find(result => result.status === 200)!.body.itinerary;
    expect((await second.get(`/v2/itineraries/${saved.itinerary.id}`)).body.itinerary).toEqual(accepted);
    const retry = await second.post(patch(results[0].status === 200 ? "left" : "right", accepted.title));
    expect(retry.body).toMatchObject({ replayed: true, itinerary: accepted });
    const sharedCreate = await Promise.all([first.post(create("shared-key")), second.post(create("shared-key"))]);
    expect(sharedCreate.map(result => result.status)).toEqual([200, 200]);
    expect(sharedCreate[0].body.itinerary.id).toBe(sharedCreate[1].body.itinerary.id);
    expect(sharedCreate.filter(result => result.body.replayed)).toHaveLength(1);
  });
  it("rolls back the actual effect when receipt commit fails and preserves historical generic rows", async () => {
    const path = directory(); const dbPath = join(path, "itinerary-and-collaboration.sqlite");
    const legacy = new DatabaseSync(dbPath);
    legacy.exec("CREATE TABLE business_records(entity_id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, idempotency_key TEXT UNIQUE NOT NULL, value TEXT NOT NULL)");
    legacy.prepare("INSERT INTO business_records VALUES (?, ?, ?, ?)").run("legacy", "user-demo", "legacy-key", '{"token":"share-offline"}'); legacy.close();
    const host = await server(path); const db = new DatabaseSync(dbPath);
    try {
      expect((await host.get("/v2/itineraries")).body.items).toEqual([]);
      db.exec("CREATE TRIGGER fail_receipt BEFORE INSERT ON itinerary_draft_receipts BEGIN SELECT RAISE(ABORT, 'injected_receipt_failure'); END");
      const failed = await host.post(create());
      expect(failed.status).toBe(503); expect(failed.body.outcome).toBe("unknown");
      expect(db.prepare("SELECT count(*) AS count FROM itinerary_drafts").get()).toMatchObject({ count: 0 });
      expect(db.prepare("SELECT count(*) AS count FROM itinerary_draft_versions").get()).toMatchObject({ count: 0 });
      expect(db.prepare("SELECT count(*) AS count FROM itinerary_draft_receipts").get()).toMatchObject({ count: 0 });
      db.exec("DROP TRIGGER fail_receipt");
      expect((await host.post(create())).status).toBe(200);
      expect(db.prepare("SELECT value FROM business_records").get()).toMatchObject({ value: '{"token":"share-offline"}' });
      expect((await host.get("/v1/itineraries")).status).toBe(409);
    } finally { db.close(); }
  });
  it("never accepts caller-selected actors and isolates reads at the service-selected owner", async () => {
    const path = directory(); const local = await server(path);
    const saved = await local.post(create(), { "x-actor-id": "someone-else", "x-role": "owner" });
    expect(saved.body.itinerary.ownerId).toBe("local-owner");
    const anonymous = await server(path, async () => null);
    expect((await anonymous.post(create(), { "x-actor-id": "local-owner" })).status).toBe(403);
    const other = await server(path, async () => ({ id: "different-owner", scope: "local-owner-poc" }));
    expect((await other.get(`/v2/itineraries/${saved.body.itinerary.id}`)).status).toBe(404);
    expect((await other.post({ command: "patch-draft", idempotencyKey: "forged", itineraryId: saved.body.itinerary.id, baseRevision: 1, patch: { title: "forged" } })).status).toBe(404);
    expect((await local.get(`/v2/itineraries/${saved.body.itinerary.id}`)).body.itinerary.title).toBe(create().input.title);
  });
});
