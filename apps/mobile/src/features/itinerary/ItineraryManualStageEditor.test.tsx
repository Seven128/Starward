// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { itineraryDraftInput, privateDraftHttp } from "../../../../../tests/fixtures/private-draft-http";
import { ItineraryScreen } from "./ItineraryScreen";
import type { ItineraryStage } from "../../../../../packages/domain/src/itinerary/index";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

const shell = vi.hoisted(() => ({ stageId: 0, state: { decisionContext: { revision: 1, observingNight: "2026-11-01", timezone: "Asia/Shanghai", origin: "广州", target: "moon", profileId: "base" }, location: { source: "manual" }, profiles: [{ id: "base", observerTypes: [] }] } }));
vi.mock("../../state/shell-store", () => ({ useShellStore: (select: (state: typeof shell.state) => unknown) => select(shell.state) }));
vi.mock("../../shell/DecisionContextRevision", () => ({ DecisionContextRevision: () => null }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => `manual-stage-${++shell.stageId}` }));
vi.mock("expo-router", () => ({ router: { push: vi.fn() } }));
vi.mock("../../data/runtime-api-base-url", () => ({ resolveRuntimeApiBaseUrl: () => "http://private-draft.local" }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const node = ({ children, testID }: { children: ReactNode; testID?: string }) => createElement("div", { "data-testid": testID }, children);
  return { View: node, Text: node, ScrollView: node, StyleSheet: { create: (value: unknown) => value },
    Pressable: ({ children, onPress, disabled, testID }: { children: ReactNode; onPress(): void; disabled?: boolean; testID?: string }) => createElement("button", { onClick: onPress, disabled, "data-testid": testID }, children),
    TextInput: ({ value, onChangeText, editable, accessibilityLabel }: { value: string; onChangeText(value: string): void; editable: boolean; accessibilityLabel: string }) => createElement("input", { value, disabled: !editable, "aria-label": accessibilityLabel, onChange: (event: { target: { value: string } }) => onChangeText(event.target.value) }),
  };
});
let host: Awaited<ReturnType<typeof privateDraftHttp>>, root: import("react-dom/client").Root, container: HTMLDivElement, react: typeof import("react"), cache: QueryClient;
beforeEach(async () => {
  shell.stageId = 0; host = await privateDraftHttp(); react = await import("react"); (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  container = document.createElement("div"); document.body.append(container); root = (await import("react-dom/client")).createRoot(container);
});
afterEach(async () => { await react.act(async () => root.unmount()); cache.clear(); container.remove(); await host.close(); });
async function settled(check: () => void) { await vi.waitFor(async () => { await react.act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); }); check(); }); }
const actor = { id: "owner-A", scope: "local-owner-poc" as const };
const button = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null;
async function click(id: string) { expect(button(id), id).not.toBeNull(); expect(button(id)!.disabled, id).toBe(false); await react.act(async () => button(id)!.click()); }
function input(label: string) { return container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement | null; }
async function type(label: string, value: string) {
  expect(input(label), label).not.toBeNull();
  await react.act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(label), value); input(label)!.dispatchEvent(new Event("input", { bubbles: true })); });
}
function seed(stages: ItineraryStage[] = [{ id: "observation-A", kind: "observation", startsAt: "2026-11-01T14:00:20.123Z", endsAt: "2026-11-01T15:00:30.456Z" }], timezone = "Asia/Shanghai", date = "2026-11-01") {
  const first = host.itinerary.service.command(actor, { ...itineraryDraftInput, input: { ...itineraryDraftInput.input, timezone, inputs: { ...itineraryDraftInput.input.inputs, date } }, idempotencyKey: "manual-seed-create" }).itinerary;
  return host.itinerary.service.command(actor, { command: "patch-draft", itineraryId: first.id, baseRevision: 1, idempotencyKey: "manual-seed-stage", patch: { stages } }).itinerary;
}
async function mount(client = host.itineraryClient(), ready = true) {
  await react.act(async () => root.render(<QueryClientProvider client={cache}><ItineraryScreen client={client} /></QueryClientProvider>));
  if (ready) await settled(() => expect(button("plan-edit")?.disabled).toBe(false)); return client;
}
const posts = () => host.requests.filter(request => request.method === "POST");

