// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { privateDraftHttp } from "../../../../../tests/fixtures/private-draft-http";
import { ItineraryScreen } from "./ItineraryScreen";

const shell = vi.hoisted(() => ({ state: { decisionContext: { revision: 1, observingNight: "2026-11-01", timezone: "Asia/Shanghai", origin: "广州", target: "moon", profileId: "base" }, location: { source: "manual" }, profiles: [{ id: "base", observerTypes: [] }] } }));
vi.mock("../../state/shell-store", () => ({ useShellStore: (select: (state: typeof shell.state) => unknown) => select(shell.state) }));
vi.mock("../../shell/DecisionContextRevision", () => ({ DecisionContextRevision: () => null }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "unused-native-key" }));
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
  host = await privateDraftHttp(); react = await import("react"); (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  container = document.createElement("div"); document.body.append(container); root = (await import("react-dom/client")).createRoot(container);
});
afterEach(async () => { await react.act(async () => root.unmount()); cache.clear(); container.remove(); await host.close(); });
async function settled(check: () => void) { await vi.waitFor(async () => { await react.act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); }); check(); }); }
const button = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null;
async function click(id: string) { expect(button(id), id).not.toBeNull(); expect(button(id)!.disabled, id).toBe(false); await react.act(async () => button(id)!.click()); }
const actor = { id: "owner-A", scope: "local-owner-poc" as const };
function seedHistory() {
  const first = host.seedItinerary();
  const old = host.itinerary.service.command(actor, { command: "patch-draft", itineraryId: first.id, baseRevision: 1, idempotencyKey: "history-old",
    patch: { title: "旧版本合成标题", inputs: { ...first.inputs, origin: "旧出发地", people: 3 }, stages: [{ id: "old-observation", kind: "observation", startsAt: "2026-11-01T14:00:00Z", endsAt: "2026-11-01T15:00:00Z" }] } }).itinerary;
  const current = host.itinerary.service.command(actor, { command: "patch-draft", itineraryId: first.id, baseRevision: 2, idempotencyKey: "history-current",
    patch: { title: "当前合成标题", inputs: { ...first.inputs, origin: "当前出发地", people: 1 }, stages: [{ id: "current-observation", kind: "observation", startsAt: "2026-11-01T16:00:00Z", endsAt: "2026-11-01T17:00:00Z" }] } }).itinerary;
  return { old, current };
}
async function render(client = host.itineraryClient()) { await react.act(async () => root.render(<QueryClientProvider client={cache}><ItineraryScreen client={client} /></QueryClientProvider>)); await settled(() => expect(button("plan-edit")?.disabled).toBe(false)); return client; }
async function openOld() { await click("plan-open-history"); await settled(() => expect(button("plan-history-revision-2")).not.toBeNull()); await click("plan-history-revision-2"); await settled(() => expect(container.querySelector('[data-testid="plan-history-diff-stages"]')).not.toBeNull()); }

it("previews actual version differences read-only, cancels without a command, then explicitly restores new current", async () => {
  const { old, current } = seedHistory(), contextBefore = JSON.stringify(shell.state);
  await render(); await openOld();
  expect(container.textContent).toContain("当前：当前出发地"); expect(container.textContent).toContain("恢复后：旧出发地");
  expect(container.textContent).toContain("old-observation"); expect(container.textContent).toContain("current-observation");
  expect(host.requests.every(request => request.method === "GET")).toBe(true);
  let unavailable = true;
  host.intercept(async (request, response) => unavailable && request.path.endsWith("/revisions/2") ? new Response(JSON.stringify({ code: "itinerary_storage_unavailable", outcome: "unknown" }), { status: 503 }) : response);
  await react.act(async () => { await cache.invalidateQueries({ queryKey: ["itinerary-revision"] }); });
  await settled(() => expect(button("plan-history-detail-retry")).not.toBeNull());
  expect(container.textContent).toContain("恢复后：旧出发地"); expect(button("plan-restore-history")!.disabled).toBe(true);
  unavailable = false; await click("plan-history-detail-retry"); await settled(() => expect(button("plan-restore-history")?.disabled).toBe(false));
  await click("plan-close-history-comparison"); expect(container.querySelector('[data-testid="itinerary-history"]')).toBeNull();
  expect(host.itinerary.service.get(actor, current.id).revision).toBe(3); expect(JSON.stringify(shell.state)).toBe(contextBefore);
  await openOld(); await settled(() => expect(button("plan-restore-history")?.disabled).toBe(false)); await click("plan-restore-history");
  await settled(() => expect(host.itinerary.service.get(actor, current.id).revision).toBe(4));
  await settled(() => expect(container.querySelector('[data-testid="itinerary-history"]')).toBeNull());
  expect(container.textContent).toContain(old.title); expect(host.itinerary.service.get(actor, current.id).stages).toEqual(old.stages);
  expect(host.requests.filter(request => request.method === "POST")).toHaveLength(1); expect(JSON.stringify(shell.state)).toBe(contextBefore);
});

