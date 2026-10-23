import { describe, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "generated-key" }));
import { createItineraryClient } from "./itinerary-client";
import type { ItineraryDraft, ItineraryDraftResult } from "../../../../packages/domain/src/itinerary/draft";
const input = { command: "create-draft" as const, input: { title: "原始夜晚", timezone: "Asia/Shanghai", inputs: { date: "2026-11-01", origin: "广州", people: 2, transport: "drive" as const, target: "moon", userType: "family", latestReturnLocal: null, overnight: false, collaborative: false as const } } };
function storage() { const values = new Map<string, string>(); return { values, getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } }; }
function plan(revision = 1): ItineraryDraft { return { schemaVersion: "starward-itinerary-draft-v1", id: "plan-1", ownerId: "local-owner", title: input.input.title, timezone: input.input.timezone, revision, sequence: revision, createdAt: "2026-10-23T12:00:00Z", updatedAt: "2026-10-23T12:00:00Z", inputs: input.input.inputs, source: { kind: "user-input", capturedAt: "2026-10-23T12:00:00Z" }, state: "draft", evidence: { route: "missing", weather: "missing", astronomy: "missing", spot: "unverified" }, stages: [], stops: [], operationLog: [] }; }
function reply(key: string): ItineraryDraftResult { return { schemaVersion: "starward-itinerary-v2", status: "saved", replayed: false, itinerary: plan(), receipt: { idempotencyKey: key, itineraryId: "plan-1", revision: 1, committedAt: "2026-10-23T12:00:00Z" } }; }
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