it("creates the first draft once, then adds its first manual stage only after a separate explicit save", async () => {
  await mount(host.itineraryClient(), false); await settled(() => expect(button("plan-generate")?.disabled).toBe(false)); await click("plan-generate");
  expect(button("plan-stage-add")).toBeNull(); await type("用户类型", "亲子观星"); await click("plan-save-draft");
  await settled(() => expect(button("plan-edit")?.disabled).toBe(false)); expect(posts()).toHaveLength(1);
  expect(JSON.parse(posts()[0].body!).input).not.toHaveProperty("stages");
  const id = host.itinerary.service.list(actor).items[0].id; expect(host.itinerary.service.get(actor, id).stages).toEqual([]);
  await click("plan-edit"); await click("plan-stage-add"); expect(input("开始日期")!.value).toBe("2026-11-01");
  await type("开始时间", "22:00"); await type("结束时间", "23:30"); expect(posts()).toHaveLength(1); await click("plan-save-draft");
  await settled(() => expect(host.itinerary.service.get(actor, id).revision).toBe(2));
  expect(host.itinerary.service.get(actor, id).stages).toEqual([{ id: "manual-stage-1", kind: "observation", startsAt: "2026-11-01T14:00:00.000Z", endsAt: "2026-11-01T15:30:00.000Z" }]);
  expect(posts()).toHaveLength(2);
});

it("saves manual add/remove/time/order edits through one actual new revision without changing other facts", async () => {
  const current = seed([
    { id: "later", kind: "observation", startsAt: "2026-11-01T15:00:10.100Z", endsAt: "2026-11-01T16:00:20.200Z" },
    { id: "earlier", kind: "scouting", startsAt: "2026-11-01T13:00:30.300Z", endsAt: "2026-11-01T14:00:40.400Z" },
  ]), shellBefore = JSON.stringify(shell.state);
  await mount(); await click("plan-edit"); expect(container.querySelector('[data-testid="plan-manual-stage-editor"]')).not.toBeNull();
  expect(input("开始日期")!.value).toBe("2026-11-01"); expect(input("开始时间")!.value).toBe("23:00:10.100");
  await type("开始时间", "23:15:10.125"); await click("plan-stage-kind-return");
  await click("plan-stage-add"); expect(input("开始时间")!.value).toBe("00:00:20.200"); expect(input("开始日期")!.value).toBe("2026-11-02");
  await type("结束时间", "01:00:20.250"); await click("plan-stage-kind-return");
  await click("plan-stage-sort");
  const order = [...container.querySelectorAll('[data-testid="plan-stage-earlier"], [data-testid="plan-stage-later"], [data-testid="plan-stage-manual-stage-1"]')].map(row => row.getAttribute("data-testid"));
  expect(order).toEqual(["plan-stage-earlier", "plan-stage-later", "plan-stage-manual-stage-1"]);
  await click("plan-stage-open-earlier"); await click("plan-stage-remove-earlier"); expect(posts()).toHaveLength(0);
  await click("plan-save-draft"); await settled(() => expect(host.itinerary.service.get(actor, current.id).revision).toBe(3));
  await settled(() => expect(button("plan-manual-stage-editor")).toBeNull());
  const saved = host.itinerary.service.get(actor, current.id);
  expect(saved.stages).toEqual([
    { id: "later", kind: "return", startsAt: "2026-11-01T15:15:10.125Z", endsAt: "2026-11-01T16:00:20.200Z" },
    { id: "manual-stage-1", kind: "return", startsAt: "2026-11-01T16:00:20.200Z", endsAt: "2026-11-01T17:00:20.250Z" },
  ]);
  expect(saved.inputs).toEqual(current.inputs); expect(saved.evidence).toEqual(current.evidence); expect(saved.source).toEqual(current.source); expect(saved.stops).toEqual(current.stops);
  expect(posts()).toHaveLength(1); expect(JSON.parse(posts()[0].body!)).toMatchObject({ command: "patch-draft", baseRevision: 2, patch: { stages: saved.stages } });
  expect(host.itinerary.service.get(actor, current.id, 2).stages).toEqual(current.stages); expect(JSON.stringify(shell.state)).toBe(shellBefore);
  await click("plan-open-astronomy"); expect(container.querySelector('[data-testid="plan-target-event"]')?.textContent).toContain("15:15:10.125 UTC");
  expect(container.textContent).toContain("不是计算所得的天文事实");
});

