// @vitest-environment jsdom
import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import { createUnrestrictedProfile } from "@starward/domain/preferences";
import { createHash, randomUUID } from "node:crypto";
import type { PreferenceRuntimeStorage } from "@starward/domain/preferences/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({ createPreferenceStorage: vi.fn() }));
vi.mock("../../state/preferences-storage", () => boundary);
vi.mock("expo-crypto", () => ({
  randomUUID: () => randomUUID(), CryptoDigestAlgorithm: { SHA256: "SHA256" },
  digestStringAsync: async (_algorithm: string, value: string) => createHash("sha256").update(value).digest("hex"),
}));

vi.mock("../../shell/useStarwardTheme", async () => {
  const { colors } = await import("@starward/ui-system/tokens");
  return { useStarwardTheme: () => ({ mode: "planning", palette: colors.planning }) };
});
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const node = ({ children, testID }: { children: ReactNode; testID?: string }) => createElement("div", { "data-testid": testID }, children);
  return {
    View: node, Text: node, ScrollView: node,
    Modal: ({ visible, children }: { visible: boolean; children: ReactNode }) => visible ? children : null,
    StyleSheet: { create: (styles: unknown) => styles },
    Pressable: ({ onPress, children, disabled }: { onPress(): void; children: ReactNode; disabled?: boolean }) => createElement("button", { onClick: onPress, disabled }, children),
    Switch: ({ value, onValueChange, accessibilityLabel }: { value: boolean; onValueChange(value: boolean): void; accessibilityLabel: string }) => createElement("input", { type: "checkbox", checked: value, "aria-label": accessibilityLabel, onChange: () => onValueChange(!value) }),
    TextInput: ({ value, onChangeText, accessibilityLabel }: { value: string; onChangeText(value: string): void; accessibilityLabel: string }) => createElement("input", { value, "aria-label": accessibilityLabel, onChange: (event: { target: { value: string } }) => onChangeText(event.target.value) }),
  };
});

