import { mkdtempSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { notificationForecastQuery as query, notificationWeatherRule, notificationWeatherRun } from "../../../../tests/fixtures/notification-weather";
import { nextNotificationAllowed } from "../../../../packages/domain/src/notifications/evaluation";
import type { NotificationRuleDefinition } from "../../../../packages/domain/src/notifications/rules";
import { buildApi } from "../server";
import { ForecastQueryService, type ForecastPrimaryAcquisition } from "../modules/forecast/forecast-query-service";
import { createNotificationToolsRuntime } from "../modules/notifications/runtime";
import { resolveLocalNotificationOwner, type NotificationRuleActorResolver } from "../modules/notifications/rule-routes";

const hosts: Array<{ app: Awaited<ReturnType<typeof buildApi>> }> = [], directories: string[] = [];
const owner = { id: "local-owner", scope: "local-owner-poc" as const };
afterEach(async () => {
  for (const host of hosts.splice(0)) await host.app.close();
  for (const directory of directories.splice(0)) {
    if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith("starward-notification-evaluation-")) throw new Error("unexpected_test_directory");
    rmSync(directory, { recursive: true, force: true });
  }
});
function directory() { const path = mkdtempSync(join(tmpdir(), "starward-notification-evaluation-")); directories.push(path); return path; }
async function server(path = directory(), resolver: NotificationRuleActorResolver | null = resolveLocalNotificationOwner) {
  let now = Date.parse("2026-10-24T18:58:00.000Z"), cloud: number | null = 80, loads = 0;
  let sourceHours: string[] | undefined;
  const acquisitions: ForecastPrimaryAcquisition[] = [];
  const runtime = await createNotificationToolsRuntime({ dataDir: path, now: () => new Date(now) });
  const forecast = new ForecastQueryService({ now: () => new Date(now), cacheTtlMs: 1000,
    primary: { async load(input) { loads++; return notificationWeatherRun(new Date(now).toISOString(), cloud, input.runId, sourceHours, { latitude: input.latitude, longitude: input.longitude }); } },
    onPrimaryAcquired: input => { acquisitions.push(structuredClone(input)); runtime.evaluations.acceptForecast(input); } });
  const app = await buildApi({ allowedOrigins: ["http://localhost:8081"], nightReports: { create: async () => { throw Error("not_used"); } },
    spots: { getDetail: async () => { throw Error("not_used"); } }, resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }),
    forecast, notificationRules: runtime.service, notificationEvaluations: runtime.evaluations, resolveNotificationActor: resolver ?? undefined });
  app.addHook("onClose", runtime.close);
  const url = await app.listen({ host: "127.0.0.1", port: 0 });
  const host = { app, runtime, path, url, acquisitions,
    setTime(at: string) { now = Date.parse(at); },
    get loads() { return loads; },
    get: async (route: string, headers?: Record<string, string>) => { const response = await fetch(url + route, { headers }); return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") }; },
    post: async (route: string, input: unknown) => { const response = await fetch(url + route, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); return { status: response.status, body: await response.json() }; },
    acquire: async (at: string, value: number | null, hours?: string[], sourceQuery = query) => {
      now = Date.parse(at); cloud = value; sourceHours = hours;
      const params = new URLSearchParams(Object.entries(sourceQuery).map(([key, value]) => [key, String(value)]));
      return host.get(`/v1/forecast/hourly?${params}`);
    },
  };
  hosts.push(host); return host;
}
function controls(baseRevision = 0, enabled = true) { return { command: "set-controls", idempotencyKey: `controls-${baseRevision}-${enabled}`, baseRevision, expectedOwnerId: owner.id, enabled, categories: { pretrip: true, "long-term": false } }; }
async function createRule(host: Awaited<ReturnType<typeof server>>, input: NotificationRuleDefinition = notificationWeatherRule(), key = "rule") {
  const saved = await host.post("/v2/notification-rules/commands", { command: "create-rule", idempotencyKey: key, input });
  expect(saved.status).toBe(200); return saved.body.rule;
}