it("preserves the live unsaved form and selected comparison across history read failure and cancellation", async () => {
  seedHistory(); await render(); await click("plan-edit");
  await react.act(async () => { const input = container.querySelector('input[aria-label="行程名称"]') as HTMLInputElement; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "未保存的手调内容"); input.dispatchEvent(new Event("input", { bubbles: true })); });
  await openOld(); expect(button("plan-restore-history")!.disabled).toBe(true); expect(container.textContent).toContain("当前还有未保存编辑");
  let fail = true;
  host.intercept(async (request, response) => fail && request.path.endsWith("/revisions") ? new Response(JSON.stringify({ code: "itinerary_storage_unavailable", outcome: "unknown" }), { status: 503 }) : response);
  await react.act(async () => { await cache.invalidateQueries({ queryKey: ["itinerary-history"] }); });
  await settled(() => expect(button("plan-history-retry")).not.toBeNull());
  expect(container.textContent).toContain("恢复后：旧出发地");
  expect((container.querySelector('input[aria-label="行程名称"]') as HTMLInputElement).value).toBe("未保存的手调内容");
  fail = false; await click("plan-history-retry"); await settled(() => expect(button("plan-history-retry")).toBeNull());
  await click("plan-history-choose-version");
  let failDetail = true;
  host.intercept(async (request, response) => failDetail && request.path.endsWith("/revisions/1") ? new Response(JSON.stringify({ code: "itinerary_storage_unavailable", outcome: "unknown" }), { status: 503 }) : response);
  await click("plan-history-revision-1"); await settled(() => expect(button("plan-history-detail-retry")).not.toBeNull());
  expect(container.textContent).toContain("当前版本 3 → 历史版本 1"); expect(button("plan-restore-history")!.disabled).toBe(true);
  expect((container.querySelector('input[aria-label="行程名称"]') as HTMLInputElement).value).toBe("未保存的手调内容");
  failDetail = false; await click("plan-history-detail-retry"); await settled(() => expect(button("plan-history-detail-retry")).toBeNull());
  await click("plan-close-history"); expect((container.querySelector('input[aria-label="行程名称"]') as HTMLInputElement).value).toBe("未保存的手调内容");
  expect(host.requests.every(request => request.method === "GET")).toBe(true);
});

it("keeps a conflicted comparison until a fresh explicit compare and a second explicit restore", async () => {
  const { current } = seedHistory(); await render(); await openOld();
  host.itinerary.service.command(actor, { command: "patch-draft", itineraryId: current.id, baseRevision: 3, idempotencyKey: "concurrent-edit", patch: { title: "并发更新后的标题" } });
  await click("plan-restore-history");
  await settled(() => expect(container.textContent).toContain("当前行程已更新，请重新比较"));
  expect(container.textContent).toContain("当前版本 3 → 历史版本 2"); expect(button("plan-restore-history")!.disabled).toBe(true);
  expect(host.requests.filter(request => request.method === "POST")).toHaveLength(1); expect(host.itinerary.service.get(actor, current.id).revision).toBe(4);
  await click("plan-history-recompare"); await settled(() => expect(container.textContent).toContain("当前版本 4 → 历史版本 2"));
  expect(container.textContent).toContain("当前：并发更新后的标题"); await settled(() => expect(button("plan-restore-history")!.disabled).toBe(false));
  await click("plan-restore-history"); await settled(() => expect(host.itinerary.service.get(actor, current.id).revision).toBe(5));
  const posts = host.requests.filter(request => request.method === "POST").map(request => JSON.parse(request.body!));
  expect(posts.map(command => command.baseRevision)).toEqual([3, 4]); expect(posts[0].idempotencyKey).not.toBe(posts[1].idempotencyKey);
});

it("retains an uncertain restore after closing history and recreating the consumer, then confirms original body/key", async () => {
  const { current } = seedHistory(), client = await render(); await openOld();
  let lose = true; host.intercept(async (request, response) => { if (lose && request.method === "POST") { lose = false; throw Error("lost_real_restore_reply"); } return response; });
  await click("plan-restore-history"); await settled(() => expect(button("plan-retry-save")).not.toBeNull());
  const pending = await client.pending(); expect(pending).toMatchObject({ command: "restore-draft", itineraryId: current.id, baseRevision: 3, sourceRevision: 2 });
  expect(container.querySelector('[data-testid="itinerary-pending"]')?.textContent).toContain("恢复版本 2 · 基于版本 3");
  await click("plan-close-history"); expect(await client.pending()).toEqual(pending);
  host.itinerary.service.command(actor, { command: "patch-draft", itineraryId: current.id, baseRevision: 4, idempotencyKey: "later-current", patch: { title: "后来更新的版本" } });
  await react.act(async () => root.unmount()); cache.clear(); root = (await import("react-dom/client")).createRoot(container);
  const rebuilt = host.itineraryClient();
  await react.act(async () => root.render(<QueryClientProvider client={cache}><ItineraryScreen client={rebuilt} /></QueryClientProvider>));
  await settled(() => expect(button("plan-retry-save")?.disabled).toBe(false)); await click("plan-retry-save");
  await settled(() => expect(button("plan-retry-save")).toBeNull()); expect(await rebuilt.pending()).toBeNull();
  expect(container.textContent).toContain("后来更新的版本"); expect(host.itinerary.service.get(actor, current.id).revision).toBe(5);
  const posts = host.requests.filter(request => request.method === "POST"); expect(posts).toHaveLength(2); expect(posts[0].body).toBe(posts[1].body);
});

