import { describe, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "generated-rule-key" }));
import { createNotificationRulesClient as createRuleClient } from "./notification-rules-client";
import { ruleDefinition, ruleResult, savedRule, withRuleOwnerQualification } from "../../../../tests/fixtures/notification-rules";
import type { NotificationRuleInput } from "./notification-rules-client";
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
function storage() { const values = new Map<string, string>(); return { values, getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } }; }
const input = (): NotificationRuleInput => ({ command: "create-rule", input: ruleDefinition() });
const createNotificationRulesClient = (options: Parameters<typeof createRuleClient>[0]) => createRuleClient({ ...options,
  fetcher: withRuleOwnerQualification(options?.fetcher ?? fetch) });
describe("notification configuration pending command owner", () => {
  it("captures payload/key before async storage, joins duplicate taps and blocks another intent", async () => {
    const port = storage(); let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    let reads = 0, keys = 0; const posts: string[] = [];
    const fetcher = (async (_url, init) => {
      if (init?.method === "POST") { expect(port.values.size).toBe(1); posts.push(String(init.body)); return response(ruleResult("key-1")); }
      return response({ schemaVersion: "starward-notification-rules-v2", rule: savedRule() });
    }) as typeof fetch;
    const client = createNotificationRulesClient({ baseUrl: "http://api", storage: { ...port, getItem: async key => { if (++reads === 1) await held; return port.getItem(key); } }, fetcher, newKey: () => `key-${++keys}` });
    const original = input(); const same = structuredClone(original);
    const first = client.command(original), duplicate = client.command(same);
    expect(first).toBe(duplicate); expect(keys).toBeGreaterThan(0);
    if (original.command === "create-rule") { original.input.target = "changed"; original.input.threshold.unit = "changed-unit"; }
    await expect(client.command({ command: "create-rule", input: { ...ruleDefinition(), target: "different" } })).rejects.toThrow("notification_rule_save_in_progress");
    release(); await first;
    expect(posts).toHaveLength(1); expect(JSON.parse(posts[0])).toMatchObject({ idempotencyKey: "key-1", input: { target: "moon", threshold: { unit: "%" } } });
  });
  it("retries the exact original command after loss/recreation and reads current instead of historical replay", async () => {
    const port = storage(), posts: string[] = []; let lose = true;
    const fetcher = (async (_url, init) => {
      if (init?.method === "POST") { posts.push(String(init.body)); if (lose) { lose = false; throw new Error("lost_rule_reply"); } return response({ ...ruleResult(), replayed: true }); }
      return response({ schemaVersion: "starward-notification-rules-v2", rule: savedRule(2, { ...ruleDefinition(), enabled: true }) });
    }) as typeof fetch;
    const first = createNotificationRulesClient({ baseUrl: "http://api", storage: port, fetcher, newKey: () => "same-key" });
    await expect(first.command(input())).rejects.toThrow("lost_rule_reply");
    const next = createNotificationRulesClient({ baseUrl: "http://api", storage: port, fetcher, newKey: () => "never-use" });
    await expect(next.command(input())).rejects.toThrow("notification_rule_pending_requires_retry");
    await expect(next.retry()).resolves.toMatchObject({ revision: 2, definition: { enabled: true } });
    expect(posts[1]).toBe(posts[0]); expect(await next.pending()).toBeNull();
  });
  it("preserves an unknown command after later input parsing refuses it", async () => {
    const port = storage(), posts: string[] = [];
    let phase: "lost" | "parse" | "recover" = "lost";
    const fetcher = (async (_url, init) => {
      if (init?.method === "POST") {
        posts.push(String(init.body));
        if (phase === "lost") throw new Error("lost_reply_after_commit");
        if (phase === "parse") return response({ code: "invalid_notification_rule_expiry", outcome: "rejected" }, 400);
        return response({ ...ruleResult(), replayed: true });
      }
      return response({ schemaVersion: "starward-notification-rules-v2", rule: savedRule(2, { ...ruleDefinition(), enabled: true }) });
    }) as typeof fetch;
    const first = createNotificationRulesClient({ baseUrl: "http://api", storage: port, fetcher, newKey: () => "same-key" });
    await expect(first.command(input())).rejects.toThrow("lost_reply_after_commit");
    const original = [...port.values.values()][0]; expect(original).toBeTruthy();
    phase = "parse";
    const restarted = createNotificationRulesClient({ baseUrl: "http://api", storage: port, fetcher, newKey: () => "must-not-be-sent" });
    await expect(restarted.retry()).rejects.toMatchObject({ code: "invalid_notification_rule_expiry", rejected: false });
    expect([...port.values.values()][0]).toBe(original); expect(posts[1]).toBe(posts[0]);
    await expect(restarted.command(input())).rejects.toThrow("notification_rule_pending_requires_retry");
    phase = "recover";
    await expect(restarted.retry()).resolves.toMatchObject({ revision: 2, definition: { enabled: true } });
    expect(posts[2]).toBe(posts[0]); expect(await restarted.pending()).toBeNull();
  });
  it.each([403, 404, 503])("retains a successful command when current readback returns %i", async status => {
    const port = storage();
    const client = createNotificationRulesClient({ baseUrl: "http://api", storage: port, newKey: () => "same-key", fetcher: (async (_url, init) => init?.method === "POST" ? response(ruleResult()) : response({ code: "unavailable", outcome: "rejected" }, status)) as typeof fetch });
    await expect(client.command(input())).rejects.toThrow("notification_rule_readback_unconfirmed");
    expect((await client.pending())?.idempotencyKey).toBe("same-key");
  });
  it("rejects wrong-identity readback and keeps the original key for recovery", async () => {
    const port = storage();
    const client = createNotificationRulesClient({ baseUrl: "http://api", storage: port, newKey: () => "same-key", fetcher: (async (_url, init) => response(init?.method === "POST" ? ruleResult() : { schemaVersion: "starward-notification-rules-v2", rule: { ...savedRule(), id: "other-rule" } })) as typeof fetch });
    await expect(client.command(input())).rejects.toThrow("notification_rule_readback_unconfirmed");
    expect((await client.pending())?.idempotencyKey).toBe("same-key");
  });
  it("clears only a proven initial refusal, retaining generic/retry size failures and command conflicts", async () => {
    const port = storage(); let code = "notification_rule_request_body_too_large", outcome: string | undefined = "rejected", status = 413;
    const fetcher = (async () => response({ code, outcome }, status)) as typeof fetch;
    const client = createNotificationRulesClient({ baseUrl: "http://api", storage: port, fetcher, newKey: () => "same-key" });
    await expect(client.command(input())).rejects.toMatchObject({ rejected: true }); expect(await client.pending()).toBeNull();
    code = "request_body_too_large"; outcome = undefined;
    await expect(client.command(input())).rejects.toMatchObject({ rejected: false });
    code = "notification_rule_request_body_too_large"; outcome = "rejected";
    await expect(client.retry()).rejects.toMatchObject({ rejected: false }); expect(await client.pending()).not.toBeNull();
    code = "notification_rule_idempotency_conflict"; status = 409;
    await expect(client.retry()).rejects.toMatchObject({ rejected: false }); expect(await client.pending()).not.toBeNull();
  });
  it("never dispatches an effect after pending storage fails and never discards a corrupt pending row", async () => {
    const port = storage(), fetcher = vi.fn();
    const client = createNotificationRulesClient({ baseUrl: "http://api", fetcher: fetcher as typeof fetch, storage: { ...port, setItem: async () => { throw new Error("storage_full"); } } });
    await expect(client.command(input())).rejects.toThrow("storage_full"); expect(fetcher).not.toHaveBeenCalled();
    port.values.set("starward-notification-rule-pending-v2:http://api", '{"command":"unsupported","idempotencyKey":"original"}');
    await expect(client.retry()).rejects.toThrow("notification_rule_pending_invalid");
    expect(port.values.size).toBe(1); expect(fetcher).not.toHaveBeenCalled();
  });
});
