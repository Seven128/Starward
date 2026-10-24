import { mkdtempSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "unused-owner-key" }));
import { createNotificationRulesClient } from "../../../mobile/src/data/notification-rules-client";
import { buildApi } from "../server";
import { createNotificationToolsRuntime } from "../modules/notifications/runtime";
import { ruleDefinition } from "../../../../tests/fixtures/notification-rules";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); });
function storage() {
  const values = new Map<string, string>();
  return { values, getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } };
}
async function server() {
  const directory = mkdtempSync(join(tmpdir(), "starward-rule-owner-"));
  const runtime = await createNotificationToolsRuntime({ dataDir: directory });
  let actor = "A";
  const app = await buildApi({ allowedOrigins: ["http://localhost:8081"], nightReports: { create: async () => { throw Error("unused"); } },
    spots: { getDetail: async () => { throw Error("unused"); } }, resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }),
    notificationRules: runtime.service, notificationEvaluations: runtime.evaluations,
    resolveNotificationActor: async () => actor ? ({ id: actor, scope: "local-owner-poc" }) : null });
  app.addHook("onClose", runtime.close);
  const url = await app.listen({ host: "127.0.0.1", port: 0 });
  cleanup.push(async () => {
    await app.close();
    if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith("starward-rule-owner-")) throw Error("unexpected_owner_test_directory");
    rmSync(directory, { recursive: true, force: true });
  });
  return { url, runtime, actor(value: string) { actor = value; },
    list: (id: string) => runtime.service.list({ id, scope: "local-owner-poc" }).items };
}
it("binds a lost committed rule to A, rejects B without altering it, then restores the original attempt and uses a new key", async () => {
  const host = await server(), port = storage(), posts: Array<{ body: string; owner: string | null }> = [];
  let key = 0, lose = true;
  const client = createNotificationRulesClient({ baseUrl: host.url, storage: port, newKey: () => `owner-${++key}`, fetcher: (async (url, init) => {
    const response = await fetch(url, init);
    if (init?.method === "POST") { posts.push({ body: String(init.body), owner: new Headers(init.headers).get("x-notification-owner") }); if (lose && response.ok) { lose = false; throw Error("lost_after_A_commit"); } }
    return response;
  }) as typeof fetch });
  await client.inboxClient.controls();
  await expect(client.command({ command: "create-rule", input: ruleDefinition() })).rejects.toThrow("lost_after_A_commit");
  const original = host.list("A"); expect(original).toHaveLength(1); expect(host.list("B")).toHaveLength(0);
  const raw = [...port.values.values()][0];
  expect((await client.pending())?.ownerQualification).toEqual({ schemaVersion: "starward-notification-rule-owner-v1", ownerId: "A" });
  host.actor("B"); await client.inboxClient.controls();
  await expect(client.retry()).rejects.toMatchObject({ code: "notification_rule_owner_mismatch", rejected: false, expectedOwnerId: "A" });
  expect(client.inboxClient.authority()).toMatchObject({ status: "ready", ownerId: "B" });
  expect([...port.values.values()][0]).toBe(raw); expect(host.list("B")).toHaveLength(0); expect(host.list("A")).toEqual(original);
  host.actor("A"); await client.inboxClient.controls();
  await expect(client.retry()).resolves.toMatchObject({ id: original[0].id, ownerId: "A" });
  expect(port.values.size).toBe(0); expect(posts).toHaveLength(3); expect(posts.every(post => post.owner === "A" && post.body === posts[0].body)).toBe(true);
  const refreshed = await client.command({ command: "create-rule", input: { ...ruleDefinition(), target: "jupiter" } });
  expect(refreshed.ownerId).toBe("A"); expect(host.list("A")).toHaveLength(2);
  expect(JSON.parse(posts[3].body).idempotencyKey).not.toBe(JSON.parse(posts[0].body).idempotencyKey);
});
it("keeps legacy unqualified bytes unknown even when a current owner has the same key and full-input receipt", async () => {
  const host = await server(), port = storage();
  const command = { command: "create-rule", input: ruleDefinition(), idempotencyKey: "legacy-key" };
  for (const id of ["A", "B"]) host.runtime.service.command({ id, scope: "local-owner-poc" }, command);
  const raw = ` \n${JSON.stringify(command)}\n `, slot = `starward-notification-rule-pending-v2:${host.url}`;
  port.values.set(slot, raw);
  let requests = 0;
  const client = createNotificationRulesClient({ baseUrl: host.url, storage: port, fetcher: (async (url, init) => { requests++; return fetch(url, init); }) as typeof fetch });
  for (const id of ["B", "A"]) {
    host.actor(id); await client.inboxClient.controls(); const before = requests;
    await expect(client.retry()).rejects.toMatchObject({ code: "notification_rule_pending_owner_unqualified", rejected: false });
    expect(requests).toBe(before); expect(port.values.get(slot)).toBe(raw); expect(host.list(id)).toHaveLength(1);
  }
  const before = requests;
  await expect(client.command({ command: "create-rule", input: ruleDefinition() })).rejects.toThrow("notification_rule_pending_requires_retry");
  expect(requests).toBe(before); expect(port.values.get(slot)).toBe(raw);
});
it("restricts a delayed new intent and private reads at the actual actor without granting authority from a caller header", async () => {
  const host = await server(), port = storage(); let release!: () => void, firstRead = true;
  const held = new Promise<void>(resolve => { release = resolve; });
  const delayedStorage = { ...port, getItem: async (key: string) => { if (firstRead) { firstRead = false; await held; } return port.getItem(key); } };
  const client = createNotificationRulesClient({ baseUrl: host.url, storage: delayedStorage });
  await client.inboxClient.controls();
  const attempt = client.command({ command: "create-rule", input: ruleDefinition() });
  host.actor("B"); release();
  await expect(attempt).rejects.toMatchObject({ code: "notification_rule_owner_unconfirmed", rejected: false });
  expect(host.list("A")).toHaveLength(0); expect(host.list("B")).toHaveLength(0); expect(port.values.size).toBe(0);
  const spoof = await fetch(host.url + "/v2/notification-rules/commands", { method: "POST", headers: { "content-type": "application/json", "x-notification-owner": "A", "x-actor-id": "A" }, body: JSON.stringify({ command: "create-rule", idempotencyKey: "restricted", input: ruleDefinition() }) });
  expect(spoof.status).toBe(403); expect(host.list("B")).toHaveLength(0);
  const read = await fetch(host.url + "/v2/notification-rules", { headers: { "x-notification-owner": "A" } });
  expect(read.status).toBe(403);
  // Existing unqualified wire callers keep their original server actor, not A.
  const legacy = await fetch(host.url + "/v2/notification-rules/commands", { method: "POST", headers: { "content-type": "application/json", "x-actor-id": "A" }, body: JSON.stringify({ command: "create-rule", idempotencyKey: "old-wire", input: ruleDefinition() }) });
  expect(legacy.status).toBe(200); expect((await legacy.json()).rule.ownerId).toBe("B");
});