describe("itinerary client command recovery", () => {
  it("does not turn a generic 413 or a retry parser rejection into proof about an earlier attempt", async () => {
    const port = storage(); let specific = false; const posts: string[] = [];
    const fetcher = (async (_url, init) => { posts.push(String(init?.body)); return response(specific ? { code: "itinerary_request_body_too_large", outcome: "rejected" } : { code: "request_body_too_large" }, 413); }) as typeof fetch;
    const first = createItineraryClient({ baseUrl: "http://api", fetcher, storage: port, newKey: () => "same-key" });
    await expect(first.command(input)).rejects.toMatchObject({ code: "request_body_too_large", rejected: false });
    expect((await first.pending())?.idempotencyKey).toBe("same-key");
    specific = true;
    const restarted = createItineraryClient({ baseUrl: "http://api", fetcher, storage: port, newKey: () => "must-not-be-used" });
    await expect(restarted.retry()).rejects.toMatchObject({ code: "itinerary_request_body_too_large", rejected: false });
    expect(posts[1]).toBe(posts[0]); expect((await restarted.pending())?.idempotencyKey).toBe("same-key");
    await expect(restarted.command({ ...input, input: { ...input.input, title: "changed" } })).rejects.toThrow("itinerary_pending_requires_retry");
  });
  it("persists before sending and replays the exact original input after a lost reply and client restart", async () => {
    const port = storage(); const posts: string[] = []; let lost = true;
    const fetcher = (async (_url, init) => {
      if (init?.method === "POST") {
        expect(port.values.size).toBe(1); posts.push(String(init.body));
        if (lost) { lost = false; throw new Error("reply_lost_after_commit"); }
        return response({ ...reply("same-key"), replayed: true });
      }
      return response({ schemaVersion: "starward-itinerary-v2", itinerary: { ...plan(2), title: "后续已确认的修改" } });
    }) as typeof fetch;
    const first = createItineraryClient({ baseUrl: "http://api", fetcher, storage: port, newKey: () => "same-key" });
    await expect(first.command(input)).rejects.toThrow("reply_lost_after_commit");
    const restarted = createItineraryClient({ baseUrl: "http://api", fetcher, storage: port, newKey: () => "must-not-be-used" });
    await expect(restarted.command({ ...input, input: { ...input.input, title: "新的浏览上下文" } })).rejects.toThrow("itinerary_pending_requires_retry");
    await expect(restarted.retry()).resolves.toMatchObject({ revision: 2, title: "后续已确认的修改" });
    expect(posts).toHaveLength(2); expect(posts[1]).toBe(posts[0]); expect(await restarted.pending()).toBeNull();
  });
  it("preserves an unknown command after later input parsing refuses it", async () => {
    const port = storage(), posts: string[] = [];
    let phase: "lost" | "parse" | "recover" = "lost";
    const fetcher = (async (_url, init) => {
      if (init?.method === "POST") {
        posts.push(String(init.body));
        if (phase === "lost") throw new Error("lost_reply_after_commit");
        if (phase === "parse") return response({ code: "invalid_itinerary_input", outcome: "rejected" }, 400);
        return response({ ...reply("same-key"), replayed: true });
      }
      return response({ schemaVersion: "starward-itinerary-v2", itinerary: plan(2) });
    }) as typeof fetch;
    const first = createItineraryClient({ baseUrl: "http://api", storage: port, fetcher, newKey: () => "same-key" });
    await expect(first.command(input)).rejects.toThrow("lost_reply_after_commit");
    const original = [...port.values.values()][0]; expect(original).toBeTruthy();
    phase = "parse";
    const restarted = createItineraryClient({ baseUrl: "http://api", storage: port, fetcher, newKey: () => "must-not-be-sent" });
    await expect(restarted.retry()).rejects.toMatchObject({ code: "invalid_itinerary_input", rejected: false });
    expect([...port.values.values()][0]).toBe(original); expect(posts[1]).toBe(posts[0]);
    await expect(restarted.command(input)).rejects.toThrow("itinerary_pending_requires_retry");
    phase = "recover";
    await expect(restarted.retry()).resolves.toMatchObject({ revision: 2 });
    expect(posts[2]).toBe(posts[0]); expect(await restarted.pending()).toBeNull();
  });
  it.each([403, 404])("keeps a committed command when its readback returns %i", async status => {
    const port = storage(); const posts: string[] = []; let unavailable = true;
    const fetcher = (async (_url, init) => {
      if (init?.method === "POST") { posts.push(String(init.body)); return response(reply("same-key")); }
      return unavailable ? response({ code: "itinerary_not_found", outcome: "rejected" }, status) : response({ schemaVersion: "starward-itinerary-v2", itinerary: plan() });
    }) as typeof fetch;
    const client = createItineraryClient({ baseUrl: "http://api", fetcher, storage: port, newKey: () => "same-key" });
    await expect(client.command(input)).rejects.toThrow("itinerary_readback_unconfirmed");
    expect((await client.pending())?.idempotencyKey).toBe("same-key"); unavailable = false;
    await expect(client.retry()).resolves.toMatchObject({ id: "plan-1" }); expect(posts[1]).toBe(posts[0]);
  });
  it("rejects mismatched readback identity and permits correction after a known command rejection", async () => {
    const port = storage(); let rejected = false;
    const fetcher = (async (_url, init) => init?.method === "POST" ? rejected ? response({ code: "itinerary_revision_conflict", outcome: "rejected" }, 409) : response(reply("same-key")) : response({ schemaVersion: "starward-itinerary-v2", itinerary: { ...plan(), id: "someone-elses-plan" } })) as typeof fetch;
    const client = createItineraryClient({ baseUrl: "http://api", fetcher, storage: port, newKey: () => "same-key" });
    await expect(client.command(input)).rejects.toThrow("itinerary_readback_unconfirmed"); expect(await client.pending()).not.toBeNull();
    rejected = true; await expect(client.retry()).rejects.toThrow("itinerary_revision_conflict"); expect(await client.pending()).toBeNull();
  });
  it("never sends if the original command cannot be durably stored", async () => {
    const port = storage(); const fetcher = vi.fn(); port.setItem = async () => { throw new Error("storage_unavailable"); };
    const client = createItineraryClient({ baseUrl: "http://api", fetcher: fetcher as unknown as typeof fetch, storage: port });
    await expect(client.command(input)).rejects.toThrow("storage_unavailable"); expect(fetcher).not.toHaveBeenCalled();
  });
  it("preserves an uncertain attempt when retry loses authority", async () => {
    const port = storage(); let first = true;
    const fetcher = (async () => { if (first) { first = false; throw new Error("unknown_commit"); } return response({ code: "itinerary_owner_required", outcome: "rejected" }, 403); }) as typeof fetch;
    const client = createItineraryClient({ baseUrl: "http://api", fetcher, storage: port, newKey: () => "same-key" });
    await expect(client.command(input)).rejects.toThrow("unknown_commit");
    await expect(client.retry()).rejects.toThrow("itinerary_owner_required");
    expect((await client.pending())?.idempotencyKey).toBe("same-key");
  });
});
