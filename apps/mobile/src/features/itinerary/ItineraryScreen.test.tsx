// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createItineraryClient } from "../../data/itinerary-client";
import type { ItineraryDraftCommand, ItineraryDraft } from "../../../../../packages/domain/src/itinerary/draft";

const shell = vi.hoisted(() => ({ state: { decisionContext: { observingNight: "2026-11-01", timezone: "Asia/Shanghai", origin: "广州", target: "moon", profileId: "quick-observing-profile" }, location: { source: "manual" }, profiles: [{ id: "quick-observing-profile", observerTypes: ["family", "visual-observer"] }] }, listeners: new Set<() => void>() }));
vi.mock("../../state/shell-store", async () => { const { useSyncExternalStore } = await import("react"); return { useShellStore: (selector: (state: typeof shell.state) => unknown) => useSyncExternalStore(callback => { shell.listeners.add(callback); return () => shell.listeners.delete(callback); }, () => selector(shell.state)) }; });
vi.mock("../../shell/DecisionContextRevision", () => ({ DecisionContextRevision: () => null }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "screen-command-key" }));
vi.mock("expo-router", () => ({ router: { push: vi.fn() } }));
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

describe("itinerary explicit input and retry consumer", () => {
  let root: import("react-dom/client").Root; let container: HTMLDivElement; let react: typeof import("react"); let cache: QueryClient;
  beforeEach(async () => {
    react = await import("react");
    shell.state = { decisionContext: { observingNight: "2026-11-01", timezone: "Asia/Shanghai", origin: "广州", target: "moon", profileId: "quick-observing-profile" }, location: { source: "manual" }, profiles: [{ id: "quick-observing-profile", observerTypes: ["family", "visual-observer"] }] };
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    container = document.createElement("div"); document.body.append(container); root = (await import("react-dom/client")).createRoot(container);
  });
  afterEach(async () => { await react.act(async () => root.unmount()); cache.clear(); container.remove(); });
  async function waitFor(check: () => void) { await vi.waitFor(async () => { await react.act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); }); check(); }); }
  const button = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement;
  const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
  function savedDraft(command: Extract<ItineraryDraftCommand, { command: "create-draft" }>): ItineraryDraft {
    return { schemaVersion: "starward-itinerary-draft-v1", id: "saved-plan", ownerId: "local-owner", title: command.input.title, timezone: command.input.timezone, inputs: command.input.inputs, revision: 1, sequence: 1, state: "draft", createdAt: "2026-10-23T12:00:00Z", updatedAt: "2026-10-23T12:00:00Z", source: { kind: "user-input", capturedAt: "2026-10-23T12:00:00Z" }, stages: [], stops: [], operationLog: [], evidence: { route: "missing", weather: "missing", astronomy: "missing", spot: "unverified" } };
  }
  async function changeText(label: string, value: string) {
    await react.act(async () => {
      const input = container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  it("creates from the explicitly opened form, retries that same command after Context changes, then edits the saved revision", async () => {
    const values = new Map<string, string>(); const posts: ItineraryDraftCommand[] = []; let saved: ItineraryDraft | null = null; let loseReply = true;
    const fetcher = (async (url, init) => {
      const path = String(url);
      if (init?.method === "POST") {
        const command = JSON.parse(String(init.body)) as ItineraryDraftCommand; posts.push(command);
        if (command.command === "create-draft" && !saved) saved = savedDraft(command);
        if (command.command === "patch-draft") saved = { ...saved!, title: command.patch.title ?? saved!.title, inputs: command.patch.inputs ?? saved!.inputs, revision: saved!.revision + 1 };
        if (loseReply) { loseReply = false; throw new Error("lost_commit_reply"); }
        return response({ schemaVersion: "starward-itinerary-v2", status: "saved", replayed: command.command === "create-draft", itinerary: saved, receipt: { idempotencyKey: command.idempotencyKey, itineraryId: saved!.id, revision: saved!.revision, committedAt: saved!.updatedAt } });
      }
      return path.endsWith("/v2/itineraries") ? response({ schemaVersion: "starward-itinerary-v2", items: saved ? [saved] : [], nextCursor: null, scope: "local-owner-poc" }) : response({ schemaVersion: "starward-itinerary-v2", itinerary: saved });
    }) as typeof fetch;
    let counter = 0;
    const client = createItineraryClient({ baseUrl: "http://local-api", fetcher, newKey: () => `key-${++counter}`, storage: { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async key => { values.delete(key); } } });
    const { ItineraryScreen } = await import("./ItineraryScreen");
    await react.act(async () => root.render(<QueryClientProvider client={cache}><ItineraryScreen client={client} /></QueryClientProvider>));
    await waitFor(() => expect(container.textContent).toContain("还没有行程"));
    expect(posts).toHaveLength(0);
    await react.act(async () => button("plan-generate").click());
    expect(container.querySelector('input[aria-label="出发地"]')).toHaveProperty("value", "广州");
    expect(container.querySelector('input[aria-label="用户类型"]')).toHaveProperty("value", "亲子观星、目视观测");
    await react.act(async () => { shell.state = { ...shell.state, decisionContext: { ...shell.state.decisionContext, observingNight: "2026-12-12", origin: "成都", target: "jupiter", profileId: "base" }, profiles: [{ id: "base", observerTypes: [] }] }; shell.listeners.forEach(listener => listener()); });
    await react.act(async () => button("plan-save-draft").click());
    await waitFor(() => expect(button("plan-retry-save")).not.toBeNull());
    expect(posts[0]).toMatchObject({ command: "create-draft", input: { inputs: { date: "2026-11-01", origin: "广州", target: "moon", userType: "亲子观星、目视观测" } } });
    expect(button("plan-generate").disabled).toBe(true);
    await react.act(async () => button("plan-retry-save").click());
    await waitFor(() => expect(container.textContent).toContain("已保存草稿 · 版本 1"));
    expect(posts[1]).toEqual(posts[0]); expect(values.size).toBe(0);
    expect(container.textContent).toContain("2026-11-01"); expect(container.textContent).not.toContain("2026-12-12");
    expect(container.textContent).toContain("尚未生成可执行计划");
    await react.act(async () => button("plan-edit").click());
    expect(container.querySelector('input[aria-label="用户类型"]')).toHaveProperty("value", "亲子观星、目视观测");
    await react.act(async () => button("plan-save-draft").click());
    await waitFor(() => expect(container.textContent).toContain("已保存草稿 · 版本 2"));
    expect(posts[2]).toMatchObject({ command: "patch-draft", itineraryId: "saved-plan", baseRevision: 1, patch: { inputs: { date: "2026-11-01", origin: "广州", userType: "亲子观星、目视观测" } } });
    await react.act(async () => button("plan-create-share").click());
    expect(container.textContent).toContain("未生成分享链接，也未下载观测包"); expect(posts).toHaveLength(3);
  });
  it("retains editable text after a proven first-request size refusal and saves the corrected form", async () => {
    const values = new Map<string, string>(); const posts: ItineraryDraftCommand[] = []; let saved: ItineraryDraft | null = null;
    const fetcher = (async (url, init) => {
      if (init?.method === "POST") {
        const command = JSON.parse(String(init.body)) as ItineraryDraftCommand; posts.push(command);
        if (posts.length === 1) return new Response(JSON.stringify({ code: "itinerary_request_body_too_large", outcome: "rejected" }), { status: 413 });
        if (command.command !== "create-draft") throw new Error("unexpected_patch");
        saved = savedDraft(command);
        return response({ schemaVersion: "starward-itinerary-v2", status: "saved", replayed: false, itinerary: saved, receipt: { idempotencyKey: command.idempotencyKey, itineraryId: saved.id, revision: saved.revision, committedAt: saved.updatedAt } });
      }
      return String(url).endsWith("/v2/itineraries") ? response({ schemaVersion: "starward-itinerary-v2", items: saved ? [saved] : [], nextCursor: null, scope: "local-owner-poc" }) : response({ schemaVersion: "starward-itinerary-v2", itinerary: saved });
    }) as typeof fetch;
    let counter = 0;
    const client = createItineraryClient({ baseUrl: "http://local-api", fetcher, newKey: () => `key-${++counter}`, storage: { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async key => { values.delete(key); } } });
    const { ItineraryScreen } = await import("./ItineraryScreen");
    await react.act(async () => root.render(<QueryClientProvider client={cache}><ItineraryScreen client={client} /></QueryClientProvider>));
    await waitFor(() => expect(button("plan-generate").disabled).toBe(false));
    await react.act(async () => button("plan-generate").click());
    await changeText("行程名称", "x".repeat(66_000));
    await react.act(async () => button("plan-save-draft").click());
    await waitFor(() => expect(container.textContent).toContain("内容过长，尚未保存"));
    await waitFor(() => expect(button("plan-save-draft").disabled).toBe(false));
    expect(container.querySelector('input[aria-label="行程名称"]')).toHaveProperty("value", "x".repeat(66_000));
    expect(button("plan-retry-save")).toBeNull(); expect(values.size).toBe(0);
    await changeText("行程名称", "缩短后的行程");
    await react.act(async () => button("plan-save-draft").click());
    await waitFor(() => expect(container.textContent).toContain("已保存草稿 · 版本 1"));
    expect(posts[1]).toMatchObject({ command: "create-draft", idempotencyKey: "key-2", input: { title: "缩短后的行程", inputs: { userType: "亲子观星、目视观测" } } });
    expect(values.size).toBe(0);
  });
  it.each(["base", "missing-profile"])("leaves observer type empty for %s instead of leaking profile identity", async profileId => {
    shell.state = { ...shell.state, decisionContext: { ...shell.state.decisionContext, profileId }, profiles: [{ id: "base", observerTypes: [] }] };
    const client = createItineraryClient({ baseUrl: "http://local-api", fetcher: (async () => response({ schemaVersion: "starward-itinerary-v2", items: [], nextCursor: null, scope: "local-owner-poc" })) as typeof fetch, storage: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined } });
    const { ItineraryScreen } = await import("./ItineraryScreen");
    await react.act(async () => root.render(<QueryClientProvider client={cache}><ItineraryScreen client={client} /></QueryClientProvider>));
    await waitFor(() => expect(button("plan-generate").disabled).toBe(false));
    await react.act(async () => button("plan-generate").click());
    expect(container.querySelector('input[aria-label="用户类型"]')).toHaveProperty("value", "");
    expect(container.querySelector('input[aria-label="用户类型"]')).toHaveProperty("disabled", false);
  });
});
