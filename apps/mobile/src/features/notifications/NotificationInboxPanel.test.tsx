// @vitest-environment jsdom
import type { ReactNode } from "react";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createNotificationInboxClient } from "../../data/notification-inbox-client";
import { createNotificationRulesClient } from "../../data/notification-rules-client";
import { buildApi } from "../../../../api/src/server";
import { createNotificationToolsRuntime } from "../../../../api/src/modules/notifications/runtime";
import { ForecastQueryService } from "../../../../api/src/modules/forecast/forecast-query-service";
import { notificationForecastQuery, notificationWeatherRule, notificationWeatherRun } from "../../../../../tests/fixtures/notification-weather";

const shell = vi.hoisted(() => ({ state: { displayMode: "planning", decisionContext: { target: "moon", timezone: "UTC" }, selectedSpot: { id: "point", name: "已选地点", coordinate: { lat: 0, lon: 0 } }, location: { label: "出发地", latitude: 0, longitude: 0 } }, listeners: new Set<() => void>() }));
const lifecycle = vi.hoisted(() => ({ listeners: new Set<(state: string) => void>() }));
vi.mock("../../state/shell-store", async () => { const { useSyncExternalStore } = await import("react"); return { useShellStore: (select: (state: typeof shell.state) => unknown) => useSyncExternalStore(callback => { shell.listeners.add(callback); return () => shell.listeners.delete(callback); }, () => select(shell.state)) }; });
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "native-inbox-key" }));
vi.mock("../../data/runtime-api-base-url", () => ({ resolveRuntimeApiBaseUrl: () => "http://controlled-tools" }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const node = ({ children, testID }: { children: ReactNode; testID?: string }) => createElement("div", { "data-testid": testID }, children);
  return { View: node, Text: node, ScrollView: node, StyleSheet: { create: (styles: unknown) => styles },
    AppState: { addEventListener(_event: string, callback: (state: string) => void) { lifecycle.listeners.add(callback); return { remove() { lifecycle.listeners.delete(callback); } }; } },
    Pressable: ({ children, onPress, disabled, testID }: { children: ReactNode; onPress(): void; disabled?: boolean; testID?: string }) => createElement("button", { onClick: onPress, disabled, "data-testid": testID }, children),
    TextInput: ({ value, onChangeText, editable, accessibilityLabel }: { value: string; onChangeText(value: string): void; editable: boolean; accessibilityLabel: string }) => createElement("input", { value, disabled: !editable, "aria-label": accessibilityLabel, onChange: (event: { target: { value: string } }) => onChangeText(event.target.value) }),
  };
});
function storage() { const values = new Map<string, string>(); return { values, getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } }; }
async function server() {
  const directory = mkdtempSync(join(tmpdir(), "starward-inbox-consumer-"));
  let now = Date.parse("2026-10-24T18:58:00.000Z"), cloud: number | null = 80, actorId = "local-owner", loads = 0;
  const runtime = await createNotificationToolsRuntime({ dataDir: directory, now: () => new Date(now) });
  const forecast = new ForecastQueryService({ now: () => new Date(now), cacheTtlMs: 1000,
    primary: { async load(input) { loads++; return notificationWeatherRun(new Date(now).toISOString(), cloud, input.runId); } }, onPrimaryAcquired: input => runtime.evaluations.acceptForecast(input) });
  const app = await buildApi({ allowedOrigins: ["http://localhost:8081"], nightReports: { create: async () => { throw Error("not_used"); } }, spots: { getDetail: async () => { throw Error("not_used"); } },
    resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }), forecast,
    notificationRules: runtime.service, notificationEvaluations: runtime.evaluations, resolveNotificationActor: async () => ({ id: actorId, scope: "local-owner-poc" }) });
  app.addHook("onClose", runtime.close); const url = await app.listen({ host: "127.0.0.1", port: 0 });
  return { app, runtime, url, directory, get loads() { return loads; }, actor(value: string) { actorId = value; }, time(value: string) { now = Date.parse(value); },
    async acquire(at: string, value: number | null) { now = Date.parse(at); cloud = value; const query = new URLSearchParams(Object.entries(notificationForecastQuery).map(([k, v]) => [k, String(v)])); const response = await fetch(`${url}/v1/forecast/hourly?${query}`); expect(response.status).toBe(200); await response.json(); await runtime.evaluations.flush(); },
    async close() { await app.close(); if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith("starward-inbox-consumer-")) throw Error("unexpected_consumer_directory"); rmSync(directory, { recursive: true, force: true }); },
  };
}

