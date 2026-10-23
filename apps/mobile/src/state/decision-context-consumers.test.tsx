// @vitest-environment jsdom
// Product regression for the formerly failing F07 real consumer paths.
// React/Query/store/components/HTTP clients are real. Only RN/Expo/storage and
// external HTTP responses are replaced; no device or shared service is used.
import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ForecastBundle, ForecastQuery, ProfessionalForecastHour } from "@starward/contracts/forecast";
import { shiftObservingNight } from "@starward/contracts/observing-time";
import { buildShootingPlan, type ShootingInput } from "@starward/domain/shooting";

const boundary = vi.hoisted(() => ({
  push: vi.fn(), persistSkyResolution: vi.fn(),
  hydratePreferenceRuntime: vi.fn(), persistActiveProfile: vi.fn(),
  persistPreferenceProfile: vi.fn(), persistShellDestination: vi.fn(), persistShellLocation: vi.fn(),
  saveLocalShootingVersion: vi.fn(),
}));
vi.mock("../state/preferences-runtime", () => boundary);
vi.mock("../state/sky-runtime", () => boundary);
vi.mock("../../modules/orientation/expo-orientation-adapter", () => ({ startExpoOrientation: vi.fn() }));
vi.mock("../data/shooting-storage", () => ({
  loadLocalChecklist: async () => null, loadLocalShootingVersions: async () => [],
  saveLocalChecklist: vi.fn(), saveLocalShootingVersion: boundary.saveLocalShootingVersion,
}));
vi.mock("../native/map/native-map-gateway", () => ({ openNativeMapNavigation: vi.fn() }));
vi.mock("../shell/TabRestorationEvidence", () => ({
  useTabRestorationEvidence: () => ({ onScroll() {}, scrollEventThrottle: 16, evidence: null }),
}));
vi.mock("expo-router", () => ({ router: { push: boundary.push }, useLocalSearchParams: () => boundary.push.mock.calls.at(-1)?.[0]?.params ?? {} }));
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

function forecastFixture(context: ForecastQuery): ForecastBundle {
  const run = { provider: "fixture", model: "isolated", runId: `night-${context.nightDate}`, modelRunTimeUtc: `${context.nightDate}T08:00:00.000Z`, ingestedAt: `${context.nightDate}T08:00:00.000Z`, expiresAt: `${context.nightDate}T23:00:00.000Z`, resolutionKm: 1, status: "fresh", sourceLicense: "fixture", use: "noncommercial-poc", attribution: [], qualityFlags: [] } as const;
  const hours = [10, 16, 19].map((hour) => ({
    validTimeUtc: `${context.nightDate}T${hour}:00:00.000Z`, conditionText: `night-${context.nightDate}`, temperatureC: 10, apparentTemperatureC: 10,
    relativeHumidityPct: 50, dewPointC: 2, dewPointSpreadC: 8, pressureHpa: 1000, pressureChangeHpa: null,
    totalCloudPct: 10, lowCloudPct: null, midCloudPct: null, highCloudPct: null, visibilityM: 10000,
    windSpeedMps: 2, windGustMps: 3, windDirectionDeg: 90, precipitationMm: 0, precipitationProbabilityPct: 0,
    fogProbabilityPct: null, aqi: null, aqiScale: null, pm25UgM3: null, pm10UgM3: null, aerosolOpticalDepth: null,
    moonIlluminationPct: 10, moonAltitudeDeg: null, moonAzimuthDeg: null, targetAltitudeDeg: 30, targetAzimuthDeg: 80,
    atmosphere: { label: "fixture", confidence: 0.5, factors: [], uncertainty: "fixture", methodVersion: "fixture", officialSeeing: false }, quality: "fresh", missingFields: [],
  })) as ProfessionalForecastHour[];
  return {
    schemaVersion: "starward-forecast-bundle-v1", status: "fresh", runtimeMode: "noncommercial-poc", generatedAt: run.ingestedAt, expiresAt: run.expiresAt,
    context: { ...context, coordinateSystem: "WGS84" }, primary: { run: { ...run, attribution: [], qualityFlags: [] }, hours }, comparison: null,
    modelComparison: { status: "fresh", confidence: 0.5, explanation: "fixture", consensusStartUtc: null, consensusEndUtc: null, disagreementStartUtc: null, disagreementEndUtc: null, comparedFields: [] },
    trends: [context.nightDate, shiftObservingNight(context.nightDate, 1)].map((date) => ({ date, status: "fresh", confidence: 0.5, conditionText: date, lowTemperatureC: 10, highTemperatureC: 20, averageTotalCloudPct: 10, precipitationMm: 0, precipitationProbabilityPct: 0, moonIlluminationPct: 10, astronomicalDarkMinutes: 300, moonlessDarkMinutes: 60, targetVisibleMinutes: 90, planningOnly: true })),
    astronomy: { algorithmVersion: "fixture", coordinateSystem: "WGS84", timezone: context.timezone, nightDate: context.nightDate, observer: { latitude: context.latitude, longitude: context.longitude, elevationM: 0 }, civilDusk: null, nauticalDusk: null, astronomicalDusk: null, astronomicalDawn: null, nauticalDawn: null, civilDawn: null, moonRise: null, moonSet: null, astronomicalDarkWindow: { startUtc: `${context.nightDate}T10:45:12.000Z`, endUtc: `${context.nightDate}T20:00:00.000Z`, durationMinutes: 554.8 }, moonlessWindow: null, targetWindow: null, bestIntersection: null, limitations: [] },
    layers: [], warnings: [],
  };
}

