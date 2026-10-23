// @vitest-environment jsdom
// Investigation-only reproduction of current defects, not a product pass gate.
// React/Query/store/components/HTTP clients are real. Only RN/Expo/storage and
// external HTTP responses are replaced; no device or shared service is used.
import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({
  push: vi.fn(), persistSkyResolution: vi.fn(),
  hydratePreferenceRuntime: vi.fn(), persistActiveProfile: vi.fn(),
  persistPreferenceProfile: vi.fn(), persistShellDestination: vi.fn(), persistShellLocation: vi.fn(),
}));
vi.mock("../../../../apps/mobile/src/state/preferences-runtime", () => boundary);
vi.mock("../../../../apps/mobile/src/state/sky-runtime", () => boundary);
vi.mock("../../../../apps/mobile/modules/orientation/expo-orientation-adapter", () => ({ startExpoOrientation: vi.fn() }));
vi.mock("../../../../apps/mobile/src/data/shooting-storage", () => ({
  loadLocalChecklist: async () => null, loadLocalShootingVersions: async () => [],
  saveLocalChecklist: vi.fn(), saveLocalShootingVersion: vi.fn(),
}));
vi.mock("../../../../apps/mobile/src/native/map/native-map-gateway", () => ({ openNativeMapNavigation: vi.fn() }));
vi.mock("../../../../apps/mobile/src/shell/TabRestorationEvidence", () => ({
  useTabRestorationEvidence: () => ({ onScroll() {}, scrollEventThrottle: 16, evidence: null }),
}));
vi.mock("expo-router", () => ({ router: { push: boundary.push } }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: { apiBaseUrl: "http://f07.invalid" } } } }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native", async () => {
  const { createElement, forwardRef } = await import("react");
  const node = forwardRef<HTMLDivElement, { children: ReactNode; testID?: string }>(({ children, testID }, ref) =>
    createElement("div", { ref, "data-testid": testID }, children));
  return {
    View: node, Text: node, ScrollView: node, Platform: { OS: "web" }, StyleSheet: { create: (value: unknown) => value },
    Pressable: ({ children, onPress, testID, disabled, accessibilityLabel }: { children: ReactNode; onPress(): void; testID?: string; disabled?: boolean; accessibilityLabel?: string }) =>
      createElement("button", { onClick: onPress, disabled, "data-testid": testID, "aria-label": accessibilityLabel }, children),
    TextInput: ({ value, onChangeText, testID }: { value: string; onChangeText(value: string): void; testID?: string }) =>
      createElement("input", { value, "data-testid": testID, onInput: (event: { currentTarget: { value: string } }) => onChangeText(event.currentTarget.value), readOnly: false }),
  };
});