describe("actual App notification consumer through real HTTP/SQLite", () => {
  let host: Awaited<ReturnType<typeof server>>, root: import("react-dom/client").Root, container: HTMLDivElement, react: typeof import("react"), cache: QueryClient;
  beforeEach(async () => {
    host = await server(); react = await import("react"); (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    shell.state = { displayMode: "planning", decisionContext: { target: "moon", timezone: "UTC" }, selectedSpot: { id: "point", name: "已选地点", coordinate: { lat: 0, lon: 0 } }, location: { label: "出发地", latitude: 0, longitude: 0 } };
    cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    container = document.createElement("div"); document.body.append(container); root = (await import("react-dom/client")).createRoot(container);
    const actualFetch = fetch;
    vi.stubGlobal("fetch", (async (url, init) => String(url).startsWith("http://controlled-tools") ? new Response(JSON.stringify({ schemaVersion: "starward-tools-v1" })) : actualFetch(url, init)) as typeof fetch);
  });
  afterEach(async () => { await react.act(async () => root.unmount()); cache.clear(); container.remove(); await host.close(); vi.unstubAllGlobals(); expect(lifecycle.listeners.size).toBe(0); });
  const button = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement;
  const field = (name: string) => container.querySelector(`input[aria-label="${name}"]`) as HTMLInputElement;
  const wait = async (check: () => void) => { await vi.waitFor(async () => { await react.act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); }); check(); }); };
  async function click(id: string) { await react.act(async () => button(id).click()); }
  async function change(name: string, value: string) { await react.act(async () => { const node = field(name); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(node, value); node.dispatchEvent(new Event("input", { bubbles: true })); }); }
  async function render(inboxClient = createNotificationInboxClient({ baseUrl: host.url, storage: storage() })) {
    const { ToolsScreen } = await import("./ToolsScreen");
    await react.act(async () => root.render(<QueryClientProvider client={cache}><ToolsScreen rulesClient={createNotificationRulesClient({ baseUrl: host.url, storage: storage() })} inboxClient={inboxClient} /></QueryClientProvider>));
  }
  async function seedInbox() {
    const actor = { id: "local-owner", scope: "local-owner-poc" as const };
    const rule = host.runtime.service.command(actor, { command: "create-rule", idempotencyKey: "authority-rule", input: notificationWeatherRule() }).rule;
    host.runtime.evaluations.command(actor, { command: "set-controls", idempotencyKey: "authority-controls", expectedOwnerId: actor.id, baseRevision: 0, enabled: true, categories: { pretrip: true, "long-term": false } });
    await host.acquire("2026-10-24T19:00:00.000Z", 80);
    await host.acquire("2026-10-24T19:01:00.000Z", 10);
    const page = await (await fetch(host.url + "/v2/notifications/inbox")).json();
    expect(page.items).toHaveLength(1);
    return { id: page.items[0].id as string, ruleId: rule.id };
  }
  it("preserves the unsaved form across attempted top-level switching and releases the lock after cancel", async () => {
    await render(); await click("tools-create-pretrip-rule");
    await wait(() => expect(button("notification-new-rule")).not.toBeNull()); await click("notification-new-rule");
    await change("阈值", "31"); await click("tools-change-notification-controls");
    if (button("notification-inbox-panel")) await click("tools-create-pretrip-rule");
    expect(field("阈值")?.value).toBe("31");
    await click("notification-cancel-edit"); await click("tools-change-notification-controls");
    await wait(() => expect(button("notification-controls-global")).not.toBeNull());
  });
  it("does not call a denied owner an empty inbox", async () => {
    await seedInbox(); host.actor("");
    let inboxReads = 0; const actualFetch = fetch;
    const client = createNotificationInboxClient({ baseUrl: host.url, storage: storage(), fetcher: (async (url, init) => {
      if (String(url).includes("/notifications/inbox")) inboxReads++;
      return actualFetch(url, init);
    }) as typeof fetch });
    await render(client); await click("tools-change-notification-controls");
    await wait(() => expect(container.textContent).toContain("开关读取失败"));
    expect(inboxReads).toBe(0); expect(container.querySelector('[data-testid="notification-inbox-empty"]')).toBeNull();
    expect(container.querySelector('[data-testid="notification-owner-unavailable"]')).not.toBeNull();
  });
  it("withdraws private Inbox and cached rule projections after a real owner denial, without turning it into a transport fallback", async () => {
    const { id, ruleId } = await seedInbox(); await render();
    await click("tools-create-pretrip-rule"); await wait(() => expect(button(`notification-select-${ruleId}`)).not.toBeNull());
    await click(`notification-select-${ruleId}`); await wait(() => expect(container.textContent).toContain("规则配置已保存"));
    await click("tools-change-notification-controls"); await wait(() => expect(button(`notification-inbox-${id}`)).not.toBeNull());
    await click(`notification-inbox-${id}`); expect(container.textContent).toContain("总云量从 80 变为 10");
    host.actor("other"); await click("notification-inbox-refresh");
    await wait(() => expect(button(`notification-inbox-${id}`)).toBeNull());
    expect(container.querySelector('[data-testid="notification-message-detail"]')).toBeNull();
    expect(container.textContent).not.toContain("最近资料仍满足条件");
    await click("tools-create-pretrip-rule");
    expect(button(`notification-select-${ruleId}`)).toBeNull();
    expect(container.querySelector('[data-testid="notification-rule-current"]')).toBeNull();
    expect(container.querySelector('[data-testid="notification-rules-empty"]')).toBeNull();
  });
  it("lets an original confirmation finish without publishing over a newer owner's control observation", async () => {
    const actualFetch = fetch, port = storage(); let holdReadback = false, readbackReady!: () => void, releaseReadback!: () => void;
    const ready = new Promise<void>(resolve => { readbackReady = resolve; });
    const release = new Promise<void>(resolve => { releaseReadback = resolve; });
    const client = createNotificationInboxClient({ baseUrl: host.url, storage: port, newKey: () => "delayed-owner-save", fetcher: (async (url, init) => {
      const response = await actualFetch(url, init);
      if (init?.method === "POST" && response.ok) holdReadback = true;
      else if (holdReadback && String(url).endsWith("/notifications/controls") && new Headers(init?.headers).get("x-notification-owner") === "local-owner") {
        holdReadback = false; readbackReady(); await release;
      }
      return response;
    }) as typeof fetch });
    try {
      await render(client); await click("tools-change-notification-controls");
      await wait(() => expect(button("notification-controls-global")).not.toBeNull());
      await click("notification-controls-global"); await ready;
      host.actor("other"); await react.act(async () => { lifecycle.listeners.forEach(listener => listener("active")); });
      await wait(() => expect(cache.getQueryData<import("../../data/notification-inbox-client").NotificationControls>(["notification-controls"])?.ownerId).toBe("other"));
      await react.act(async () => releaseReadback());
      await wait(() => expect(port.values.size).toBe(0));
      expect(cache.getQueryData<import("../../data/notification-inbox-client").NotificationControls>(["notification-controls"])?.ownerId).toBe("other");
      expect(button("notification-controls-global").textContent).toContain("关闭");
    } finally { releaseReadback?.(); }
  });
  it("keeps a lost opt-in bound to its owner, then reads a nonempty real trigger and preserves history through reversal/failure/expiry", async () => {
    const rule = host.runtime.service.command({ id: "local-owner", scope: "local-owner-poc" }, { command: "create-rule", idempotencyKey: "consumer-rule", input: notificationWeatherRule() }).rule;
    const port = storage(), posts: string[] = []; let lose = true, failRead = false, key = 0;
    const actualFetch = fetch;
    const client = createNotificationInboxClient({ baseUrl: host.url, storage: port, newKey: () => `consumer-${++key}`, fetcher: (async (url, init) => {
      if (failRead && String(url).includes("/notifications/inbox")) { failRead = false; return new Response(JSON.stringify({ code: "notification_evaluation_unavailable" }), { status: 503 }); }
      const response = await actualFetch(url, init);
      if (init?.method === "POST") { posts.push(String(init.body)); if (lose && response.ok) { lose = false; throw Error("lost_after_actual_controls_commit"); } }
      return response;
    }) as typeof fetch });
    await render(client); await click("tools-change-notification-controls");
    await wait(() => expect(button("notification-controls-global").textContent).toContain("关闭")); expect(posts).toHaveLength(0);
    await click("notification-controls-global");
    await wait(() => expect(button("notification-controls-retry")).not.toBeNull());
    expect(button("notification-controls-global").disabled).toBe(true); expect(port.values.size).toBe(1);
    host.actor("other"); await click("notification-controls-retry");
    await wait(() => { expect(posts).toHaveLength(2); expect(button("notification-controls-retry").disabled).toBe(false); }); expect(port.values.size).toBe(1);
    expect(host.runtime.evaluations.controls({ id: "other", scope: "local-owner-poc" }).enabled).toBe(false);
    host.actor("local-owner"); await click("notification-controls-retry");
    await wait(() => { expect(button("notification-controls-global").textContent).toContain("开启"); expect(button("notification-controls-global").disabled).toBe(false); });
    expect(posts[2]).toBe(posts[0]); expect(posts[1]).toBe(posts[0]); expect(port.values.size).toBe(0);
    await click("notification-controls-pretrip"); await wait(() => expect(button("notification-controls-pretrip").textContent).toContain("开启"));
    await host.acquire("2026-10-24T19:00:00.000Z", 80); await host.acquire("2026-10-24T19:01:00.000Z", 10);
    await click("notification-inbox-refresh");
    const page = await (await actualFetch(host.url + "/v2/notifications/inbox")).json(); const id = page.items[0].id;
    await wait(() => expect(button(`notification-inbox-${id}`)).not.toBeNull()); await click(`notification-inbox-${id}`);
    expect(container.textContent).toContain("总云量从 80 变为 10 %"); expect(container.textContent).toContain("moon");
    expect(page.items[0].trigger.ruleId).toBe(rule.id); expect(container.textContent).toContain("Weather data by Open-Meteo");
    await host.acquire("2026-10-24T19:02:00.000Z", 80); await click("notification-inbox-refresh");
    await wait(() => expect(container.textContent).toContain("条件已经反转")); expect(container.textContent).toContain("总云量从 80 变为 10 %");
    failRead = true; await click("notification-inbox-refresh");
    await wait(() => expect(container.textContent).toContain("更新失败，保留已有通知")); expect(button(`notification-inbox-${id}`)).not.toBeNull();
    await click("notification-inbox-refresh"); await wait(() => expect(container.textContent).not.toContain("更新失败，保留已有通知"));
    host.time("2026-10-24T19:33:00.000Z");
    await react.act(async () => { lifecycle.listeners.forEach(listener => listener("active")); });
    await wait(() => expect(container.textContent).toContain("原资料已过期")); expect(host.loads).toBe(3);
  });
  it("exposes a qualified new rule with approved defaults while preserving explicit cooldown edits", async () => {
    await render(); await click("tools-create-pretrip-rule");
    await wait(() => expect(button("notification-new-rule")).not.toBeNull()); await click("notification-new-rule");
    expect(field("冷却分钟").value).toBe("120"); expect(container.textContent).toContain("拟用通道：App 收件箱");
    await click("notification-category-longterm"); expect(field("冷却分钟").value).toBe("1440");
    await change("冷却分钟", "33"); await click("notification-category-pretrip"); expect(field("冷却分钟").value).toBe("33");
    await click("notification-metric-totalCloudPct"); expect(field("条件指标").value).toBe("totalCloudPct"); expect(field("阈值单位").value).toBe("%");
    await change("阈值", "20"); await click("notification-direction-below"); await click("notification-save-rule");
    await wait(() => expect(container.textContent).toContain("规则配置已保存"));
    const library = await (await fetch(host.url + "/v2/notification-rules")).json();
    expect(library.items[0].definition).toMatchObject({ channel: "inbox", enabled: false, threshold: { metric: "totalCloudPct", direction: "below", value: 20, unit: "%" }, target: "moon", cooldownMinutes: 33 });
    await click("notification-open-inbox"); await wait(() => expect(button("notification-controls-global").textContent).toContain("关闭"));
    await wait(() => expect(container.textContent).toContain("尚无保存后的对应预报"));
  });
});
