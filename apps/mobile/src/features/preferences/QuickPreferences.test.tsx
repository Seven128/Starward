// @vitest-environment jsdom
import { mkdtempSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { createUnrestrictedProfile, type PreferenceProfile } from "@starward/domain/preferences";
import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ directory: "", handles: [] as DatabaseSync[], loseReply: false, unavailable: false, committedWrites: 0, readGate: null as (() => Promise<void>) | null, validationGate: null as (() => Promise<void>) | null }));
vi.mock("./quick-profile-resolver", async importOriginal => {
  const actual = await importOriginal<typeof import("./quick-profile-resolver")>();
  return { quickProfileResolver: async (...args: Parameters<typeof actual.quickProfileResolver>) => {
    const result = await actual.quickProfileResolver(...args);
    if (native.validationGate) { const gate = native.validationGate; native.validationGate = null; await gate(); }
    return result;
  } };
});
vi.mock("expo-sqlite", () => ({ openDatabaseAsync: async () => {
  const database = new DatabaseSync(join(native.directory, "preferences.db"));
  native.handles.push(database);
  return {
    execAsync: async (sql: string) => database.exec(sql),
    getFirstAsync: async (sql: string, ...values: SQLInputValue[]) => {
      if (native.unavailable) throw new Error("database_temporarily_unavailable");
      if (native.readGate) { const gate = native.readGate; native.readGate = null; await gate(); }
      return database.prepare(sql).get(...values);
    },
    runAsync: async (sql: string, ...values: SQLInputValue[]) => {
      const result = database.prepare(sql).run(...values);
      if (result.changes) native.committedWrites++;
      if (result.changes && native.loseReply) { native.loseReply = false; native.unavailable = true; throw new Error("commit_reply_lost"); }
      return result;
    },
    closeAsync: async () => database.close(),
  };
} }));
vi.mock("expo-crypto", () => ({ randomUUID, CryptoDigestAlgorithm: { SHA256: "SHA256" }, digestStringAsync: async (_algorithm: string, value: string) => createHash("sha256").update(value).digest("hex") }));
vi.mock("expo-router", () => ({ router: { replace: vi.fn(), canGoBack: () => false }, Slot: () => null, useIsFocused: () => true }));
vi.mock("expo-location", () => ({ Accuracy: { Balanced: 3 }, PermissionStatus: { UNDETERMINED: "undetermined" } }));
vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));
vi.mock("../../shell/native-route-store", () => ({ useNativeRouteIntent: () => null, consumeNativeRouteIntent: () => null }));
vi.mock("../../shell/DesignEvidenceRuntime", () => ({ DesignEvidenceRuntimeProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native-gesture-handler", () => ({ GestureHandlerRootView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: ({ children }: { children: ReactNode }) => children, SafeAreaView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native-svg", () => ({ default: () => null, Path: () => null }));
vi.mock("../../shell/TabRestorationEvidence", () => ({ useTabRestorationEvidence: () => ({ onScroll: () => undefined, scrollEventThrottle: 16, evidence: null }) }));
vi.mock("../../shell/DesignControlEvidence", () => ({
  useDesignControlEvidence: () => ({ accessibilityLabelSuffix: "", accessibilityState: {}, evidence: null }),
  useDesignScenarioEvidence: () => ({ action: () => null, result: null }),
}));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const node = ({ children, testID }: { children: ReactNode; testID?: string }) => createElement("div", { "data-testid": testID }, children);
  return {
    View: node, Text: node, ScrollView: node, ActivityIndicator: () => null,
    Modal: ({ visible, children }: { visible: boolean; children: ReactNode }) => visible ? createElement("section", { "data-testid": "native-modal" }, children) : null,
    StyleSheet: { create: (styles: unknown) => styles }, Platform: { OS: "android" },
    AppState: { addEventListener: () => ({ remove() {} }) },
    Pressable: ({ onPress, children, disabled, testID, accessibilityRole, accessibilityState, accessibilityLabel }: { onPress(): void; children: ReactNode; disabled?: boolean; testID?: string; accessibilityRole?: string; accessibilityState?: { selected?: boolean; checked?: boolean }; accessibilityLabel?: string }) => createElement("button", { onClick: onPress, disabled, "data-testid": testID, role: accessibilityRole, "aria-label": accessibilityLabel, "aria-checked": accessibilityState?.selected ?? accessibilityState?.checked }, children),
    TextInput: ({ value, onChangeText, accessibilityLabel }: { value: string; onChangeText(value: string): void; accessibilityLabel?: string }) => createElement("input", { value, "aria-label": accessibilityLabel, onChange: (event: { target: { value: string } }) => onChangeText(event.target.value) }),
    Switch: ({ value, onValueChange, accessibilityLabel }: { value: boolean; onValueChange(value: boolean): void; accessibilityLabel: string }) => createElement("input", { type: "checkbox", checked: value, "aria-label": accessibilityLabel, onChange: () => onValueChange(!value) }),
  };
});