describe("preference draft save recovery", () => {
  let root: Root;
  let container: HTMLDivElement;
  let react: typeof import("react");
  let faults: { loseReply: boolean; unavailable: boolean };
  let port: PreferenceRuntimeStorage;
  const initial = { ...createUnrestrictedProfile("2026-10-23T00:00:00.000Z"), name: "完整预设" };

  beforeEach(async () => {
    vi.resetModules();
    vi.resetAllMocks();
    faults = { loseReply: false, unavailable: false };
    const rows = new Map<string, string>();
    port = {
      kind: "sqlite",
      read: async (key) => {
        if (faults.unavailable) throw new Error("database_temporarily_unavailable");
        return rows.get(key) ?? null;
      },
      compareAndSwap: async (key, expected, value) => {
        if ((rows.get(key) ?? null) !== expected) return false;
        rows.set(key, value);
        if (faults.loseReply) { faults.loseReply = false; faults.unavailable = true; throw new Error("commit_reply_lost"); }
        return true;
      },
    };
    boundary.createPreferenceStorage.mockResolvedValue(port);
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    react = await import("react");
    container = document.createElement("div");
    document.body.append(container);
    root = (await import("react-dom/client")).createRoot(container);
  });
  afterEach(async () => { await react.act(async () => root.unmount()); container.remove(); });

  function button(text: string) {
    const element = [...container.querySelectorAll("button")].find((item) => item.textContent === text);
    expect(element, text).toBeDefined();
    return element!;
  }

  it("keeps the full original candidate on an unknown-response retry", async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error("preference_runtime_commit_unknown")).mockResolvedValueOnce(undefined);
    const onClose = vi.fn();
    const { PreferenceWizard } = await import("./PreferenceWizard");
    await react.act(async () => root.render(react.createElement(PreferenceWizard, { visible: true, initial, onSave, onClose })));
    await react.act(async () => button("保存并设为当前预设").click());
    expect(container.querySelector('[data-testid="preference-save-error"]')?.textContent).toBe("保存结果未确认，输入已保留。请重试。");
    expect(onClose).not.toHaveBeenCalled();
    const candidate = onSave.mock.calls[0][0];
    expect(candidate).toMatchObject({ id: initial.id, revision: 2, createdAt: initial.createdAt });
    await react.act(async () => button("保存并设为当前预设").click());
    expect(onSave.mock.calls[1][0]).toBe(candidate);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps a changed draft distinct from an uncertain earlier save", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("preference_runtime_commit_unknown"));
    const onClose = vi.fn();
    const { PreferenceWizard } = await import("./PreferenceWizard");
    await react.act(async () => root.render(react.createElement(PreferenceWizard, { visible: true, initial, onSave, onClose })));
    await react.act(async () => button("保存并设为当前预设").click());
    const original = onSave.mock.calls[0][0];
    await react.act(async () => button("行星").click());
    await react.act(async () => button("保存并设为当前预设").click());
    const changed = onSave.mock.calls[1][0];
    expect(changed).not.toBe(original);
    expect(changed.targets).toEqual(["planets"]);
    expect(original.targets).toEqual([]);
    expect(onClose).not.toHaveBeenCalled();
    expect(button("✓ 行星")).toBeDefined();
  });

  it("does not close a draft edited while its earlier candidate is saving", async () => {
    let finish!: () => void;
    const onSave = vi.fn((_profile: ReturnType<typeof createUnrestrictedProfile>) => new Promise<void>((resolve) => { finish = resolve; }));
    const onClose = vi.fn();
    const { PreferenceWizard } = await import("./PreferenceWizard");
    await react.act(async () => root.render(react.createElement(PreferenceWizard, { visible: true, initial, onSave, onClose })));
    await react.act(async () => button("保存并设为当前预设").click());
    expect(button("正在保存…").disabled).toBe(true);
    await react.act(async () => button("行星").click());
    await react.act(async () => finish());
    expect(onClose).not.toHaveBeenCalled();
    expect(button("✓ 行星")).toBeDefined();
    await react.act(async () => button("保存并设为当前预设").click());
    expect(onSave.mock.calls[1][0]).toMatchObject({ revision: 3, targets: ["planets"] });
    await react.act(async () => finish());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("recovers an unknown committed save, a changed draft and explicit revision-conflict retry through the real store/runtime", async () => {
    const { useShellStore } = await import("../../state/shell-store");
    const { PreferenceWizard } = await import("./PreferenceWizard");
    const onClose = vi.fn();
    useShellStore.setState({ profiles: [initial], activeProfileId: initial.id });
    function Consumer() {
      const { profiles, activeProfileId, saveProfile } = useShellStore();
      return react.createElement(PreferenceWizard, { visible: true, initial: profiles.find((profile) => profile.id === activeProfileId)!, onSave: saveProfile, onClose });
    }
    await react.act(async () => root.render(react.createElement(Consumer)));
    faults.loseReply = true;
    await react.act(async () => button("保存并设为当前预设").click());
    expect(container.textContent).toContain("保存结果未确认");
    expect(useShellStore.getState().profiles[0].revision).toBe(1);
    expect(onClose).not.toHaveBeenCalled();

    faults.unavailable = false;
    await react.act(async () => button("行星").click());
    await react.act(async () => button("保存并设为当前预设").click());
    expect(container.textContent).toContain("此预设已有新版本。草稿已保留");
    expect(useShellStore.getState().profiles[0]).toMatchObject({ revision: 2, targets: [] });
    expect(button("✓ 行星")).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();

    await react.act(async () => button("保存并设为当前预设").click());
    expect(useShellStore.getState().profiles[0]).toMatchObject({ revision: 3, targets: ["planets"] });
    expect(onClose).toHaveBeenCalledOnce();
    // A fresh domain runtime reads the same storage; no UI success alone can
    // establish that the new draft reached persistence.
    const { createPreferencesRuntime } = await import("@starward/domain/preferences/runtime");
    const restarted = await createPreferencesRuntime({ storage: port });
    expect((await restarted.getProjection({ actorId: "personal-trial-owner" })).profiles[0]).toMatchObject({ revision: 3, targets: ["planets"] });
  });

  it("applies the current selection when the real runtime replays a historical save", async () => {
    const { useShellStore } = await import("../../state/shell-store");
    const first = { ...initial, id: "first", name: "第一预设" };
    const second = { ...initial, id: "second", name: "第二预设" };
    await useShellStore.getState().saveProfile(first);
    await useShellStore.getState().saveProfile(second);
    await useShellStore.getState().saveProfile(first);
    expect(useShellStore.getState().activeProfileId).toBe(second.id);
    const { hydratePreferenceRuntime } = await import("../../state/preferences-runtime");
    expect((await hydratePreferenceRuntime()).activeProfileId).toBe(second.id);
  });

  it("reopens a successfully saved profile at its new revision without an artificial conflict", async () => {
    const { useShellStore } = await import("../../state/shell-store");
    const { PreferenceWizard } = await import("./PreferenceWizard");
    const onClose = vi.fn();
    useShellStore.setState({ profiles: [initial], activeProfileId: initial.id });
    function Consumer({ visible }: { visible: boolean }) {
      const { profiles, activeProfileId, saveProfile } = useShellStore();
      return react.createElement(PreferenceWizard, { visible, initial: profiles.find((profile) => profile.id === activeProfileId)!, onSave: saveProfile, onClose });
    }
    await react.act(async () => root.render(react.createElement(Consumer, { visible: true })));
    await react.act(async () => button("行星").click());
    await react.act(async () => button("保存并设为当前预设").click());
    expect(useShellStore.getState().profiles[0]).toMatchObject({ revision: 2, targets: ["planets"] });
    await react.act(async () => root.render(react.createElement(Consumer, { visible: false })));
    await react.act(async () => root.render(react.createElement(Consumer, { visible: true })));
    await react.act(async () => button("保存并设为当前预设").click());
    expect(container.textContent).not.toContain("已有新版本");
    expect(useShellStore.getState().profiles[0]).toMatchObject({ revision: 3, targets: ["planets"] });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
