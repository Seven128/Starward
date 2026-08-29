import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as installedEvents from "@tarojs/runtime/dist/dom/event.js";
import { userMapRegionEnd } from "./map-region-event";
import { transportHarness } from "../../services/api-request-test-support";
import { isMiniappRequestCancelled } from "../../services/request-lifecycle";

type Center = { latitude: number; longitude: number };
const center: Center = { latitude: 20, longitude: 110 }; // synthetic only
// The installed runtime ships ESM syntax without package type=module; tsx's
// workspace loader may expose it through the CommonJS default namespace.
const createEvent = installedEvents.createEvent ?? (installedEvents as unknown as { default: typeof installedEvents }).default.createEvent;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function mapRuntime(response: Promise<{ data: object }> | (() => Promise<{ data: object }>)) {
  const text = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  const source = ts.createSourceFile("map.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(["resolveMapPoint", "onRegionChange"]);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.has(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, names.size);
  assert.match(text, /"map-observation-context",\s*mapResetVersion/u);
  let version = 0, calls = 0;
  const contexts: object[] = [], viewports: object[] = [], notifications: object[] = [];
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const functions = vm.runInNewContext(ts.transpileModule(declarations.join("\n") + "\n({resolveMapPoint, onRegionChange});", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    useAppStore: { getState: () => ({ mapResetVersion: version }) },
    gcj02ToWgs84: () => ({ lat: 20, lon: 110 }), activeContext: null,
    currentTimezoneHint: () => "UTC", localDateForNow: () => "2026-08-29",
    resolveObservationContext: () => { calls++; return typeof response === "function" ? response() : response; },
    isMiniappRequestCancelled,
    setObservationContext: (context: object) => contexts.push(context),
    setViewport: (viewport: object) => viewports.push(viewport),
    notify: (notification: object) => notifications.push(notification), errorMessage: () => "synthetic error",
    userMapRegionEnd, regionTimer: { current: null },
    clearTimeout: (id: number) => timers.delete(id),
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
  }, { timeout: 1000 }) as {
    resolveMapPoint(center: Center, source: "MAP_VIEWPORT"): Promise<object | null>;
    onRegionChange(event: object): void;
  };
  return { ...functions, contexts, viewports, notifications, reset: () => { version++; },
    fireTimers: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach((callback) => callback()); }, get calls() { return calls; } };
}

test("actual map-point resolver discards success and error superseded by default reset", async () => {
  for (const outcome of ["SUCCESS", "ERROR"] as const) {
    const response = deferred<{ data: object }>();
    const map = mapRuntime(response.promise);
    const pending = map.resolveMapPoint(center, "MAP_VIEWPORT");
    map.reset();
    if (outcome === "SUCCESS") response.resolve({ data: { contextId: "synthetic-old" } });
    else response.reject(new Error("synthetic late failure"));
    assert.equal(await pending, null);
    assert.equal(map.contexts.length, 0);
  }
});

test("actual current map-point result still commits and current failures still reject", async () => {
  const context = { contextId: "synthetic-current" };
  const map = mapRuntime(Promise.resolve({ data: context }));
  assert.equal(await map.resolveMapPoint(center, "MAP_VIEWPORT"), context);
  assert.deepEqual(map.contexts, [context]);
  const failed = mapRuntime(Promise.reject(new Error("synthetic current failure")));
  await assert.rejects(failed.resolveMapPoint(center, "MAP_VIEWPORT"), /synthetic current failure/);
});

test("a replaced map request is silent and cannot overwrite the current context", async () => {
  const transport = transportHarness();
  const map = mapRuntime(() => transport.request("context-resolve", "/context", { cache: false }));
  const first = map.resolveMapPoint(center, "MAP_VIEWPORT");
  const observed = first.catch((error: unknown) => error);
  const second = map.resolveMapPoint(center, "MAP_VIEWPORT");
  const context = { contextId: "synthetic-new" };
  transport.calls[1]!.success({ statusCode: 200, data: { ...transport.response, data: context } });
  assert.equal(await second, context);
  assert.equal(await observed, null);
  transport.calls[0]!.success({ statusCode: 200, data: transport.response });
  assert.deepEqual(map.contexts, [context]);
  assert.deepEqual(map.notifications, []);
});

