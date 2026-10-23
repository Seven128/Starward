import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "http-field-key" }));
import { createFieldReportsClient } from "../../../mobile/src/data/field-reports-client";
import { fieldReportInput as input } from "../../../../tests/fixtures/field-reports";
import { buildApi } from "../server";
import { createFieldReportRuntime } from "../modules/field/report-runtime";
import { resolveLocalFieldReportOwner, type FieldReportActorResolver } from "../modules/field/report-routes";
import { FieldService } from "../modules/field/field-service";

const apps: Awaited<ReturnType<typeof buildApi>>[] = [], directories: string[] = [];
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
  for (const directory of directories.splice(0)) {
    const absolute = resolve(directory);
    if (dirname(absolute) !== resolve(tmpdir()) || !basename(absolute).startsWith("starward-field-report-")) throw new Error("unexpected_test_directory");
    rmSync(absolute, { recursive: true, force: true });
  }
});
function directory() { const path = mkdtempSync(join(tmpdir(), "starward-field-report-")); directories.push(path); return path; }
async function server(dataDir: string, resolver: FieldReportActorResolver | null = resolveLocalFieldReportOwner) {
  const runtime = await createFieldReportRuntime({ dataDir });
  const dependencies = { allowedOrigins: ["http://localhost:8081"], nightReports: { create: async () => { throw new Error("not_used"); } }, spots: { getDetail: async () => { throw new Error("not_used"); } }, resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }), field: new FieldService(), fieldReports: runtime.service, resolveFieldReportActor: resolver ?? undefined };
  const app = await buildApi(dependencies);
  app.addHook("onClose", runtime.close); apps.push(app);
  const url = await app.listen({ host: "127.0.0.1", port: 0 });
  return { app, url,
    get: async (path = "/v2/field-reports") => { const response = await fetch(`${url}${path}`); return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") }; },
    post: async (payload: unknown, headers?: Record<string, string>) => { const response = await fetch(`${url}/v2/field-reports/commands`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(payload) }); return { status: response.status, body: await response.json() }; },
  };
}
const create = (key = "create-a") => ({ command: "create-report-draft", idempotencyKey: key, input: input() });
function pendingStorage() { const values = new Map<string, string>(); return { getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } }; }