describe("actual quick-preference consumer and durable current projection", () => {
  let root: Root;
  let container: HTMLDivElement;
  let react: typeof import("react");

  async function newUi() {
    react = await import("react");
    root = (await import("react-dom/client")).createRoot(container);
    const { default: RuntimeRoot } = await import("../../shell/RuntimeRoot");
    const { MobileShellScreen } = await import("../../shell/MobileShellScreen");
    await react.act(async () => root.render(react.createElement(RuntimeRoot, null, react.createElement(MobileShellScreen))));
  }
  beforeEach(() => {
    vi.resetModules(); vi.resetAllMocks();
    native.directory = mkdtempSync(join(tmpdir(), "starward-quick-preferences-"));
    native.handles = []; native.loseReply = false; native.unavailable = false; native.committedWrites = 0; native.readGate = null; native.validationGate = null;
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div"); document.body.append(container);
  });
  afterEach(async () => {
    if (root) await react.act(async () => root.unmount());
    for (const database of native.handles) database.close();
    container.remove();
  });
  function button(label: string, scope: ParentNode = container) {
    const result = [...scope.querySelectorAll("button")].find(item => item.textContent === label || item.getAttribute("aria-label") === label);
    expect(result, label).toBeDefined(); return result!;
  }
  const selected = (label: string) => button(label).getAttribute("aria-checked") === "true";
  async function click(label: string, scope: ParentNode = container) { await react.act(async () => button(label, scope).click()); }
  async function currentProfile() {
    const { hydratePreferenceRuntime } = await import("../../state/preferences-runtime");
    const current = await hydratePreferenceRuntime();
    return current.profiles.find(profile => profile.id === current.activeProfileId)!;
  }
  function durableProjection() {
    const database = new DatabaseSync(join(native.directory, "preferences.db"));
    try {
      const row = database.prepare("SELECT value FROM preference_runtime_state WHERE key = ?").get("preferences-runtime-state") as { value: string };
      return { bytes: row.value, ...JSON.parse(row.value).actors[0].projection as { profiles: PreferenceProfile[]; activeProfileId: string } };
    } finally { database.close(); }
  }
  async function coldReopen() {
    await react.act(async () => root.unmount());
    for (const database of native.handles) database.close(); native.handles = [];
    vi.resetModules(); await newUi();
  }
  const complete = () => {
    const profile = createUnrestrictedProfile("2026-10-25T00:00:00.000Z");
    return { ...profile, id: "custom-profile", name: "家", revision: 4, city: "受控城市", startingPlace: "受控出发地", observerTypes: ["family" as const],
      targets: ["moon" as const, "comet" as const], equipment: ["telescope" as const], lensFocalLengthsMm: [400],
      travel: { ...profile.travel, modes: ["cycle" as const], maxOneWayMinutes: 77, maxWalkingKilometers: 0.5 },
      facilities: { ...profile.facilities, toilet: "required" as const } };
  };
  async function seed(profile: ReturnType<typeof createUnrestrictedProfile>) {
    const { persistPreferenceProfile } = await import("../../state/preferences-runtime");
    await persistPreferenceProfile(profile);
  }
  async function enter(label: string, value: string) {
    const input = container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
    expect(input, label).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await react.act(async () => { setter.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
  }

  it("reopens the saved planets and zero-walk choices through the real repository", async () => {
    await newUi();
    expect(selected("银河")).toBe(false); expect(selected("≤ 800 m")).toBe(false);
    await click("行星"); await click("不步行"); await click("保存偏好");
    const saved = await currentProfile();
    expect(saved.targets).toEqual(["planets"]); expect(saved.travel.maxWalkingKilometers).toBe(0);
    await coldReopen();
    expect(await currentProfile()).toEqual(saved);
    expect(selected("行星")).toBe(true); expect(selected("不步行")).toBe(true);
    expect(selected("银河")).toBe(false); expect(selected("≤ 800 m")).toBe(false);
    expect(container.querySelector('[data-testid="preference-active-profile"]')?.textContent).toBe("基础模式 · 用于当前推荐");
    expect(container.querySelector('[data-testid="preference-saved-state"]')?.textContent).toBe("已保存 · 当前");
  });

  it("shows complete unrepresented values and current profile switches, preserving every unrelated field on quick save", async () => {
    const profile = complete();
    const other = { ...createUnrestrictedProfile(profile.createdAt), id: "second-profile", name: "第二预设", targets: ["milky-way" as const], travel: { ...createUnrestrictedProfile().travel, maxWalkingKilometers: 2 } };
    await seed(other); await seed(profile); await newUi();
    expect(container.querySelector('[data-testid="preference-ranking-impact"]')?.textContent).toBe("保留现有完整设置，可进入完整偏好修改。");
    expect(container.querySelector('[data-testid="quick-preference-targets"]')?.textContent).toBe("已填目标：月亮、彗星");
    expect(container.querySelector('[data-testid="quick-preference-walking"]')?.textContent).toContain("0.5 km");
    for (const label of ["银河", "行星", "流星", "不步行", "≤ 800 m", "≤ 2 km"]) expect(selected(label)).toBe(false);
    const { useShellStore } = await import("../../state/shell-store");
    await react.act(async () => useShellStore.getState().activateProfile(other.id));
    expect(selected("银河")).toBe(true); expect(selected("≤ 2 km")).toBe(true);
    await react.act(async () => useShellStore.getState().activateProfile(profile.id));
    await click("行星"); await click("不步行"); await click("保存偏好");
    expect(await currentProfile()).toEqual({ ...profile, revision: 5, updatedAt: expect.any(String), targets: ["planets"], travel: { ...profile.travel, maxWalkingKilometers: 0 } });
    expect((await currentProfile()).travel.directAccessRequired).toBe(false);
  });

  it("retains dirty input through late real hydration and a later profile switch until explicit discard", async () => {
    const profile = complete();
    const other = { ...createUnrestrictedProfile(profile.createdAt), id: "second-profile", name: "第二预设", targets: ["meteor-shower" as const] };
    await seed(other); await seed(profile);
    for (const database of native.handles) database.close(); native.handles = []; vi.resetModules();
    let release!: () => void;
    const wait = new Promise<void>(resolve => { release = resolve; });
    native.readGate = () => wait;
    await newUi();
    expect(button("保存偏好").disabled).toBe(true);
    await click("行星");
    await react.act(async () => release());
    expect(selected("行星")).toBe(true);
    expect(container.textContent).toContain("当前预设已变化，原编辑内容已保留");
    expect((await currentProfile()).id).toBe(profile.id);
    await click("放弃修改并读取当前预设");
    expect(container.querySelector('[data-testid="quick-preference-targets"]')?.textContent).toBe("已填目标：月亮、彗星");
    await click("行星");
    const { useShellStore } = await import("../../state/shell-store");
    await react.act(async () => useShellStore.getState().activateProfile(other.id));
    expect(selected("行星")).toBe(true); expect(button("保存并切回此预设")).toBeDefined();
    expect(container.querySelector('[data-testid="quick-preference-owner"]')?.textContent).toContain(profile.name);
    await click("放弃修改并读取当前预设");
    expect(selected("流星")).toBe(true); expect(selected("行星")).toBe(false);
    expect((await currentProfile()).id).toBe(other.id);
  });

  it("retries a lost real SQLite acknowledgement without replacing the original committed body", async () => {
    await newUi(); await click("行星"); await click("不步行");
    native.loseReply = true;
    await click("保存偏好");
    expect(container.querySelector('[data-testid="quick-preference-save-error"]')?.textContent).toContain("保存结果未确认");
    expect(selected("行星")).toBe(true); expect(selected("不步行")).toBe(true);
    const committed = native.handles[0].prepare("SELECT value FROM preference_runtime_state WHERE key = 'preferences-runtime-state'").get()!.value;
    const writes = native.committedWrites;
    native.unavailable = false;
    await click("确认上次保存");
    expect(native.committedWrites).toBe(writes);
    expect(native.handles[0].prepare("SELECT value FROM preference_runtime_state WHERE key = 'preferences-runtime-state'").get()!.value).toBe(committed);
    expect(await currentProfile()).toMatchObject({ targets: ["planets"], travel: { maxWalkingKilometers: 0 } });
    expect(container.querySelector('[data-testid="quick-preference-save-error"]')).toBeNull();
  });

  it("keeps the changed draft on a real revision refusal and merges only its edits on explicit conflict retry", async () => {
    const profile = complete();
    await seed(profile); await newUi(); await click("行星");
    const remote = { ...profile, revision: 5, city: "后来保存的城市", facilities: { ...profile.facilities, parking: "required" as const } };
    await seed(remote);
    await click("保存偏好");
    expect(container.textContent).toContain("此预设已有新版本。草稿已保留");
    expect(selected("行星")).toBe(true);
    expect(await currentProfile()).toEqual(remote);
    await click("保存偏好");
    expect(await currentProfile()).toEqual({ ...remote, revision: 6, updatedAt: expect.any(String), targets: ["planets"] });
  });

  it("continues one complete unsaved draft through Quick, full fields, close and reopen", async () => {
    const profile = { ...complete(), name: "完整预设", targets: [] };
    await seed(profile); await newUi();
    await click("行星"); await click("不步行");
    await click("编辑完整观测偏好");
    let modal = container.querySelector('[data-testid="native-modal"]')!;
    const nightWalking = modal.querySelector('input[aria-label="接受夜间徒步"]') as HTMLInputElement;
    await react.act(async () => nightWalking.click());
    await click("关闭偏好编辑", modal);
    expect(container.querySelector('[data-testid="native-modal"]')).toBeNull();
    expect(await currentProfile()).toEqual(profile);
    await click("编辑完整观测偏好");
    modal = container.querySelector('[data-testid="native-modal"]')!;
    expect((modal.querySelector('input[aria-label="接受夜间徒步"]') as HTMLInputElement).checked).toBe(true);
    expect(button("✓ 行星", modal)).toBeDefined();
    expect((modal.querySelector('input[aria-label="最大徒步距离（公里）"]') as HTMLInputElement).value).toBe("0");
    await click("保存并设为当前预设", modal);
    expect(container.querySelector('[data-testid="native-modal"]')).toBeNull();
    expect(await currentProfile()).toEqual({ ...profile, revision: 5, targets: ["planets"], updatedAt: expect.any(String), travel: { ...profile.travel, maxWalkingKilometers: 0, acceptsNightWalking: true } });
    expect(selected("行星")).toBe(true); expect(selected("不步行")).toBe(true);
  });

  it("rebases the retained A draft on explicit known-conflict retry without writing current B", async () => {
    const profile = complete();
    const other = { ...createUnrestrictedProfile(profile.createdAt), id: "second-profile", name: "第二预设", revision: 4, targets: ["milky-way" as const] };
    await seed(other); await seed(profile); await newUi(); await click("行星");
    const later = { ...profile, revision: 5, city: "后来城市", facilities: { ...profile.facilities, parking: "required" as const } };
    await seed(later);
    const { useShellStore } = await import("../../state/shell-store");
    await react.act(async () => useShellStore.getState().activateProfile(other.id));
    const before = native.handles[0].prepare("SELECT value FROM preference_runtime_state WHERE key = 'preferences-runtime-state'").get()!.value;
    const writes = native.committedWrites;
    await click("保存并切回此预设");
    expect(container.textContent).toContain("此预设已有新版本。草稿已保留");
    expect(native.committedWrites).toBe(writes);
    expect(native.handles[0].prepare("SELECT value FROM preference_runtime_state WHERE key = 'preferences-runtime-state'").get()!.value).toBe(before);
    expect((await currentProfile()).id).toBe(other.id);
    expect(selected("行星")).toBe(true);
    await click("保存并切回此预设");
    const { hydratePreferenceRuntime } = await import("../../state/preferences-runtime");
    const after = await hydratePreferenceRuntime();
    expect(after.activeProfileId).toBe(profile.id);
    expect(after.profiles.find(p => p.id === profile.id)).toEqual({ ...later, revision: 6, targets: ["planets"], updatedAt: expect.any(String) });
    expect(after.profiles.find(p => p.id === other.id)).toEqual(other);
  });

  it("confirms an uncertain original save without promising or performing a later profile switch", async () => {
    const profile = complete();
    const other = { ...createUnrestrictedProfile(profile.createdAt), id: "second-profile", name: "第二预设", targets: ["milky-way" as const] };
    await seed(other); await seed(profile); await newUi(); await click("行星");
    native.loseReply = true; await click("保存偏好"); native.unavailable = false;
    const { useShellStore } = await import("../../state/shell-store");
    await react.act(async () => useShellStore.getState().activateProfile(other.id));
    expect(button("确认上次保存")).toBeDefined();
    expect([...container.querySelectorAll("button")].some(item => item.textContent === "保存并切回此预设")).toBe(false);
    expect(container.textContent).toContain("确认上次保存不会切换当前预设");
    const before = native.handles[0].prepare("SELECT value FROM preference_runtime_state WHERE key = 'preferences-runtime-state'").get()!.value;
    const writes = native.committedWrites;
    await click("确认上次保存");
    expect(native.committedWrites).toBe(writes);
    expect(native.handles[0].prepare("SELECT value FROM preference_runtime_state WHERE key = 'preferences-runtime-state'").get()!.value).toBe(before);
    expect((await currentProfile()).id).toBe(other.id);
    expect(selected("银河")).toBe(true);
  });

  it.each(["  家用预设  ", "家"])("confirms the same uncertain Quick save in the complete view with original legal name %j", async name => {
    const profile = { ...complete(), name, city: "  原城市  ", startingPlace: "  原出发地  " };
    const other = { ...createUnrestrictedProfile(profile.createdAt), id: "second-profile", name: "第二预设", targets: ["milky-way" as const] };
    await seed(other); await seed(profile); await newUi(); await click("行星");
    native.loseReply = true; await click("保存偏好"); native.unavailable = false;
    expect(container.textContent).toContain("保存结果未确认");
    const { useShellStore } = await import("../../state/shell-store");
    await react.act(async () => useShellStore.getState().activateProfile(other.id));
    const before = durableProjection(); const writes = native.committedWrites;
    await click("编辑完整观测偏好");
    await click("确认上次保存", container.querySelector('[data-testid="native-modal"]')!);
    const after = durableProjection();
    expect(after.bytes).toBe(before.bytes); expect(native.committedWrites).toBe(writes);
    expect(after.activeProfileId).toBe(other.id);
    expect(after.profiles.find(p => p.id === profile.id)).toEqual({ ...profile, revision: 5, targets: ["planets"], updatedAt: expect.any(String) });
    expect(container.querySelector('[data-testid="quick-preference-save-error"]')).toBeNull();
    expect(container.querySelector('[data-testid="native-modal"]')).toBeNull();
    expect((await currentProfile()).id).toBe(other.id);
  });

  it("validates new complete-view input after an uncertain save and retains the original confirmation after reverting it", async () => {
    const profile = complete();
    const other = { ...createUnrestrictedProfile(profile.createdAt), id: "second-profile", name: "第二预设", targets: ["milky-way" as const] };
    await seed(other); await seed(profile); await newUi(); await click("行星");
    native.loseReply = true; await click("保存偏好"); native.unavailable = false;
    const { useShellStore } = await import("../../state/shell-store");
    await react.act(async () => useShellStore.getState().activateProfile(other.id));
    const before = durableProjection(); const writes = native.committedWrites;
    await click("编辑完整观测偏好");
    const modal = container.querySelector('[data-testid="native-modal"]')!;
    await click("流星雨", modal); await click("保存新的修改", modal);
    expect(modal.textContent).toContain("请为预设填写至少两个字的名称");
    expect(durableProjection().bytes).toBe(before.bytes); expect(native.committedWrites).toBe(writes);
    await click("✓ 流星雨", modal); await click("确认上次保存", modal);
    expect(container.querySelector('[data-testid="native-modal"]')).toBeNull();
    expect(container.querySelector('[data-testid="quick-preference-save-error"]')).toBeNull();
    const after = durableProjection();
    expect(after.bytes).toBe(before.bytes); expect(native.committedWrites).toBe(writes);
    expect(after.activeProfileId).toBe(other.id);
    expect(after.profiles.find(p => p.id === profile.id)).toEqual({ ...profile, revision: 5, targets: ["planets"], updatedAt: expect.any(String) });
  });

  it("freezes the complete candidate across asynchronous validation and retains edits made during it", async () => {
    const profile = complete();
    await seed(profile); await newUi(); await click("行星");
    let release!: () => void;
    native.validationGate = () => new Promise<void>(resolve => { release = resolve; });
    await click("保存偏好");
    expect(release).toBeTypeOf("function");
    await click("流星"); await click("不步行");
    await react.act(async () => release());
    expect(await currentProfile()).toEqual({ ...profile, revision: 5, targets: ["planets"], updatedAt: expect.any(String) });
    expect(selected("流星")).toBe(true); expect(selected("不步行")).toBe(true);
    await click("保存偏好");
    expect(await currentProfile()).toEqual({ ...profile, revision: 6, targets: ["meteor-shower"], travel: { ...profile.travel, maxWalkingKilometers: 0 }, updatedAt: expect.any(String) });
  });

  describe("new-profile creation identity", () => {
    it("starts a neutral named task, discards an unsaved task and creates without changing the original", async () => {
      const original = { ...complete(), name: "原始预设A" };
      await seed(original); await newUi();
      const before = durableProjection();
      await click("档案切换器，当前 原始预设A"); await click("新建完整预设");
      await enter("预设名称", "放弃此草稿");
      await click("关闭偏好编辑");
      expect(durableProjection().bytes).toBe(before.bytes);
      const newTaskStartedAt = Date.now();
      await click("档案切换器，当前 原始预设A"); await click("新建完整预设");
      expect((container.querySelector('input[aria-label="预设名称"]') as HTMLInputElement).value).toBe("");
      await click("保存并设为当前预设", container.querySelector('[data-testid="native-modal"]')!);
      expect(container.textContent).toContain("请为预设填写至少两个字的名称");
      expect(durableProjection().bytes).toBe(before.bytes);
      await enter("预设名称", "新增预设B"); await enter("最大驾车距离（公里）", "12.75");
      await click("保存并设为当前预设", container.querySelector('[data-testid="native-modal"]')!);
      const after = durableProjection();
      const saved = after.profiles.find(profile => profile.name === "新增预设B")!;
      expect(saved.id).not.toBe(original.id); expect(after.profiles).toHaveLength(before.profiles.length + 1);
      expect(after.profiles.find(profile => profile.id === original.id)).toEqual(original);
      expect(Date.parse(saved.createdAt)).toBeGreaterThanOrEqual(newTaskStartedAt);
      expect(Date.parse(saved.createdAt)).toBeLessThanOrEqual(Date.now());
      expect(saved).toMatchObject({ city: "", startingPlace: "", observerTypes: [], targets: [], equipment: [], lensFocalLengthsMm: [] });
      expect(saved.travel).toEqual({ ...createUnrestrictedProfile().travel, maxDrivingKilometers: 12.75 });
      expect(Object.values(saved.facilities).every(value => value === "unrestricted")).toBe(true);
      expect(after.activeProfileId).toBe(saved.id);
      expect(container.querySelector('[data-testid="native-modal"]')).toBeNull();
    });

    it("resumes one uncertain creation after close and current-B selection, then gives the next task a new identity", async () => {
      const original = { ...complete(), name: "原始预设A" };
      const other = { ...createUnrestrictedProfile(original.createdAt), id: "other-profile", name: "当前预设B" };
      await seed(other); await seed(original); await newUi();
      await click("档案切换器，当前 原始预设A"); await click("新建完整预设");
      await enter("预设名称", "未确认的新预设");
      native.loseReply = true;
      await click("保存并设为当前预设", container.querySelector('[data-testid="native-modal"]')!);
      expect(container.textContent).toContain("保存结果未确认");
      const committed = durableProjection().profiles.find(profile => profile.name === "未确认的新预设")!;
      expect(committed.id).not.toBe(original.id);
      await click("关闭偏好编辑"); native.unavailable = false;
      const { useShellStore } = await import("../../state/shell-store");
      await react.act(async () => useShellStore.getState().hydrateFromRuntime());
      await react.act(async () => useShellStore.getState().activateProfile(other.id));
      const beforeConfirm = durableProjection(); const writes = native.committedWrites;
      await click("档案切换器，当前 当前预设B"); await click("继续上次新建预设");
      expect((container.querySelector('input[aria-label="预设名称"]') as HTMLInputElement).value).toBe("未确认的新预设");
      await click("确认上次保存", container.querySelector('[data-testid="native-modal"]')!);
      const confirmed = durableProjection();
      expect(confirmed.bytes).toBe(beforeConfirm.bytes); expect(native.committedWrites).toBe(writes);
      expect(confirmed.activeProfileId).toBe(other.id);
      expect(confirmed.profiles.find(profile => profile.id === committed.id)).toEqual(committed);
      expect(confirmed.profiles.find(profile => profile.id === original.id)).toEqual(original);
      await click("档案切换器，当前 当前预设B"); await click("新建完整预设");
      expect((container.querySelector('input[aria-label="预设名称"]') as HTMLInputElement).value).toBe("");
      await enter("预设名称", "下一套新预设");
      await click("保存并设为当前预设", container.querySelector('[data-testid="native-modal"]')!);
      const after = durableProjection();
      const next = after.profiles.find(profile => profile.name === "下一套新预设")!;
      expect([original.id, other.id, committed.id]).not.toContain(next.id);
      expect(after.profiles).toHaveLength(4); expect(after.activeProfileId).toBe(next.id);
      expect(after.profiles.find(profile => profile.id === committed.id)).toEqual(committed);
      expect(after.profiles.find(profile => profile.id === original.id)).toEqual(original);
    });

    it("does not close a later switcher when a dismissed creation finishes, and retires its completed task", async () => {
      const original = { ...complete(), name: "原始预设A" };
      await seed(original); await newUi();
      await click("档案切换器，当前 原始预设A"); await click("新建完整预设");
      await enter("预设名称", "迟到完成的新预设");
      let release!: () => void;
      native.readGate = () => new Promise<void>(resolve => { release = resolve; });
      await click("保存并设为当前预设", container.querySelector('[data-testid="native-modal"]')!);
      expect(release).toBeTypeOf("function");
      await click("关闭偏好编辑");
      await click("档案切换器，当前 原始预设A");
      expect(container.querySelector('[data-testid="native-modal"]')?.textContent).toContain("切换偏好预设");
      await react.act(async () => release());
      const committed = durableProjection();
      expect(committed.profiles.find(profile => profile.id === original.id)).toEqual(original);
      const first = committed.profiles.find(profile => profile.name === "迟到完成的新预设")!;
      expect(first.id).not.toBe(original.id);
      expect(container.querySelector('[data-testid="native-modal"]')?.textContent).toContain("切换偏好预设");
      await click("新建完整预设");
      expect((container.querySelector('input[aria-label="预设名称"]') as HTMLInputElement).value).toBe("");
      await enter("预设名称", "之后的新任务");
      await click("保存并设为当前预设", container.querySelector('[data-testid="native-modal"]')!);
      const after = durableProjection();
      expect(after.profiles).toHaveLength(3);
      expect(after.profiles.find(profile => profile.name === "之后的新任务")?.id).not.toBe(first.id);
      expect(after.profiles.find(profile => profile.id === original.id)).toEqual(original);
    });
  });
});