it("keeps invalid intervals local and cancellation restores the stored stages with no command", async () => {
  const current = seed(); await mount(); await click("plan-edit");
  await type("结束时间", "21:59:59.999"); await click("plan-save-draft");
  expect(container.querySelector('[data-testid="plan-stage-error"]')?.textContent).toContain("不能重叠"); expect(posts()).toHaveLength(0);
  expect(input("结束时间")!.value).toBe("21:59:59.999");
  await click("plan-cancel-edit"); expect(host.itinerary.service.get(actor, current.id).stages).toEqual(current.stages);
  await click("plan-edit"); expect(input("结束时间")!.value).toBe("23:00:30.456"); expect(posts()).toHaveLength(0);
});

it("requires explicit date review before sending unchanged stages with a changed observing date", async () => {
  const current = seed(); await mount(); await click("plan-edit"); await type("日期 YYYY-MM-DD", "2026-11-02"); await click("plan-save-draft");
  expect(posts()).toHaveLength(0); expect(container.textContent).toContain("阶段时刻不会自动平移");
  await click("plan-confirm-stage-dates"); await click("plan-save-draft");
  await settled(() => expect(host.itinerary.service.get(actor, current.id).revision).toBe(3));
  expect(host.itinerary.service.get(actor, current.id).inputs.date).toBe("2026-11-02"); expect(host.itinerary.service.get(actor, current.id).stages).toEqual(current.stages);
  expect(JSON.parse(posts()[0].body!).patch.stages).toEqual(current.stages);
});

it("preserves exact repeated-hour instants until an explicit occurrence is selected", async () => {
  const current = seed([{ id: "fold", kind: "observation", startsAt: "2026-10-25T00:10:20.123Z", endsAt: "2026-10-25T01:50:30.456Z" }], "Europe/London", "2026-10-24");
  await mount(); await click("plan-edit"); expect(input("开始时间")!.value).toBe("01:10:20.123"); expect(input("结束时间")!.value).toBe("01:50:30.456");
  await type("行程名称", "重复小时中的原安排"); await click("plan-save-draft"); await settled(() => expect(host.itinerary.service.get(actor, current.id).revision).toBe(3));
  expect(JSON.parse(posts()[0].body!).patch).not.toHaveProperty("stages"); expect(host.itinerary.service.get(actor, current.id).stages).toEqual(current.stages);
  await settled(() => expect(button("plan-edit")?.disabled).toBe(false)); await click("plan-edit"); await type("开始时间", "01:15:20.125"); await click("plan-save-draft");
  expect(posts()).toHaveLength(1); expect(container.textContent).toContain("出现两次");
  await click("plan-stage-start-occurrence-2"); await click("plan-save-draft"); await settled(() => expect(host.itinerary.service.get(actor, current.id).revision).toBe(4));
  expect(host.itinerary.service.get(actor, current.id).stages[0]).toMatchObject({ startsAt: "2026-10-25T01:15:20.125Z", endsAt: "2026-10-25T01:50:30.456Z" });
});

it("refuses a nonexistent spring clock time and accepts a normal corrected local time automatically", async () => {
  const current = seed([{ id: "spring", kind: "observation", startsAt: "2026-03-29T00:10:20.123Z", endsAt: "2026-03-29T01:50:30.456Z" }], "Europe/London", "2026-03-28");
  await mount(); await click("plan-edit"); await type("开始时间", "01:30:20.123"); await click("plan-save-draft");
  expect(posts()).toHaveLength(0); expect(input("开始时间")!.value).toBe("01:30:20.123"); expect(container.querySelector('[data-testid="plan-stage-error"]')).not.toBeNull();
  await type("开始时间", "02:10:20.125"); await click("plan-save-draft"); await settled(() => expect(host.itinerary.service.get(actor, current.id).revision).toBe(3));
  expect(host.itinerary.service.get(actor, current.id).stages[0]).toMatchObject({ startsAt: "2026-03-29T01:10:20.125Z", endsAt: "2026-03-29T01:50:30.456Z" });
});

