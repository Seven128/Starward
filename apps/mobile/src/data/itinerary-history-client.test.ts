import { afterEach, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "unused-history-key" }));
import { privateDraftHttp } from "../../../../tests/fixtures/private-draft-http";
import type { ItineraryDraft } from "../../../../packages/domain/src/itinerary/draft";

const hosts: Array<Awaited<ReturnType<typeof privateDraftHttp>>> = [];
afterEach(async () => { for (const host of hosts.splice(0)) await host.close(); });
const badSnapshots: Array<[string, (draft: ItineraryDraft) => unknown]> = [
  ["another id", draft => ({ ...draft, id: "another-plan" })],
  ["another revision", draft => ({ ...draft, revision: 2 })],
  ["another owner", draft => ({ ...draft, ownerId: "owner-B" })],
  ["unsupported schema", draft => ({ ...draft, schemaVersion: "unsupported-draft" })],
  ["an unsupported editable field", draft => ({ ...draft, inputs: { ...draft.inputs, unrecognizedIntent: "must-not-be-omitted" } })],
  ["an array in a declared scalar", draft => ({ ...draft, inputs: { ...draft.inputs, transport: ["drive"] } })],
];
it.each(badSnapshots)("rejects selected history containing %s before it can become restore content", async (_name, corrupt) => {
  const host = await privateDraftHttp(); hosts.push(host);
  const saved = host.seedItinerary(), client = host.itineraryClient(); await client.list();
  host.intercept(async (request, response) => {
    if (request.path.endsWith("/revisions/1") && response.ok) { const body = await response.json(); return new Response(JSON.stringify({ ...body, itinerary: corrupt(body.itinerary) }), { status: 200 }); }
    return response;
  });
  await expect(client.getRevision(saved.id, 1)).rejects.toMatchObject({ code: "itinerary_history_response_invalid" });
  expect(client.authority()).toMatchObject({ status: "ready", ownerId: "owner-A" }); expect(await client.pending()).toBeNull();
  expect(host.requests.every(request => request.method === "GET")).toBe(true);
  expect(host.itinerary.service.get({ id: "owner-A", scope: "local-owner-poc" }, saved.id)).toEqual(saved);
});

it("requires independent current-owner qualification and does not acquire it from a history page", async () => {
  const host = await privateDraftHttp(); hosts.push(host);
  const saved = host.seedItinerary(), client = host.itineraryClient();
  await expect(client.history(saved.id)).rejects.toMatchObject({ code: "itinerary_owner_unconfirmed" });
  await expect(client.getRevision(saved.id, 1)).rejects.toMatchObject({ code: "itinerary_owner_unconfirmed" }); expect(host.requests).toHaveLength(0);
  await client.list();
  host.intercept(async (request, response) => {
    if (request.path.endsWith("/revisions") && response.ok) { const body = await response.json(); return new Response(JSON.stringify({ ...body, ownerQualification: { ...body.ownerQualification, ownerId: "owner-B" } }), { status: 200 }); }
    return response;
  });
  await expect(client.history(saved.id)).rejects.toMatchObject({ code: "itinerary_history_response_invalid" });
  expect(client.authority()).toMatchObject({ status: "ready", ownerId: "owner-A" }); expect(host.requests.every(request => request.method === "GET")).toBe(true);
});
