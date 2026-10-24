import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "unused-default-key" }));
import { createNightReportClient } from "../../../mobile/src/data/night-report-client";
import { buildApi } from "../server";
import { NightReportService } from "../modules/night-report/night-report-service";
import { createNightReportRuntime } from "../modules/night-report/runtime";
import type { LocalPocOwner } from "../local-poc-owner";
import { nightInput, nightProviders } from "./night-report-fixture";

const close: Array<() => Promise<unknown>> = [];
afterEach(async () => { for (const fn of close.splice(0).reverse()) await fn(); });
const owner: LocalPocOwner = { id: "synthetic-owner", scope: "local-owner-poc" };
const path = () => mkdtempSync(join(tmpdir(), "starward-night-report-"));
function pendingStorage() {
  const values = new Map<string, string>();
  return { values, getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } };
}
async function server(dataDir = path(), actor: () => Promise<LocalPocOwner | null> = async () => owner, providers = nightProviders()) {
  let generated = 0;
  const generator = new NightReportService(providers, undefined, () => new Date("2026-10-24T10:00:00Z"), () => `report-${crypto.randomUUID()}-${++generated}`);
  const runtime = await createNightReportRuntime({ dataDir, generator });
  const app = await buildApi({ nightReports: generator, nightReportRuntime: runtime, resolveNightReportActor: actor, spots: { getDetail: async () => { throw new Error("unused"); } }, resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }), allowedOrigins: ["http://localhost:8081"] });
  app.addHook("onClose", runtime.close); close.push(() => app.close());
  const url = await app.listen({ host: "127.0.0.1", port: 0 });
  const post = (requestId: string, input = nightInput, headers = {}) => fetch(`${url}/v1/night-reports`, { method: "POST", headers: { "content-type": "application/json", "x-request-id": requestId, ...headers }, body: JSON.stringify({ ...input, requestId }) });
  return { app, url, runtime, dataDir, post, generated: () => generated };
}
function counts(dataDir: string) {
  const db = new DatabaseSync(join(dataDir, "tonight-decision.sqlite"));
  try { return ["night_report_snapshots", "night_report_receipts"].map(table => Number((db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n)); }
  finally { db.close(); }
}

describe("NightReport actual HTTP/snapshot/receipt", () => {
  it("accepts the standard UTC timezone supported by the public contract without relabeling the saved input", async () => {
    const host = await server();
    const response = await host.post("utc-context", { ...nightInput, timezone: "UTC" });
    expect(response.status).toBe(200);
    expect((await response.json()).context.timezone).toBe("UTC");
    expect(host.runtime.service.result(owner, "utc-context").report.context.timezone).toBe("UTC");
  });
  it("reopens and replays a useful complete snapshot with its original evidence and full input conflict", async () => {
    const host = await server();
    const response = await host.post("original");
    expect(response.status).toBe(200);
    const report = await response.json();
    expect(report).toMatchObject({ status: "ready", primarySpot: { id: "synthetic-spot", travelMinutes: 15 }, observationWindow: { durationMinutes: 120 }, targets: [{ id: "milky-way-core" }] });
    expect(report.provenance).toHaveLength(4);
    expect(report.context.route.origin).toEqual(nightInput.route.origin);
    const receipt = host.runtime.service.result(owner, "original");
    expect((await host.post("original", { ...nightInput, route: { ...nightInput.route, origin: { ...nightInput.route.origin, label: "Changed origin label" }, modes: ["walk"] } })).status).toBe(409);
    expect(counts(host.dataDir)).toEqual([1, 1]);
    await host.app.close(); close.pop();
    const reopened = await server(host.dataDir, async () => owner, { ...nightProviders(), weather: { load: async () => { throw new Error("must_not_refetch"); } } });
    const replay = await reopened.post("original");
    expect(replay.headers.get("x-night-report-replayed")).toBe("true");
    expect(await replay.json()).toEqual(report); expect(reopened.generated()).toBe(0);
    const read = await fetch(`${reopened.url}/v1/night-report-requests/original`);
    expect(await read.json()).toEqual({ ...receipt, replayed: true });
    expect(await (await fetch(`${reopened.url}/v1/night-reports/${report.id}`)).json()).toMatchObject({ ownerId: owner.id, report });
    expect(counts(host.dataDir)).toEqual([1, 1]);
  });
  it("persists honest partial output, rejects invalid input and never grants owner authority from caller fields", async () => {
    const providers = nightProviders(); providers.routes.load = async () => { throw new Error("route_unavailable"); };
    let actor: LocalPocOwner | null = owner;
    const host = await server(undefined, async () => actor, providers);
    const report = await (await host.post("partial")).json();
    expect(report).toMatchObject({ status: "partial", primarySpot: { travelMinutes: null, distanceKm: null, routeState: "missing" }, parts: { weather: { state: "fresh" }, route: { state: "missing" } } });
    expect(report.observationWindow).not.toBeNull();
    expect(host.runtime.service.result(owner, "partial").report).toEqual(report);
    for (const input of [{ ...nightInput, nightDate: "2026-02-30" }, { ...nightInput, route: { ...nightInput.route, origin: { ...nightInput.route.origin, lat: 999 } } }, { ...nightInput, route: { ...nightInput.route, modes: "drive" } }]) {
      expect((await host.post("invalid", input as typeof nightInput)).status).toBe(422);
    }
    actor = null;
    const session = await fetch(`${host.url}/v1/night-report-session`, { headers: { "x-actor-id": owner.id } });
    expect(await session.json()).toEqual({ schemaVersion: "starward-night-report-session-v1", storage: "ephemeral" });
    expect((await host.post("spoof", nightInput, { "x-night-report-storage-required": "local-owner-poc-v1", "x-night-report-owner": owner.id, "x-actor-id": owner.id })).status).toBe(403);
    expect((await fetch(`${host.url}/v1/night-reports/${report.id}`)).status).toBe(403);
    expect(counts(host.dataDir)).toEqual([1, 1]);
    expect((await host.post("ordinary-guest")).headers.get("x-night-report-storage")).toBe("ephemeral");
    expect(counts(host.dataDir)).toEqual([1, 1]);
  });
  it("admits only one effect across actual SQLite connections and rolls back the snapshot if receipt insertion fails", async () => {
    const dataDir = path(), a = await server(dataDir), b = await server(dataDir);
    const results = await Promise.all([a.post("concurrent"), b.post("concurrent")]);
    expect(results.map(r => r.status)).toEqual([200, 200]);
    expect(await results[0]!.json()).toEqual(await results[1]!.json()); expect(counts(dataDir)).toEqual([1, 1]);
    const db = new DatabaseSync(join(dataDir, "tonight-decision.sqlite"));
    try { db.exec("CREATE TRIGGER fail_receipt BEFORE INSERT ON night_report_receipts BEGIN SELECT RAISE(ABORT, 'synthetic_receipt_failure'); END"); }
    finally { db.close(); }
    const failed = await a.post("rollback"); expect(failed.status).toBe(503); expect(await failed.json()).toMatchObject({ outcome: "unknown" });
    expect(counts(dataDir)).toEqual([1, 1]);
    const repair = new DatabaseSync(join(dataDir, "tonight-decision.sqlite")); try { repair.exec("DROP TRIGGER fail_receipt"); } finally { repair.close(); }
    expect((await b.post("rollback")).status).toBe(200); expect(counts(dataDir)).toEqual([2, 2]);
  });
  it("keeps an owner attempt through lost reply, guest temporary query and authority/readback loss, then reconciles the exact key", async () => {
    let actor: LocalPocOwner | null = owner, loseReply = true, denyRead = false, next = 0;
    const host = await server(undefined, async () => actor), storage = pendingStorage(), posts: string[] = [];
    const clientOptions = { baseUrl: host.url, storage, newKey: () => `request-${++next}`, fetcher: (async (url, init) => {
      const response = await fetch(url, init);
      if (init?.method === "POST") { posts.push(String(init.body)); if (loseReply) { loseReply = false; await response.arrayBuffer(); throw new Error("committed_reply_lost"); } }
      if (denyRead && String(url).includes("/v1/night-report-requests/")) return new Response(JSON.stringify({ code: "night_report_owner_required" }), { status: 403 });
      return response;
    }) as typeof fetch };
    await expect(createNightReportClient(clientOptions).load(nightInput)).rejects.toThrow("committed_reply_lost");
    const originalBytes = [...storage.values.values()][0]!;
    expect(JSON.parse(originalBytes)).toMatchObject({ idempotencyKey: "request-1", input: nightInput, qualification: { storage: "local-owner-poc-v1", ownerId: owner.id } });
    const original = host.runtime.service.result(owner, "request-1").report;
    actor = null;
    const client = createNightReportClient(clientOptions);
    const temporary = await client.load(nightInput);
    expect(temporary.requestId).toBe("request-2"); expect(temporary.id).not.toBe(original.id);
    expect([...storage.values.values()]).toEqual([originalBytes]); expect(counts(host.dataDir)).toEqual([1, 1]);
    actor = { ...owner, id: "another-owner" };
    await client.load(nightInput); expect([...storage.values.values()]).toEqual([originalBytes]); expect(counts(host.dataDir)).toEqual([1, 1]);
    actor = owner; denyRead = true;
    await expect(client.load(nightInput)).rejects.toThrow("night_report_readback_unconfirmed"); expect([...storage.values.values()]).toEqual([originalBytes]);
    denyRead = false;
    expect(await client.load(nightInput)).toEqual(original); expect(storage.values.size).toBe(0);
    const refresh = await client.load(nightInput); expect(refresh.id).not.toBe(original.id); expect(refresh.requestId).toBe("request-4");
    expect(posts.filter(body => JSON.parse(body).requestId === "request-1").every(body => body === posts[0])).toBe(true);
    expect(counts(host.dataDir)).toEqual([2, 2]);
    actor = null; const guest = await client.load({ ...nightInput, nightDate: "2026-10-25" });
    expect(guest.context.nightDate).toBe("2026-10-25"); expect(storage.values.size).toBe(0); expect(counts(host.dataDir)).toEqual([2, 2]);
  });
  it("cannot clear a durable attempt using missing qualification, or infer an old unqualified attempt's owner from current readback", async () => {
    const host = await server(), storage = pendingStorage(); let strip = true, keys = 0, posts = 0;
    const options = { baseUrl: host.url, storage, newKey: () => `qualification-${++keys}`, fetcher: (async (url, init) => {
      const response = await fetch(url, init);
      if (init?.method === "POST") { posts++; if (strip) { const headers = new Headers(response.headers); headers.delete("x-night-report-storage"); return new Response(await response.text(), { status: response.status, headers }); } }
      return response;
    }) as typeof fetch };
    await expect(createNightReportClient(options).load(nightInput)).rejects.toThrow("night_report_storage_unconfirmed");
    expect(storage.values.size).toBe(1); strip = false;
    const [key, bytes] = [...storage.values][0]!; const legacy = JSON.parse(bytes); delete legacy.qualification; storage.values.set(key, JSON.stringify(legacy));
    expect((await createNightReportClient(options).load(nightInput)).requestId).toBe("qualification-2");
    expect(posts).toBe(2); expect(storage.values.size).toBe(1); expect(counts(host.dataDir)).toEqual([1, 1]);
  });
  it("enforces the pre-dispatch qualification when authority changes between session read and POST", async () => {
    let actor: LocalPocOwner | null = owner, changeAfterSession = true, next = 0;
    const host = await server(undefined, async () => actor), storage = pendingStorage();
    const client = createNightReportClient({ baseUrl: host.url, storage, newKey: () => `race-${++next}`, fetcher: (async (url, init) => {
      const response = await fetch(url, init);
      if (String(url).endsWith("/v1/night-report-session") && changeAfterSession) actor = actor ? null : owner;
      return response;
    }) as typeof fetch });
    await expect(client.load(nightInput)).rejects.toThrow("night_report_owner_required");
    expect(counts(host.dataDir)).toEqual([0, 0]);
    expect([...storage.values.values()].map(value => JSON.parse(value).idempotencyKey)).toEqual(["race-1"]);
    changeAfterSession = false; actor = owner;
    expect((await client.load(nightInput)).requestId).toBe("race-1"); expect(storage.values.size).toBe(0);
    actor = null; changeAfterSession = true;
    expect((await client.load({ ...nightInput, nightDate: "2026-10-25" })).requestId).toBe("race-2");
    expect(actor).toEqual(owner); expect(counts(host.dataDir)).toEqual([1, 1]); expect(storage.values.size).toBe(0);
  });
  it("does not resubmit a legacy unknown attempt with no receipt and retains legitimate direct v1 ephemeral compatibility", async () => {
    const host = await server(), storage = pendingStorage(); let posts = 0, keys = 0;
    const options = { baseUrl: host.url, storage, newKey: () => `legacy-unknown-${++keys}`, fetcher: (async (url, init) => {
      if (init?.method === "POST") { posts++; if (posts === 1) throw new Error("dispatch_result_unknown"); }
      return fetch(url, init);
    }) as typeof fetch };
    await expect(createNightReportClient(options).load(nightInput)).rejects.toThrow("dispatch_result_unknown");
    const [key, bytes] = [...storage.values][0]!; const legacy = JSON.parse(bytes); delete legacy.qualification; storage.values.set(key, JSON.stringify(legacy));
    expect((await createNightReportClient(options).load(nightInput)).requestId).toBe("legacy-unknown-2");
    expect(posts).toBe(2); expect(storage.values.size).toBe(1); expect(counts(host.dataDir)).toEqual([0, 0]);
    const report = await new NightReportService(nightProviders()).generate({ ...nightInput, requestId: "legacy-v1" });
    const direct = createNightReportClient({ baseUrl: host.url, fetcher: (async () => new Response(JSON.stringify(report))) as typeof fetch });
    expect(await direct.create({ ...nightInput, requestId: "legacy-v1" })).toEqual(report);
    for (const changed of [{ ...report, requestId: "another-request" }, { ...report, context: { ...report.context, route: { ...report.context.route, modes: ["walk"] } } }]) {
      const bad = createNightReportClient({ baseUrl: host.url, fetcher: (async () => new Response(JSON.stringify(changed))) as typeof fetch });
      await expect(bad.create({ ...nightInput, requestId: "legacy-v1" })).rejects.toThrow("night_report_response_context_mismatch");
    }
  });
  it("preserves an unqualified legacy attempt even when another owner has the same requestId and full input", async () => {
    let actor = owner, keys = 0, lose = true;
    const host = await server(undefined, async () => actor), storage = pendingStorage();
    const client = createNightReportClient({ baseUrl: host.url, storage, newKey: () => `ambiguous-${++keys}`, fetcher: (async (url, init) => {
      const response = await fetch(url, init);
      if (init?.method === "POST" && lose) { lose = false; await response.arrayBuffer(); throw new Error("legacy_reply_lost"); }
      return response;
    }) as typeof fetch });
    await expect(client.load(nightInput)).rejects.toThrow("legacy_reply_lost");
    const [key, bytes] = [...storage.values][0]!; const legacy = JSON.parse(bytes); delete legacy.qualification;
    const unknownBytes = JSON.stringify(legacy); storage.values.set(key, unknownBytes);
    actor = { ...owner, id: "another-owner" };
    const other = await (await host.post("ambiguous-1")).json();
    const temporary = await client.load(nightInput);
    expect(temporary.id).not.toBe(other.id); expect(temporary.requestId).toBe("ambiguous-2");
    expect([...storage.values.values()]).toEqual([unknownBytes]); expect(counts(host.dataDir)).toEqual([2, 2]);
    actor = owner; await client.load(nightInput);
    expect([...storage.values.values()]).toEqual([unknownBytes]); expect(counts(host.dataDir)).toEqual([2, 2]);
  });
});