it("withdraws selected private history on actual denial and cannot publish a late A revision over B", async () => {
  const { current } = seedHistory(), client = await render(); await click("plan-open-history"); await settled(() => expect(button("plan-history-revision-2")).not.toBeNull());
  let release!: () => void, resolveReady!: () => void;
  const ready = new Promise<void>(resolve => { resolveReady = resolve; }), held = new Promise<void>(resolve => { release = resolve; });
  host.intercept(async (request, response) => { if (request.path.endsWith("/revisions/2") && response.ok) { resolveReady(); await held; } return response; });
  try {
    await click("plan-history-revision-2"); await ready;
    host.actor("itinerary", null); await react.act(async () => { await expect(client.get(current.id)).rejects.toMatchObject({ statusCode: 403 }); });
    expect(container.querySelector('[data-testid="itinerary-history"]')).toBeNull(); expect(container.textContent).not.toContain("当前合成标题");
    host.actor("itinerary", "owner-B"); host.seedItinerary("B当前合成资料");
    await react.act(async () => { await cache.invalidateQueries({ queryKey: ["itinerary-library"] }); });
    await settled(() => expect(container.textContent).toContain("B当前合成资料")); await react.act(async () => release());
    await settled(() => expect(cache.getQueryCache().getAll().filter(query => query.queryKey[0] === "itinerary-revision").every(query => query.state.fetchStatus === "idle")).toBe(true));
    expect(container.textContent).not.toContain("旧版本合成标题"); expect(container.textContent).not.toContain("旧出发地");
    expect(client.authority()).toMatchObject({ status: "ready", ownerId: "owner-B" }); expect(host.requests.every(request => request.method === "GET")).toBe(true);
  } finally { release(); }
});

it.each([
 {name:"supported seconds and milliseconds",timezone:"Asia/Shanghai",date:"2026-11-01",oldStart:"2026-11-01T14:00:10.100Z",oldEnd:"2026-11-01T15:00:10.100Z",currentStart:"2026-11-01T14:00:20.200Z",currentEnd:"2026-11-01T15:00:20.200Z"},
 {name:"repeated local hour at daylight-saving fold",timezone:"Europe/London",date:"2026-10-24",oldStart:"2026-10-25T00:10:00.000Z",oldEnd:"2026-10-25T00:20:00.000Z",currentStart:"2026-10-25T01:10:00.000Z",currentEnd:"2026-10-25T01:20:00.000Z"},
])("independent: restore preview exposes $name",async sample=>{
 const {itineraryDraftInput}=await import("../../../../../tests/fixtures/private-draft-http");
 const initial=host.itinerary.service.command(actor,{command:"create-draft",idempotencyKey:"independent-precision-initial",input:{...itineraryDraftInput.input,timezone:sample.timezone,inputs:{...itineraryDraftInput.input.inputs,date:sample.date}}}).itinerary;
 const oldStage={id:"same-user-stage",kind:"observation" as const,startsAt:sample.oldStart,endsAt:sample.oldEnd};
 const currentStage={...oldStage,startsAt:sample.currentStart,endsAt:sample.currentEnd};
 host.itinerary.service.command(actor,{command:"patch-draft",itineraryId:initial.id,baseRevision:1,idempotencyKey:"independent-precision-old",patch:{stages:[oldStage]}});
 const before=host.itinerary.service.command(actor,{command:"patch-draft",itineraryId:initial.id,baseRevision:2,idempotencyKey:"independent-precision-current",patch:{stages:[currentStage]}}).itinerary;
 await render();await openOld();
 const diff=container.querySelector('[data-testid="plan-history-diff-stages"]')!;
 const displayed=Array.from(diff.children).map(node=>node.textContent??"");
 const currentDisplay=displayed[1].replace(/^当前：/u,""),restoredDisplay=displayed[2].replace(/^恢复后：/u,"");
 const restoreWasEnabled=button("plan-restore-history")?.disabled===false;
 expect(restoreWasEnabled).toBe(true);
 await click("plan-restore-history");await settled(()=>expect(host.itinerary.service.get(actor,initial.id).revision).toBe(4));
 const after=host.itinerary.service.get(actor,initial.id);
 expect(after.stages).toEqual([oldStage]);expect(before.stages).toEqual([currentStage]);
 const posts=host.requests.filter(request=>request.method==="POST");expect(posts).toHaveLength(1);
 console.log(JSON.stringify({diagnostic:"supported_instant_restore_preview",name:sample.name,currentDisplay,restoredDisplay,restoreWasEnabled,beforeStart:before.stages[0].startsAt,afterStart:after.stages[0].startsAt,revisionBefore:before.revision,revisionAfter:after.revision,posts:posts.length}));
 expect(currentDisplay,"the preview must expose the real stage-time change before the write").not.toBe(restoredDisplay);
});