describe("qualified forecast acquisition to authoritative notification inbox", () => {
  it("keeps old definition enablement shadow-only, then delivers a real edge once with source/target/hour meaning", async () => {
    const host = await server(), rule = await createRule(host);
    expect((await host.get("/v2/notifications/controls")).body.controls).toMatchObject({ revision: 0, enabled: false, categories: { pretrip: false, "long-term": false } });
    await host.acquire("2026-10-24T19:00:00.000Z", 80);
    await host.acquire("2026-10-24T19:01:00.000Z", 10);
    expect((await host.get("/v2/notifications/inbox")).body.items).toEqual([]);
    expect((await host.get(`/v2/notifications/rules/${rule.id}/activity`)).body.activity.lastEvaluation.status).toBe("controls-disabled");
    expect((await host.post("/v2/notifications/controls/commands", controls())).status).toBe(200);
    await host.acquire("2026-10-24T19:02:00.000Z", 10);
    expect((await host.get("/v2/notifications/inbox")).body.items).toEqual([]);
    await host.acquire("2026-10-24T19:03:00.000Z", 80);
    const ready = await host.acquire("2026-10-24T19:04:00.000Z", 10);
    expect(ready.status).toBe(200);
    const page = await host.get("/v2/notifications/inbox");
    expect(page.status).toBe(200); expect(page.cache).toBe("private, no-store"); expect(page.body.items).toHaveLength(1);
    const message = page.body.items[0];
    expect(message).toMatchObject({ ownerId: owner.id, boundary: "in-app-inbox-only", current: "same-condition",
      trigger: { ruleId: rule.id, revision: 1, target: "moon", metric: "totalCloudPct", unit: "%", previousValue: 80, value: 10,
        source: { acquiredAt: "2026-10-24T19:04:00.000Z", expiresAt: "2026-10-24T19:34:00.000Z" }, previousSource: { acquiredAt: "2026-10-24T19:03:00.000Z" } } });
    expect(message.trigger.astronomyAlgorithmVersion).toContain("astronomy-engine");
    expect(Date.parse(message.trigger.window.startUtc)).toBeGreaterThanOrEqual(Date.parse(ready.body.astronomy.targetWindow.startUtc));
    expect(message.dueAt).toBe(new Date(Date.parse(message.trigger.window.startUtc) - 60 * 60_000).toISOString());
    expect(message.trigger.source.runId).toBe(ready.body.primary.run.runId);
    expect(message.trigger.source.attribution[0].licenseId).toBe("CC-BY-4.0");
    const original = host.acquisitions.at(-1)!;
    host.runtime.evaluations.acceptForecast(original); host.runtime.evaluations.acceptForecast(structuredClone(original));
    expect((await host.get("/v2/notifications/inbox")).body.items).toEqual(page.body.items);
    expect(host.loads).toBe(5);
  });
  it("retains the original acquisition after enqueue failure and retries it from cache without another provider fetch", async () => {
    const host = await server(); await createRule(host); await host.post("/v2/notifications/controls/commands", controls());
    const db = new DatabaseSync(join(host.path, "notifications-and-toolbox.sqlite"));
    try {
      db.exec("CREATE TRIGGER fail_source BEFORE INSERT ON notification_source_events BEGIN SELECT RAISE(ABORT,'source-storage-unavailable'); END");
      const failed = await host.acquire("2026-10-24T19:00:00.000Z", 80);
      expect(failed.status).toBe(200); expect(failed.body.primary.hours[0].totalCloudPct).toBe(80);
      expect(failed.body.warnings.join(" ")).toContain("通知评估暂未确认");
      db.exec("DROP TRIGGER fail_source");
      const recovered = await host.acquire("2026-10-24T19:00:00.500Z", 80);
      expect(recovered.body.status).toBe("cached"); expect(recovered.body.warnings.join(" ")).not.toContain("通知评估暂未确认");
      expect(host.loads).toBe(1); await host.runtime.evaluations.flush();
      const row = db.prepare("SELECT source_body,payload,complete FROM notification_source_events").get() as { source_body: string; payload: string | null; complete: number };
      expect(JSON.parse(row.source_body).source.acquiredAt).toBe("2026-10-24T19:00:00.000Z");
      expect(JSON.parse(row.source_body).source.expiresAt).toBe("2026-10-24T19:30:00.000Z"); expect(row.payload).toBeNull(); expect(row.complete).toBe(1);
      await host.acquire("2026-10-24T19:01:00.000Z", 10);
      expect((await host.get("/v2/notifications/inbox")).body.items).toHaveLength(1); expect(host.loads).toBe(2);
    } finally { db.close(); }
  });
  it("rolls back a failed actual inbox write, reopens pending work and confirms one nonempty durable result", async () => {
    const path = directory(), first = await server(path); await createRule(first); await first.post("/v2/notifications/controls/commands", controls());
    await first.acquire("2026-10-24T19:00:00.000Z", 80); await first.runtime.evaluations.flush();
    const db = new DatabaseSync(join(path, "notifications-and-toolbox.sqlite"));
    db.exec("CREATE TRIGGER fail_inbox BEFORE INSERT ON notification_inbox BEGIN SELECT RAISE(ABORT,'lost-inbox-write'); END");
    try {
      expect((await first.acquire("2026-10-24T19:01:00.000Z", 10)).status).toBe(200);
      expect((await first.get("/v2/notifications/inbox")).body).toMatchObject({ evaluationStatus: "unavailable", items: [] });
      expect(db.prepare("SELECT count(*) AS count FROM notification_inbox").get()).toMatchObject({ count: 0 });
      expect(db.prepare("SELECT count(*) AS count FROM notification_inbox_candidates WHERE status='scheduled'").get()).toMatchObject({ count: 2 });
      await first.app.close(); db.exec("DROP TRIGGER fail_inbox");
      const second = await server(path); second.setTime("2026-10-24T19:01:00.000Z");
      const restored = await second.get("/v2/notifications/inbox");
      expect(restored.status).toBe(200); expect(restored.body.items).toHaveLength(1);
      expect(restored.body.items[0].trigger.value).toBe(10); expect(second.loads).toBe(0);
      second.runtime.evaluations.acceptForecast(first.acquisitions.at(-1)!);
      expect((await second.get("/v2/notifications/inbox")).body.items).toEqual(restored.body.items);
    } finally { db.close(); }
  });
  it("does not turn missing/old data or another point/target/unit into a fresh edge", async () => {
    const host = await server(), rule = await createRule(host); await host.post("/v2/notifications/controls/commands", controls());
    const wrong = await createRule(host, { ...notificationWeatherRule(), threshold: { ...notificationWeatherRule().threshold, unit: "fraction" } }, "wrong-unit");
    const grid = await createRule(host, { ...notificationWeatherRule(), location: { kind: "grid", grid: "unqualified-grid" } }, "grid");
    await host.acquire("2026-10-24T19:00:00.000Z", 80); const old = host.acquisitions.at(-1)!;
    await host.acquire("2026-10-24T19:01:00.000Z", null);
    await host.acquire("2026-10-24T19:02:00.000Z", 10);
    expect((await host.get("/v2/notifications/inbox")).body.items).toEqual([]);
    host.runtime.evaluations.acceptForecast(old);
    await host.acquire("2026-10-24T19:03:00.000Z", 80);
    await host.acquire("2026-10-24T19:04:00.000Z", 0);
    const page = (await host.get("/v2/notifications/inbox")).body;
    expect(page.items).toHaveLength(1); expect(page.items[0].trigger.value).toBe(0); expect(page.items[0].trigger.ruleId).toBe(rule.id);
    expect((await host.get(`/v2/notifications/rules/${wrong.id}/activity`)).body.activity).toMatchObject({ supported: false, reason: "metric-unit-mismatch" });
    expect((await host.get(`/v2/notifications/rules/${grid.id}/activity`)).body.activity).toMatchObject({ supported: false, reason: "grid-coverage-unqualified", lastEvaluation: null });
    await host.acquire("2026-10-24T19:05:00.000Z", 80);
    const reversed = (await host.get("/v2/notifications/inbox")).body.items;
    expect(reversed).toHaveLength(1); expect(reversed[0].current).toBe("condition-reversed"); expect(reversed[0].trigger.value).toBe(0);
  });
  it("keeps lead time/quiet hours/freshness separate and refreshes queued evidence before delivery", async () => {
    const host = await server(); await createRule(host, { ...notificationWeatherRule(), leadMinutes: 0, quietHours: { start: "19:00", end: "20:15", timezone: "UTC" } });
    await host.post("/v2/notifications/controls/commands", controls());
    await host.acquire("2026-10-24T19:00:00.000Z", 80); await host.acquire("2026-10-24T19:01:00.000Z", 10);
    host.setTime("2026-10-24T19:31:00.000Z"); expect((await host.get("/v2/notifications/inbox")).body.items).toEqual([]);
    await host.acquire("2026-10-24T19:59:00.000Z", 10);
    host.setTime("2026-10-24T20:00:00.000Z"); expect((await host.get("/v2/notifications/inbox")).body.items).toEqual([]);
    host.setTime("2026-10-24T20:15:00.000Z"); const page = await host.get("/v2/notifications/inbox");
    expect(page.body.items).toHaveLength(1); expect(page.body.items[0]).toMatchObject({ deliveredAt: "2026-10-24T20:15:00.000Z", trigger: { source: { acquiredAt: "2026-10-24T19:01:00.000Z" } }, evidence: { source: { acquiredAt: "2026-10-24T19:59:00.000Z" } } });
    host.setTime("2026-10-24T20:30:00.000Z"); expect((await host.get("/v2/notifications/inbox")).body.items[0].current).toBe("expired");
    expect(nextNotificationAllowed(Date.parse("2026-11-01T05:30:00Z"), Date.parse("2026-11-01T08:00:00Z"), { start: "01:00", end: "02:00", timezone: "America/New_York" })).toBe(Date.parse("2026-11-01T07:00:00Z"));
  });
  it("indexes and resumes a multi-page affected population without per-rule provider loads", async () => {
    const host = await server();
    const ids: string[] = [];
    for (let i = 0; i < 105; i++) ids.push(host.runtime.service.command(owner, { command: "create-rule", idempotencyKey: `batch-${i}`, input: notificationWeatherRule() }).rule.id);
    host.runtime.service.command(owner, { command: "create-rule", idempotencyKey: "other-point", input: { ...notificationWeatherRule(), location: { kind: "place", label: "other", latitude: 1, longitude: 0 } } });
    await host.post("/v2/notifications/controls/commands", controls());
    await host.acquire("2026-10-24T19:00:00.000Z", 80); await host.runtime.evaluations.flush();
    const db = new DatabaseSync(join(host.path, "notifications-and-toolbox.sqlite"));
    try {
      const stopAt = ids.sort()[60];
      db.exec(`CREATE TRIGGER stop_second_page BEFORE INSERT ON notification_rule_evaluations WHEN NEW.rule_id='${stopAt}' AND json_extract(NEW.body,'$.source.acquiredAt')='2026-10-24T19:01:00.000Z' BEGIN SELECT RAISE(ABORT,'page-fault'); END`);
      await host.acquire("2026-10-24T19:01:00.000Z", 10);
      const partial = await host.get("/v2/notifications/inbox");
      expect(partial.body.evaluationStatus).toBe("unavailable");
      expect(partial.body.items).toHaveLength(50);
      expect(db.prepare("SELECT count(*) AS count FROM notification_rule_evaluations WHERE acquired_at='2026-10-24T19:01:00.000Z'").get()).toMatchObject({ count: 50 });
      db.exec("DROP TRIGGER stop_second_page");
      await host.runtime.evaluations.flush();
      let path = "/v2/notifications/inbox", count = 0;
      while (path) { const page = await host.get(path); expect(page.status).toBe(200); count += page.body.items.length; path = page.body.nextCursor ? `/v2/notifications/inbox?cursor=${page.body.nextCursor}` : ""; }
      expect(count).toBe(105); expect(host.loads).toBe(2);
      expect(db.prepare("SELECT count(*) AS count FROM notification_rule_evaluations").get()).toMatchObject({ count: 210 });
    } finally { db.close(); }
  });
  it("preserves actor qualification, controls CAS/replay and current read ownership", async () => {
    const host = await server();
    const saved = await host.post("/v2/notifications/controls/commands", controls()); expect(saved.status).toBe(200);
    expect((await host.post("/v2/notifications/controls/commands", controls())).body).toEqual({ ...saved.body, replayed: true });
    expect((await host.post("/v2/notifications/controls/commands", { ...controls(), enabled: false })).status).toBe(409);
    expect((await host.post("/v2/notifications/controls/commands", { ...controls(), idempotencyKey: "stale" })).body.code).toBe("notification_controls_revision_conflict");
    expect((await host.post("/v2/notifications/controls/commands", { ...controls(1), expectedOwnerId: "other" })).status).toBe(403);
    expect((await host.get("/v2/notifications/inbox", { "x-notification-owner": "other" })).status).toBe(403);
    const denied = await server(host.path, null); expect((await denied.get("/v2/notifications/inbox")).status).toBe(403);
    expect((await host.app.inject({ method: "GET", url: "/v2/notifications/controls", remoteAddress: "203.0.113.1", headers: { "x-actor-id": owner.id } })).statusCode).toBe(403);
    const other = await server(host.path, async () => ({ id: "other", scope: "local-owner-poc" }));
    expect((await other.get("/v2/notifications/controls")).body.controls.enabled).toBe(false);
    expect((await other.get("/v2/notifications/inbox")).body.items).toEqual([]);
  });
  it("makes an omitted active hour unknown without clearing another valid hour or accepting a late old frame", async () => {
    const host = await server(); host.setTime("2026-10-24T20:28:00.000Z");
    await createRule(host, { ...notificationWeatherRule(), leadMinutes: 0 }); await host.post("/v2/notifications/controls/commands", controls());
    const hours = ["2026-10-24T21:00", "2026-10-24T22:00"];
    await host.acquire("2026-10-24T20:30:00.000Z", 80, hours);
    await host.acquire("2026-10-24T20:31:00.000Z", 10, hours); await host.runtime.evaluations.flush();
    const old = structuredClone(host.acquisitions.at(-1)!);
    await host.acquire("2026-10-24T20:40:00.000Z", 10, ["2026-10-24T22:00"]); await host.runtime.evaluations.flush();
    old.run = notificationWeatherRun("2026-10-24T20:35:00.000Z", 10, "delayed-older-response", hours);
    host.runtime.evaluations.acceptForecast(old); await host.runtime.evaluations.flush();
    host.setTime("2026-10-24T21:00:00.000Z"); await host.runtime.evaluations.flush();
    expect((await host.get("/v2/notifications/inbox")).body.items).toEqual([]);
    await host.acquire("2026-10-24T21:59:00.000Z", 10, ["2026-10-24T22:00"]);
    host.setTime("2026-10-24T22:00:00.000Z"); await host.runtime.evaluations.flush();
    const page = await host.get("/v2/notifications/inbox");
    expect(page.body.items).toHaveLength(1);
    expect(page.body.items[0].trigger.window.startUtc).toBe("2026-10-24T22:00:00.000Z");
    expect(page.body.items[0].evidence.source.acquiredAt).toBe("2026-10-24T21:59:00.000Z");
  });
  it("keeps a failed source unconfirmed across empty/unrelated work and blocks its older still-fresh candidate", async () => {
    const host = await server(); await createRule(host, { ...notificationWeatherRule(), leadMinutes: 0 });
    await host.post("/v2/notifications/controls/commands", controls());
    await host.acquire("2026-10-24T19:30:00.000Z", 80, ["2026-10-24T20:00"]);
    await host.acquire("2026-10-24T19:31:00.000Z", 10, ["2026-10-24T20:00"]); await host.runtime.evaluations.flush();
    const db = new DatabaseSync(join(host.path, "notifications-and-toolbox.sqlite"));
    try {
      db.exec("CREATE TRIGGER fail_affected_source BEFORE INSERT ON notification_source_events WHEN json_extract(NEW.source_body,'$.query.latitude')=0 BEGIN SELECT RAISE(ABORT,'affected-source-unavailable'); END");
      const latest = await host.acquire("2026-10-24T19:40:00.000Z", 80, ["2026-10-24T20:00"]);
      expect(latest.status).toBe(200); expect(latest.body.warnings.join(" ")).toContain("通知评估暂未确认");
      expect((await host.get("/v2/notifications/inbox")).body.evaluationStatus).toBe("unavailable");
      await host.acquire("2026-10-24T19:45:00.000Z", 10, ["2026-10-24T20:00"], { ...query, latitude: 1 });
      expect((await host.get("/v2/notifications/inbox")).body.evaluationStatus).toBe("unavailable");
      host.setTime("2026-10-24T20:00:00.000Z");
      const blocked = await host.get("/v2/notifications/inbox");
      expect(blocked.body).toMatchObject({ items: [], evaluationStatus: "unavailable" });
      expect(db.prepare("SELECT count(*) AS count FROM notification_source_readiness WHERE status='pending'").get()).toMatchObject({ count: 1 });
      db.exec("DROP TRIGGER fail_affected_source"); await host.runtime.evaluations.flush();
      const recovered = await host.get("/v2/notifications/inbox");
      expect(recovered.body).toMatchObject({ items: [], evaluationStatus: "ready" });
      expect(db.prepare("SELECT count(*) AS count FROM notification_source_readiness WHERE status='pending'").get()).toMatchObject({ count: 0 });
      const header = db.prepare("SELECT source_body FROM notification_source_readiness WHERE acquired_at='2026-10-24T19:40:00.000Z'").get() as { source_body: string };
      expect(JSON.parse(header.source_body).source.acquiredAt).toBe("2026-10-24T19:40:00.000Z");
      expect(host.loads).toBe(4);
    } finally { db.close(); }
  });
});
