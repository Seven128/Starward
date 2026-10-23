import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { MutationCache, QueryCache, QueryClient, QueryObserver } from "@tanstack/react-query";
import { createSkyObservationTime } from "./sky-observation-time";
import { skyTargetInstantQueryKey } from "../../services/sky-target-instant-response";
import { MiniappRequestCancelled, isMiniappRequestCancelled } from "../../services/request-lifecycle";
import { harness, controls } from "./sky-overlay-test-support";
import { skyTimeInputAllowed } from "./sky-time-input";

function moduleValue(file: string, dependencies: Record<string, unknown>) {
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: (name: string) => { assert(name in dependencies, name); return dependencies[name]; } });
  return exports;
}

function queryHarness(request: (binding: any, signal?: AbortSignal) => Promise<any>, sharedClient?: QueryClient) {
  const client: QueryClient = sharedClient ?? moduleValue("../../services/query-client.ts", {
    "@tanstack/react-query": { MutationCache, QueryCache, QueryClient },
    "./platform-polyfills": { installAbortControllerPolyfill() {} },
    "./request-lifecycle": { isMiniappRequestCancelled }, "./runtime-error": { reportRuntimeError() {} },
  }).miniappQueryClient;
  let options: any, observer: QueryObserver<any> | undefined, unsubscribe: (() => void) | undefined;
  const useResourceQuery = moduleValue("../../hooks/use-resource-query.ts", {
    "@tanstack/react-query": { useQueryClient: () => client, useQuery: (value: any) => {
      options = client.defaultQueryOptions({ ...value, _optimisticResults: "optimistic" });
      observer ??= new QueryObserver(client, options);
      return observer.getOptimisticResult(options);
    } }, react: { useEffect() {} }, "@/services/acceptance-diagnostics": { recordAcceptanceDiagnostic() {} },
  }).useResourceQuery;
  let ref: { current: unknown } | undefined;
  const useSkyTimeTargetQuery = moduleValue("./sky-time-target-query.ts", {
    react: { useRef: (value: unknown) => ref ??= { current: value } },
    "../../hooks/use-resource-query": { useResourceQuery },
    "../../services/sky-celestial-client": { getSkyTargetInstant: request },
    "../../services/sky-target-instant-response": { skyTargetInstantQueryKey },
    "../../services/request-lifecycle": { MiniappRequestCancelled },
  }).useSkyTimeTargetQuery;
  const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(["fineTargetBinding", "fineTarget"]), statements: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.has(d.name.getText(source))))
      statements.push(node.getText(source));
    ts.forEachChild(node, visit);
  }; visit(source); assert.equal(statements.length, 2);
  const build = vm.runInNewContext(ts.transpileModule(`(input => { const { timeGeometryReady, timePresentation, carriedReport,
    timePlaying, timeScrubbing, rawReportData, activeContext, requestedAt, pageVisible, skyResourcesActive,
    observationTime, skyTimeIntentCurrent } = input;
    ${statements.join("\n")} return fineTarget; });`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
  { useResourceQuery, useSkyTimeTargetQuery, skyTargetInstantQueryKey, getSkyTargetInstant: request });
  return { client, render: build, renderTarget: useSkyTimeTargetQuery,
    commit() { observer!.setOptions(options); unsubscribe ??= observer!.subscribe(() => {}); },
    detach() { unsubscribe?.(); unsubscribe = undefined; observer = undefined; },
    close() { unsubscribe?.(); if (!sharedClient) client.clear(); },
    get options() { return options; }, get result() { return observer?.getCurrentResult(); } };
}

const at = "2026-10-16T12:00:00.123Z";
const context = { spotId: "spot:time", contextId: "ctx:time", contextRevision: 1, contextFingerprint: "fp:time", dataRevision: "data:1" };
const waitQuery = () => new Promise<void>(resolve => setImmediate(resolve));

/** Exercise the page's actual field callbacks with the original controls and
 * observation-time owner, including a new render before an old timer fires. */
