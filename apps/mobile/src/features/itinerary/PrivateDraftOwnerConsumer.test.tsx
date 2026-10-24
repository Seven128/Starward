// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { privateDraftHttp, type DraftFamily } from "../../../../../tests/fixtures/private-draft-http";
import { ItineraryScreen } from "./ItineraryScreen";
import { FieldReportsPanel } from "../field/FieldReportsPanel";

const shell = vi.hoisted(() => ({ state: { decisionContext: { revision: 1, observingNight: "2026-11-01", timezone: "Asia/Shanghai", origin: "广州", target: "moon", profileId: "base", moment: "2026-11-01T15:00:00Z" }, location: { source: "manual", label: "广州" }, profiles: [{ id: "base", revision: 1, observerTypes: [] }], displayMode: "planning", selectedSpot: null } }));
vi.mock("../../state/shell-store", () => ({ useShellStore: (selector: (value: typeof shell.state) => unknown) => selector(shell.state) }));
vi.mock("../../shell/DecisionContextRevision", () => ({ DecisionContextRevision: () => null }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "unused-native-key" }));
vi.mock("expo-router", () => ({ router: { push: vi.fn() } }));
vi.mock("../../data/runtime-api-base-url", () => ({ resolveRuntimeApiBaseUrl: () => "http://private-draft.local" }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const node = ({ children, testID }: { children: ReactNode; testID?: string }) => createElement("div", { "data-testid": testID }, children);
  return { View: node, Text: node, ScrollView: node, StyleSheet: { create: (value: unknown) => value }, Keyboard: { dismiss: vi.fn() },
    Pressable: ({ children, onPress, disabled, testID }: { children: ReactNode; onPress(): void; disabled?: boolean; testID?: string }) => createElement("button", { onClick: onPress, disabled, "data-testid": testID }, children),
    TextInput: ({ value, onChangeText, editable, accessibilityLabel }: { value: string; onChangeText(value: string): void; editable: boolean; accessibilityLabel: string }) => createElement("input", { value, disabled: !editable, "aria-label": accessibilityLabel, onChange: (event: { target: { value: string } }) => onChangeText(event.target.value) }),
  };
});
let host: Awaited<ReturnType<typeof privateDraftHttp>>, root: import("react-dom/client").Root, container: HTMLDivElement, react: typeof import("react"), cache: QueryClient;
beforeEach(async () => {
  host = await privateDraftHttp(); react = await import("react"); (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  container = document.createElement("div"); document.body.append(container); root = (await import("react-dom/client")).createRoot(container);
});
afterEach(async () => { await react.act(async () => root.unmount()); cache.clear(); container.remove(); await host.close(); });
async function settled(check: () => void) { await vi.waitFor(async () => { await react.act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); }); check(); }); }
it.each(["itinerary", "field"] as DraftFamily[])("%s removes old private detail and editor projections after actual authority denial", async family => {
  const saved = family === "itinerary" ? host.seedItinerary() : host.seedField();
  const secret = family === "itinerary" ? "合成行程私密内容A" : "合成现场私密内容A";
  const component = family === "itinerary" ? <ItineraryScreen client={host.itineraryClient()} /> : <FieldReportsPanel client={host.fieldClient()} />;
  await react.act(async () => root.render(react.createElement(QueryClientProvider, { client: cache }, component)));
  if (family === "field") {
    await settled(() => expect(container.querySelector(`[data-testid="field-report-${saved.id}"]`)).not.toBeNull());
    await react.act(async () => (container.querySelector(`[data-testid="field-report-${saved.id}"]`) as HTMLButtonElement).click());
  }
  const editId = family === "itinerary" ? "plan-edit" : "field-edit-report";
  await settled(() => expect(container.textContent).toContain(secret));
  await settled(() => expect(container.querySelector(`[data-testid="${editId}"]`)).not.toBeNull());
  await react.act(async () => (container.querySelector(`[data-testid="${editId}"]`) as HTMLButtonElement).click());
  expect([...container.querySelectorAll("input")].some(input => input.value === secret)).toBe(true);
  host.actor(family, null);
  await react.act(async () => { await cache.invalidateQueries(); });
  await settled(() => expect(host.requests.some(request => request.family === family && request.status === 403)).toBe(true));
  expect(container.textContent).not.toContain(secret);
  expect([...container.querySelectorAll("input")].some(input => input.value === secret)).toBe(false);
  host.actor(family, "owner-A");
  await react.act(async () => { await cache.invalidateQueries(); });
  await settled(() => expect([...container.querySelectorAll("input")].some(input => input.value === secret)).toBe(true));
});
it.each(["itinerary", "field"] as DraftFamily[])("%s cannot publish an original A save over newer B private data", async family => {
  const saved = family === "itinerary" ? host.seedItinerary() : host.seedField();
  const client = family === "itinerary" ? host.itineraryClient() : host.fieldClient();
  const component = family === "itinerary" ? <ItineraryScreen client={client as ReturnType<typeof host.itineraryClient>} /> : <FieldReportsPanel client={client as ReturnType<typeof host.fieldClient>} />;
  await react.act(async () => root.render(react.createElement(QueryClientProvider, { client: cache }, component)));
  if (family === "field") {
    await settled(() => expect(container.querySelector(`[data-testid="field-report-${saved.id}"]`)).not.toBeNull());
    await react.act(async () => (container.querySelector(`[data-testid="field-report-${saved.id}"]`) as HTMLButtonElement).click());
  }
  const editId = family === "itinerary" ? "plan-edit" : "field-edit-report";
  await settled(() => expect(container.querySelector(`[data-testid="${editId}"]`)).not.toBeNull());
  await react.act(async () => (container.querySelector(`[data-testid="${editId}"]`) as HTMLButtonElement).click());
  let release!: () => void, readReady!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; }), ready = new Promise<void>(resolve => { readReady = resolve; });
  let hold = true;
  host.intercept(async (request, response) => {
    if (hold && request.method === "GET" && request.path.endsWith(`/${saved.id}`) && response.ok) {
      const value = await response.clone().json();
      if ((value.itinerary ?? value.report)?.revision === 2) { hold = false; readReady(); await held; }
    }
    return response;
  });
  await react.act(async () => (container.querySelector(`[data-testid="${family === "itinerary" ? "plan-save-draft" : "field-save-draft"}"]`) as HTMLButtonElement).click());
  await ready;
  host.actor(family, "owner-B");
  const b = family === "itinerary" ? host.seedItinerary("合成行程B当前资料") : host.seedField("合成现场B当前资料", "B当前地点");
  await react.act(async () => { await cache.invalidateQueries({ queryKey: [family === "itinerary" ? "itinerary-library" : "field-reports"] }); });
  await settled(() => expect(container.textContent).toContain(family === "itinerary" ? "合成行程B当前资料" : "B当前地点"));
  await react.act(async () => { release(); });
  await settled(() => expect(host.values.size).toBe(0));
  await settled(() => expect(cache.getMutationCache().getAll().every(mutation => mutation.state.status === "success")).toBe(true));
  expect(client.authority()).toMatchObject({ status: "ready", ownerId: "owner-B" });
  expect(container.textContent).not.toContain(family === "itinerary" ? "合成行程私密内容A" : "合成现场私密内容A");
  expect([...container.querySelectorAll("input")].some(input => input.value.includes("私密内容A"))).toBe(false);
  if (family === "field") {
    await react.act(async () => (container.querySelector('[data-testid="field-cancel-edit"]') as HTMLButtonElement).click());
    await react.act(async () => (container.querySelector(`[data-testid="field-report-${b.id}"]`) as HTMLButtonElement).click());
    await settled(() => expect(container.textContent).toContain("合成现场B当前资料"));
  }
  expect(container.textContent).toContain(family === "itinerary" ? "合成行程B当前资料" : "合成现场B当前资料");
});