describe("actual private field report HTTP persistence", () => {
  it("stores the user's content and Context, reads versions after restart and never submits a community report", async () => {
    const path = directory(), first = await server(path);
    const empty = await first.get(); expect(empty.status).toBe(200); expect(empty.body.items).toEqual([]);
    const saved = await first.post(create()); expect(saved.status).toBe(200);
    expect(saved.body.report).toMatchObject({ revision: 1, input: input(), visibility: "private", publication: "not-submitted" });
    const revised = { ...input(), note: "更正：云层仅在西南侧。", category: "weather" };
    const changed = await first.post({ command: "update-report-draft", idempotencyKey: "edit-a", reportId: saved.body.report.id, baseRevision: 1, input: revised });
    expect(changed.status).toBe(200); expect(changed.body.report.input).toEqual(revised);
    await first.app.close(); const restarted = await server(path);
    expect((await restarted.get(`/v2/field-reports/${saved.body.report.id}`)).body.report).toEqual(changed.body.report);
    expect((await restarted.get(`/v2/field-reports/${saved.body.report.id}/revisions/1`)).body.report).toEqual(saved.body.report);
    expect((await restarted.post(create())).body).toEqual({ ...saved.body, replayed: true });
    expect((await restarted.get()).body.items).toEqual([changed.body.report]);
    expect((await restarted.post({ ...create(), input: revised })).status).toBe(409);
  });
  it("serializes real connections, rejects a stale edit and replays one shared create key", async () => {
    const path = directory(), left = await server(path), right = await server(path);
    const saved = (await left.post(create())).body.report;
    const edit = (key: string, note: string) => ({ command: "update-report-draft", idempotencyKey: key, reportId: saved.id, baseRevision: 1, input: { ...input(), note } });
    const changed = await Promise.all([left.post(edit("left", "左侧修改")), right.post(edit("right", "右侧修改"))]);
    expect(changed.map(result => result.status).sort()).toEqual([200, 409]);
    expect((await right.get(`/v2/field-reports/${saved.id}`)).body.report).toEqual(changed.find(result => result.status === 200)!.body.report);
    const shared = await Promise.all([left.post(create("shared")), right.post(create("shared"))]);
    expect(shared.map(result => result.status)).toEqual([200, 200]); expect(shared[0].body.report.id).toBe(shared[1].body.report.id);
    expect(shared.filter(result => result.body.replayed)).toHaveLength(1);
  });
  it("rolls back content/history when receipt persistence fails and preserves legacy generic bytes", async () => {
    const path = directory(), db = new DatabaseSync(join(path, "field-offline-safety.sqlite"));
    const legacy = ' {"token":"save-report","unproven":"queue-ready"} ';
    db.exec("CREATE TABLE business_records(entity_id TEXT PRIMARY KEY, value TEXT NOT NULL)"); db.prepare("INSERT INTO business_records VALUES (?, ?)").run("legacy", legacy);
    const host = await server(path);
    try {
      expect((await host.get()).body.items).toEqual([]);
      db.exec("CREATE TRIGGER fail_field_receipt BEFORE INSERT ON field_report_receipts BEGIN SELECT RAISE(ABORT, 'injected_receipt_failure'); END");
      expect(await host.post(create())).toMatchObject({ status: 503, body: { outcome: "unknown" } });
      for (const table of ["field_report_drafts", "field_report_versions", "field_report_receipts"]) expect(db.prepare(`SELECT count(*) AS count FROM ${table}`).get()).toMatchObject({ count: 0 });
      db.exec("DROP TRIGGER fail_field_receipt"); expect((await host.post(create())).status).toBe(200);
      expect(db.prepare("SELECT value FROM business_records").get()).toMatchObject({ value: legacy });
    } finally { db.close(); }
    for (const command of ["verify-pack", "toggle-red", "switch-backup", "start-session", "share-location", "save-report", "enter-offline"]) {
      const result = await host.app.inject({ method: "POST", url: "/v1/field/commands", payload: { command } });
      expect(result.statusCode).toBe(409);
    }
  });
  it("derives loopback ownership, refuses missing resolvers and does not trust actor headers", async () => {
    const path = directory(), local = await server(path);
    const saved = await local.post(create(), { "x-actor-id": "other", "x-role": "owner" }); expect(saved.body.report.ownerId).toBe("local-owner");
    const denied = await server(path, null); expect((await denied.get()).status).toBe(403); expect((await denied.post(create("denied"))).status).toBe(403);
    expect((await local.app.inject({ method: "GET", url: "/v2/field-reports", remoteAddress: "203.0.113.2", headers: { "x-actor-id": "local-owner" } })).statusCode).toBe(403);
    const other = await server(path, async () => ({ id: "other-owner", scope: "local-owner-poc" }));
    expect((await other.get()).body.items).toEqual([]); expect((await other.get(`/v2/field-reports/${saved.body.report.id}`)).status).toBe(404);
    expect((await other.post({ command: "update-report-draft", idempotencyKey: "stolen", reportId: saved.body.report.id, baseRevision: 1, input: input() })).status).toBe(404);
  });
  it("retains actual client intent through a lost committed reply, authority loss and a newer current edit", async () => {
    let authorized = true; const path = directory(), host = await server(path, request => authorized ? resolveLocalFieldReportOwner(request) : Promise.resolve(null));
    const storage = pendingStorage(), posts: string[] = []; let loseReply = true;
    const fetcher = (async (url, init) => { const response = await fetch(url, init); if (init?.method === "POST") { posts.push(String(init.body)); if (loseReply && response.ok) { loseReply = false; throw new Error("lost_field_reply"); } } return response; }) as typeof fetch;
    const first = createFieldReportsClient({ baseUrl: host.url, storage, fetcher, newKey: () => "lost-key" });
    const originalInput = input(), captured = structuredClone(originalInput);
    const attempt = first.command({ command: "create-report-draft", input: originalInput }); originalInput.note = "later mutable input";
    await expect(attempt).rejects.toThrow("lost_field_reply");
    const saved = (await host.get()).body.items[0]; expect(saved.input).toEqual(captured);
    await host.post({ command: "update-report-draft", idempotencyKey: "later", reportId: saved.id, baseRevision: 1, input: { ...captured, note: "新版本已保存" } });
    const restarted = createFieldReportsClient({ baseUrl: host.url, storage, fetcher, newKey: () => "unused" }); authorized = false;
    await expect(restarted.retry()).rejects.toMatchObject({ code: "field_report_owner_required", rejected: false }); expect((await restarted.pending())?.input).toEqual(captured);
    authorized = true; await expect(restarted.retry()).resolves.toMatchObject({ id: saved.id, revision: 2, input: { note: "新版本已保存" } });
    expect(new Set(posts).size).toBe(1); expect(await restarted.pending()).toBeNull();
    const db = new DatabaseSync(join(path, "field-offline-safety.sqlite"));
    try { expect(db.prepare("SELECT count(*) AS count FROM field_report_drafts").get()).toMatchObject({ count: 1 }); expect(db.prepare("SELECT count(*) AS count FROM field_report_receipts").get()).toMatchObject({ count: 2 }); } finally { db.close(); }
  });
  it("rejects invalid/timezone-less content before an effect, lets a first rejection be corrected and preserves unknown retries", async () => {
    const host = await server(directory()), storage = pendingStorage(); let key = 0;
    const client = createFieldReportsClient({ baseUrl: host.url, storage, newKey: () => `validation-${++key}` });
    await expect(client.command({ command: "create-report-draft", input: { ...input(), observedAt: "2026-10-24T13:24:35" } })).rejects.toMatchObject({ rejected: true });
    expect(await client.pending()).toBeNull(); expect((await host.get()).body.items).toEqual([]);
    await expect(client.command({ command: "create-report-draft", input: input() })).resolves.toMatchObject({ revision: 1 });
    for (const invalid of [{ ...input(), note: "" }, { ...input(), observedAt: "2026-02-30T13:00:00Z" }, { ...input(), context: { ...input().context, timezone: "unknown" } }, { ...input(), locationAccuracyM: 5 }, { ...input(), publication: "published" }]) expect((await host.post({ ...create("bad"), input: invalid })).status).toBe(400);
    expect((await host.get()).body.items).toHaveLength(1);
  });
  it("lets a first HTTP body-limit refusal be corrected without a phantom saved report", async () => {
    const host = await server(directory()), storage = pendingStorage(); let key = 0;
    const client = createFieldReportsClient({ baseUrl: host.url, storage, newKey: () => `limit-${++key}` });
    await expect(client.command({ command: "create-report-draft", input: { ...input(), note: "x".repeat(66_000) } })).rejects.toMatchObject({ code: "field_report_request_body_too_large", rejected: true });
    expect(await client.pending()).toBeNull(); expect((await host.get()).body.items).toEqual([]);
    await expect(client.command({ command: "create-report-draft", input: input() })).resolves.toMatchObject({ revision: 1 });
    expect((await host.get()).body.items).toHaveLength(1);
  });
  it("rejects a non-string category before storing content, history or a receipt", async () => {
    const path = directory(), host = await server(path), command = create("category-type");
    const response = await host.post({ ...command, input: { ...command.input, category: ["sky"] } });
    expect(response).toMatchObject({ status: 400, body: { code: "invalid_field_report", outcome: "rejected" } });
    expect((await host.get()).body.items).toEqual([]);
    const db = new DatabaseSync(join(path, "field-offline-safety.sqlite"));
    try {
      for (const table of ["field_report_drafts", "field_report_versions", "field_report_receipts"]) expect(db.prepare(`SELECT count(*) AS count FROM ${table}`).get()).toMatchObject({ count: 0 });
    } finally { db.close(); }
    expect((await host.post(command)).body.report.input.category).toBe("sky");
  });
  it("preserves the complete body and label within the existing HTTP budget, including indentation and surrounding whitespace", async () => {
    const host = await server(directory());
    const note = ` \n\t  ${"用户填写的长记录。".repeat(650)}\n\t保留缩进\n  `, label = "用户输入的地点说明".repeat(40);
    const original = { ...input(), place: { label }, note };
    const command = { command: "create-report-draft", idempotencyKey: "original-user-attempt-".repeat(12), input: original };
    expect(note.length).toBeGreaterThan(4000); expect(Buffer.byteLength(JSON.stringify(command))).toBeLessThan(64 * 1024);
    const saved = await host.post(command); expect(saved.status).toBe(200); expect(saved.body.report.input).toEqual(original);
    const changed = await host.post({ command: "update-report-draft", idempotencyKey: "later-edit", reportId: saved.body.report.id, baseRevision: 1, input: { ...original, note: `${note}\n又一行用户内容\t ` } });
    expect(changed.status).toBe(200);
    expect((await host.get(`/v2/field-reports/${saved.body.report.id}`)).body.report.input).toEqual(changed.body.report.input);
    expect((await host.get(`/v2/field-reports/${saved.body.report.id}/revisions/1`)).body.report.input).toEqual(original);
  });
});
