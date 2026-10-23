// @vitest-environment jsdom
import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import type { LocationObject } from "expo-location";
import type { PreferenceProjection } from "@starward/domain/preferences/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({
  hydratePreferenceRuntime: vi.fn(), persistActiveProfile: vi.fn(), persistPreferenceProfile: vi.fn(),
  persistShellDestination: vi.fn(), persistShellLocation: vi.fn(),
  getForegroundPermissionsAsync: vi.fn(), requestForegroundPermissionsAsync: vi.fn(),
  hasServicesEnabledAsync: vi.fn(), getCurrentPositionAsync: vi.fn(),
  replace: vi.fn(), focused: true,
  backgroundListeners: new Set<(state: string) => void>(),
}));
vi.mock("../state/preferences-runtime", () => boundary);
vi.mock("expo-location", () => ({ ...boundary, Accuracy: { Balanced: 3 }, PermissionStatus: { UNDETERMINED: "undetermined" } }));
vi.mock("expo-router", () => ({ router: { replace: boundary.replace }, Slot: () => null, useIsFocused: () => boundary.focused }));
vi.mock("./native-route-store", () => ({ useNativeRouteIntent: () => null, consumeNativeRouteIntent: () => null }));
vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));
vi.mock("./DesignEvidenceRuntime", () => ({ DesignEvidenceRuntimeProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native-gesture-handler", () => ({ GestureHandlerRootView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: ({ children }: { children: ReactNode }) => children, SafeAreaView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native-svg", () => ({ default: () => null, Path: () => null }));
vi.mock("../features/preferences/PreferenceWizard", () => ({ PreferenceWizard: () => null }));
vi.mock("./TabRestorationEvidence", () => ({ useTabRestorationEvidence: () => ({ onScroll: () => undefined, scrollEventThrottle: 16, evidence: null }) }));
vi.mock("./DesignControlEvidence", () => ({
  useDesignControlEvidence: () => ({ accessibilityLabelSuffix: "", accessibilityState: {}, evidence: null }),
  useDesignScenarioEvidence: () => ({ action: () => null, result: null }),
}));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const node = ({ children, testID }: { children: ReactNode; testID?: string }) => createElement("div", { "data-testid": testID }, children);
  return {
    View: node, Text: node, ScrollView: node, ActivityIndicator: () => null,
    Modal: ({ visible, children }: { visible: boolean; children: ReactNode }) => visible ? createElement("section", { "data-testid": "native-modal" }, children) : null,
    StyleSheet: { create: (styles: unknown) => styles }, Platform: { OS: "web" },
    AppState: { addEventListener: (_event: string, listener: (state: string) => void) => {
      boundary.backgroundListeners.add(listener);
      return { remove: () => boundary.backgroundListeners.delete(listener) };
    } },
    Pressable: ({ onPress, children, disabled, testID }: { onPress(): void; children: ReactNode; disabled?: boolean; testID?: string }) => createElement("button", { onClick: onPress, disabled, "data-testid": testID }, children),
    TextInput: ({ value, onChangeText }: { value: string; onChangeText(value: string): void }) => createElement("input", { value, onChange: (event: { target: { value: string } }) => onChangeText(event.target.value) }),
  };
});

function reply(projection: Partial<PreferenceProjection> = {}) {
  return { projection: { profiles: [], revision: 1, ...projection } };
}

