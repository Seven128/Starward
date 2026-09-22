import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyContextSession } from "./sky-context-session.ts";
import type { ObservationContext } from "@starward/miniapp-contracts";

const source = ts.createSourceFile("sky.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
const statements = page.body!.statements;
const commands = statements.filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => ["commitIndex", "commitCivilDate"].includes(d.name.getText(source))));
const lookupEffect = statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(source) === "useEffect" && node.expression.arguments[0]?.getText(source).includes("contextLookup.data?.data"))!;
const compile = (text: string) => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const commandCode = compile(commands.map(node => node.getText(source)).join("\n") + "\n({commitIndex, commitCivilDate});");

const context = (id = "ctx:a", revision = 1) => ({ contextId: id as ObservationContext["contextId"], revision, contextFingerprint: `${id}:${revision}`, timezone: "Asia/Shanghai", selectedAtUtc: "2026-09-15T12:00:00Z" });
function harness(initial = context()) {
  let state = { observationContext: initial as ReturnType<typeof context> | null, selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 };
  const session = createSkyContextSession("ctx:a", () => state);
  const requests: { resolve: (value: { data: ReturnType<typeof context> }) => void; reject: (error: Error) => void }[] = [];
  const writes: unknown[] = [], notifications: unknown[] = [], saving: boolean[] = [];
  const sandbox = {
    alignmentMode: "auto",
    orientationController: { snapshot: () => ({ alignment: { mode: sandbox.alignmentMode } }) },
    activeContext: initial, timeSaving: false, reportData: { hourly: [{ at: "2026-09-15T13:00:00Z" }] },
    committedAt: initial.selectedAtUtc, selectedCivilDate: "2026-09-15", contextSession: session,
    clampIndex: () => 0, setTimeSaving: (value: boolean) => saving.push(value),
    setPreviewIndex: () => {}, setDatePickerOpen: () => {},
    setObservationContext: (value: ReturnType<typeof context>) => { writes.push(value); state = { ...state, observationContext: value }; },
    updateObservationContext: () => new Promise<{ data: ReturnType<typeof context> }>((resolve, reject) => requests.push({ resolve, reject })),
    instantForCivilDate: (localDate: string) => ({ localDate, selectedAt: "2026-09-16T12:00:00Z" }),
    notify: (value: unknown) => notifications.push(value), errorMessage: () => "request failed", isMiniappRequestCancelled: () => false,
  };
  const actions = vm.runInNewContext(commandCode, sandbox) as { commitIndex: (index: number) => Promise<void>; commitCivilDate: (date: string) => Promise<void> };
  return { session, sandbox, requests, writes, notifications, saving, actions,
    replace: () => { state = { ...state, observationContext: context("ctx:b"), selectedSpotId: "spot:b" }; },
    state: () => state,
  };
}

for (const command of ["time", "date"] as const) {
  const start = (h: ReturnType<typeof harness>) => command === "time" ? h.actions.commitIndex(0) : h.actions.commitCivilDate("2026-09-16");
  test(`${command}: late success cannot replace the newly selected place`, async () => {
    const h = harness(); const pending = start(h); h.replace();
    h.requests[0]!.resolve({ data: context("ctx:a", 2) }); await pending;
    assert.equal(h.state().observationContext?.contextId, "ctx:b");
    assert.equal(h.writes.length, 0);
  });
  test(`${command}: hidden page cannot publish success or late failure`, async () => {
    for (const failed of [false, true]) {
      const h = harness(); const pending = start(h); h.session.hide();
      if (failed) h.requests[0]!.reject(new Error("late")); else h.requests[0]!.resolve({ data: context("ctx:a", 2) });
      await pending; assert.equal(h.writes.length, 0); assert.equal(h.notifications.length, 0);
      assert.deepEqual(h.saving, [true], "old finally cannot reset a newer page operation");
    }
  });
  test(`${command}: current update can adopt a recovered Context ID`, async () => {
    const h = harness(); const pending = start(h);
    h.requests[0]!.resolve({ data: context("ctx:recovered", 2) }); await pending;
    assert.equal(h.state().observationContext?.contextId, "ctx:recovered");
    assert.equal(h.session.contextId, "ctx:recovered");
    assert.equal(h.session.canLookup(), false, "do not restore the obsolete route ID");
    assert.deepEqual(h.saving, [true, false]);
  });
}

test("time and date share a synchronous lock before React rerenders", async () => {
  const h = harness(); const first = h.actions.commitIndex(0); const second = h.actions.commitCivilDate("2026-09-16");
  assert.equal(h.requests.length, 1);
  h.requests[0]!.resolve({ data: context("ctx:a", 2) }); await Promise.all([first, second]);
});

test("the actual lookup effect cannot overwrite a newer place or run while hidden", () => {
  for (const changed of [true, false]) {
    let state = { observationContext: null as ReturnType<typeof context> | null, selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 };
    const session = createSkyContextSession("ctx:a", () => state);
    if (changed) state = { ...state, observationContext: context("ctx:b"), selectedSpotId: "spot:b" }; else session.hide();
    const writes: unknown[] = [];
    vm.runInNewContext(compile(lookupEffect.getText(source)), {
      contextSession: session, pageVisible: changed, storedContext: state.observationContext,
      contextLookup: { data: { data: context() } }, setObservationContext: (v: unknown) => writes.push(v),
      useEffect: (fn: () => void) => fn(),
    });
    assert.equal(writes.length, 0);
  }
});

