// @vitest-environment jsdom
import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import type { MapRouteRequest, MapSpotPage, MapSpotSummary } from "@starward/contracts/map";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({ navigate: vi.fn(), push: vi.fn() }));
vi.mock("../../state/preferences-runtime", () => ({ hydratePreferenceRuntime: vi.fn(), persistActiveProfile: vi.fn(), persistPreferenceProfile: vi.fn(), persistShellDestination: vi.fn(), persistShellLocation: vi.fn() }));
vi.mock("../../native/map/native-map-gateway", () => ({ openNativeMapNavigation: boundary.navigate }));
vi.mock("expo-router", () => ({ router: { push: boundary.push } }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: { apiBaseUrl: "http://map-fixture.invalid" } } } }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const node = ({ children, testID }: { children: ReactNode; testID?: string }) => createElement("div", { "data-testid": testID }, children);
  return {
    View: node, Text: node, ScrollView: node, StyleSheet: { create: (value: unknown) => value }, Platform: { OS: "web" },
    Pressable: ({ children, onPress, disabled, testID }: { children: ReactNode; onPress(): void; disabled?: boolean; testID?: string }) => createElement("button", { onClick: onPress, disabled, "data-testid": testID }, children),
  };
});

const original: MapSpotSummary = {
  id: "spot-b", name: "原地点 B", coordinate: { lat: 31, lon: 121, system: "WGS84" }, distanceMeters: 1000,
  status: "verified", mapState: "recommended", facilities: ["parking"], verificationAt: null, imageUrl: null,
  source: { label: "隔离地点源", url: "https://example.invalid", licenseId: "test", fetchedAt: "2026-10-24T01:00:00Z" }, factsBoundary: "合成测试事实",
};
const updated: MapSpotSummary = {
  ...original, name: "刷新地点 B", coordinate: { lat: 32, lon: 122, system: "WGS84" }, mapState: "closed",
  source: { ...original.source, fetchedAt: "2026-10-24T02:00:00Z" },
};
const other: MapSpotSummary = { ...original, id: "spot-c", name: "地点 C", coordinate: { lat: 33, lon: 123, system: "WGS84" } };

