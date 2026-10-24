// @vitest-environment jsdom
import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { nativeForecastClock, nativeForecastRun, type ForecastComparisonSample } from "../../../../../tests/fixtures/native-forecast";
import { ForecastQueryService } from "../../../../api/src/modules/forecast/forecast-query-service";
import { buildApi } from "../../../../api/src/server";

const boundary = vi.hoisted(() => ({ commit: vi.fn() }));
vi.mock("../../state/use-decision-snapshot", () => ({ useDecisionSnapshot: () => ({
  observingNight: "2026-07-20", moment: "2026-07-20T12:00:00.000Z", timezone: "Asia/Shanghai", target: "milky-way-core",
  observer: { latitude: 22.529, longitude: 113.9468, label: "合成公开测试点" },
}) }));
vi.mock("../../state/shell-store", () => ({ useShellStore: (select: (value: unknown) => unknown) => select({ commitDecisionContext: boundary.commit }) }));
vi.mock("../../shell/DecisionContextRevision", () => ({ DecisionContextRevision: () => null }));
vi.mock("../../shell/TabRestorationEvidence", () => ({ useTabRestorationEvidence: () => ({ onScroll() {}, scrollEventThrottle: 16, evidence: null }) }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: { apiBaseUrl: "http://comparison.invalid" } } } }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native", async () => {
  const { createElement, forwardRef } = await import("react");
  const node = forwardRef<HTMLDivElement, { children: ReactNode; testID?: string }>(({ children, testID }, ref) => createElement("div", { ref, "data-testid": testID }, children));
  return { View: node, Text: node, ScrollView: node, Platform: { OS: "web" }, StyleSheet: { create: (value: unknown) => value },
    Pressable: ({ children, onPress, disabled, testID }: { children: ReactNode; onPress(): void; disabled?: boolean; testID?: string }) => createElement("button", { onClick: onPress, disabled, "data-testid": testID }, children),
  };
});

let app: FastifyInstance, root: Root, container: HTMLDivElement;
let react: typeof import("react"), cache: import("@tanstack/react-query").QueryClient;
let mode: "unavailable" | "empty" | "partial" | "zero";
let requests: number;
const samples = (cloud: number | null, rain: number | null): ForecastComparisonSample[] => [0, 1].map(hour => ({ hour, totalCloudPct: cloud, precipitationProbabilityPct: rain }));
const evidence = () => container.querySelector('[data-testid="forecast-disagreement"]')!.textContent!;
async function settled(check: () => void) { await vi.waitFor(async () => { await react.act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); check(); }); }

beforeEach(async () => {
  vi.resetModules(); mode = "unavailable"; requests = 0;
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "http://comparison.invalid");
  const service = new ForecastQueryService({ maxCacheEntries: 0, now: () => new Date(nativeForecastClock),
    primary: { load: async () => nativeForecastRun("gfs_seamless", 0, mode === "empty" ? samples(null, null) : mode === "partial" ? samples(50, 40) : samples(0, 0)) },
    comparison: { load: async () => { if (mode === "unavailable") throw new Error("controlled_source_unavailable"); return nativeForecastRun("ecmwf_ifs025", 0, mode === "empty" ? samples(null, null) : mode === "partial" ? samples(50, null) : samples(0, 0)); } },
  });
  app = await buildApi({ forecast: service, nightReports: { create: async () => { throw new Error("not_used"); } }, spots: { getDetail: async () => { throw new Error("not_used"); } }, resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }), allowedOrigins: ["http://comparison.invalid"] });
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input)); expect(url.origin).toBe("http://comparison.invalid"); expect(url.pathname).toBe("/v1/forecast/hourly"); requests++;
    const response = await app.inject({ method: "GET", url: url.pathname + url.search, headers: init?.headers as Record<string, string> });
    return new Response(response.body, { status: response.statusCode, headers: { "content-type": "application/json" } });
  }));
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  react = await import("react"); const query = await import("@tanstack/react-query");
  cache = new query.QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  container = document.createElement("div"); document.body.append(container); root = (await import("react-dom/client")).createRoot(container);
});
afterEach(async () => { if (root) await react.act(async () => root.unmount()); cache?.clear(); container?.remove(); await app?.close(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function render() {
  const { ForecastScreen } = await import("./ForecastScreen"), { QueryClientProvider } = await import("@tanstack/react-query");
  await react.act(async () => root.render(<QueryClientProvider client={cache}><ForecastScreen /></QueryClientProvider>));
  await settled(() => expect(container.querySelector('[data-testid="forecast-disagreement"]')).not.toBeNull());
}

it("renders unavailable comparison without agreement or its legacy placeholder confidence, then recovers to real zero evidence", async () => {
  await render();
  expect(evidence()).toContain("模型暂不可比"); expect(evidence()).not.toContain("当前一致");
  expect(container.textContent).toContain("暂无对比可信度"); expect(container.textContent).not.toContain("45%");
  mode = "zero"; await react.act(async () => { await cache.invalidateQueries({ queryKey: ["forecast"] }); });
  await settled(() => expect(evidence()).toContain("可比资料未见显著分歧"));
  expect(evidence()).toContain("总云量、降水概率"); expect(container.textContent).not.toContain("暂无对比可信度");
  expect(requests).toBe(2); expect(boundary.commit).not.toHaveBeenCalled();
});

it.each(["empty", "partial"] as const)("shows actual %s service qualification without invented agreement", async value => {
  mode = value; await render();
  expect(evidence()).toContain(value === "empty" ? "模型暂不可比" : "模型部分可比");
  expect(evidence()).not.toContain("当前一致"); expect(evidence()).not.toContain("存在分歧");
  expect(container.textContent).toContain(value === "empty" ? "暂无对比可信度" : "对比有限");
  expect(requests).toBe(1);
});
