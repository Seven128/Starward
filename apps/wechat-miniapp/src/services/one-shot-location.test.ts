import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { requestOneShotLocation, type OneShotLocationResult } from "./one-shot-location";
import { enqueueNotification, selectNotification, type NotificationIntent, type NotificationRecord } from "../state/notification";

type Port = Parameters<typeof requestOneShotLocation>[0];
// Synthetic coordinates only; no device data is captured by these tests.
const center = { latitude: 20, longitude: 110 };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function platform(fix: () => Promise<unknown>, permission: () => Promise<unknown>): Port {
  return { getLocation: fix, getSetting: permission } as Port;
}

test("one-shot native location uses GCJ02 and returns only the validated center", async () => {
  const calls: unknown[] = [];
  const result = await requestOneShotLocation({
    getLocation: async (options: unknown) => { calls.push(options); return { ...center, accuracy: 10 }; },
    getSetting: async () => { throw new Error("must not query permission after success"); },
  } as unknown as Port);
  assert.deepEqual(result, { state: "GRANTED", center });
  assert.deepEqual(calls, [{ type: "gcj02", isHighAccuracy: false, highAccuracyExpireTime: 2500 }]);
});

test("native errors become denied only for an explicit Mini Program permission refusal", async () => {
  for (const permission of [false, true, undefined]) {
    const result = await requestOneShotLocation(platform(
      async () => { throw new Error("synthetic native failure"); },
      async () => ({ authSetting: { "scope.userLocation": permission } }),
    ));
    assert.deepEqual(result, { state: permission === false ? "DENIED" : "UNAVAILABLE" });
  }
  const result = await requestOneShotLocation(platform(
    async () => { throw new Error("synthetic native failure"); },
    async () => { throw new Error("synthetic setting failure"); },
  ));
  assert.deepEqual(result, { state: "UNAVAILABLE" });
});

test("invalid native coordinates cannot move the map or masquerade as permission refusal", async () => {
  for (const invalid of [
    { latitude: NaN, longitude: 0 }, { latitude: 0, longitude: Infinity },
    { latitude: 91, longitude: 0 }, { latitude: -91, longitude: 0 },
    { latitude: 0, longitude: 181 }, { latitude: 0, longitude: -181 },
  ]) {
    assert.deepEqual(await requestOneShotLocation(platform(
      async () => invalid, async () => { throw new Error("must not query permission"); },
    )), { state: "UNAVAILABLE" });
  }
});

