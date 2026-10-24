import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "unused-native-test-key" }));
import Ajv2020 from "ajv/dist/2020";
import { readFileSync } from "node:fs";
import { privateDraftHttp, itineraryDraftInput } from "../../../../../tests/fixtures/private-draft-http";
import { createItineraryClient } from "../../../../mobile/src/data/itinerary-client";
import { itineraryDraftRestoreInput, compareItineraryDraftContent, projectItineraryDraftContent } from "../../../../../packages/domain/src/itinerary/draft-content";
import type { ItineraryDraft } from "../../../../../packages/domain/src/itinerary/draft";

const hosts: Array<Awaited<ReturnType<typeof privateDraftHttp>>> = [];
afterEach(async () => { for (const host of hosts.splice(0)) await host.close(); });
const setup = async (directory?: string) => { const host = await privateDraftHttp({ directory }); hosts.push(host); return host; };
const stage = (id: string, hour: number, date = "2026-11-01") => ({ id, kind: "observation" as const, startsAt: `${date}T${hour}:00:00.000Z`, endsAt: `${date}T${hour + 1}:00:00.000Z` });
async function versions(host: Awaited<ReturnType<typeof setup>>) {
  const client = host.itineraryClient();
  const first = await client.command(itineraryDraftInput);
  const historical = await client.command({ command: "patch-draft", itineraryId: first.id, baseRevision: first.revision,
    patch: { title: "准备恢复的合成版本", inputs: { ...first.inputs, people: 3, origin: "旧出发地", overnight: true }, stages: [stage("old-observation", 14)] } });
  const current = await client.command({ command: "patch-draft", itineraryId: first.id, baseRevision: historical.revision,
    patch: { title: "当前合成版本", inputs: { ...first.inputs, date: "2026-11-02", people: 1, origin: "新出发地", overnight: false }, stages: [stage("new-observation", 16, "2026-11-02")] } });
  return { client, first, historical, current };
}
function inspect(host: Awaited<ReturnType<typeof setup>>) { return new DatabaseSync(join(host.directory, "itinerary-and-collaboration.sqlite")); }
function versionBodies(database: DatabaseSync) { return database.prepare("SELECT revision, body FROM itinerary_draft_versions ORDER BY revision").all() as Array<{ revision: number; body: string }>; }