function pageFieldCallbacks(time: ReturnType<typeof createSkyObservationTime>, permitted: () => boolean,
  previews: string[]) {
  const ast = ts.createSourceFile("page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let command = "";
  const callbacks: Record<string, string> = {};
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "setSkyTimeEditing") command = node.initializer!.getText(ast);
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "SkyTimeControls") {
      for (const attribute of node.attributes.properties) if (ts.isJsxAttribute(attribute) &&
        ["current", "editingCurrent", "editingGeneration", "onEditChange", "onPreview"].includes(attribute.name.getText(ast)) &&
        attribute.initializer && ts.isJsxExpression(attribute.initializer))
        callbacks[attribute.name.getText(ast)] = attribute.initializer.expression!.getText(ast);
    }
    ts.forEachChild(node, visit);
  }; visit(ast);
  assert.ok(command && callbacks.current && callbacks.editingCurrent && callbacks.editingGeneration && callbacks.onEditChange && callbacks.onPreview);
  const expected = time.snapshot(), owns = () => time.snapshot().binding === expected.binding &&
    time.snapshot().committedAt === expected.committedAt;
  const result = vm.runInNewContext(ts.transpileModule(`const setSkyTimeEditing = ${command};
    ({ current: ${callbacks.current}, editingCurrent: ${callbacks.editingCurrent}, editingGeneration: ${callbacks.editingGeneration},
      onEditChange: ${callbacks.onEditChange}, onPreview: ${callbacks.onPreview} });`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    observationTime: time, timeIntent: expected, skyControlPanelRef: { current: "time" },
    skyTimeIntentCurrent: () => permitted() && owns(), skyTimeIntentRetirable: owns,
    setTimeIntent: (value: ReturnType<typeof time.snapshot>) => assert.equal(value, time.snapshot()),
    cancelSkyCalibration() {}, skyTimeInputAllowed,
  });
  return { ...result, onPreview: (value: string) => {
    const accepted: boolean = result.onPreview(value); if (accepted) previews.push(value); return accepted;
  } };
}

test("the public page wires ruler and civil controls into the existing time owner with its Context fences", () => {
  const ast = ts.createSourceFile("page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let command = "", scrubbing = "";
  const callbacks: Record<string, string> = {};
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "setSkyTimeEditing") command = node.initializer!.getText(ast);
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "timeScrubbing") scrubbing = node.initializer!.getText(ast);
    if (ts.isJsxSelfClosingElement(node)) for (const attribute of node.attributes.properties) {
      if (ts.isJsxAttribute(attribute) && ["onEditChange", "onScrubChange"].includes(attribute.name.getText(ast)) &&
        attribute.initializer && ts.isJsxExpression(attribute.initializer)) callbacks[node.tagName.getText(ast)] = attribute.initializer.expression!.getText(ast);
    }
    ts.forEachChild(node, visit);
  }; visit(ast);
  assert.ok(command && scrubbing && callbacks.SkyTimeControls && callbacks.OrientationTimeRuler);
  const time = createSkyObservationTime(); time.bind("current", at, null);
  let current = true, retirable = true;
  const read = vm.runInNewContext(ts.transpileModule(`const setSkyTimeEditing = ${command};
    ({ fields: ${callbacks.SkyTimeControls}, ruler: ${callbacks.OrientationTimeRuler},
      active: () => { const timeIntent = observationTime.snapshot(); return ${scrubbing}; } });`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    observationTime: time, timeIntent: time.snapshot(), setTimeIntent: (value: unknown) => assert.equal(value, time.snapshot()),
    skyTimeIntentCurrent: () => current, skyTimeIntentRetirable: () => retirable,
  });
  read.fields(true); assert.equal(read.active(), true); read.ruler(true); read.fields(false);
  assert.deepEqual(time.snapshot().editing, ["ruler"]);
  current = false; read.fields(true); assert.deepEqual(time.snapshot().editing, ["ruler"]);
  read.ruler(false); assert.equal(read.active(), false, "the retiring control can finish after losing activation");
  time.bind("replacement", at, null); time.edit("fields", true); retirable = false;
  read.fields(false); assert.deepEqual(time.snapshot().editing, ["fields"], "an obsolete control cannot settle a replacement Context");
  time.bind("current", at, null); time.edit("fields", true); current = retirable = true;
  read.fields(false); assert.deepEqual(time.snapshot().editing, ["fields"], "returning to equal values cannot grant old cleanup the new edit");
});