test("entry lookup is accepted once and cannot downgrade an existing revision", () => {
  const empty = { observationContext: null, selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 };
  const session = createSkyContextSession("ctx:a", () => empty);
  assert.equal(session.acceptLookup(context("ctx:wrong")), false);
  assert.equal(session.acceptLookup(context()), true);
  assert.equal(session.canLookup(), false);
  const h = harness(context("ctx:a", 3)); const ticket = h.session.begin(h.state().observationContext!)!;
  assert.equal(h.session.accept(ticket, context("ctx:a", 2)), false);
});

test("hide cancels old requests but allows a fresh request after return", () => {
  const h = harness(); const old = h.session.begin(context())!;
  h.session.hide(); h.session.show(); const current = h.session.begin(context())!;
  assert.ok(current); assert.equal(h.session.accept(old, context("ctx:a", 2)), false);
  assert.equal(h.session.finish(old), false);
  assert.equal(h.session.accept(current, context("ctx:a", 2)), true);
  assert.equal(h.session.finish(current), true);
});

test("actual page lifecycle hooks cancel publishing and reset the visible saving state", () => {
  const hooks = statements.filter(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
    ["useDidHide", "useDidShow", "useEffect"].includes(node.expression.expression.getText(source)) &&
    node.expression.arguments[0]?.getText(source).includes("contextSession." ) &&
    !node.expression.arguments[0]?.getText(source).includes("contextLookup"));
  const h = harness(); let hide = () => {}, show = () => {}, dispose = () => {};
  const visible: boolean[] = [], saving: boolean[] = [];
  vm.runInNewContext(compile(hooks.map(node => node.getText(source)).join("\n")), {
    contextSession: h.session, setPageVisible: (value: boolean) => visible.push(value),
    setTimeSaving: (value: boolean) => saving.push(value), setPreviewIndex: () => {},
    useDidHide: (fn: () => void) => { hide = fn; }, useDidShow: (fn: () => void) => { show = fn; },
    useEffect: (fn: () => () => void) => { dispose = fn(); },
  });
  const old = h.session.begin(context())!; hide();
  assert.equal(h.session.isCurrent(old), false); assert.deepEqual(visible, [false]); assert.deepEqual(saving, [false]);
  show(); const next = h.session.begin(context())!; assert.ok(next); dispose();
  assert.equal(h.session.isCurrent(next), false);
});

test("the actual active Context and weather query follow a successful recovered ID", async () => {
  const h = harness(); const pending = h.actions.commitCivilDate("2026-09-16");
  const recovered = { ...context("ctx:recovered", 2), localDate: "2026-09-16", location: { kind: "FORMAL_SPOT", spotId: "spot:a" } };
  h.requests[0]!.resolve({ data: recovered }); await pending;
  const names = ["activeContext", "proposalRoute", "contextLocationMatches", "contextComplete", "report"];
  const declarations = statements.filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.includes(d.name.getText(source))));
  const requests: string[] = [];
  vm.runInNewContext(compile(declarations.map(node => node.getText(source)).join("\n")), {
    contextSession: h.session, storedContext: h.state().observationContext, contextLookup: { data: { data: context() } },
    routeContext: { contextId: "ctx:a", spotId: "spot:a", localDate: "2026-09-15", selectedAt: "2026-09-15T12:00:00Z", timezone: "Asia/Shanghai", dataRevision: "initial" },
    pageVisible: true, WEATHER_ALERT_REFRESH_MS: 300000,
    isDate: () => true, isSelectedAt: () => true, validTimezone: () => true, observationDateFor: () => "2026-09-15",
    getSkyReport: (_spot: string, id: string) => { requests.push(id); },
    useSkyForecastQuery: (options: { enabled: boolean; queryFn: () => void }) => { if (options.enabled) options.queryFn(); return {}; },
  });
  assert.deepEqual(requests, ["ctx:recovered"], "obsolete route/cache must neither block nor replace the new report query");
});

test("returning after a different place was selected cannot become a disabled-query loading screen", () => {
  const loading = statements.find(node => ts.isIfStatement(node) && node.expression.getText(source).includes("contextLookup.isPending")) as ts.IfStatement;
  const h = harness(); h.session.hide(); h.replace(); h.session.show();
  const actual = vm.runInNewContext(compile(loading.expression.getText(source)), {
    activeContext: null, contextLookup: { isPending: true }, pageVisible: true,
    contextSession: h.session, contextLookupEnabled: h.session.canLookup(),
  });
  assert.equal(actual, false, "the existing Context error/return action must remain reachable");
});

test("freeze rejects date and time commits synchronously before React catches up", async () => {
  const h = harness(); h.sandbox.alignmentMode = "editing";
  await h.actions.commitIndex(0); await h.actions.commitCivilDate("2026-09-16");
  assert.equal(h.requests.length, 0); assert.equal(h.writes.length, 0);
  assert.equal(h.session.busy, false);
});