it.each(["itinerary", "field"] as DraftFamily[])("%s treats a same-owner confirmation as fresh without creating a consumer fetch loop", async family => {
  const saved = family === "itinerary" ? host.seedItinerary() : host.seedField();
  const client = family === "itinerary" ? host.itineraryClient() : host.fieldClient();
  const component = family === "itinerary" ? <ItineraryScreen client={client as ReturnType<typeof host.itineraryClient>} /> : <FieldReportsPanel client={client as ReturnType<typeof host.fieldClient>} />;
  await react.act(async () => root.render(<QueryClientProvider client={cache}>{component}</QueryClientProvider>));
  await settled(() => expect(client.authority()).toMatchObject({ status: "ready", ownerId: "owner-A" }));
  const listPath = family === "itinerary" ? "/v2/itineraries" : "/v2/field-reports";
  const before = host.requests.filter(request => request.path === listPath).length;
  await react.act(async () => { await cache.invalidateQueries({ queryKey: [family === "itinerary" ? "itinerary-library" : "field-reports"] }); });
  await settled(() => expect(cache.getQueryCache().getAll().every(query => query.state.fetchStatus === "idle")).toBe(true));
  // One bounded event-loop drain checks the actual subscriber/Query interaction;
  // it is not a performance or frame-rate measurement.
  await react.act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); });
  expect(host.requests.filter(request => request.path === listPath)).toHaveLength(before + 1);
  expect(client.authority()).toMatchObject({ status: "ready", ownerId: "owner-A" });
  expect(family === "itinerary" ? container.textContent?.includes("合成行程私密内容A") : !!container.querySelector(`[data-testid="field-report-${saved.id}"]`)).toBe(true);
  expect(host.requests.every(request => request.method === "GET")).toBe(true);
});