test("all held-arrow stop paths release continuous editing and ordinary click stays a single preview", () => {
  const cases = ["release", "cancel", "outside", "hide", "close", "invalidated", "unmount"] as const;
  for (const reason of cases) {
    const ui = harness("SkyTimeControls"), edits: boolean[] = [], previews: string[] = [];
    let current = true;
    const props = { at, timezone: "UTC", active: true, playing: false, canPlay: true, current: () => current,
      editingCurrent: () => current, editingGeneration: 0,
      onPreview: (value: string) => { previews.push(value); return true; }, onEditChange: (active: boolean) => edits.push(active),
      onPause() {}, onApply() {}, onTogglePlay() {} };
    const tree = ui.render(props), arrow = controls(tree).find(node => node.props?.ariaLabel === "增加秒")!;
    arrow.props.onTouchStart(); ui.tick(); assert.deepEqual(edits, [true]);
    if (reason === "release") arrow.props.onTouchEnd();
    if (reason === "cancel") arrow.props.onTouchCancel();
    if (reason === "outside") arrow.props.onTouchMove({ touches: [{ clientX: 45, clientY: 20 }] });
    if (reason === "hide") ui.hide();
    if (reason === "close") ui.render({ ...props, active: false });
    if (reason === "invalidated") { current = false; ui.advance(380); }
    if (reason === "unmount") ui.unmount();
    assert.deepEqual(edits, [true, false], reason); assert.equal(ui.timers, 0, reason);
    const count = previews.length; ui.advance(1000); assert.equal(previews.length, count, reason);
    ui.unmount();
  }
  const ui = harness("SkyTimeControls"), previews: string[] = [], edits: boolean[] = [];
  const tree = ui.render({ at, timezone: "UTC", active: true, playing: false, canPlay: true, current: () => true,
    editingCurrent: () => true, editingGeneration: 0,
    onPreview: (value: string) => { previews.push(value); return true; }, onEditChange: (active: boolean) => edits.push(active),
    onPause() {}, onApply() {}, onTogglePlay() {} });
  controls(tree).find(node => node.props?.ariaLabel === "增加秒")!.props.onClick();
  assert.deepEqual(previews, ["2026-10-16T12:00:01.123Z"]); assert.deepEqual(edits, []); ui.unmount();
});

test("a held field cannot adopt replacement Context callbacks or revive after A to B to A", () => {
  for (const reason of ["replacement", "same-values-return", "unrendered-same-values-return", "cancel", "hide", "permission"] as const) {
    const ui = harness("SkyTimeControls"), time = createSkyObservationTime(), previews: string[] = [];
    let permitted = true;
    time.bind("context:original", at, null);
    const render = () => ui.render({ at: time.snapshot().at, timezone: "UTC", active: true, playing: false, canPlay: false,
      ...pageFieldCallbacks(time, () => permitted, previews), onPause: time.pause, onApply() {}, onTogglePlay() {} });
    try {
      const arrow = controls(render()).find(node => node.props?.ariaLabel === "增加秒")!;
      arrow.props.onTouchStart(); ui.tick();
      assert.equal(time.snapshot().at, "2026-10-16T12:00:01.123Z");
      assert.deepEqual(time.snapshot().editing, ["fields"]);
      if (reason === "replacement" || reason === "same-values-return" || reason === "unrendered-same-values-return")
        time.bind("context:replacement", "2026-10-16T12:00:20.123Z", null);
      if (reason === "same-values-return" || reason === "unrendered-same-values-return") time.bind("context:original", at, null);
      if (reason === "cancel") time.cancel();
      if (reason === "hide") time.hide(0);
      if (reason === "permission") permitted = false;
      const afterRetirement = time.snapshot().at, count = previews.length;
      // Cover both the reported replacement-render ordering and a queued tick
      // before React observes an A-to-B-to-A replacement.
      if (reason !== "unrendered-same-values-return") render();
      ui.advance(380);
      assert.equal(time.snapshot().at, afterRetirement, reason);
      assert.equal(previews.length, count, `${reason}: no input means no additional preview`);
      assert.deepEqual(time.snapshot().editing, [], reason);
      assert.equal(ui.timers, 0, reason);
      permitted = true; render(); ui.advance(1000);
      assert.equal(time.snapshot().at, afterRetirement, `${reason}: restored eligibility cannot revive the hold`);
      const freshArrow = controls(render()).find(node => node.props?.ariaLabel === "增加秒")!;
      freshArrow.props.onTouchStart();
      assert.equal(time.snapshot().at, new Date(Date.parse(afterRetirement) + 1000).toISOString(),
        `${reason}: a genuinely new touch can still preview`);
      assert.deepEqual(time.snapshot().editing, ["fields"]);
      freshArrow.props.onTouchCancel(); assert.deepEqual(time.snapshot().editing, []); assert.equal(ui.timers, 0);
    } finally { ui.unmount(); }
  }
});