describe("F07 current-consumer diagnostic", () => {
  let react: typeof import("react");
  let root: Root;
  let container: HTMLDivElement;
  let query: typeof import("@tanstack/react-query");
  let queryClient: import("@tanstack/react-query").QueryClient;
  let requests: Array<{ url: URL; body: unknown }>;
  let skyResponses = false;
  let mapResponses = false;
  const now = "2026-10-23T08:00:00.000Z";
  const bestTime = "2026-10-24T18:45:12.000Z";
  const spotB = {
    id: "f07-spot-b", name: "隔离测试观测点 B", coordinate: { lat: 40.12, lon: 116.22, system: "WGS84" },
    distanceMeters: 5000, status: "verified", mapState: "caution", facilities: [], verificationAt: null,
    imageUrl: null, source: { label: "isolated fixture", url: "https://example.invalid", licenseId: "fixture", fetchedAt: now }, factsBoundary: "test fixture",
  };
  const observed = (path: string) => requests.filter((item) => item.url.pathname === path);
  const testElement = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement;
  const render = async (Component: React.ComponentType) => react.act(async () => {
    root.render(react.createElement(query.QueryClientProvider, { client: queryClient }, react.createElement(Component)));
  });
  async function waitFor(predicate: () => boolean) {
    await vi.waitFor(async () => { await react.act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); expect(predicate()).toBe(true); });
  }
  beforeEach(async () => {
    vi.resetModules(); vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(now));
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "http://f07.invalid");
    requests = []; skyResponses = false; mapResponses = false;
    boundary.persistSkyResolution.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input)); requests.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.pathname === "/v1/sky" && skyResponses) return new Response(JSON.stringify({
        schemaVersion: "starward-sky-context-v1", state: "partial", generatedAt: now,
        algorithm: { name: "Astronomy Engine", version: "fixture-v1", coordinateSystem: "WGS84", refraction: "none" },
        context: { ...Object.fromEntries(url.searchParams), latitude: Number(url.searchParams.get("latitude")), longitude: Number(url.searchParams.get("longitude")), elevationM: 0 },
        catalog: { loadedChunk: "bright", deferredChunks: [], magnitudeLimit: 4 }, objects: [], selectedTarget: null,
        trajectory: [], bestTargetTime: bestTime, horizon: null, warnings: [],
      }), { status: 200 });
      if (url.pathname === "/v1/map/spots" && mapResponses) return new Response(JSON.stringify({
        items: [spotB], nextCursor: null, context: { center: { lat: 31.23, lon: 121.47, system: "WGS84" }, radiusMeters: 100000, limit: 20 }, generatedAt: now, status: "partial",
      }), { status: 200 });
      return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
    }));
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    react = await import("react"); query = await import("@tanstack/react-query");
    queryClient = new query.QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    container = document.createElement("div"); document.body.append(container);
    root = (await import("react-dom/client")).createRoot(container);
    const { useShellStore } = await import("../../../../apps/mobile/src/state/shell-store");
    useShellStore.setState({ location: { source: "manual", label: "隔离出发地 A", latitude: 31.23, longitude: 121.47 } });
  });
  afterEach(async () => {
    await react.act(async () => root.unmount()); queryClient.clear(); container.remove();
    vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
  });

  it("reproduces committed tomorrow in Tonight while Forecast and Map request today's night; shared origin does propagate", async () => {
    const { TonightScreen } = await import("../../../../apps/mobile/src/features/tonight/TonightScreen");
    const { useShellStore } = await import("../../../../apps/mobile/src/state/shell-store");
    await render(TonightScreen);
    await react.act(async () => testElement("tonight-date-tomorrow").click());
    expect(useShellStore.getState().decisionContext.observingNight).toBe("2026-10-24");
    expect(observed("/v1/night-reports").at(-1)?.body).toMatchObject({ nightDate: "2026-10-24", location: { lat: 31.23, lon: 121.47 } });
    const { ForecastScreen } = await import("../../../../apps/mobile/src/features/forecast/ForecastScreen");
    await render(ForecastScreen);
    expect(observed("/v1/forecast/hourly").at(-1)?.url.searchParams.get("nightDate")).toBe("2026-10-23");
    const { MapScreen } = await import("../../../../apps/mobile/src/features/map/MapScreen");
    await render(MapScreen);
    expect(observed("/v1/forecast/hourly").at(-1)?.url.searchParams.get("nightDate")).toBe("2026-10-23");
    expect(observed("/v1/map/spots").at(-1)?.url.searchParams.get("lat")).toBe("31.23");
    expect(container.textContent).toContain("2026-10-24");
    console.log("F07 night evidence", JSON.stringify({ committed: useShellStore.getState().decisionContext.observingNight, requestNights: observed("/v1/forecast/hourly").map(({ url }) => url.searchParams.get("nightDate")), location: "same synthetic origin", mapLabelStillClaims: "2026-10-24" }));
  });

  it("reproduces an invalid custom-date draft committing global context while no request is allowed", async () => {
    const { TonightScreen } = await import("../../../../apps/mobile/src/features/tonight/TonightScreen");
    const { useShellStore } = await import("../../../../apps/mobile/src/state/shell-store");
    await render(TonightScreen);
    await react.act(async () => testElement("tonight-date-custom").click());
    const beforeRequests = requests.length;
    await react.act(async () => {
      const input = testElement("tonight-custom-date") as HTMLInputElement;
      input.value = "2026-"; input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(useShellStore.getState().decisionContext.observingNight).toBe("2026-");
    expect(requests.length).toBe(beforeRequests);
    expect(container.textContent).toContain("请输入有效的 YYYY-MM-DD 日期");
    console.log("F07 invalid draft evidence", JSON.stringify({ committed: useShellStore.getState().decisionContext.observingNight, requestSuppressed: true }));
  });

  it("reproduces Sky's chosen instant being omitted by the actual Shooting navigation and request", async () => {
    skyResponses = true;
    const { SkyScreen } = await import("../../../../apps/mobile/src/features/sky/SkyScreen");
    const { useShellStore } = await import("../../../../apps/mobile/src/state/shell-store");
    const before = useShellStore.getState().decisionContext;
    await render(SkyScreen); await waitFor(() => container.textContent?.includes("计算时刻") === true);
    await react.act(async () => testElement("sky-jump-time").click());
    await waitFor(() => container.textContent?.includes(bestTime) === true);
    expect(observed("/v1/sky").at(-1)?.url.searchParams.get("at")).toBe(bestTime);
    expect(useShellStore.getState().decisionContext).toEqual(before);
    await react.act(async () => testElement("sky-open-shooting-assistant").click());
    expect(boundary.push).toHaveBeenLastCalledWith("/shooting");
    const { ShootingScreen } = await import("../../../../apps/mobile/src/features/shooting/ShootingScreen");
    const expectedDefaultAt = new Date(Date.now() + 6 * 60 * 60_000).toISOString();
    await render(ShootingScreen);
    const shooting = observed("/v1/shooting-plans").at(-1)!.url;
    expect(shooting.searchParams.get("scheduledAt")).toBe(expectedDefaultAt);
    expect(shooting.searchParams.get("latitude")).toBe("31.23");
    console.log("F07 moment evidence", JSON.stringify({ skySelected: bestTime, shootingAt: shooting.searchParams.get("scheduledAt"), shootingNight: shooting.searchParams.get("nightDate"), unchangedContext: true }));
  });

  it("reproduces selecting Map B, then navigating a fixed detail id and requesting current instead of B", async () => {
    mapResponses = true;
    const { MapScreen } = await import("../../../../apps/mobile/src/features/map/MapScreen");
    const { useMapSelectionStore } = await import("../../../../apps/mobile/src/features/map/map-selection-store");
    await render(MapScreen); await waitFor(() => !!container.querySelector('[aria-label="隔离测试观测点 B，caution"]'));
    await react.act(async () => (container.querySelector('[aria-label="隔离测试观测点 B，caution"]') as HTMLElement).click());
    expect(useMapSelectionStore.getState().selectedSpot?.id).toBe(spotB.id);
    expect(observed("/v1/routes/plan").at(-1)?.body).toMatchObject({ destination: spotB.coordinate });
    await react.act(async () => testElement("map-open-selected-spot-detail").click());
    expect(boundary.push).toHaveBeenLastCalledWith("/spot/spot-a");
    const { SpotScreen } = await import("../../../../apps/mobile/src/features/spots/SpotScreen");
    await render(SpotScreen);
    expect(observed("/v1/spots/current")).toHaveLength(1);
    console.log("F07 selected identity evidence", JSON.stringify({ selected: spotB.id, route: "/spot/spot-a", detailRequest: "/v1/spots/current", mapRouteDestination: spotB.coordinate }));
  });
});
