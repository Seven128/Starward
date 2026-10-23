// @vitest-environment jsdom
// Real screen, React Query, shooting rules and local version repository. Only
// device/storage transport boundaries are replaced with isolated synthetic data.
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { buildShootingPlan, saveShootingPlanVersion, type ShootingInput, type ShootingPlanVersion } from "@starward/domain/shooting";

const boundary = vi.hoisted(() => ({ snapshot: null as any, store: new Map<string, string>(), uncertain: false, unavailableRead: false, writes: [] as ShootingPlanVersion[][] }));
vi.mock("../../state/use-decision-snapshot", () => ({ useDecisionSnapshot: () => boundary.snapshot }));
vi.mock("../../shell/TabRestorationEvidence", () => ({ useTabRestorationEvidence: () => ({ evidence: null }) }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: { apiBaseUrl: "http://shooting-fixture.invalid" } } } }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: async (key: string) => {
    if (boundary.unavailableRead) { boundary.unavailableRead = false; throw new Error("read_unavailable"); }
    return boundary.store.get(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    boundary.store.set(key, value); boundary.writes.push(JSON.parse(value));
    if (boundary.uncertain) {
      boundary.uncertain = false; boundary.unavailableRead = true;
      throw new Error("lost_commit_response");
    }
  },
} }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: any) => children }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const node = ({ children, testID }: any) => createElement("div", { "data-testid": testID }, children);
  return { View: node, Text: node, ScrollView: node, StyleSheet: { create: (value: any) => value }, Pressable: ({ children, onPress, testID, disabled }: any) => createElement("button", { "data-testid": testID, onClick: onPress, disabled }, children) };
});

afterEach(() => { boundary.store.clear(); boundary.writes = []; boundary.uncertain = false; boundary.unavailableRead = false; });

it("retries an unconfirmed A snapshot after switching to B, then saves B separately and restores both on remount", async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const first = "2026-10-24T16:00:00.000Z", second = "2026-10-24T17:00:00.000Z";
  boundary.snapshot = { revision: 1, observingNight: "2026-10-24", moment: first, momentSource: "selected", timezone: "Asia/Shanghai", target: "milky-way-core", observer: { latitude: 31.2, longitude: 121.4, locationId: "selected-b", label: "测试地点" }, profile: { lensFocalLengthsMm: [24] } };
  const input = (scheduledAt: string): ShootingInput => ({ target: "milky-way", locationId: "selected-b", scheduledAt, timezone: "Asia/Shanghai", acceptsStacking: true, experience: "intermediate", equipment: { kind: "camera", model: "fixture", sensorWidthMm: 36, sensorHeightMm: 24, focalLengthMm: 24, maxAperture: 2.8, tracker: false, tripod: true }, conditions: { capturedAt: first, sourceVersions: ["fixture"] } });
  const prior = saveShootingPlanVersion(null, input("2026-10-24T15:00:00.000Z"), {}, "2026-10-23T10:00:00.000Z");
  boundary.store.set("starward-shooting-versions-v1", JSON.stringify([prior]));
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, gcTime: Infinity } } });
  for (const scheduledAt of [first, second]) {
    const context = { latitude: 31.2, longitude: 121.4, timezone: "Asia/Shanghai", nightDate: "2026-10-24", locationId: "selected-b", scheduledAt, target: "milky-way-core", focalLengthMm: 24, acceptsStacking: true };
    const plan = input(scheduledAt), result = buildShootingPlan(plan);
    client.setQueryData(["shooting-preview", context], { schemaVersion: "starward-shooting-preview-v1", context, conditions: plan.conditions, camera: { input: plan, result }, phone: { input: plan, result }, provenance: { weather: { runId: "fixture" }, astronomy: "fixture" } });
  }
  const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
  const { ShootingScreen } = await import("./ShootingScreen");
  const render = (key = "first-mount") => act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(ShootingScreen, { key }))));
  const save = () => (container.querySelector('[data-testid="shooting-save-version"]') as HTMLButtonElement).click();
  try {
    await render(); boundary.uncertain = true;
    // Two taps before React publishes busy state must still share one attempt.
    await act(async () => { save(); save(); });
    expect(container.textContent).toContain("拍摄版本保存未确认");
    expect(boundary.writes).toHaveLength(1);
    const captured = boundary.writes[0][1];
    expect(captured).toMatchObject({ id: prior.id, revision: 2, input: { scheduledAt: first } });
    boundary.snapshot = { ...boundary.snapshot, revision: 2, moment: second }; await render();
    const retry = [...container.querySelectorAll("button")].find(button => button.textContent === "重试");
    expect(retry).toBeDefined(); await act(async () => retry!.click());
    const stored = JSON.parse(boundary.store.get("starward-shooting-versions-v1")!) as ShootingPlanVersion[];
    expect(stored).toEqual([prior, captured]);
    expect(boundary.writes).toHaveLength(1); // exact retry is a read, not a replacement
    expect(container.querySelector('[data-testid="shooting-plan-version"]')?.textContent).toContain(first);
    await act(async () => save());
    const complete = JSON.parse(boundary.store.get("starward-shooting-versions-v1")!) as ShootingPlanVersion[];
    expect(complete).toHaveLength(3);
    expect(complete[1]).toEqual(captured);
    expect(complete[2]).toMatchObject({ id: prior.id, revision: 3, previousRevision: 2, input: { scheduledAt: second } });
    await render("remount");
    await act(async () => (container.querySelector('[data-testid="shooting-create-camera-plan"]') as HTMLButtonElement).click());
    expect(container.querySelector('[data-testid="shooting-save-version"]')?.textContent).toContain("r4");
    expect(JSON.parse(boundary.store.get("starward-shooting-versions-v1")!)).toEqual(complete);

    // Another mounted owner committed r4 after this screen's read. Collision
    // recovery requires a separate explicit action and preserves that version.
    const concurrent = saveShootingPlanVersion(complete[2], input(first), {}, "2026-10-23T10:03:00.000Z");
    boundary.store.set("starward-shooting-versions-v1", JSON.stringify([...complete, concurrent]));
    await act(async () => save());
    expect(container.textContent).toContain("拍摄版本发生冲突");
    expect(JSON.parse(boundary.store.get("starward-shooting-versions-v1")!).at(-1)).toEqual(concurrent);
    const saveRetained = [...container.querySelectorAll("button")].find(button => button.textContent === "另存原方案为新版本");
    expect(saveRetained).toBeDefined(); await act(async () => saveRetained!.click());
    const recovered = JSON.parse(boundary.store.get("starward-shooting-versions-v1")!);
    expect(recovered.slice(0, 4)).toEqual([...complete, concurrent]);
    expect(recovered[4]).toMatchObject({ id: prior.id, revision: 5, previousRevision: 4, input: { scheduledAt: second } });
  } finally { await act(async () => root.unmount()); client.clear(); container.remove(); }
});
