// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createNotificationRulesClient } from "../../data/notification-rules-client";
import type { NotificationRule, NotificationRuleCommand } from "../../../../../packages/domain/src/notifications/rules";
import { ruleResult, savedRule } from "../../../../../tests/fixtures/notification-rules";

const shell = vi.hoisted(() => ({ state: { decisionContext: { target: "moon", timezone: "Asia/Shanghai" }, selectedSpot: { id: "selected-place", name: "已选地点A", coordinate: { lat: 25, lon: 115 } } as { id: string; name: string; coordinate: { lat: number; lon: number } } | null, location: { label: "出发地", latitude: 23, longitude: 113 }, displayMode: "planning" }, listeners: new Set<() => void>() }));
vi.mock("../../state/shell-store", async () => { const { useSyncExternalStore } = await import("react"); return { useShellStore: (select: (state: typeof shell.state) => unknown) => useSyncExternalStore(callback => { shell.listeners.add(callback); return () => shell.listeners.delete(callback); }, () => select(shell.state)) }; });
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "screen-rule-key" }));
vi.mock("../../data/runtime-api-base-url", () => ({ resolveRuntimeApiBaseUrl: () => "http://local-api" }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const node = ({ children, testID }: { children: ReactNode; testID?: string }) => createElement("div", { "data-testid": testID }, children);
  return { View: node, Text: node, ScrollView: node, StyleSheet: { create: (styles: unknown) => styles },
    Pressable: ({ children, onPress, disabled, testID }: { children: ReactNode; onPress(): void; disabled?: boolean; testID?: string }) => createElement("button", { onClick: onPress, disabled, "data-testid": testID }, children),
    TextInput: ({ value, onChangeText, editable, accessibilityLabel }: { value: string; onChangeText(value: string): void; editable: boolean; accessibilityLabel: string }) => createElement("input", { value, disabled: !editable, "aria-label": accessibilityLabel, onChange: (event: { target: { value: string } }) => onChangeText(event.target.value) }),
  };
});
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
function transport(loseFirstReply = false) {
  const values = new Map<string, string>(), rules = new Map<string, NotificationRule>(), receipts = new Map<string, ReturnType<typeof ruleResult>>(), posts: NotificationRuleCommand[] = [];
  let key = 0, loss = loseFirstReply;
  const fetcher = (async (url, init) => {
    if (String(url).endsWith("/v1/tools")) return response({ schemaVersion: "starward-tools-v1" });
    if (init?.method === "POST") {
      const command = JSON.parse(String(init.body)) as NotificationRuleCommand; posts.push(command);
      const old = receipts.get(command.idempotencyKey);
      if (old) return response({ ...old, replayed: true });
      let rule: NotificationRule;
      if (command.command === "create-rule") rule = { ...savedRule(1, command.input), id: `rule-${rules.size + 1}` };
      else {
        const current = rules.get(command.ruleId)!;
        if (current.revision !== command.baseRevision) return response({ code: "notification_rule_revision_conflict", outcome: "rejected" }, 409);
        rule = { ...current, revision: current.revision + 1, definition: command.command === "update-rule" ? command.input : { ...current.definition, enabled: command.enabled } };
      }
      rules.set(rule.id, rule); const receipt = ruleResult(command.idempotencyKey, rule); receipts.set(command.idempotencyKey, receipt);
      if (loss) { loss = false; throw new Error("reply_lost_after_commit"); }
      return response(receipt);
    }
    if (String(url).endsWith("/v2/notification-rules")) return response({ schemaVersion: "starward-notification-rules-v2", scope: "local-owner-poc", items: [...rules.values()], nextCursor: null });
    return response({ schemaVersion: "starward-notification-rules-v2", rule: rules.get(decodeURIComponent(String(url).split("/").at(-1)!)) });
  }) as typeof fetch;
  const storage = { getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } };
  return { values, rules, posts, fetcher, client: () => createNotificationRulesClient({ baseUrl: "http://local-api", storage, fetcher, newKey: () => `key-${++key}` }) };
}
describe("real Tools notification configuration consumer", () => {
  let root: import("react-dom/client").Root, container: HTMLDivElement, react: typeof import("react"), cache: QueryClient;
  beforeEach(async () => {
    react = await import("react"); (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    shell.state = { decisionContext: { target: "moon", timezone: "Asia/Shanghai" }, selectedSpot: { id: "selected-place", name: "已选地点A", coordinate: { lat: 25, lon: 115 } }, location: { label: "出发地", latitude: 23, longitude: 113 }, displayMode: "planning" };
    cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    container = document.createElement("div"); document.body.append(container); root = (await import("react-dom/client")).createRoot(container);
    vi.stubGlobal("fetch", (async () => response({ schemaVersion: "starward-tools-v1" })) as typeof fetch);
  });
  afterEach(async () => { await react.act(async () => root.unmount()); cache.clear(); container.remove(); vi.unstubAllGlobals(); });
  const button = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement;
  const field = (label: string) => container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
  async function waitFor(check: () => void) { await vi.waitFor(async () => { await react.act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); }); check(); }); }
  async function change(label: string, value: string) { await react.act(async () => { const element = field(label); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, value); element.dispatchEvent(new Event("input", { bubbles: true })); }); }
  async function open(client: ReturnType<typeof createNotificationRulesClient>) {
    const { ToolsScreen } = await import("./ToolsScreen");
    await react.act(async () => root.render(<QueryClientProvider client={cache}><ToolsScreen rulesClient={client} /></QueryClientProvider>));
    await react.act(async () => button("tools-create-pretrip-rule").click());
    await waitFor(() => expect(container.textContent).toContain("还没有规则"));
    await react.act(async () => button("notification-new-rule").click());
  }
  it("opens without a write, snapshots the selected place, retries after Context changes, edits and stops the definition", async () => {
    const host = transport(true); await open(host.client());
    expect(host.posts).toHaveLength(0); expect(field("地点名称").value).toBe("已选地点A"); expect(field("纬度 WGS84").value).toBe("25");
    const inputNode = field("条件指标"); inputNode.focus(); await change("条件指标", "cloud-cover");
    expect(field("条件指标")).toBe(inputNode); expect(document.activeElement).toBe(inputNode);
    await change("阈值", "25"); await change("阈值单位", "%");
    await react.act(async () => { shell.state = { ...shell.state, selectedSpot: { id: "other-place", name: "地点B", coordinate: { lat: 30, lon: 120 } }, decisionContext: { target: "jupiter", timezone: "Asia/Shanghai" } }; shell.listeners.forEach(listener => listener()); });
    expect(field("地点名称").value).toBe("已选地点A"); expect(field("目标").value).toBe("moon");
    await react.act(async () => button("notification-save-rule").click());
    await waitFor(() => expect(button("notification-retry-save")).not.toBeNull());
    expect(host.posts[0]).toMatchObject({ command: "create-rule", input: { enabled: false, target: "moon", location: { label: "已选地点A", latitude: 25, longitude: 115, spotId: "selected-place" } } });
    expect(button("notification-new-rule").disabled).toBe(true);
    const saved = host.rules.get("rule-1")!;
    host.rules.set("rule-1", { ...saved, revision: 2, definition: { ...saved.definition, enabled: true } });
    await react.act(async () => button("notification-retry-save").click());
    await waitFor(() => expect(container.textContent).toContain("规则配置已保存 · 版本 2"));
    expect(host.posts[1]).toEqual(host.posts[0]); expect(host.values.size).toBe(0);
    expect(container.textContent).toContain("尚未评估，尚未投递"); expect(container.textContent).not.toContain("76→82");
    await react.act(async () => button("notification-edit-rule").click());
    await change("阈值", "30");
    await react.act(async () => button("notification-save-rule").click());
    await waitFor(() => expect(container.textContent).toContain("规则配置已保存 · 版本 3"));
    expect(host.posts[2]).toMatchObject({ command: "update-rule", ruleId: "rule-1", baseRevision: 2, input: { threshold: { value: 30 }, location: { label: "已选地点A" }, target: "moon" } });
    await react.act(async () => button("notification-toggle-rule").click());
    await waitFor(() => expect(container.textContent).toContain("规则配置已保存 · 版本 4"));
    expect(host.posts[3]).toMatchObject({ command: "set-rule-enabled", baseRevision: 3, enabled: false });
    expect(host.rules.get("rule-1")!.definition.enabled).toBe(false);
  });
  it("keeps a conflicting full form, reads current without overwriting it and explicitly saves a separate rule", async () => {
    const host = transport(); await open(host.client());
    await change("条件指标", "cloud-cover"); await change("阈值", "25"); await change("阈值单位", "%");
    await react.act(async () => button("notification-save-rule").click());
    await waitFor(() => expect(button("notification-edit-rule")).not.toBeNull());
    await react.act(async () => button("notification-edit-rule").click()); await change("阈值", "31");
    const old = host.rules.get("rule-1")!; host.rules.set("rule-1", { ...old, revision: 2, definition: { ...old.definition, threshold: { ...old.definition.threshold, value: 40 } } });
    await react.act(async () => button("notification-save-rule").click());
    await waitFor(() => expect(container.textContent).toContain("规则已有新版本"));
    expect(field("阈值").value).toBe("31"); expect(host.values.size).toBe(0);
    await react.act(async () => button("notification-load-latest").click());
    await waitFor(() => expect(container.textContent).toContain("规则配置已保存 · 版本 2"));
    expect(field("阈值").value).toBe("31");
    await react.act(async () => button("notification-save-as-new").click());
    await react.act(async () => button("notification-save-rule").click());
    await waitFor(() => expect(host.rules.size).toBe(2));
    expect(host.rules.get("rule-1")!.definition.threshold.value).toBe(40);
    expect(host.rules.get("rule-2")!.definition.threshold.value).toBe(31);
  });
});
