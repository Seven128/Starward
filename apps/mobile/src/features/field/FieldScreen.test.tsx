// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createFieldClient } from "../../data/field-client";
import { createFieldReportsClient } from "../../data/field-reports-client";
import type { FieldReportCommand, FieldReportDraft } from "../../../../../packages/domain/src/offline/field-reports";
import { fieldReportInput, fieldReportResult, savedFieldReport } from "../../../../../tests/fixtures/field-reports";
import { privateOwnerQualification } from "../../../../../tests/fixtures/private-command-owner";
import { createDecisionContext } from "../../state/decision-context";

const shell = vi.hoisted(() => {
  const state = {
    decisionContext: { revision: 12, observingNight: "2026-10-24", moment: "2026-10-24T13:24:35.000Z", timezone: "Asia/Shanghai", target: "moon", profileId: "user-profile", profileRevision: 3 },
    selectedSpot: { id: "selected-a", name: "用户已选地点A", coordinate: { lat: 25, lon: 115 } } as { id: string; name: string; coordinate: { lat: number; lon: number } } | null,
    location: { source: "unset", label: "尚未选择位置" }, profiles: [{ id: "user-profile", revision: 3 }], displayMode: "planning" as "planning" | "night" | "redLight", setDisplayMode: (_mode: string) => {},
  };
  return { state, listeners: new Set<() => void>(), modeWrites: [] as string[], pushes: [] as string[] };
});
vi.mock("../../state/shell-store", async () => { const { useSyncExternalStore } = await import("react"); return { useShellStore: (select: (state: typeof shell.state) => unknown) => useSyncExternalStore(callback => { shell.listeners.add(callback); return () => shell.listeners.delete(callback); }, () => select(shell.state)) }; });
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "field-screen-key" }));
vi.mock("expo-router", () => ({ router: { push: (route: string) => shell.pushes.push(route) } }));
vi.mock("../../data/runtime-api-base-url", () => ({ resolveRuntimeApiBaseUrl: () => "http://local-api" }));
vi.mock("../../shell/TabRestorationEvidence", () => ({ useTabRestorationEvidence: () => ({ evidence: null, onScroll: () => {}, scrollEventThrottle: 16 }) }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const node = ({ children, testID, style }: { children: ReactNode; testID?: string; style?: unknown }) => createElement("div", { "data-testid": testID, ...(Array.isArray(style) ? {} : { style }) }, children);
  return { View: node, Text: node, ScrollView: node, KeyboardAvoidingView: node, Platform: { OS: "android" }, Keyboard: { dismiss: vi.fn() }, StyleSheet: { create: (styles: unknown) => styles },
    Pressable: ({ children, onPress, disabled, testID }: { children: ReactNode; onPress(): void; disabled?: boolean; testID?: string }) => createElement("button", { onClick: onPress, disabled, "data-testid": testID }, children),
    TextInput: ({ value, onChangeText, editable, accessibilityLabel }: { value: string; onChangeText(value: string): void; editable: boolean; accessibilityLabel: string }) => createElement("input", { value, disabled: !editable, "aria-label": accessibilityLabel, onChange: (event: { target: { value: string } }) => onChangeText(event.target.value) }),
  };
});
const status = { schemaVersion: "starward-field-v2", generatedAt: "2026-10-24T13:00:00Z", capabilities: { "observation-pack": "unavailable", "parking-route": "unavailable", "backup-switch": "unavailable", "safety-session": "unavailable", "location-share": "unavailable", "offline-replay": "unavailable" } };
const response = (value: unknown, code = 200) => new Response(JSON.stringify(value), { status: code });
function transport(loseFirstReply = false) {
  const values = new Map<string, string>(), reports = new Map<string, FieldReportDraft>(), receipts = new Map<string, ReturnType<typeof fieldReportResult>>(), posts: FieldReportCommand[] = [];
  let key = 0, loss = loseFirstReply;
  const fetcher = (async (url, init) => {
    if (String(url).endsWith("/v2/field")) return response(status);
    if (init?.method === "POST") {
      const command = JSON.parse(String(init.body)) as FieldReportCommand; posts.push(command);
      const old = receipts.get(command.idempotencyKey); if (old) return response({ ...old, replayed: true });
      let report: FieldReportDraft;
      if (command.command === "create-report-draft") report = { ...savedFieldReport(1, command.input), id: `report-${reports.size + 1}` };
      else {
        const current = reports.get(command.reportId)!;
        if (current.revision !== command.baseRevision) return response({ code: "field_report_revision_conflict", outcome: "rejected" }, 409);
        report = { ...current, revision: current.revision + 1, input: command.input };
      }
      reports.set(report.id, report); const receipt = fieldReportResult(command.idempotencyKey, report); receipts.set(command.idempotencyKey, receipt);
      if (loss) { loss = false; throw new Error("lost_committed_field_reply"); }
      return response(receipt);
    }
    if (String(url).endsWith("/v2/field-reports")) return response({ schemaVersion: "starward-field-reports-v2", scope: "local-owner-poc", items: [...reports.values()], nextCursor: null, ownerQualification: privateOwnerQualification() });
    return response({ schemaVersion: "starward-field-reports-v2", report: reports.get(decodeURIComponent(String(url).split("/").at(-1)!)) });
  }) as typeof fetch;
  const storage = { getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } };
  return { values, reports, posts, client: () => createFieldReportsClient({ baseUrl: "http://local-api", storage, fetcher, newKey: () => `key-${++key}` }), statusClient: createFieldClient({ baseUrl: "http://local-api", fetcher }) };
}
describe("actual native Field consumer with private report drafts", () => {
  let root: import("react-dom/client").Root, container: HTMLDivElement, react: typeof import("react"), cache: QueryClient;
  const button = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement;
  const field = (label: string) => container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
  const newCache = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  beforeEach(async () => {
    react = await import("react"); (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    shell.state = { decisionContext: { ...fieldReportInput().context, profileRevision: 3 }, selectedSpot: { id: "selected-a", name: "用户已选地点A", coordinate: { lat: 25, lon: 115 } }, location: { source: "unset", label: "尚未选择位置" }, profiles: [{ id: "user-profile", revision: 3 }], displayMode: "planning", setDisplayMode: mode => { shell.modeWrites.push(mode); shell.state = { ...shell.state, displayMode: mode as typeof shell.state.displayMode }; shell.listeners.forEach(listener => listener()); } };
    shell.modeWrites.length = 0; shell.pushes.length = 0; cache = newCache();
    container = document.createElement("div"); document.body.append(container); root = (await import("react-dom/client")).createRoot(container);
  });
  afterEach(async () => { await react.act(async () => root.unmount()); cache.clear(); container.remove(); });
  async function waitFor(check: () => void) { await vi.waitFor(async () => { await react.act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); }); check(); }); }
  async function change(label: string, value: string) { await react.act(async () => { const element = field(label); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, value); element.dispatchEvent(new Event("input", { bubbles: true })); }); }
  async function open(host: ReturnType<typeof transport>, reportsClient = host.client()) {
    const { FieldScreen } = await import("./FieldScreen");
    await react.act(async () => root.render(<QueryClientProvider client={cache}><FieldScreen client={host.statusClient} reportsClient={reportsClient} /></QueryClientProvider>));
    await react.act(async () => button("field-save-report").click());
    await waitFor(() => expect(!button("field-new-report").disabled || button("field-retry-save") !== null).toBe(true));
  }
  it("opens without a write, preserves the initial Context and actual text, resumes an uncertain save after remount and reads the current revision", async () => {
    const host = transport(true); await open(host); expect(host.posts).toHaveLength(0);
    await react.act(async () => button("field-new-report").click());
    expect(field("记录地点").value).toBe("用户已选地点A"); expect(field("记录时间 UTC 或带时差").value).toBe("2026-10-24T13:24:35.000Z");
    const input = field("记录内容"); input.focus(); await change("记录内容", "用户实际输入：西侧薄云"); expect(field("记录内容")).toBe(input); expect(document.activeElement).toBe(input);
    await react.act(async () => { shell.state = { ...shell.state, selectedSpot: { id: "selected-b", name: "地点B", coordinate: { lat: 30, lon: 120 } }, decisionContext: { ...shell.state.decisionContext, revision: 13, moment: "2026-10-24T14:15:00.000Z", target: "jupiter" } }; shell.listeners.forEach(listener => listener()); });
    expect(field("记录地点").value).toBe("用户已选地点A");
    await react.act(async () => button("field-save-draft").click());
    await waitFor(() => expect(button("field-retry-save")).not.toBeNull());
    expect(host.posts[0]).toMatchObject({ command: "create-report-draft", input: { place: { label: "用户已选地点A", spotId: "selected-a" }, observedAt: "2026-10-24T13:24:35.000Z", note: "用户实际输入：西侧薄云", context: { revision: 12, target: "moon" } } });
    expect(button("field-new-report").disabled).toBe(true);
    const saved = host.reports.get("report-1")!; host.reports.set(saved.id, { ...saved, revision: 2, input: { ...saved.input, note: "另一次已保存修订" } });
    await react.act(async () => root.render(null)); cache.clear(); cache = newCache();
    await open(host); await react.act(async () => button("field-retry-save").click());
    await waitFor(() => expect(container.textContent).toContain("私人草稿已保存 · 版本 2"));
    expect(container.querySelector('[data-testid="field-report-content"]')!.textContent).toBe("另一次已保存修订");
    expect(host.posts[1]).toEqual(host.posts[0]); expect(host.values.size).toBe(0);
    expect(container.textContent).not.toContain("已保存在本机"); expect(container.textContent).toContain("尚未公开或送审");
    await react.act(async () => button("field-edit-report").click()); await change("记录内容", "用户明确修改的记录"); await react.act(async () => button("field-save-draft").click());
    await waitFor(() => expect(container.textContent).toContain("私人草稿已保存 · 版本 3"));
    expect(host.posts[2]).toMatchObject({ command: "update-report-draft", baseRevision: 2, input: { note: "用户明确修改的记录", context: { revision: 12 } } });
  });
  it("keeps a conflicting input and reads current without replacing the form, then explicitly saves another private note", async () => {
    const host = transport(); await open(host); await react.act(async () => button("field-new-report").click()); await change("记录内容", "原始记录"); await react.act(async () => button("field-save-draft").click());
    await waitFor(() => expect(button("field-edit-report")).not.toBeNull());
    await react.act(async () => button("field-edit-report").click()); await change("记录内容", "我保留的修改");
    const prior = host.reports.get("report-1")!; host.reports.set(prior.id, { ...prior, revision: 2, input: { ...prior.input, note: "当前服务端新版" } });
    await react.act(async () => button("field-save-draft").click()); await waitFor(() => expect(container.textContent).toContain("记录已有新版本"));
    expect(field("记录内容").value).toBe("我保留的修改"); expect(host.values.size).toBe(0);
    await react.act(async () => button("field-load-latest").click()); await waitFor(() => expect(container.textContent).toContain("私人草稿已保存 · 版本 2")); expect(field("记录内容").value).toBe("我保留的修改");
    await react.act(async () => button("field-save-as-new").click()); await react.act(async () => button("field-save-draft").click()); await waitFor(() => expect(host.reports.size).toBe(2));
    expect(host.reports.get("report-1")!.input.note).toBe("当前服务端新版"); expect(host.reports.get("report-2")!.input.note).toBe("我保留的修改");
  });
  it("uses the shared display owner, keeps unimplemented native capabilities unavailable and warns before red-light keyboard entry", async () => {
    const host = transport(); await open(host);
    for (const [id, content] of [["field-verify-pack", "尚无可用观测包"], ["field-return-to-parking", "尚无已确认停车点"], ["field-open-offline-route", "备选切换尚不可用"], ["field-start-session", "安全会话尚未开启"], ["field-share-location", "位置分享尚不可用"], ["field-enter-airplane-mode", "完全离线尚不可用"]]) { await react.act(async () => button(id).click()); expect(container.textContent).toContain(content); }
    expect(host.posts).toHaveLength(0); expect(container.textContent).not.toContain("00:35"); expect(container.textContent).not.toContain("本地签到提醒已排程");
    await react.act(async () => button("field-toggle-red-mode").click()); expect(shell.modeWrites).toEqual([]);
    await react.act(async () => button("field-mode-redLight").click()); expect(shell.modeWrites).toEqual(["redLight"]); expect(shell.state.displayMode).toBe("redLight"); expect(host.posts).toHaveLength(0);
    await react.act(async () => button("field-save-report").click()); await react.act(async () => button("field-new-report").click());
    expect(container.querySelector('[data-testid="field-report-keyboard-warning"]')).not.toBeNull(); expect(field("记录内容").disabled).toBe(true);
    await react.act(async () => button("field-report-allow-keyboard").click()); expect(field("记录内容").disabled).toBe(false); expect(host.posts).toHaveLength(0);
    await react.act(async () => button("field-open-tool-grid").click()); expect(button("field-tool-sky").disabled).toBe(true); expect(shell.pushes).toEqual([]);
    await react.act(async () => button("field-toggle-red-mode").click()); await react.act(async () => button("field-mode-night").click()); await react.act(async () => button("field-open-tool-grid").click()); await react.act(async () => button("field-tool-sky").click()); expect(shell.pushes).toEqual(["/sky"]);
    await react.act(async () => button("field-save-report").click()); expect(field("记录地点").value).toBe("用户已选地点A");
  });
  it("keeps an actual initial Context revision and missing profile version distinct without inventing a place or profile", async () => {
    const initial = createDecisionContext("missing-profile");
    shell.state = { ...shell.state, decisionContext: initial, profiles: [], selectedSpot: null };
    const host = transport(); await open(host); await react.act(async () => button("field-new-report").click());
    expect(field("记录地点").value).toBe(""); expect(field("记录时间 UTC 或带时差").value).toBe(initial.moment); expect(container.textContent).toContain("未知版本");
    await change("记录地点", "用户亲自填写的现场"); await change("记录内容", "保留缺少预设时的原始记录"); await react.act(async () => button("field-save-draft").click());
    await waitFor(() => expect(button("field-edit-report")).not.toBeNull());
    expect(host.posts[0]).toMatchObject({ input: { place: { label: "用户亲自填写的现场" }, context: { revision: initial.revision, profileId: "missing-profile", profileRevision: null } } });
    expect(host.posts[0].input.place).not.toHaveProperty("spotId"); expect(host.posts[0].input).not.toHaveProperty("latitude");
  });
});
