import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "http-rule-key" }));
import { createNotificationRulesClient } from "../../../mobile/src/data/notification-rules-client";
import { ruleDefinition as definition } from "../../../../tests/fixtures/notification-rules";
import { buildApi } from "../server";
import { createNotificationToolsRuntime } from "../modules/notifications/runtime";
import { resolveLocalNotificationOwner, type NotificationRuleActorResolver } from "../modules/notifications/rule-routes";
import { ToolsService } from "../modules/notifications/tools-service";

const apps: Awaited<ReturnType<typeof buildApi>>[] = [];
const directories: string[] = [];
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
  for (const directory of directories.splice(0)) {
    const absolute = resolve(directory);
    if (dirname(absolute) !== resolve(tmpdir()) || !basename(absolute).startsWith("starward-rule-")) throw new Error("unexpected_test_directory");
    rmSync(absolute, { recursive: true, force: true });
  }
});
function directory() { const path = mkdtempSync(join(tmpdir(), "starward-rule-")); directories.push(path); return path; }
async function server(dataDir: string, resolver: NotificationRuleActorResolver | null = resolveLocalNotificationOwner) {
  const runtime = await createNotificationToolsRuntime({ dataDir });
  const app = await buildApi({ allowedOrigins: ["http://localhost:8081"], nightReports: { create: async () => { throw new Error("not_used"); } }, spots: { getDetail: async () => { throw new Error("not_used"); } }, resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }), tools: new ToolsService(), notificationRules: runtime.service, notificationEvaluations: runtime.evaluations, resolveNotificationActor: resolver ?? undefined });
  app.addHook("onClose", runtime.close); apps.push(app);
  const url = await app.listen({ host: "127.0.0.1", port: 0 });
  return {
    app, url,
    get: async (path = "/v2/notification-rules") => { const response = await fetch(`${url}${path}`); return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") }; },
    post: async (payload: unknown, headers?: Record<string, string>) => { const response = await fetch(`${url}/v2/notification-rules/commands`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(payload) }); return { status: response.status, body: await response.json() }; },
  };
}
function create(key = "create-a") { return { command: "create-rule", idempotencyKey: key, input: definition() }; }
function pendingStorage() { const values = new Map<string, string>(); return { getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } }; }