test("six-field hold previews every exact instant but settles one target query at release", async () => {
  const ui = harness("SkyTimeControls"), time = createSkyObservationTime(), requests: string[] = [], previews: string[] = [];
  time.bind("ctx:time:1:fp:time", at, { startAt: "2026-10-16T00:00:00.000Z", endAt: "2026-10-17T00:00:00.000Z" });
  const query = queryHarness(async binding => { requests.push(binding.at); return { data: { ...binding,
    targets: [{ targetId: "target:actual", displayName: `精确目标 ${binding.at}` }] } }; });
  const renderQuery = () => { query.render({ timeGeometryReady: true, timePresentation: { mode: "MODEL" },
    carriedReport: false, timePlaying: false, timeScrubbing: time.snapshot().editing.length > 0, rawReportData: { context },
    activeContext: { nightStartUtc: "2026-10-16T00:00:00.000Z", nightEndUtc: "2026-10-17T00:00:00.000Z" },
    requestedAt: time.snapshot().at, pageVisible: true, skyResourcesActive: true,
    observationTime: time, skyTimeIntentCurrent: () => true }); query.commit(); };
  const renderControls = () => ui.render({ at: time.snapshot().at, timezone: "UTC", active: true, playing: false, canPlay: true,
    ...pageFieldCallbacks(time, () => true, previews), onPause: time.pause, onApply() {},
    onTogglePlay: () => time.snapshot().mode === "PLAYING" ? time.pause() : time.play(0) });
  try {
    renderQuery(); await waitQuery(); requests.length = 0;
    let tree = renderControls();
    const up = controls(tree).find(node => node.props?.ariaLabel === "增加秒")!;
    up.props.onTouchStart(); ui.tick(); tree = renderControls(); renderQuery(); await waitQuery();
    for (let i = 0; i < 4; i++) {
      ui.advance(i === 0 ? 380 : 70); tree = renderControls(); renderQuery(); await waitQuery();
    }
    assert.equal(previews.length, 5, "suppression cannot remove any supported exact preview");
    assert.deepEqual(requests, [], "intermediate held steps are not settled target demand");
    up.props.onTouchEnd(); up.props.onClick(); renderQuery(); await waitQuery();
    assert.deepEqual(requests, [previews.at(-1)]);
    assert.equal(query.result?.data?.data.targets[0].displayName, `精确目标 ${previews.at(-1)}`,
      "a reduced count must still return new final target data");
    const play = controls(renderControls()).find(node => node.props?.ariaLabel === "1倍播放")!;
    play.props.onClick(); assert.equal(time.snapshot().mode, "PLAYING");
    play.props.onClick(); assert.equal(time.snapshot().mode, "PAUSED",
      "retiring the edit lease cannot block a second playback tap before React renders");
  } finally { ui.unmount(); query.close(); }
});