test("a superseded region callback does not publish a false failure notice", async () => {
  const transport = transportHarness();
  const map = mapRuntime(() => transport.request("context-resolve", "/context", { cache: false }));
  map.onRegionChange({ type: "end", causedBy: "drag", detail: { centerLocation: center, scale: 12 } });
  map.fireTimers();
  const current = map.resolveMapPoint(center, "MAP_VIEWPORT");
  transport.calls[1]!.success({ statusCode: 200, data: transport.response });
  await current;
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(map.notifications, []);
  assert.equal(map.contexts.length, 1);
  assert.equal(transport.requests.has("context-resolve"), false);
});

test("queued map-region event cannot restore a pre-reset viewport or request context", () => {
  const map = mapRuntime(Promise.resolve({ data: {} }));
  map.onRegionChange({ detail: { type: "end", causedBy: "drag", detail: { centerLocation: center, scale: 12 } } });
  map.reset();
  map.fireTimers();
  assert.equal(map.viewports.length, 0);
  assert.equal(map.calls, 0);
  assert.equal(map.notifications.length, 0);
});

test("native drag through the installed Taro event bridge updates viewport and context", () => {
  const map = mapRuntime(Promise.resolve({ data: {} }));
  const event = createEvent({ type: "end", causedBy: "drag", detail: { centerLocation: center, scale: 12 } } as never);
  map.onRegionChange(event);
  map.fireTimers();
  assert.equal(map.viewports.length, 1);
  assert.equal(map.calls, 1);
});

test("nested and direct detail gesture events retain the latest debounced center", () => {
  const map = mapRuntime(Promise.resolve({ data: {} }));
  map.onRegionChange({ detail: { type: "end", causedBy: "drag", detail: { centerLocation: center, scale: 11 } } });
  const latest = { latitude: 21, longitude: 111 };
  map.onRegionChange({ type: "regionchange", detail: { type: "end", causedBy: "scale", centerLocation: latest, scale: 13 } });
  map.fireTimers();
  assert.equal(map.viewports.length, 1);
  const viewport = map.viewports[0] as { center: Center; zoom: number; loadedViewport: string };
  assert.deepEqual(viewport.center, latest);
  assert.equal(viewport.zoom, 13);
  assert.match(viewport.loadedViewport, /^viewport:\d+$/);
  assert.equal(map.calls, 1);
});

test("programmatic and malformed events neither resolve a new context nor cancel a pending gesture", () => {
  const map = mapRuntime(Promise.resolve({ data: {} }));
  const invalid = [
    { type: "end", causedBy: "update", detail: { centerLocation: center, scale: 12 } },
    { type: "begin", causedBy: "gesture", detail: { centerLocation: center } },
    { type: "end", causedBy: "unknown", detail: { centerLocation: center } },
    { type: "end", causedBy: "drag", detail: { centerLocation: { latitude: NaN, longitude: 0 } } },
    { type: "end", causedBy: "drag", detail: { centerLocation: { latitude: 91, longitude: 0 } } },
    { type: "end", causedBy: "drag", detail: { centerLocation: center, scale: Infinity } },
    { detail: { type: "end", causedBy: "update", detail: { centerLocation: center } } },
  ];
  invalid.forEach((event) => map.onRegionChange(event));
  map.fireTimers();
  assert.equal(map.calls, 0);
  map.onRegionChange({ type: "end", causedBy: "drag", detail: { centerLocation: center } });
  invalid.forEach((event) => map.onRegionChange(event));
  map.fireTimers();
  assert.equal(map.calls, 1);
  assert.equal("zoom" in map.viewports[0]!, false);
});