describe("real notification rule configuration HTTP persistence", () => {
  it("persists explicit configuration and enabled state across restart without fabricating an evaluation or delivery", async () => {
    const path = directory(); const first = await server(path);
    expect((await first.get()).body.items).toEqual([]);
    const saved = await first.post(create());
    expect(saved.status).toBe(200);
    expect(saved.body.rule.definition).toEqual(definition());
    expect(saved.body.rule).toMatchObject({ revision: 1, evaluation: "not-evaluated", delivery: "not-configured" });
    const changed = await first.post({ command: "update-rule", idempotencyKey: "enable-a", ruleId: saved.body.rule.id, baseRevision: 1, input: { ...definition(), enabled: true, threshold: { ...definition().threshold, value: 35 } } });
    expect(changed.status).toBe(200);
    await first.app.close();
    const restarted = await server(path);
    expect((await restarted.get(`/v2/notification-rules/${saved.body.rule.id}`)).body.rule).toEqual(changed.body.rule);
    expect((await restarted.get(`/v2/notification-rules/${saved.body.rule.id}/revisions/1`)).body.rule).toEqual(saved.body.rule);
    expect((await restarted.post(create())).body).toEqual({ ...saved.body, replayed: true });
    expect((await restarted.get()).body.items).toEqual([changed.body.rule]);
    expect((await restarted.post({ ...create(), input: { ...definition(), enabled: true } })).status).toBe(409);
    const stopped = await restarted.post({ command: "set-rule-enabled", idempotencyKey: "stop-a", ruleId: saved.body.rule.id, baseRevision: 2, enabled: false });
    expect(stopped.body.rule).toMatchObject({ revision: 3, definition: { enabled: false }, evaluation: "not-evaluated", delivery: "not-configured" });
    expect(stopped.body.rule.definition.threshold.value).toBe(35);
    expect((await restarted.get(`/v2/notification-rules/${saved.body.rule.id}/revisions/2`)).body.rule).toEqual(changed.body.rule);
  });
  it("serializes two connections, rejects stale revisions and replays one shared create key", async () => {
    const path = directory(), left = await server(path), right = await server(path);
    const saved = (await left.post(create())).body.rule;
    const update = (key: string, value: number) => ({ command: "update-rule", idempotencyKey: key, ruleId: saved.id, baseRevision: 1, input: { ...definition(), threshold: { ...definition().threshold, value } } });
    const results = await Promise.all([left.post(update("left", 40)), right.post(update("right", 50))]);
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    const accepted = results.find(result => result.status === 200)!.body.rule;
    expect((await right.get(`/v2/notification-rules/${saved.id}`)).body.rule).toEqual(accepted);
    const shared = await Promise.all([left.post(create("shared")), right.post(create("shared"))]);
    expect(shared.map(result => result.status)).toEqual([200, 200]);
    expect(shared[0].body.rule.id).toBe(shared[1].body.rule.id);
    expect(shared.filter(result => result.body.replayed)).toHaveLength(1);
  });
  it("rolls back rule/version with a failed receipt insert and leaves old generic records byte-for-byte intact", async () => {
    const path = directory(), dbPath = join(path, "notifications-and-toolbox.sqlite"), db = new DatabaseSync(dbPath);
    db.exec("CREATE TABLE business_records(entity_id TEXT PRIMARY KEY, value TEXT NOT NULL)");
    const legacy = ' {"token":"create-rule","oldDelivery":"metadata-only"} ';
    db.prepare("INSERT INTO business_records VALUES (?, ?)").run("legacy", legacy);
    const host = await server(path);
    try {
      expect((await host.get()).body.items).toEqual([]);
      db.exec("CREATE TRIGGER fail_rule_receipt BEFORE INSERT ON notification_rule_receipts BEGIN SELECT RAISE(ABORT, 'injected_rule_receipt_failure'); END");
      const failed = await host.post(create());
      expect(failed).toMatchObject({ status: 503, body: { outcome: "unknown" } });
      for (const table of ["notification_rules", "notification_rule_versions", "notification_rule_receipts"]) expect(db.prepare(`SELECT count(*) AS count FROM ${table}`).get()).toMatchObject({ count: 0 });
      db.exec("DROP TRIGGER fail_rule_receipt");
      expect((await host.post(create())).status).toBe(200);
      expect(db.prepare("SELECT value FROM business_records").get()).toMatchObject({ value: legacy });
      for (const command of ["create-rule", "change-controls"]) expect((await host.app.inject({ method: "POST", url: "/v1/tools/commands", payload: { command } })).statusCode).toBe(409);
      expect((await host.app.inject({ method: "POST", url: "/v1/tools/commands", payload: { command: "professional" } })).statusCode).toBe(200);
    } finally { db.close(); }
  });
  it("derives the POC owner at the server and refuses omitted resolvers, nonloopback requests and other owners", async () => {
    const path = directory(), local = await server(path);
    const saved = await local.post(create(), { "x-actor-id": "someone-else", "x-role": "owner" });
    expect(saved.body.rule.ownerId).toBe("local-owner");
    const denied = await server(path, null);
    expect((await denied.post(create("denied"))).status).toBe(403);
    expect((await denied.get()).status).toBe(403);
    expect((await local.app.inject({ method: "GET", url: "/v2/notification-rules", remoteAddress: "203.0.113.2", headers: { "x-actor-id": "local-owner", "x-role": "owner" } })).statusCode).toBe(403);
    const other = await server(path, async () => ({ id: "isolated-owner", scope: "local-owner-poc" }));
    expect((await other.get()).body.items).toEqual([]);
    expect((await other.get(`/v2/notification-rules/${saved.body.rule.id}`)).status).toBe(404);
    expect((await other.post({ command: "set-rule-enabled", idempotencyKey: "stolen", ruleId: saved.body.rule.id, baseRevision: 1, enabled: true })).status).toBe(404);
  });
  it("keeps the real client's exact intent through a lost committed reply, changed current state and authority loss", async () => {
    const path = directory(); let authorized = true;
    const host = await server(path, request => authorized ? resolveLocalNotificationOwner(request) : Promise.resolve(null));
    const storage = pendingStorage(), posts: string[] = []; let loseReply = true;
    const fetcher = (async (url, init) => {
      const response = await fetch(url, init);
      if (init?.method === "POST") { posts.push(String(init.body)); if (loseReply && response.ok) { loseReply = false; throw new Error("lost_rule_reply"); } }
      return response;
    }) as typeof fetch;
    const first = createNotificationRulesClient({ baseUrl: host.url, storage, fetcher, newKey: () => "lost-key" });
    await expect(first.command({ command: "create-rule", input: definition() })).rejects.toThrow("lost_rule_reply");
    const original = (await host.get()).body.items[0];
    await host.post({ command: "set-rule-enabled", idempotencyKey: "later-current", ruleId: original.id, baseRevision: 1, enabled: true });
    const restarted = createNotificationRulesClient({ baseUrl: host.url, storage, fetcher, newKey: () => "must-not-be-used" });
    authorized = false;
    await expect(restarted.retry()).rejects.toMatchObject({ code: "notification_rule_owner_required", rejected: false });
    expect((await restarted.pending())?.idempotencyKey).toBe("lost-key");
    authorized = true;
    await expect(restarted.retry()).resolves.toMatchObject({ id: original.id, revision: 2, definition: { enabled: true } });
    expect(new Set(posts).size).toBe(1); expect(await restarted.pending()).toBeNull();
    const db = new DatabaseSync(join(path, "notifications-and-toolbox.sqlite"));
    try { expect(db.prepare("SELECT count(*) AS count FROM notification_rules").get()).toMatchObject({ count: 1 }); expect(db.prepare("SELECT count(*) AS count FROM notification_rule_receipts").get()).toMatchObject({ count: 2 }); }
    finally { db.close(); }
  });
  it("proves a first body-limit refusal had no effect and lets the client correct it", async () => {
    const path = directory(), host = await server(path), storage = pendingStorage(); let next = 0;
    const client = createNotificationRulesClient({ baseUrl: host.url, storage, newKey: () => `limit-${++next}` });
    await expect(client.command({ command: "create-rule", input: { ...definition(), target: "x".repeat(66_000) } })).rejects.toMatchObject({ code: "notification_rule_request_body_too_large", rejected: true });
    expect(await client.pending()).toBeNull(); expect((await host.get()).body.items).toEqual([]);
    await expect(client.command({ command: "create-rule", input: definition() })).resolves.toMatchObject({ revision: 1 });
    expect(await client.pending()).toBeNull(); expect((await host.get()).body.items).toHaveLength(1);
  });
  it("rejects missing/ambiguous units, coordinates, timezone and unsupported itinerary binding without a stored effect", async () => {
    const host = await server(directory());
    const invalid = [{ ...definition(), threshold: { ...definition().threshold, unit: "" } }, { ...definition(), location: { kind: "place", label: "missing", latitude: 999, longitude: 0 } }, { ...definition(), quietHours: { ...definition().quietHours, timezone: "unknown-zone" } }, { ...definition(), leadMinutes: -1 }, { ...definition(), expiresAt: "2026-10-25T20:00:00" }, { ...definition(), expiresAt: "2026-02-30T20:00:00Z" }, { ...definition(), category: "intrip" }];
    for (const input of invalid) expect((await host.post({ ...create(), input })).status).toBe(400);
    expect((await host.get()).body.items).toEqual([]);
    const grid = await host.post({ ...create("explicit-grid"), input: { ...definition(), location: { kind: "grid", grid: "user-explicit-grid" }, category: "long-term", cooldownMinutes: 1440 } });
    expect(grid.status).toBe(200); expect(grid.body.rule.definition.location).toEqual({ kind: "grid", grid: "user-explicit-grid" });
  });
  it("rejects a non-string channel before storing a rule, version or receipt", async () => {
    const path = directory(), host = await server(path), command = create("channel-type");
    expect(await host.post({ ...command, input: { ...command.input, channel: ["local"] } })).toMatchObject({ status: 400, body: { code: "invalid_notification_rule", outcome: "rejected" } });
    expect((await host.get()).body.items).toEqual([]);
    const db = new DatabaseSync(join(path, "notifications-and-toolbox.sqlite"));
    try {
      for (const table of ["notification_rules", "notification_rule_versions", "notification_rule_receipts"]) expect(db.prepare(`SELECT count(*) AS count FROM ${table}`).get()).toMatchObject({ count: 0 });
    } finally { db.close(); }
    expect((await host.post(command)).body.rule.definition.channel).toBe("local");
  });
});