test("page and actual Sources options reuse the same result, expire inactive instants and reopen with fresh exact data", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.parse(at) });
  const requested: string[] = [], binding = { ...context, at };
  const request = async (value: any) => { requested.push(value.at); return { data: { ...value,
    targets: [{ targetId: "target:actual", source: { id: "source:actual" }, displayName: `取得 ${requested.length}` }] } }; };
  const page = queryHarness(request), source = queryHarness(request, page.client);
  const ast = ts.createSourceFile("target-sources.tsx", readFileSync(new URL("../../sky/sources/target-sources.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "result") expression = node.initializer!.getText(ast);
    ts.forEachChild(node, visit);
  }; visit(ast); assert.ok(expression);
  const read = vm.runInNewContext(`input => { const { selection, visible, valid, visibleRef, useAppStore,
    skyTargetSourceContextMatches } = input; return ${expression}; }`, { useSkyTimeTargetQuery: source.renderTarget });
  const openSource = () => { read({ selection: { ...binding, dataRevision: context.dataRevision }, visible: true, valid: true,
    visibleRef: { current: true }, useAppStore: { getState: () => ({ observationContext: context }) },
    skyTargetSourceContextMatches: () => true }); source.commit(); };
  try {
    page.renderTarget(binding, context.dataRevision, true, () => true); page.commit(); await waitQuery();
    page.detach(); t.mock.timers.tick(30_000); openSource(); await waitQuery();
    assert.deepEqual(requested, [at], "a same-source navigation gap within freshness reuses the full result");
    assert.equal(source.result?.data.data.targets[0].displayName, "取得 1");
    const key = skyTargetInstantQueryKey(binding, context.dataRevision), cached = page.client.getQueryCache().find({ queryKey: key })!;
    assert.equal(cached.gcTime, 60_000, "Sources must not raise the shared query back to global 30 minutes");
    t.mock.timers.tick(90_000);
    assert.ok(page.client.getQueryData(key), "reading an open source page owns its result beyond the inactive limit");
    source.detach(); t.mock.timers.tick(59_999); assert.ok(page.client.getQueryData(key));
    t.mock.timers.tick(1); assert.equal(page.client.getQueryData(key), undefined);
    openSource(); await waitQuery();
    assert.deepEqual(requested, [at, at]); assert.equal(source.result?.data.data.targets[0].displayName, "取得 2");
  } finally { source.close(); page.close(); t.mock.timers.reset(); }
});

test("queued old intent, permission loss and A to B to A cannot dispatch an obsolete target", async () => {
  let current = at, allowed = true;
  const requested: string[] = [], query = queryHarness(async binding => { requested.push(binding.at); return { data: binding }; });
  const render = (value: string) => query.renderTarget({ ...context, at: value }, context.dataRevision, true,
    () => allowed && current === value);
  try {
    render(at); current = "2026-10-16T12:00:02.123Z"; query.commit();
    assert.deepEqual(requested, []);
    current = at; render(at); query.commit(); await waitQuery(); assert.deepEqual(requested, [at]);
    current = "2026-10-16T12:00:03.123Z"; const old = render(current); allowed = false; query.commit();
    await old.refetch(); assert.deepEqual(requested, [at], "manual retry must use the same live validity check");
    query.renderTarget(null, undefined, false, () => false); query.commit();
    assert.equal(query.result?.data, undefined, "invalid or hidden owners release the preceding result");
  } finally { query.close(); }
});

test("shared in-flight Sources work survives page retirement; final owner cancellation rejects its late completion", async () => {
  const pending: { signal: AbortSignal | undefined; complete: (value: any) => void }[] = [], binding = { ...context, at };
  const request = (_binding: any, signal?: AbortSignal) => new Promise(resolve => pending.push({ signal, complete: resolve }));
  const page = queryHarness(request), source = queryHarness(request, page.client);
  let pageCurrent = true;
  try {
    page.renderTarget(binding, context.dataRevision, true, () => pageCurrent); page.commit();
    source.renderTarget(binding, context.dataRevision, true, () => true); source.commit();
    assert.equal(pending.length, 1);
    pageCurrent = false; page.renderTarget(null, undefined, false, () => false); page.commit();
    assert.equal(pending[0]!.signal?.aborted, false, "the joined Sources owner still needs this exact request");
    pending[0]!.complete({ data: { ...binding, targets: [{ targetId: "source-final" }] } }); await waitQuery();
    assert.equal(source.result?.data.data.targets[0].targetId, "source-final");
    const next = { ...binding, at: "2026-10-16T12:00:07.123Z" };
    source.renderTarget(next, context.dataRevision, true, () => true); source.commit();
    source.renderTarget(null, undefined, false, () => false); source.commit();
    assert.equal(pending[1]!.signal?.aborted, true);
    pending[1]!.complete({ data: { ...next, targets: [{ targetId: "obsolete" }] } }); await waitQuery();
    assert.equal(source.result?.data, undefined);
    assert.equal(page.client.getQueryData(skyTargetInstantQueryKey(next, context.dataRevision)), undefined);
  } finally { source.close(); page.close(); }
});
