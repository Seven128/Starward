// @vitest-environment jsdom
import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpotTrustDetail } from "@starward/contracts/spot";

const boundary = vi.hoisted(() => ({ params: {} as { spotId?: string | string[] }, replace: vi.fn(), push: vi.fn() }));
vi.mock("expo-router", () => ({ router: { replace: boundary.replace, push: boundary.push }, useLocalSearchParams: () => boundary.params }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: { apiBaseUrl: "http://spot-fixture.invalid" } } } }));
vi.mock("../../shell/DecisionContextRevision", () => ({ DecisionContextRevision: () => null }));
vi.mock("../../shell/TabRestorationEvidence", () => ({ useTabRestorationEvidence: () => ({ onScroll() {}, scrollEventThrottle: 16, evidence: null }) }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const node = ({ children, testID }: { children: ReactNode; testID?: string }) => createElement("div", { "data-testid": testID }, children);
  return {
    View: node, Text: node, ScrollView: node, StyleSheet: { create: (value: unknown) => value },
    Pressable: ({ children, testID, onPress }: { children: ReactNode; testID?: string; onPress(): void }) => createElement("button", { "data-testid": testID, onClick: onPress }, children),
  };
});

const detail = (id: string, name: string): SpotTrustDetail => ({
  id, name, status: "caution", statusReason: "隔离测试：未现场核验", updatedAt: "2026-10-23T08:00:00Z",
  coordinate: { level: "approximate", coordinate: { lat: 40.12, lon: 116.23, system: "WGS84" }, exact: false, reason: "近似区域" },
  facts: [], actions: [], trust: { verifiedSources: 0, conflicts: [], fieldVerificationRequired: true },
});

describe("native spot route identity", () => {
  let react: typeof import("react");
  let query: typeof import("@tanstack/react-query");
  let queryClient: import("@tanstack/react-query").QueryClient;
  let root: Root;
  let container: HTMLDivElement;
  let Screen: React.ComponentType;
  let pending: Array<{ url: URL; resolve(response: Response): void }>;
  const render = async () => react.act(async () => {
    root.render(react.createElement(query.QueryClientProvider, { client: queryClient }, react.createElement(Screen)));
  });
  const waitForText = async (text: string) => vi.waitFor(async () => {
    await react.act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain(text);
  });

  beforeEach(async () => {
    vi.resetModules(); vi.clearAllMocks();
    boundary.params = {};
    pending = [];
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "http://spot-fixture.invalid");
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => new Promise<Response>((resolve) => pending.push({ url: new URL(String(input)), resolve }))));
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    react = await import("react"); query = await import("@tanstack/react-query");
    queryClient = new query.QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    container = document.createElement("div"); document.body.append(container);
    root = (await import("react-dom/client")).createRoot(container);
    Screen = (await import("../../../app/(map)/spot/[spotId]")).default;
  });
  afterEach(async () => {
    await react.act(async () => root.unmount()); queryClient.clear(); container.remove();
    vi.unstubAllGlobals(); vi.unstubAllEnvs();
  });

  it("keeps B's route/query/HTTP and visible result after an obsolete A response arrives", async () => {
    boundary.params = { spotId: "osm-42001" }; await render();
    boundary.params = { spotId: "osm-42002" }; await render();
    expect(pending.map((request) => request.url.pathname)).toEqual(["/v1/spots/osm-42001", "/v1/spots/osm-42002"]);
    await react.act(async () => pending[1]!.resolve(new Response(JSON.stringify(detail("osm-42002", "隔离地点 B")), { status: 200 })));
    await waitForText("隔离地点 B");
    await react.act(async () => pending[0]!.resolve(new Response(JSON.stringify(detail("osm-42001", "过时地点 A")), { status: 200 })));
    expect(container.textContent).toContain("隔离地点 B");
    expect(container.textContent).not.toContain("过时地点 A");
    expect(queryClient.getQueryData(["spot-detail", "osm-42002"])).toMatchObject({ id: "osm-42002" });
  });

  it("leaves absent or unavailable identities recoverable without an implicit current request", async () => {
    await render();
    expect(pending).toHaveLength(0);
    expect(container.textContent).toContain("地点不存在或暂无查看权限");
    boundary.params = { spotId: "missing-b" }; await render();
    expect(pending[0]?.url.pathname).toBe("/v1/spots/missing-b");
    await react.act(async () => pending[0]!.resolve(new Response(JSON.stringify({ code: "spot_not_found" }), { status: 404 })));
    await waitForText("地点不存在或暂无查看权限");
    expect(container.querySelector('[data-testid="spot-detail-ready"]')).toBeNull();
    await react.act(async () => (container.querySelector('[data-testid="spot-return-map"]') as HTMLButtonElement).click());
    expect(boundary.replace).toHaveBeenLastCalledWith("/map");
    expect(pending).toHaveLength(1);
  });

  it("withdraws previously visible detail when the server no longer permits the same identity", async () => {
    boundary.params = { spotId: "private-b" }; await render();
    await react.act(async () => pending[0]!.resolve(new Response(JSON.stringify(detail("private-b", "受保护地点 B")), { status: 200 })));
    await waitForText("受保护地点 B");
    await react.act(async () => { void queryClient.refetchQueries({ queryKey: ["spot-detail", "private-b"] }); });
    expect(pending).toHaveLength(2);
    await react.act(async () => pending[1]!.resolve(new Response(JSON.stringify({ code: "spot_not_found" }), { status: 404 })));
    await waitForText("地点不存在或暂无查看权限");
    expect(container.textContent).not.toContain("受保护地点 B");
    expect(container.querySelector('[data-testid="spot-detail-ready"]')).toBeNull();
    expect(queryClient.getQueryData(["spot-detail", "private-b"])).toBeNull();

    // A transient retry cannot restore data that was authoritatively refused.
    await react.act(async () => { void queryClient.refetchQueries({ queryKey: ["spot-detail", "private-b"] }); });
    expect(container.textContent).not.toContain("受保护地点 B");
    for (let index = 2; index < 5; index += 1) {
      await vi.waitFor(() => expect(pending.length).toBeGreaterThan(index), { timeout: 4500 });
      await react.act(async () => pending[index]!.resolve(new Response(JSON.stringify({ code: "spot_detail_unavailable" }), { status: 503 })));
    }
    await vi.waitFor(() => expect(queryClient.getQueryState(["spot-detail", "private-b"])?.status).toBe("error"), { timeout: 4500 });
    await render();
    expect(container.textContent).not.toContain("受保护地点 B");
    expect(container.querySelector('[data-testid="spot-detail-ready"]')).toBeNull();
    expect(queryClient.getQueryData(["spot-detail", "private-b"])).toBeNull();

    await react.act(async () => { void queryClient.refetchQueries({ queryKey: ["spot-detail", "private-b"] }); });
    await react.act(async () => pending[5]!.resolve(new Response(JSON.stringify(detail("private-b", "重新授权的地点 B")), { status: 200 })));
    await waitForText("重新授权的地点 B");
  });
});