describe("actual shell entry and location button wiring", () => {
  let root: Root;
  let container: HTMLDivElement;
  let react: typeof import("react");

  beforeEach(async () => {
    vi.resetModules();
    vi.resetAllMocks();
    boundary.focused = true;
    boundary.backgroundListeners.clear();
    boundary.hydratePreferenceRuntime.mockResolvedValue({ profiles: [], location: { source: "manual", label: "已保存出发地" }, activeDestination: "sky" });
    boundary.persistShellLocation.mockImplementation(async (location) => reply({ location }));
    boundary.persistPreferenceProfile.mockImplementation(async (profile) => reply({ profiles: [profile], activeProfileId: profile.id }));
    boundary.persistActiveProfile.mockImplementation(async (activeProfileId) => {
      const { useShellStore } = await import("../state/shell-store");
      return reply({ profiles: useShellStore.getState().profiles, activeProfileId });
    });
    boundary.getForegroundPermissionsAsync.mockResolvedValue({ status: "granted", granted: true, canAskAgain: true });
    boundary.hasServicesEnabledAsync.mockResolvedValue(true);
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    react = await import("react");
    container = document.createElement("div");
    document.body.append(container);
    root = (await import("react-dom/client")).createRoot(container);
  });

  afterEach(async () => {
    await react.act(async () => root.unmount());
    container.remove();
    expect(boundary.backgroundListeners.size).toBe(0);
  });

  const sample: LocationObject = {
    coords: { latitude: 31.23, longitude: 121.47, accuracy: 8.5, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
    timestamp: 1_792_757_000_000,
  };

  function button(label: string) {
    const element = [...container.querySelectorAll("button")].find((item) => item.textContent === label);
    expect(element, `button ${label}`).toBeDefined();
    return element!;
  }

  it("hydrates a non-Me startup consumer without replacing the Router destination", async () => {
    const { default: RuntimeRoot } = await import("./RuntimeRoot");
    const { useShellStore } = await import("../state/shell-store");
    function StartupConsumer() {
      const location = useShellStore((state) => state.location);
      return react.createElement("div", null, location.label);
    }
    await react.act(async () => root.render(react.createElement(RuntimeRoot, null, react.createElement(StartupConsumer))));
    expect(container.textContent).toBe("已保存出发地");
    expect(boundary.hydratePreferenceRuntime).toHaveBeenCalledOnce();
    expect(boundary.replace).not.toHaveBeenCalled();
    expect(useShellStore.getState()).toMatchObject({ hydrationState: "ready", activeDestination: "sky" });
  });

  it("takes the real button through permission, actual fix, persistence and visible metadata", async () => {
    let receive!: (location: LocationObject) => void;
    boundary.getCurrentPositionAsync.mockImplementation(() => new Promise<LocationObject>((resolve) => { receive = resolve; }));
    const { default: RuntimeRoot } = await import("./RuntimeRoot");
    const { MobileShellScreen } = await import("./MobileShellScreen");
    const { useShellStore } = await import("../state/shell-store");
    await react.act(async () => root.render(react.createElement(RuntimeRoot, null, react.createElement(MobileShellScreen))));
    expect(boundary.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    await react.act(async () => button("允许使用期间").click());
    await react.act(async () => button("允许使用期间定位").click());
    expect(boundary.getCurrentPositionAsync).toHaveBeenCalledOnce();
    expect(boundary.persistShellLocation).not.toHaveBeenCalled();
    await react.act(async () => receive(sample));
    expect(boundary.persistShellLocation).toHaveBeenCalledWith({ source: "device", label: "当前位置", latitude: 31.23, longitude: 121.47, accuracyMeters: 8.5, timestampMs: sample.timestamp, coordinateSystem: "WGS84" });
    expect(useShellStore.getState().location.latitude).toBe(31.23);
    expect(container.textContent).toContain("设备前台位置");
    expect(container.textContent).toContain("误差约 9 m");
  });

  it("detaches readers on cancel, blur and background; late fixes cannot replace the saved place", async () => {
    const callbacks: Array<(location: LocationObject) => void> = [];
    boundary.getCurrentPositionAsync.mockImplementation(() => new Promise<LocationObject>((resolve) => { callbacks.push(resolve); }));
    const { default: RuntimeRoot } = await import("./RuntimeRoot");
    const { MobileShellScreen } = await import("./MobileShellScreen");
    const { useShellStore } = await import("../state/shell-store");
    const render = () => root.render(react.createElement(RuntimeRoot, null, react.createElement(MobileShellScreen)));
    await react.act(async () => render());
    for (const leave of ["cancel", "blur", "background"]) {
      boundary.focused = true;
      await react.act(async () => render());
      await react.act(async () => button("允许使用期间").click());
      await react.act(async () => button(callbacks.length ? "重新获取位置" : "允许使用期间定位").click());
      await react.act(async () => {
        if (leave === "cancel") button("暂不允许").click();
        else if (leave === "blur") { boundary.focused = false; render(); }
        else for (const listener of boundary.backgroundListeners) listener("background");
      });
      await react.act(async () => callbacks.at(-1)!(sample));
    }
    expect(boundary.getCurrentPositionAsync).toHaveBeenCalledTimes(3);
    expect(boundary.persistShellLocation).not.toHaveBeenCalled();
    expect(useShellStore.getState().location).toEqual({ source: "manual", label: "已保存出发地" });
  });

  it("keeps the previous location visible when the manual alternative cannot be saved", async () => {
    boundary.persistShellLocation.mockRejectedValueOnce(new Error("disk_full"));
    const { default: RuntimeRoot } = await import("./RuntimeRoot");
    const { MobileShellScreen } = await import("./MobileShellScreen");
    const { useShellStore } = await import("../state/shell-store");
    await react.act(async () => root.render(react.createElement(RuntimeRoot, null, react.createElement(MobileShellScreen))));
    await react.act(async () => button("手动选择").click());
    expect(container.textContent).toContain("手动位置保存未确认，请重试。");
    expect(useShellStore.getState().location).toEqual({ source: "manual", label: "已保存出发地" });
    expect(boundary.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("keeps a failed profile switch recoverable inside the owning dialog", async () => {
    const { createUnrestrictedProfile } = await import("@starward/domain/preferences");
    const first = { ...createUnrestrictedProfile(), id: "first", name: "原有预设" };
    const second = { ...createUnrestrictedProfile(), id: "second", name: "目标预设" };
    boundary.hydratePreferenceRuntime.mockResolvedValue({ profiles: [first, second], activeProfileId: first.id });
    boundary.persistActiveProfile.mockRejectedValueOnce(new Error("disk_full"));
    const { default: RuntimeRoot } = await import("./RuntimeRoot");
    const { MobileShellScreen } = await import("./MobileShellScreen");
    const { useShellStore } = await import("../state/shell-store");
    await react.act(async () => root.render(react.createElement(RuntimeRoot, null, react.createElement(MobileShellScreen))));
    await react.act(async () => (container.querySelector('[data-testid="profile-switcher"]') as HTMLButtonElement).click());
    const select = () => [...container.querySelectorAll("button")].find((item) => item.textContent?.startsWith(second.name))!;
    await react.act(async () => select().click());
    expect(useShellStore.getState().activeProfileId).toBe(first.id);
    expect(container.querySelector('[data-testid="native-modal"]')?.textContent).toContain("当前预设切换未确认");
    await react.act(async () => select().click());
    expect(useShellStore.getState().activeProfileId).toBe(second.id);
    expect(container.querySelector('[data-testid="native-modal"]')).toBeNull();
  });

  it.each(["resolve", "reject"] as const)("keeps the reopened profile dialog owned by its newer selection after an old %s", async (outcome) => {
    const { createUnrestrictedProfile } = await import("@starward/domain/preferences");
    const first = { ...createUnrestrictedProfile(), id: "first", name: "原有预设" };
    const second = { ...createUnrestrictedProfile(), id: "second", name: "先前选择" };
    const third = { ...createUnrestrictedProfile(), id: "third", name: "重新选择" };
    boundary.hydratePreferenceRuntime.mockResolvedValue({ profiles: [first, second, third], activeProfileId: first.id });
    let finishOld!: () => void;
    let rejectOld!: (error: Error) => void;
    let finishCurrent!: () => void;
    boundary.persistActiveProfile
      .mockImplementationOnce(() => new Promise((resolve, reject) => { finishOld = () => resolve(reply({ profiles: [first, second, third], activeProfileId: second.id })); rejectOld = reject; }))
      .mockImplementationOnce(() => new Promise((resolve) => { finishCurrent = () => resolve(reply({ profiles: [first, second, third], activeProfileId: third.id })); }));
    const { default: RuntimeRoot } = await import("./RuntimeRoot");
    const { MobileShellScreen } = await import("./MobileShellScreen");
    const { useShellStore } = await import("../state/shell-store");
    await react.act(async () => root.render(react.createElement(RuntimeRoot, null, react.createElement(MobileShellScreen))));
    const open = () => (container.querySelector('[data-testid="profile-switcher"]') as HTMLButtonElement).click();
    const select = (name: string) => [...container.querySelectorAll("button")].find((item) => item.textContent?.startsWith(name))!;
    await react.act(async () => open());
    await react.act(async () => { select(second.name).click(); select(second.name).click(); });
    expect(boundary.persistActiveProfile).toHaveBeenCalledOnce();
    expect(select(third.name).disabled).toBe(true);
    await react.act(async () => button("关闭").click());
    expect(container.querySelector('[data-testid="native-modal"]')).toBeNull();
    await react.act(async () => open());
    expect(select(third.name).disabled).toBe(false);
    await react.act(async () => select(third.name).click());
    expect(select(third.name).textContent).toContain("正在切换");
    // Durable commands are serialized even when a dialog is closed/reopened.
    expect(boundary.persistActiveProfile).toHaveBeenCalledOnce();
    await react.act(async () => { if (outcome === "resolve") finishOld(); else rejectOld(new Error("old_save_failed")); });
    expect(boundary.persistActiveProfile.mock.calls.map(([id]) => id)).toEqual([second.id, third.id]);
    const modal = container.querySelector('[data-testid="native-modal"]');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).not.toContain("当前预设切换未确认");
    expect(select(third.name).textContent).toContain("正在切换");
    expect(select(third.name).disabled).toBe(true);
    expect(useShellStore.getState().activeProfileId).toBe(outcome === "resolve" ? second.id : first.id);
    await react.act(async () => finishCurrent());
    expect(useShellStore.getState().activeProfileId).toBe(third.id);
    expect(container.querySelector('[data-testid="native-modal"]')).toBeNull();
  });

  it("retries quick-profile saves with the same candidate and creates a fresh one for changed inputs", async () => {
    boundary.persistPreferenceProfile.mockRejectedValueOnce(new Error("preference_runtime_commit_unknown"))
      .mockRejectedValueOnce(new Error("preference_runtime_commit_unknown"));
    const { default: RuntimeRoot } = await import("./RuntimeRoot");
    const { MobileShellScreen } = await import("./MobileShellScreen");
    await react.act(async () => root.render(react.createElement(RuntimeRoot, null, react.createElement(MobileShellScreen))));
    await react.act(async () => button("保存偏好").click());
    const first = boundary.persistPreferenceProfile.mock.calls[0][0];
    expect(container.textContent).toContain("偏好预设保存未确认");
    await react.act(async () => button("保存偏好").click());
    expect(boundary.persistPreferenceProfile.mock.calls[1][0]).toBe(first);
    await react.act(async () => button("行星").click());
    await react.act(async () => button("保存偏好").click());
    const changed = boundary.persistPreferenceProfile.mock.calls[2][0];
    expect(changed).not.toBe(first);
    expect(changed.targets).toEqual(["planets"]);
    const { useShellStore } = await import("../state/shell-store");
    expect(useShellStore.getState().profiles).toEqual([changed]);
  });
});