describe("owner-visible itinerary revision recovery", () => {
  it("restores the whole legal historical aggregate within the unchanged command admission", async () => {
    const host = await setup(), client = host.itineraryClient();
    const first = await client.command({ ...itineraryDraftInput, input: { ...itineraryDraftInput.input, inputs: { ...itineraryDraftInput.input.inputs, origin: "x".repeat(40_000) } } });
    const start = Date.parse("2026-11-01T00:00:00.000Z");
    const stages = Array.from({ length: 200 }, (_, index) => ({ id: `supported-history-stage-${String(index).padStart(3, "0")}`, kind: "observation" as const,
      startsAt: new Date(start + index * 600_000).toISOString(), endsAt: new Date(start + (index + 1) * 600_000).toISOString() }));
    const historical = await client.command({ command: "patch-draft", itineraryId: first.id, baseRevision: first.revision, patch: { stages } });
    const current = await client.command({ command: "patch-draft", itineraryId: first.id, baseRevision: historical.revision, patch: { inputs: { ...first.inputs, origin: "new-origin" }, stages: [] } });
    const firstPosts = host.requests.filter(request => request.method === "POST");
    expect(firstPosts).toHaveLength(3); expect(firstPosts.every(request => Buffer.byteLength(request.body!) < 65_536)).toBe(true);
    const legacyBody = { command: "patch-draft", itineraryId: current.id, baseRevision: current.revision, patch: projectItineraryDraftContent(historical), idempotencyKey: "old-full-restore" };
    expect(Buffer.byteLength(JSON.stringify(legacyBody))).toBeGreaterThan(65_536);
    const database = inspect(host), before = versionBodies(database);
    try {
      const restored = await client.command(itineraryDraftRestoreInput(current, historical));
      expect(restored).toMatchObject({ id: current.id, revision: 4, sequence: 4, inputs: { origin: "x".repeat(40_000) }, stages });
      expect(versionBodies(database).slice(0, 3)).toEqual(before);
      const sentBody = host.requests.filter(request => request.method === "POST").at(-1)!.body!, sent = JSON.parse(sentBody);
      expect(Buffer.byteLength(sentBody)).toBeLessThan(65_536);
      expect(sent).toMatchObject({ command: "restore-draft", itineraryId: current.id, baseRevision: 3, sourceRevision: 2 });
      expect(sent).not.toHaveProperty("patch");
      const document = JSON.parse(readFileSync(new URL("../../../../../packages/contracts/openapi/v1.json", import.meta.url), "utf8"));
      const ajv = new Ajv2020({ strict: false, validateFormats: false }); ajv.addSchema({ $id: "restore-contract", components: document.components });
      const validate = ajv.compile({ $ref: "restore-contract#/components/schemas/ItineraryDraftCommand" });
      expect(validate(sent), JSON.stringify(validate.errors)).toBe(true);
      expect(validate({ ...sent, patch: { title: "caller content cannot replace the version reference" } })).toBe(false);
      const replayAlias = await host.app.inject({ method: "POST", url: "/v1/itineraries/commands", headers: { "x-private-command-owner": "owner-A" }, payload: sent });
      expect(replayAlias.statusCode).toBe(200); expect(replayAlias.json()).toMatchObject({ replayed: true, itinerary: { revision: 4 } });
      expect((await host.app.inject({ method: "POST", url: "/v2/itineraries/commands", payload: legacyBody })).statusCode).toBe(413);
      expect((await client.get(current.id)).revision).toBe(4);
    } finally { database.close(); }
  });

  it("resolves only the authorized, compatible source revision without trusting caller content", async () => {
    const host = await setup(), { client, historical, current } = await versions(host), database = inspect(host);
    const command = { ...itineraryDraftRestoreInput(current, historical), idempotencyKey: "source-bound-restore" };
    try {
      const before = versionBodies(database);
      host.actor("itinerary", "owner-B");
      expect((await host.app.inject({ method: "POST", url: "/v2/itineraries/commands", headers: { "x-private-command-owner": "owner-A" }, payload: command })).statusCode).toBe(403);
      expect((await host.app.inject({ method: "POST", url: "/v2/itineraries/commands", payload: command })).statusCode).toBe(404);
      host.actor("itinerary", "owner-A");
      const missing = await host.app.inject({ method: "POST", url: "/v2/itineraries/commands", payload: { ...command, sourceRevision: 99 } });
      expect(missing.statusCode).toBe(404); expect(missing.json()).toMatchObject({ code: "itinerary_restore_source_not_found" });
      const injected = await host.app.inject({ method: "POST", url: "/v2/itineraries/commands", payload: { ...command, patch: { title: "forged replacement" } } });
      expect(injected.statusCode).toBe(400);
      expect(versionBodies(database)).toEqual(before);
      const sourceRow = before.find(row => row.revision === historical.revision)!;
      const unsupported = JSON.parse(sourceRow.body); unsupported.inputs.futureEditableField = "must not disappear";
      database.prepare("UPDATE itinerary_draft_versions SET body = ? WHERE id = ? AND revision = ?").run(JSON.stringify(unsupported), current.id, historical.revision);
      const unsupportedBefore = versionBodies(database);
      const refused = await host.app.inject({ method: "POST", url: "/v2/itineraries/commands", payload: command });
      expect(refused.statusCode).toBe(422); expect(refused.json()).toMatchObject({ code: "itinerary_restore_source_incompatible" });
      expect(versionBodies(database)).toEqual(unsupportedBefore);
      expect(database.prepare("SELECT 1 FROM itinerary_draft_receipts WHERE command_key = ?").get(command.idempotencyKey)).toBeUndefined();
      expect((await client.get(current.id)).revision).toBe(3);
    } finally { database.close(); }
  });

  it("lists metadata, compares exact content and restores as a new durable version without rewriting history", async () => {
    const host = await setup(), { client, historical, current } = await versions(host), db = inspect(host);
    const before = versionBodies(db);
    try {
      const page = await client.history(current.id);
      expect(page.items.map(item => item.revision)).toEqual([3, 2, 1]);
      expect(Object.keys(page.items[0]).sort()).toEqual(["revision", "sequence", "title", "updatedAt"]);
      const prior = await client.getRevision(current.id, 2);
      expect(compareItineraryDraftContent(current, prior).changedFields).toEqual(expect.arrayContaining(["title", "inputs.origin", "inputs.people", "inputs.overnight", "stages"]));
      const restored = await client.command(itineraryDraftRestoreInput(current, prior));
      expect(restored).toMatchObject({ id: current.id, ownerId: "owner-A", revision: 4, sequence: 4, title: "准备恢复的合成版本", inputs: { date: "2026-11-01", people: 3, origin: "旧出发地", overnight: true }, stages: [stage("old-observation", 14)] });
      expect(restored.createdAt).toBe(current.createdAt); expect(restored.evidence).toEqual(current.evidence); expect(restored.source).toEqual(current.source);
      expect(versionBodies(db).slice(0, 3)).toEqual(before);
      const command = JSON.parse(host.requests.filter(request => request.method === "POST").at(-1)!.body!);
      await client.command({ command: "patch-draft", itineraryId: current.id, baseRevision: 4, patch: { title: "恢复之后的新编辑" } });
      const replay = await host.app.inject({ method: "POST", url: "/v2/itineraries/commands", headers: { "x-private-command-owner": "owner-A" }, payload: command });
      expect(replay.json()).toMatchObject({ replayed: true, itinerary: { revision: 4 }, receipt: { revision: 4 } });
      expect((await client.get(current.id)).revision).toBe(5);
      db.close(); await host.close();
      const reopened = await setup(host.directory);
      const readback = await reopened.app.inject({ method: "GET", url: `/v2/itineraries/${current.id}`, headers: { "x-private-command-owner": "owner-A" } });
      expect(readback.json()).toMatchObject({ itinerary: { revision: 5, title: "恢复之后的新编辑" } });
      expect((await reopened.app.inject({ method: "GET", url: `/v2/itineraries/${current.id}/revisions/4` })).json()).toMatchObject({ itinerary: { revision: 4, title: historical.title, stages: historical.stages } });
    } finally { if (db.isOpen) db.close(); }
  });

  it("rolls current, version and receipt back together and rejects a stale comparison without overwriting", async () => {
    const host = await setup(), { client, historical, current } = await versions(host), db = inspect(host);
    try {
      const input = itineraryDraftRestoreInput(current, historical), command = { ...input, idempotencyKey: "rollback-restore" };
      db.exec("CREATE TRIGGER fail_restore_receipt BEFORE INSERT ON itinerary_draft_receipts WHEN NEW.command_key = 'rollback-restore' BEGIN SELECT RAISE(ABORT, 'synthetic_receipt_failure'); END;");
      const before = versionBodies(db);
      const failed = await host.app.inject({ method: "POST", url: "/v2/itineraries/commands", payload: command });
      expect(failed.statusCode).toBe(503); expect(failed.json()).toMatchObject({ outcome: "unknown", retryWithSameCommand: true });
      expect((await client.get(current.id)).revision).toBe(3); expect(versionBodies(db)).toEqual(before);
      expect(db.prepare("SELECT 1 FROM itinerary_draft_receipts WHERE command_key = 'rollback-restore'").get()).toBeUndefined();
      db.exec("DROP TRIGGER fail_restore_receipt");
      const saved = await host.app.inject({ method: "POST", url: "/v2/itineraries/commands", payload: command });
      expect(saved.statusCode).toBe(200); expect(saved.json()).toMatchObject({ itinerary: { revision: 4 } });
      const changedReference = await host.app.inject({ method: "POST", url: "/v2/itineraries/commands", payload: { ...command, sourceRevision: 1 } });
      expect(changedReference.statusCode).toBe(409); expect(changedReference.json()).toMatchObject({ code: "itinerary_idempotency_conflict" });
      await expect(client.command(input)).rejects.toMatchObject({ code: "itinerary_revision_conflict", rejected: true });
      expect(await client.pending()).toBeNull(); expect((await client.get(current.id)).revision).toBe(4);
      expect(versionBodies(db).slice(0, 3)).toEqual(before);
    } finally { db.close(); }
  });

  it("paginates only metadata under the actual actor and validates the published new response contract", async () => {
    const host = await setup(), current = host.seedItinerary(), actor = { id: "owner-A", scope: "local-owner-poc" as const };
    let latest = current;
    for (let revision = 2; revision <= 53; revision++) latest = host.itinerary.service.command(actor, { command: "patch-draft", itineraryId: current.id, baseRevision: latest.revision, idempotencyKey: `page-${revision}`, patch: { title: `合成版本${revision}` } }).itinerary;
    const route = `/v2/itineraries/${current.id}/revisions`;
    const first = await host.app.inject({ method: "GET", url: route, headers: { "x-private-command-owner": "owner-A" } });
    expect(first.statusCode).toBe(200); expect(first.headers["cache-control"]).toBe("private, no-store"); expect(first.headers.vary).toContain("x-private-command-owner");
    expect(first.json().items).toHaveLength(50); expect(first.json().nextCursor).toBe("4");
    const last = await host.app.inject({ method: "GET", url: `${route}?cursor=4` });
    expect(last.json().items.map((item: { revision: number }) => item.revision)).toEqual([3, 2, 1]); expect(last.json().nextCursor).toBeNull();
    const document = JSON.parse(readFileSync(new URL("../../../../../packages/contracts/openapi/v1.json", import.meta.url), "utf8"));
    const ajv = new Ajv2020({ strict: false, validateFormats: false }); ajv.addSchema({ $id: "contract", components: document.components });
    const validate = ajv.compile({ $ref: "contract#/components/schemas/ItineraryDraftHistory" });
    expect(validate(first.json()), JSON.stringify(validate.errors)).toBe(true); expect(validate(last.json())).toBe(true);
    expect((await host.app.inject({ method: "GET", url: `${route}?cursor=broken` })).statusCode).toBe(400);
    expect((await host.app.inject({ method: "GET", url: `/v2/itineraries/missing/revisions` })).statusCode).toBe(404);
    host.actor("itinerary", "owner-B");
    expect((await host.app.inject({ method: "GET", url: route })).statusCode).toBe(404);
    expect((await host.app.inject({ method: "GET", url: route, headers: { "x-private-command-owner": "owner-A" } })).statusCode).toBe(403);
    host.actor("itinerary", null);
    expect((await host.app.inject({ method: "GET", url: route })).statusCode).toBe(403);
  });

  it("retains a lost restore body/key across client recreation and displays authoritative later current", async () => {
    const host = await setup(), { client, historical, current } = await versions(host);
    let lost = false;
    host.intercept(async (request, response) => { if (!lost && request.method === "POST") { lost = true; throw Error("lost_restore_reply"); } return response; });
    await expect(client.command(itineraryDraftRestoreInput(current, historical))).rejects.toThrow("lost_restore_reply");
    const pending = await client.pending(); expect(pending).toMatchObject({ command: "restore-draft", itineraryId: current.id, baseRevision: 3, sourceRevision: historical.revision, ownerQualification: { ownerId: "owner-A" } });
    const saved = host.itinerary.service.get({ id: "owner-A", scope: "local-owner-poc" }, current.id);
    host.itinerary.service.command({ id: "owner-A", scope: "local-owner-poc" }, { command: "patch-draft", idempotencyKey: "after-lost-restore", itineraryId: current.id, baseRevision: saved.revision, patch: { title: "更新的权威版本" } });
    const rebuilt = createItineraryClient(host.options);
    host.actor("itinerary", "owner-B"); await rebuilt.list();
    await expect(rebuilt.retry()).rejects.toMatchObject({ code: "itinerary_owner_mismatch" });
    expect(await rebuilt.pending()).toEqual(pending);
    expect(rebuilt.authority()).toMatchObject({ status: "ready", ownerId: "owner-B" });
    expect(host.itinerary.service.list({ id: "owner-B", scope: "local-owner-poc" }).items).toEqual([]);
    host.actor("itinerary", "owner-A"); await rebuilt.list();
    const confirmed = await rebuilt.retry();
    expect(confirmed).toMatchObject({ revision: 5, title: "更新的权威版本" }); expect(await rebuilt.pending()).toBeNull();
    const posts = host.requests.filter(request => request.method === "POST"); expect(posts.at(-1)!.body).toBe(posts.at(-2)!.body);
    expect(JSON.parse(posts.at(-1)!.body!).idempotencyKey).toBe(pending!.idempotencyKey);
  });
});