it("retains the original stage body/key across a lost reply, local cancel and API/client reconstruction", async () => {
  const current = seed(), client = await mount(); await click("plan-edit"); await type("开始时间", "22:10:20.125");
  let lose = true; host.intercept(async (request, response) => { if (lose && request.method === "POST") { lose = false; throw Error("lost_manual_stage_reply"); } return response; });
  await click("plan-save-draft"); await settled(() => expect(button("plan-retry-save")?.disabled).toBe(false));
  const pending = await client.pending(), originalBody = posts()[0].body!; expect(pending).toMatchObject({ command: "patch-draft", baseRevision: 2, patch: { stages: [{ startsAt: "2026-11-01T14:10:20.125Z" }] } });
  expect(host.itinerary.service.get(actor, current.id).revision).toBe(3); await click("plan-cancel-edit"); expect(await client.pending()).toEqual(pending);
  const directory = host.directory, storage = [...host.values]; await react.act(async () => root.unmount()); cache.clear(); await host.close();
  host = await privateDraftHttp({ directory }); for (const [key, value] of storage) host.values.set(key, value);
  host.itinerary.service.command(actor, { command: "patch-draft", itineraryId: current.id, baseRevision: 3, idempotencyKey: "later-manual-title", patch: { title: "后来的已存版本" } });
  root = (await import("react-dom/client")).createRoot(container); const rebuilt = await mount(host.itineraryClient(), false);
  await settled(() => expect(button("plan-retry-save")?.disabled).toBe(false)); await click("plan-retry-save"); await settled(() => expect(button("plan-retry-save")).toBeNull());
  expect(await rebuilt.pending()).toBeNull(); expect(posts()).toHaveLength(1); expect(posts()[0].body).toBe(originalBody);
  expect(host.itinerary.service.get(actor, current.id).revision).toBe(4); expect(host.itinerary.service.get(actor, current.id).title).toBe("后来的已存版本");
  expect(host.itinerary.service.get(actor, current.id).stages[0].startsAt).toBe("2026-11-01T14:10:20.125Z");
  await settled(() => expect(container.textContent).toContain("后来的已存版本"));
});

it("preserves a conflicted stage edit until the user explicitly chooses the saved version", async () => {
  const current = seed(), client = await mount(); await click("plan-edit"); await type("开始时间", "22:15:20.125");
  host.itinerary.service.command(actor, { command: "patch-draft", itineraryId: current.id, baseRevision: 2, idempotencyKey: "concurrent-manual-edit", patch: { title: "并发已存内容" } });
  await click("plan-save-draft"); await settled(() => expect(container.textContent).toContain("行程已被更新"));
  expect(input("开始时间")!.value).toBe("22:15:20.125"); expect(await client.pending()).toBeNull(); expect(host.itinerary.service.get(actor, current.id).stages).toEqual(current.stages);
  await react.act(async () => { const choice = [...container.querySelectorAll("button")].find(item => item.textContent === "保留已存内容，重新编辑"); expect(choice).toBeDefined(); choice!.click(); });
  await settled(() => expect(input("开始时间")!.value).toBe("22:00:20.123")); expect(input("行程名称")!.value).toBe("并发已存内容"); expect(posts()).toHaveLength(1);
});

it("keeps an unsupported existing stage opaque while saving supported basic fields", async () => {
  const current = seed(), legacy = { ...current, stages: [{ ...current.stages[0], kind: "moonless" as const }] };
  // This synthetic prior-schema fixture is not claimed to have been created by
  // today's restricted manual command. Both stored projections agree before UI.
  const database = new DatabaseSync(join(host.directory, "itinerary-and-collaboration.sqlite"));
  try {
    expect(database.prepare("UPDATE itinerary_drafts SET body = ? WHERE id = ? AND actor_id = ?").run(JSON.stringify(legacy), current.id, actor.id).changes).toBe(1);
    expect(database.prepare("UPDATE itinerary_draft_versions SET body = ? WHERE id = ? AND actor_id = ? AND revision = ?").run(JSON.stringify(legacy), current.id, actor.id, current.revision).changes).toBe(1);
  } finally { database.close(); }
  await mount(); await click("plan-edit"); expect(button("plan-stage-add")).toBeNull(); expect(container.textContent).toContain("原阶段暂不能手工编辑");
  await type("行程名称", "保留旧阶段的基本信息编辑"); await click("plan-save-draft"); await settled(() => expect(host.itinerary.service.get(actor, current.id).revision).toBe(3));
  expect(JSON.parse(posts()[0].body!).patch).not.toHaveProperty("stages"); expect(host.itinerary.service.get(actor, current.id).stages).toEqual(legacy.stages);
  expect(host.itinerary.service.get(actor, current.id, 2).stages).toEqual(legacy.stages);
});