describe("accepted Map selection facts", () => {
  let react: typeof import("react");
  let query: typeof import("@tanstack/react-query");
  let store: (typeof import("../../state/shell-store"))["useShellStore"];
  let client: import("@tanstack/react-query").QueryClient;
  let root: Root;
  let container: HTMLDivElement;
  let MapScreen: React.ComponentType;
  let items: MapSpotSummary[];
  let routes: MapRouteRequest[];
  let forecasts: URL[];
  let pending: Array<{ url: URL; signal?: AbortSignal | null; resolve(response: Response): void }>;
  let deferSpots: boolean;
  const element = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement;
  const waitFor = async (predicate: () => boolean) => vi.waitFor(async () => {
    await react.act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(predicate()).toBe(true);
  });
  const page = (url: URL, entries = items): MapSpotPage => ({
    items: entries, nextCursor: null,
    context: { center: { lat: Number(url.searchParams.get("lat")), lon: Number(url.searchParams.get("lon")), system: "WGS84" }, radiusMeters: 100_000, limit: 20 },
    generatedAt: "2026-10-24T03:00:00Z", status: entries.length ? "fresh" : "empty",
  });
  const render = () => react.act(async () => { root.render(react.createElement(query.QueryClientProvider, { client }, react.createElement(MapScreen))); });

  beforeEach(async () => {
    vi.resetModules(); vi.clearAllMocks();
    items = [original, other]; routes = []; forecasts = []; pending = []; deferSpots = false;
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "http://map-fixture.invalid");
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/v1/map/spots") return deferSpots
        ? new Promise<Response>((resolve) => pending.push({ url, signal: init?.signal, resolve }))
        : new Response(JSON.stringify(page(url)));
      if (url.pathname === "/v1/routes/plan") {
        const command = JSON.parse(String(init?.body)) as MapRouteRequest;
        routes.push(command);
        return new Response(JSON.stringify({
          id: command.requestId, requestId: command.requestId, provider: "fixture", providerVersion: "test",
          generatedAt: original.source.fetchedAt, expiresAt: "2026-10-25T00:00:00Z", state: "fresh",
          authoritativeCoordinates: { origin: command.origin, destination: command.destination }, providerCoordinateSystem: "GCJ-02", mode: command.mode,
          distanceMeters: 1000, durationSeconds: 1000, straightLineReferenceMeters: 1000, navigationUsable: true, geometry: null, warning: null,
        }));
      }
      if (url.pathname === "/v1/forecast/hourly") forecasts.push(url);
      return new Response(JSON.stringify({ code: "fixture_unavailable" }), { status: 503 });
    }));
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    react = await import("react"); query = await import("@tanstack/react-query");
    store = (await import("../../state/shell-store")).useShellStore;
    store.setState({ location: { source: "manual", label: "原出发地", latitude: 30, longitude: 120 } });
    client = new query.QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    container = document.createElement("div"); document.body.append(container);
    root = (await import("react-dom/client")).createRoot(container);
    MapScreen = (await import("./MapScreen")).MapScreen;
  });

  afterEach(async () => {
    await react.act(async () => root.unmount()); client.clear(); container.remove();
    vi.unstubAllGlobals(); vi.unstubAllEnvs();
  });

  it("refreshes one accepted fact set across the real marker, summary, observer, route and navigation", async () => {
    await render(); await waitFor(() => Boolean(element("map-spot-spot-b")));
    await react.act(async () => element("map-spot-spot-b").click());
    await react.act(async () => element("map-select-spot").click());
    await react.act(async () => element("map-change-route-mode").click());
    await waitFor(() => routes.at(-1)?.mode === "cycle");
    const before = store.getState().decisionContext.revision;
    items = [updated, other];
    await react.act(async () => { await client.invalidateQueries({ queryKey: ["map-spots"] }); });
    await waitFor(() => store.getState().selectedSpot?.name === updated.name);
    await waitFor(() => routes.at(-1)?.destination.lat === updated.coordinate.lat);
    expect(store.getState().decisionContext.revision).toBe(before + 1);
    await react.act(async () => element("map-select-spot").click());
    expect(element("map-spot-spot-b").textContent).toContain(updated.name);
    expect(element("map-selected-spot").textContent).toContain(updated.name);
    expect(element("map-selected-spot").textContent).toContain("closed");
    expect(container.textContent).not.toContain(original.name);
    expect(store.getState()).toMatchObject({ selectedSpot: updated, roles: { "spot-b": "backup" }, routeMode: "cycle" });
    expect(store.getState().decisionContext.revision).toBeGreaterThan(before);
    expect(routes.at(-1)).toMatchObject({ origin: { lat: 30, lon: 120 }, destination: updated.coordinate, mode: "cycle" });
    expect(forecasts.at(-1)?.searchParams.get("latitude")).toBe("32");
    expect(forecasts.at(-1)?.searchParams.get("longitude")).toBe("122");
    await react.act(async () => element("route-open-native-map").click());
    expect(boundary.navigate).toHaveBeenLastCalledWith(updated.coordinate, updated.name);
    const confirmed = store.getState();
    await react.act(async () => { await client.invalidateQueries({ queryKey: ["map-spots"] }); });
    expect(store.getState().decisionContext).toBe(confirmed.decisionContext);
  });

  it("retains the chosen identity when a current list omits it and a late response follows a later choice", async () => {
    await render(); await waitFor(() => Boolean(element("map-spot-spot-b")));
    await react.act(async () => element("map-spot-spot-b").click());
    items = [other];
    await react.act(async () => { await client.invalidateQueries({ queryKey: ["map-spots"] }); });
    expect(store.getState().selectedSpot).toEqual(original);
    deferSpots = true;
    await react.act(async () => { void client.invalidateQueries({ queryKey: ["map-spots"] }); });
    await waitFor(() => pending.length === 1);
    await react.act(async () => element("map-spot-spot-c").click());
    await react.act(async () => pending[0]!.resolve(new Response(JSON.stringify(page(pending[0]!.url, [updated])))));
    await waitFor(() => !client.isFetching({ queryKey: ["map-spots"] }));
    expect(store.getState().selectedSpot).toEqual(other);
    await react.act(async () => element("route-open-native-map").click());
    expect(boundary.navigate).toHaveBeenLastCalledWith(other.coordinate, other.name);
  });

  it("does not replay an already-consumed page over a later same-id user choice", async () => {
    await render(); await waitFor(() => Boolean(element("map-spot-spot-b")));
    await react.act(async () => element("map-spot-spot-b").click());
    const later = { ...original, name: "后来的显式选择", coordinate: { ...original.coordinate, lat: 34 } };
    await react.act(async () => store.getState().selectSpot(later));
    expect(store.getState().selectedSpot).toEqual(later);
    expect(element("map-spot-spot-b").textContent).toContain(later.name);
    await react.act(async () => element("route-open-native-map").click());
    expect(boundary.navigate).toHaveBeenLastCalledWith(later.coordinate, later.name);
  });

  it("binds a pending refetch to its original selection generation even when the later choice has the same id", async () => {
    await render(); await waitFor(() => Boolean(element("map-spot-spot-b")));
    await react.act(async () => element("map-spot-spot-b").click());
    deferSpots = true;
    await react.act(async () => { void client.invalidateQueries({ queryKey: ["map-spots"] }); });
    await waitFor(() => pending.length === 1);
    const later = { ...original, name: "请求后显式重选的同id地点", coordinate: { ...original.coordinate, lat: 34 } };
    await react.act(async () => store.getState().selectSpot(later));
    await react.act(async () => pending[0]!.resolve(new Response(JSON.stringify(page(pending[0]!.url, [updated])))));
    await waitFor(() => !client.isFetching({ queryKey: ["map-spots"] }));
    expect(store.getState().selectedSpot).toEqual(later);
    await react.act(async () => element("route-open-native-map").click());
    expect(boundary.navigate).toHaveBeenLastCalledWith(later.coordinate, later.name);
    deferSpots = false; items = [updated];
    await react.act(async () => { await client.invalidateQueries({ queryKey: ["map-spots"] }); });
    await waitFor(() => store.getState().selectedSpot?.name === updated.name);
    expect(routes.at(-1)?.destination).toEqual(updated.coordinate);
  });

  it("does not admit a cancelled old-range response after the current range has refreshed the same id", async () => {
    await render(); await waitFor(() => Boolean(element("map-spot-spot-b")));
    await react.act(async () => element("map-spot-spot-b").click());
    deferSpots = true;
    await react.act(async () => { void client.invalidateQueries({ queryKey: ["map-spots"] }); });
    await waitFor(() => pending.length === 1);
    await react.act(async () => store.setState({ location: { source: "manual", label: "新出发地", latitude: 35, longitude: 125 } }));
    await waitFor(() => pending.length === 2);
    await react.act(async () => pending[1]!.resolve(new Response(JSON.stringify(page(pending[1]!.url, [updated])))));
    await waitFor(() => store.getState().selectedSpot?.name === updated.name);
    expect(pending[0]!.signal?.aborted).toBe(true);
    const late = { ...original, name: "已取消范围的迟到结果", source: { ...original.source, fetchedAt: "2026-10-24T04:00:00Z" } };
    await react.act(async () => pending[0]!.resolve(new Response(JSON.stringify(page(pending[0]!.url, [late])))));
    expect(store.getState().selectedSpot).toEqual(updated);
    await waitFor(() => routes.at(-1)?.origin.lat === 35 && routes.at(-1)?.destination.lat === 32);
    expect(container.textContent).not.toContain(late.name);
  });

  it("accepts current selected-place facts through an independent pending route-mode and role edit", async () => {
    await render(); await waitFor(() => Boolean(element("map-spot-spot-b")));
    await react.act(async () => element("map-spot-spot-b").click());
    deferSpots = true;
    await react.act(async () => { void client.invalidateQueries({ queryKey: ["map-spots"] }); });
    await waitFor(() => pending.length === 1);
    await react.act(async () => { element("map-change-route-mode").click(); element("map-select-spot").click(); });
    await react.act(async () => pending[0]!.resolve(new Response(JSON.stringify(page(pending[0]!.url, [updated])))));
    await waitFor(() => store.getState().selectedSpot?.name === updated.name);
    expect(store.getState()).toMatchObject({ routeMode: "cycle", roles: { "spot-b": "backup" }, selectedSpot: updated });
    expect(element("map-spot-spot-b").textContent).toContain(updated.name);
    await waitFor(() => routes.at(-1)?.destination.lat === updated.coordinate.lat);
    expect(routes.at(-1)?.mode).toBe("cycle");
    await react.act(async () => element("route-open-native-map").click());
    expect(boundary.navigate).toHaveBeenLastCalledWith(updated.coordinate, updated.name);
  });

  it("accepts current facts within the existing explicitly disclosed default range before location is selected", async () => {
    store.setState({ location: { source: "unset", label: "尚未选择位置" } });
    await render(); await waitFor(() => Boolean(element("map-spot-spot-b")));
    await react.act(async () => element("map-spot-spot-b").click());
    items = [updated];
    await react.act(async () => { await client.invalidateQueries({ queryKey: ["map-spots"] }); });
    await waitFor(() => store.getState().selectedSpot?.name === updated.name);
    expect(element("map-spot-spot-b").textContent).toContain(updated.name);
    expect(store.getState().location.source).toBe("unset");
    await waitFor(() => routes.at(-1)?.destination.lat === updated.coordinate.lat);
    await react.act(async () => element("route-open-native-map").click());
    expect(boundary.navigate).toHaveBeenLastCalledWith(updated.coordinate, updated.name);
  });

  it("accepts the same query's current facts after equal-coordinate origin metadata is replaced", async () => {
    await render(); await waitFor(() => Boolean(element("map-spot-spot-b")));
    await react.act(async () => element("map-spot-spot-b").click());
    deferSpots = true;
    await react.act(async () => { void client.invalidateQueries({ queryKey: ["map-spots"] }); });
    await waitFor(() => pending.length === 1);
    await react.act(async () => store.setState({ location: { ...store.getState().location, label: "同范围重新确认的出发地" } }));
    await react.act(async () => pending[0]!.resolve(new Response(JSON.stringify(page(pending[0]!.url, [updated])))));
    await waitFor(() => store.getState().selectedSpot?.name === updated.name);
    expect(store.getState().location.label).toBe("同范围重新确认的出发地");
    expect(pending).toHaveLength(1);
    await waitFor(() => routes.at(-1)?.destination.lat === updated.coordinate.lat);
    await react.act(async () => element("route-open-native-map").click());
    expect(boundary.navigate).toHaveBeenLastCalledWith(updated.coordinate, updated.name);
  });
});
