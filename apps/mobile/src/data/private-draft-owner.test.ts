import { expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "unused-test-key" }));
import { privateDraftHttp, itineraryDraftInput, type DraftFamily } from "../../../../tests/fixtures/private-draft-http";
import { fieldReportInput } from "../../../../tests/fixtures/field-reports";

const actor = (id: string) => ({ id, scope: "local-owner-poc" as const });
function storedBodies(directory: string, family: DraftFamily) {
  const database = new DatabaseSync(join(directory, family === "itinerary" ? "itinerary-and-collaboration.sqlite" : "field-offline-safety.sqlite"));
  try {
    const tables = family === "itinerary" ? ["itinerary_drafts", "itinerary_draft_versions", "itinerary_draft_receipts"] : ["field_report_drafts", "field_report_versions", "field_report_receipts"];
    return tables.map(table => database.prepare(`SELECT body FROM ${table} WHERE actor_id = ? ORDER BY rowid`).all("owner-A"));
  } finally { database.close(); }
}
it.each(["itinerary", "field"] as DraftFamily[])("%s keeps A's exact attempt under B, then reconciles A before a new key", async family => {
  const host = await privateDraftHttp();
  try {
    let lost = true;
    host.intercept(async (request, response) => { if (lost && request.method === "POST" && response.ok) { lost = false; throw Error("reply_lost_after_real_commit"); } return response; });
    const first = family === "itinerary" ? host.itineraryClient() : host.fieldClient();
    const command = () => family === "itinerary" ? host.itineraryClient().command(itineraryDraftInput)
      : host.fieldClient().command({ command: "create-report-draft", input: fieldReportInput() });
    // The actual client that acquires qualification also persists the attempt.
    await expect(family === "itinerary" ? (first as ReturnType<typeof host.itineraryClient>).command(itineraryDraftInput)
      : (first as ReturnType<typeof host.fieldClient>).command({ command: "create-report-draft", input: fieldReportInput() })).rejects.toThrow("reply_lost_after_real_commit");
    const pending = await first.pending(), raw = [...host.values.values()][0];
    expect(pending?.ownerQualification).toEqual({ schemaVersion: "starward-private-command-owner-v1", ownerId: "owner-A" });
    const beforePost = host.requests.find(request => request.method === "POST")!;
    const originalStoredBodies = storedBodies(host.directory, family);
    expect(beforePost.headers.get("x-private-command-owner")).toBe("owner-A");
    expect(beforePost.body).not.toContain("ownerQualification"); expect(beforePost.body).not.toContain("requestedOwnerId");
    host.actor(family, "owner-B");
    const restarted = family === "itinerary" ? host.itineraryClient() : host.fieldClient();
    expect((await restarted.list()).items).toHaveLength(0);
    await expect(restarted.retry()).rejects.toMatchObject({ code: family === "itinerary" ? "itinerary_owner_mismatch" : "field_report_owner_mismatch" });
    expect([...host.values.values()][0]).toBe(raw); expect(restarted.authority()).toMatchObject({ status: "ready", ownerId: "owner-B" });
    const bRows = family === "itinerary" ? host.itinerary.service.list(actor("owner-B")) : host.field.service.list(actor("owner-B"));
    expect(bRows.items).toHaveLength(0);
    host.actor(family, "owner-A");
    const confirmed = await restarted.retry();
    expect(confirmed.ownerId).toBe("owner-A"); expect(await restarted.pending()).toBeNull();
    expect(storedBodies(host.directory, family)).toEqual(originalStoredBodies);
    // Original A confirmation cannot publish itself over the already observed B.
    expect(restarted.authority()).toMatchObject({ status: "ready", ownerId: "owner-B" }); expect(restarted.canPublish(confirmed)).toBe(false);
    const posts = host.requests.filter(request => request.method === "POST");
    expect(posts).toHaveLength(3); expect(posts.every(request => request.body === beforePost.body)).toBe(true);
    await command();
    const last = host.requests.filter(request => request.method === "POST").at(-1)!;
    expect(JSON.parse(last.body!).idempotencyKey).not.toBe(pending?.idempotencyKey);
    expect(family === "itinerary" ? host.itinerary.service.list(actor("owner-A")).items : host.field.service.list(actor("owner-A")).items).toHaveLength(2);
  } finally { await host.close(); }
});
it.each(["itinerary", "field"] as DraftFamily[])("%s never retrofits a legacy or malformed original qualification from matching receipts", async family => {
  const host = await privateDraftHttp();
  try {
    host.intercept(async (request, response) => { if (request.method === "POST" && response.ok) throw Error("lost_commit"); return response; });
    const client = family === "itinerary" ? host.itineraryClient() : host.fieldClient();
    await expect(family === "itinerary" ? (client as ReturnType<typeof host.itineraryClient>).command(itineraryDraftInput)
      : (client as ReturnType<typeof host.fieldClient>).command({ command: "create-report-draft", input: fieldReportInput() })).rejects.toThrow("lost_commit");
    const [slot, raw] = [...host.values.entries()][0], stored = JSON.parse(raw);
    delete stored.ownerQualification;
    const wire = JSON.parse(host.requests.find(request => request.method === "POST")!.body!);
    if (family === "itinerary") host.itinerary.service.command(actor("owner-B"), wire); else host.field.service.command(actor("owner-B"), wire);
    host.intercept(undefined); host.actor(family, "owner-B");
    const restarted = family === "itinerary" ? host.itineraryClient() : host.fieldClient(); await restarted.list();
    for (const qualification of [undefined, { schemaVersion: "starward-private-command-owner-v1", ownerId: "owner-A", extra: true }]) {
      const value = JSON.stringify(qualification === undefined ? stored : { ...stored, ownerQualification: qualification });
      host.values.set(slot, value); const count = host.requests.length;
      await expect(restarted.retry()).rejects.toMatchObject({ code: family === "itinerary" ? qualification ? "itinerary_pending_invalid" : "itinerary_pending_owner_unqualified" : qualification ? "field_report_pending_invalid" : "field_report_pending_owner_unqualified" });
      expect(host.requests).toHaveLength(count); expect(host.values.get(slot)).toBe(value);
    }
  } finally { await host.close(); }
});
it.each(["itinerary", "field"] as DraftFamily[])("%s refuses a new dispatch when an older API cannot qualify its owner", async family => {
  const host = await privateDraftHttp();
  try {
    const client = family === "itinerary" ? host.itineraryClient() : host.fieldClient();
    await client.list(); expect(client.authority()).toMatchObject({ status: "ready", ownerId: "owner-A" });
    host.intercept(async (request, response) => {
      if (request.method === "GET" && !request.path.split("/").slice(3).length) { const value = await response.json(); delete value.ownerQualification; return new Response(JSON.stringify(value), { status: 200 }); }
      return response;
    });
    await expect(family === "itinerary" ? (client as ReturnType<typeof host.itineraryClient>).command(itineraryDraftInput)
      : (client as ReturnType<typeof host.fieldClient>).command({ command: "create-report-draft", input: fieldReportInput() })).rejects.toMatchObject({ code: family === "itinerary" ? "itinerary_owner_unconfirmed" : "field_report_owner_unconfirmed" });
    expect(client.authority()).toMatchObject({ status: "unknown", ownerId: null });
    expect(host.requests.every(request => request.method !== "POST")).toBe(true); expect(host.values.size).toBe(0);
  } finally { await host.close(); }
});