function actualCallback(page: "map" | "auth", name: string, ports: object): () => Promise<void> {
  const source = ts.createSourceFile("page.tsx",
    readFileSync(new URL(`../pages/${page}/index.tsx`, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name)
      declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, 1);
  return vm.runInNewContext(ts.transpileModule(`${declarations[0]}\n${name};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, ports, { timeout: 1000 });
}

function mapHarness(native: Port, resolveContext: (point: unknown, source: string) => Promise<unknown>) {
  const states: string[] = [];
  const viewports: unknown[] = [];
  const busy: boolean[] = [];
  const announcements: string[] = [];
  let queue: NotificationRecord[] = [];
  let tick = 0;
  let mapResetVersion = 0;
  const notify = (intent: NotificationIntent) => { queue = enqueueNotification(queue, intent, ++tick); };
  const run = actualCallback("map", "locateMap", {
    Taro: native, requestOneShotLocation, locationRequestBusy: { current: false },
    useAppStore: { getState: () => ({ mapResetVersion }) },
    setLocationState: (state: string) => states.push(state),
    setLocationBusy: (value: boolean) => busy.push(value),
    setViewport: (viewport: unknown) => viewports.push(viewport),
    setAnnouncement: (message: string) => announcements.push(message),
    notify, resolveMapPoint: resolveContext, errorMessage: () => "暂时不可用",
  });
  return { run, states, viewports, busy, announcements, notify,
    reset: () => { mapResetVersion++; },
    get queue() { return queue; },
    visible: () => selectNotification(queue, "inline", "map"),
  };
}

test("actual Map failure keeps viewport/context untouched and presents the right recovery", async () => {
  for (const permission of [false, true, undefined]) {
    let contextCalls = 0;
    const map = mapHarness(platform(
      async () => { throw new Error("synthetic GPS failure"); },
      async () => ({ authSetting: { "scope.userLocation": permission } }),
    ), async () => { contextCalls++; });
    await map.run();
    assert.deepEqual(map.states, ["REQUESTING", permission === false ? "DENIED" : "UNAVAILABLE"]);
    assert.equal(contextCalls, 0);
    assert.equal(map.viewports.length, 0);
    assert.deepEqual(map.busy, [true, false]);
    assert.equal(map.visible().current?.title, permission === false ? "定位未授权" : "暂时无法获取位置");
    assert.equal(map.visible().current?.action?.route, "/pages/auth/index");
    assert.equal(map.visible().residualCount, 0);
  }
});

test("Map cannot announce context success when its location update was cancelled", async () => {
  const map = mapHarness(platform(async () => center, async () => ({})), async () => null);
  await map.run();
  assert.deepEqual(map.states, ["REQUESTING", "GRANTED"]);
  assert.deepEqual(map.busy, [true, false]);
  assert.equal(map.announcements.length, 0);
  assert.equal(map.visible().current?.tone, "info");
  assert.equal(map.visible().current?.title, "位置已获取，本次上下文更新已停止");
});

test("actual Map serializes repeat clicks through GPS and context, then permits retry", async () => {
  const fix = deferred<typeof center>();
  const contextEntered = deferred<void>();
  const context = deferred<void>();
  let nativeCalls = 0;
  const points: string[] = [];
  const map = mapHarness(platform(
    () => { nativeCalls++; return fix.promise; }, async () => ({}),
  ), async (point, source) => {
    points.push(JSON.stringify({ point, source })); contextEntered.resolve(); await context.promise;
  });
  const pending = map.run();
  assert.equal(map.visible().current?.title, "正在获取一次位置");
  await map.run();
  assert.equal(nativeCalls, 1);
  fix.resolve(center);
  await contextEntered.promise;
  assert.equal(JSON.stringify(map.viewports), JSON.stringify([{ center, zoom: 10 }]));
  assert.equal(points[0], JSON.stringify({ point: center, source: "USER_LOCATION" }));
  assert.equal(map.visible().current?.title, "已获取位置，正在更新观测上下文");
  assert.match(map.visible().current!.body, /尚未确认/);
  await map.run();
  assert.equal(nativeCalls, 1);
  assert.equal(map.busy.at(-1), true);
  context.resolve();
  await pending;
  assert.equal(map.visible().current?.title, "位置与观测上下文已更新");
  assert.match(map.visible().current!.body, /天气、天文以各自加载状态为准/);
  assert.equal(map.visible().residualCount, 0);
  assert.equal(map.announcements.length, 1);
  assert.deepEqual(map.busy, [true, false]);
  await map.run();
  assert.equal(nativeCalls, 2);
});

test("actual Map context failure preserves the acquired-location state without stale success", async () => {
  const map = mapHarness(platform(async () => center, async () => ({})),
    async () => { throw new Error("synthetic context failure"); });
  await map.run();
  assert.deepEqual(map.states, ["REQUESTING", "GRANTED"]);
  assert.equal(map.viewports.length, 1);
  assert.equal(map.announcements.length, 0);
  assert.equal(map.visible().current?.tone, "warning");
  assert.match(map.visible().current!.body, /旧观测上下文不能作为当前位置结果/);
  assert.equal(map.visible().residualCount, 0);
  assert.deepEqual(map.busy, [true, false]);
});

test("location recovery removes obsolete permission action without discarding another owner's error", async () => {
  let denied = true;
  const map = mapHarness(platform(
    async () => { if (denied) throw new Error("synthetic refusal"); return center; },
    async () => ({ authSetting: { "scope.userLocation": false } }),
  ), async () => {});
  map.notify({ owner: "settings", placement: "inline", tone: "error", title: "同步失败", body: "重试" });
  await map.run();
  assert.ok(map.visible().current?.action);
  denied = false;
  await map.run();
  assert.equal(map.visible().current?.action, undefined);
  assert.equal(map.visible().current?.tone, "success");
  assert.equal(map.queue.length, 2);
  assert.equal(selectNotification(map.queue, "inline", "settings").current?.title, "同步失败");
});

test("actual permission request distinguishes outcomes, never claims map update, and suppresses duplicate requests", async () => {
  for (const state of ["GRANTED", "DENIED", "UNAVAILABLE"] as const) {
    const pending = deferred<OneShotLocationResult>();
    const states: string[] = [];
    const feedback: string[] = [];
    let calls = 0;
    const run = actualCallback("auth", "requestOnce", {
      Taro: {}, locationRequestBusy: { current: false },
      requestOneShotLocation: () => { calls++; return pending.promise; },
      setLocationState: (value: string) => states.push(value),
      setFeedback: (value: string) => feedback.push(value),
      setBusy() {}, setFeedbackState() {},
    });
    const first = run();
    await run();
    assert.equal(calls, 1);
    pending.resolve(state === "GRANTED" ? { state, center } : { state });
    await first;
    assert.deepEqual(states, ["REQUESTING", state]);
    assert.match(feedback.at(-1)!, state === "GRANTED" ? /不会更新地图观测上下文/ : state === "DENIED" ? /权限未授予/ : /暂时无法取得位置/);
    await run();
    assert.equal(calls, 2);
  }
});

test("reset during GPS or context prevents late location state and feedback", async () => {
  for (const phase of ["GPS", "CONTEXT", "CONTEXT_ERROR"]) {
    const fix = deferred<typeof center>();
    const entered = deferred<void>();
    const context = deferred<void>();
    const map = mapHarness(platform(() => fix.promise, async () => ({})),
      async () => { entered.resolve(); await context.promise; });
    const pending = map.run();
    if (phase !== "GPS") { fix.resolve(center); await entered.promise; }
    const before = JSON.stringify({ states: map.states, queue: map.queue, viewports: map.viewports });
    map.reset();
    if (phase === "GPS") fix.resolve(center);
    else if (phase === "CONTEXT") context.resolve();
    else context.reject(new Error("synthetic late rejection"));
    await pending;
    assert.equal(JSON.stringify({ states: map.states, queue: map.queue, viewports: map.viewports }), before);
    assert.equal(map.announcements.length, 0);
    assert.equal(map.busy.at(-1), false);
  }
});

test("actual permission settings never invent a GPS fix or treat unknown as refusal", async () => {
  for (const permission of [true, false, undefined, "ERROR"]) {
    const pending = deferred<unknown>();
    const states: string[] = [], feedback: string[] = [], panels: string[] = [], busy: boolean[] = [];
    let queue: NotificationRecord[] = enqueueNotification([], { owner: "map", placement: "inline", tone: "warning", title: "old", body: "old", action: { label: "old" }, dedupeKey: "map-location-request" });
    let calls = 0;
    const run = actualCallback("auth", "openPermissions", {
      Taro: { openSetting: () => { calls++; return pending.promise; } },
      locationRequestBusy: { current: false }, setBusy: (value: boolean) => busy.push(value),
      setLocationState: (value: string) => states.push(value),
      setFeedback: (value: string) => feedback.push(value), setFeedbackState: (value: string) => panels.push(value),
      notify: (intent: NotificationIntent) => { queue = enqueueNotification(queue, intent); },
    });
    const first = run(); await run(); assert.equal(calls, 1);
    if (permission === "ERROR") pending.reject(new Error("synthetic settings failure"));
    else pending.resolve({ authSetting: { "scope.userLocation": permission } });
    await first;
    assert.deepEqual(states, permission === false ? ["DENIED"] : []);
    assert.equal(panels.at(-1), permission === false ? "PERMISSION_DENIED" : permission === "ERROR" ? "ERROR" : "INITIAL");
    assert.match(feedback.at(-1)!, permission === true ? /尚未获取位置/ : permission === false ? /未开启/ : permission === "ERROR" ? /请重试/ : /尚未取得/);
    assert.deepEqual(busy, [true, false]);
    if (typeof permission === "boolean") {
      assert.equal(queue.length, 1);
      assert.equal(queue[0]?.action, undefined);
      assert.equal(queue[0]?.title, permission ? "定位权限已开启" : "定位权限未开启");
    }
    await run(); assert.equal(calls, 2);
  }
});

test("actual default-region button resets before navigation and reports failed navigation", async () => {
  const events: string[] = [], feedback: string[] = [];
  const lock = { current: true };
  const run = actualCallback("auth", "useDefaultRegion", {
    locationRequestBusy: lock, setBusy() {}, setFeedbackState() {},
    resetMapToDefaultRegion: () => events.push("reset"),
    Taro: { switchTab: async (options: { url: string }) => { events.push(options.url); throw new Error("synthetic navigation failure"); } },
    setFeedback: (value: string) => feedback.push(value),
  });
  await run(); assert.equal(events.length, 0);
  lock.current = false;
  await run();
  assert.deepEqual(events, ["reset", "/pages/map/index"]);
  assert.match(feedback.at(-1)!, /默认试点区域已恢复，但地图暂时无法打开/);
  assert.equal(lock.current, false);
});