describe("F07 committed decision consumers", () => {
  let react: typeof import("react");
  let root: Root;
  let container: HTMLDivElement;
  let query: typeof import("@tanstack/react-query");
  let queryClient: import("@tanstack/react-query").QueryClient;
  let requests: Array<{ url: URL; body: unknown }>;
  let skyResponses = false;
  let mapResponses = false;
  let forecastResponses = false;
  let shootingResponses = false;
  let spotResponses = false;
  let deferredForecasts: Map<string, (response: Response) => void> | null;
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
    requests = []; skyResponses = false; mapResponses = false; forecastResponses = false; shootingResponses = false; spotResponses = false; deferredForecasts = null;
    boundary.persistSkyResolution.mockResolvedValue(undefined);
    boundary.saveLocalShootingVersion.mockImplementation(async version => [version]);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input)); requests.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.pathname === "/v1/forecast/hourly") {
        if (deferredForecasts) return new Promise<Response>((resolve) => deferredForecasts!.set(url.searchParams.get("nightDate")!, resolve));
        if (forecastResponses) return new Response(JSON.stringify(forecastFixture({ ...Object.fromEntries(url.searchParams), latitude: Number(url.searchParams.get("latitude")), longitude: Number(url.searchParams.get("longitude")) } as unknown as ForecastQuery)));
      }
      if (url.pathname === "/v1/shooting-plans" && shootingResponses) {
        const context = { ...Object.fromEntries(url.searchParams), latitude: Number(url.searchParams.get("latitude")), longitude: Number(url.searchParams.get("longitude")), focalLengthMm: Number(url.searchParams.get("focalLengthMm")), acceptsStacking: url.searchParams.get("acceptsStacking") === "true", locationId: url.searchParams.get("locationId")!, scheduledAt: url.searchParams.get("scheduledAt")!, timezone: url.searchParams.get("timezone")! };
        const conditions = { capturedAt: now, sourceVersions: ["fixture"], weatherSampleAt: `${String(context.scheduledAt).slice(0, 10)}T19:00:00.000Z`, weatherSampleOffsetMinutes: 14.8, astronomyAt: context.scheduledAt };
        const input = { target: "milky-way", locationId: context.locationId, scheduledAt: context.scheduledAt, timezone: context.timezone, acceptsStacking: true, experience: "intermediate", conditions, equipment: { kind: "camera", model: "fixture", sensorWidthMm: 36, sensorHeightMm: 24, focalLengthMm: context.focalLengthMm, maxAperture: 2.8, tracker: false, tripod: true } } as ShootingInput;
        const result = buildShootingPlan(input);
        return new Response(JSON.stringify({ schemaVersion: "starward-shooting-preview-v1", generatedAt: now, state: "partial", context, conditions, phone: { input, result }, camera: { input, result }, provenance: { weather: { provider: "fixture", model: "fixture", runId: "fixture" }, astronomy: "fixture" } }));
      }
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
      if (url.pathname === `/v1/spots/${spotB.id}` && spotResponses) return new Response(JSON.stringify({
        id: spotB.id, name: spotB.name, status: "caution", statusReason: "尚未现场核验", updatedAt: now,
        coordinate: { level: "approximate", coordinate: { lat: 40, lon: 116, system: "WGS84" }, exact: false, reason: "权限仅含近似范围" },
        facts: [], actions: [], trust: { verifiedSources: 0, conflicts: [], fieldVerificationRequired: true },
      }));
      return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
    }));
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    react = await import("react"); query = await import("@tanstack/react-query");
    queryClient = new query.QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    container = document.createElement("div"); document.body.append(container);
    root = (await import("react-dom/client")).createRoot(container);
    const { useShellStore } = await import("../state/shell-store");
    useShellStore.setState({ location: { source: "manual", label: "隔离出发地 A", latitude: 31.23, longitude: 121.47 } });
  });
  afterEach(async () => {
    await react.act(async () => root.unmount()); queryClient.clear(); container.remove();
    vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
  });

  it("uses the committed future night in Tonight, Forecast and Map, including already-mounted consumers and returning Tonight", async () => {
    const { TonightScreen } = await import("../features/tonight/TonightScreen");
    const { useShellStore } = await import("../state/shell-store");
    await render(TonightScreen);
    await react.act(async () => testElement("tonight-date-tomorrow").click());
    expect(useShellStore.getState().decisionContext.observingNight).toBe("2026-10-24");
    expect(observed("/v1/night-reports").at(-1)?.body).toMatchObject({ nightDate: "2026-10-24", location: { lat: 31.23, lon: 121.47 } });
    const { ForecastScreen } = await import("../features/forecast/ForecastScreen");
    await render(ForecastScreen);
    expect(observed("/v1/forecast/hourly").at(-1)?.url.searchParams.get("nightDate")).toBe("2026-10-24");
    const { MapScreen } = await import("../features/map/MapScreen");
    await render(MapScreen);
    expect(observed("/v1/forecast/hourly").at(-1)?.url.searchParams.get("nightDate")).toBe("2026-10-24");
    expect(observed("/v1/map/spots").at(-1)?.url.searchParams.get("lat")).toBe("31.23");
    expect(container.textContent).toContain("2026-10-24");
    await react.act(async () => useShellStore.getState().commitDecisionContext({ observingNight: "2026-10-27" }));
    expect(observed("/v1/forecast/hourly").at(-1)?.url.searchParams.get("nightDate")).toBe("2026-10-27");
    await render(TonightScreen);
    expect(useShellStore.getState().decisionContext.observingNight).toBe("2026-10-27");
    expect(observed("/v1/night-reports").at(-1)?.body).toMatchObject({ nightDate: "2026-10-27" });
  });

  it("keeps invalid and cancelled date drafts local, committing only a valid explicit apply", async () => {
    const { TonightScreen } = await import("../features/tonight/TonightScreen");
    const { useShellStore } = await import("../state/shell-store");
    await render(TonightScreen);
    await react.act(async () => testElement("tonight-date-custom").click());
    const beforeRequests = requests.length;
    await react.act(async () => {
      const input = testElement("tonight-custom-date") as HTMLInputElement;
      input.value = "2026-"; input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(useShellStore.getState().decisionContext.observingNight).toBe("2026-10-23");
    expect(requests.length).toBe(beforeRequests);
    expect(container.textContent).toContain("请输入有效的 YYYY-MM-DD 日期");
    expect((testElement("tonight-apply-date") as HTMLButtonElement).disabled).toBe(true);
    const edit = async (value: string) => react.act(async () => { const input = testElement("tonight-custom-date") as HTMLInputElement; input.value = value; input.dispatchEvent(new Event("input", { bubbles: true })); });
    await edit("2026-02-30");
    expect((testElement("tonight-apply-date") as HTMLButtonElement).disabled).toBe(true);
    await edit("2026-10-27");
    await react.act(async () => testElement("tonight-cancel-date").click());
    expect(useShellStore.getState().decisionContext.observingNight).toBe("2026-10-23");
    await react.act(async () => testElement("tonight-date-custom").click());
    await edit("2026-10-27");
    await react.act(async () => testElement("tonight-apply-date").click());
    expect(observed("/v1/night-reports").at(-1)?.body).toMatchObject({ nightDate: "2026-10-27" });
  });

  it("carries Sky's exact selected moment and night into the actual Shooting request and saved version", async () => {
    skyResponses = true; shootingResponses = true;
    const { SkyScreen } = await import("../features/sky/SkyScreen");
    const { useShellStore } = await import("../state/shell-store");
    await render(SkyScreen); await waitFor(() => container.textContent?.includes("计算时刻") === true);
    await react.act(async () => testElement("sky-jump-time").click());
    await waitFor(() => container.textContent?.includes(bestTime) === true);
    expect(observed("/v1/sky").at(-1)?.url.searchParams.get("at")).toBe(bestTime);
    expect(useShellStore.getState().decisionContext).toMatchObject({ moment: bestTime, momentSource: "selected", observingNight: "2026-10-24" });
    await react.act(async () => testElement("sky-open-shooting-assistant").click());
    expect(boundary.push).toHaveBeenLastCalledWith("/shooting");
    const { ShootingScreen } = await import("../features/shooting/ShootingScreen");
    await render(ShootingScreen);
    const shooting = observed("/v1/shooting-plans").at(-1)!.url;
    expect(shooting.searchParams.get("scheduledAt")).toBe(bestTime);
    expect(shooting.searchParams.get("nightDate")).toBe("2026-10-24");
    expect(shooting.searchParams.get("latitude")).toBe("31.23");
    await waitFor(() => !!testElement("shooting-data-ready"));
    await react.act(async () => testElement("shooting-save-version").click());
    expect(boundary.saveLocalShootingVersion).toHaveBeenCalledOnce();
    expect(boundary.saveLocalShootingVersion.mock.calls[0][0].input).toMatchObject({ scheduledAt: bestTime, locationId: "origin:31.23,121.47", timezone: "Asia/Shanghai" });
    await react.act(async () => useShellStore.getState().commitDecisionContext({ observingNight: "2026-10-28" }));
    expect(testElement("shooting-plan-version").textContent).toContain(bestTime);
    expect(testElement("shooting-plan-version").textContent).not.toContain("2026-10-28");
  });

  it("uses selected Map B for its real detail and observing consumers while preserving route origin A", async () => {
    mapResponses = true;
    const { MapScreen } = await import("../features/map/MapScreen");
    const { useMapSelectionStore } = await import("../features/map/map-selection-store");
    await render(MapScreen); await waitFor(() => !!container.querySelector('[aria-label="隔离测试观测点 B，caution"]'));
    expect((testElement("map-open-selected-spot-detail") as HTMLButtonElement).disabled).toBe(true);
    await react.act(async () => (container.querySelector('[aria-label="隔离测试观测点 B，caution"]') as HTMLElement).click());
    expect(useMapSelectionStore.getState().selectedSpot?.id).toBe(spotB.id);
    expect(observed("/v1/routes/plan").at(-1)?.body).toMatchObject({ origin: { lat: 31.23, lon: 121.47 }, destination: spotB.coordinate });
    await react.act(async () => testElement("map-open-selected-spot-detail").click());
    expect(boundary.push).toHaveBeenLastCalledWith({ pathname: "/spot/[spotId]", params: { spotId: spotB.id } });
    const { SpotScreen } = await import("../features/spots/SpotScreen");
    await render(SpotScreen);
    expect(observed(`/v1/spots/${spotB.id}`)).toHaveLength(1);
    expect(observed("/v1/spots/current")).toHaveLength(0);
    const { SkyScreen } = await import("../features/sky/SkyScreen");
    await render(SkyScreen);
    expect(observed("/v1/sky").at(-1)?.url.searchParams.get("latitude")).toBe("40.12");
    await render(MapScreen);
    expect(useMapSelectionStore.getState().selectedSpot?.id).toBe(spotB.id);
    expect(observed("/v1/map/spots").at(-1)?.url.searchParams.get("lat")).toBe("31.23");
  });

  it("commits Forecast date and exact event/hour selections, while section browsing stays local", async () => {
    forecastResponses = true;
    const { ForecastScreen } = await import("../features/forecast/ForecastScreen");
    const { useShellStore } = await import("./shell-store");
    await render(ForecastScreen);
    await waitFor(() => !!testElement("forecast-data-ready"));
    const beforeBrowse = useShellStore.getState().decisionContext;
    await react.act(async () => testElement("forecast-compare-models").click());
    expect(useShellStore.getState().decisionContext).toBe(beforeBrowse);
    await react.act(async () => testElement("forecast-night-2026-10-24").click());
    await waitFor(() => container.textContent?.includes("night-2026-10-24") === true);
    expect(useShellStore.getState().decisionContext).toMatchObject({ observingNight: "2026-10-24", momentSource: "night-preview" });
    await react.act(async () => testElement("twilight-window-strip").click());
    expect(useShellStore.getState().decisionContext).toMatchObject({ moment: "2026-10-24T10:45:12.000Z", momentSource: "selected" });
    await react.act(async () => testElement("forecast-hour-2026-10-24T16:00:00.000Z").click());
    expect(useShellStore.getState().decisionContext).toMatchObject({ moment: "2026-10-24T16:00:00.000Z", observingNight: "2026-10-24" });
    const { SkyScreen } = await import("../features/sky/SkyScreen");
    await render(SkyScreen);
    expect(observed("/v1/sky").at(-1)?.url.searchParams.get("at")).toBe("2026-10-24T16:00:00.000Z");
  });

  it("distinguishes a deep-linked B detail from adopted A without using B's permission-limited coordinate", async () => {
    spotResponses = true;
    const { useShellStore } = await import("./shell-store");
    const adopted = { ...spotB, id: "adopted-a", name: "已采用的地点 A", coordinate: { lat: 31.2, lon: 121.4, system: "WGS84" as const }, status: "verified" as const, mapState: "caution" as const };
    useShellStore.getState().selectSpot(adopted);
    const before = useShellStore.getState().decisionContext;
    boundary.push({ pathname: "/spot/[spotId]", params: { spotId: spotB.id } });
    const { SpotScreen } = await import("../features/spots/SpotScreen");
    await render(SpotScreen);
    await waitFor(() => !!testElement("spot-detail-ready"));
    expect(container.textContent).toContain(spotB.name);
    expect(testElement("decision-context-revision").textContent).toContain("正在浏览 隔离测试观测点 B；尚未用于当前观星安排。");
    expect(testElement("decision-context-revision").textContent).toContain("已采用的地点 A");
    expect(useShellStore.getState().selectedSpot).toEqual(adopted);
    expect(useShellStore.getState().decisionContext).toBe(before);
    const { SkyScreen } = await import("../features/sky/SkyScreen");
    await render(SkyScreen);
    expect(observed("/v1/sky").at(-1)?.url.searchParams.get("latitude")).toBe("31.2");
    expect(observed("/v1/sky").at(-1)?.url.searchParams.get("longitude")).toBe("121.4");
  });

  it("never publishes an old-night response as the current Forecast after a newer request wins", async () => {
    deferredForecasts = new Map();
    const { ForecastScreen } = await import("../features/forecast/ForecastScreen");
    const { useShellStore } = await import("./shell-store");
    await render(ForecastScreen);
    await react.act(async () => useShellStore.getState().commitDecisionContext({ observingNight: "2026-10-24" }));
    const reply = (nightDate: string) => {
      const request = observed("/v1/forecast/hourly").find((item) => item.url.searchParams.get("nightDate") === nightDate)!.url;
      const context = { ...Object.fromEntries(request.searchParams), latitude: Number(request.searchParams.get("latitude")), longitude: Number(request.searchParams.get("longitude")) } as unknown as ForecastQuery;
      deferredForecasts!.get(nightDate)!(new Response(JSON.stringify(forecastFixture(context))));
    };
    await react.act(async () => reply("2026-10-24"));
    await waitFor(() => !!testElement("forecast-data-ready"));
    expect(container.textContent).toContain("night-2026-10-24");
    await react.act(async () => reply("2026-10-23"));
    expect(container.textContent).not.toContain("night-2026-10-23");
    expect(container.textContent).toContain("night-2026-10-24");
  });
});