it.each(["itinerary", "field"] as DraftFamily[])("%s rejects list results begun before denial until a fresh read qualifies", async family => {
  const host = await privateDraftHttp();
  let release = () => {};
  try {
    const saved = family === "itinerary" ? host.seedItinerary() : host.seedField();
    const client = family === "itinerary" ? host.itineraryClient() : host.fieldClient();
    const originalPage = await client.list();
    const canPublishLibrary = (page: typeof originalPage) => page.schemaVersion === "starward-itinerary-v2"
      ? (client as ReturnType<typeof host.itineraryClient>).canPublishLibrary(page)
      : (client as ReturnType<typeof host.fieldClient>).canPublishLibrary(page);
    expect(originalPage.items).toHaveLength(1);
    expect(canPublishLibrary(originalPage)).toBe(true);

    let signalReady!: () => void;
    const ready = new Promise<void>(resolve => { signalReady = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    let hold = true;
    host.intercept(async (request, response) => {
      const listPath = family === "itinerary" ? "/v2/itineraries" : "/v2/field-reports";
      if (hold && request.method === "GET" && request.path === listPath && response.ok) {
        hold = false; signalReady(); await held;
      }
      return response;
    });
    const oldList = client.list();
    await ready;
    host.actor(family, null);
    await expect(client.get(saved.id)).rejects.toMatchObject({ statusCode: 403 });
    expect(client.authority()).toEqual({ status: "denied", ownerId: "owner-A" });
    expect(canPublishLibrary(originalPage)).toBe(false);
    expect(host.requests.map(request => request.status)).toEqual([200, 200, 403]);

    release();
    await expect(oldList).rejects.toMatchObject({ code: family === "itinerary" ? "itinerary_owner_changed" : "field_report_owner_changed" });
    expect(client.authority()).toEqual({ status: "denied", ownerId: "owner-A" });
    expect(canPublishLibrary(originalPage)).toBe(false);

    host.intercept(undefined);
    host.actor(family, "owner-A");
    const restoredPage = await client.list();
    expect(client.authority()).toEqual({ status: "ready", ownerId: "owner-A" });
    expect(restoredPage.items).toHaveLength(1);
    expect(canPublishLibrary(restoredPage)).toBe(true);
    expect(host.values.size).toBe(0);
    expect(host.requests.every(request => request.method === "GET")).toBe(true);
  } finally { release(); await host.close(); }
});
