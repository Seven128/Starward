import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { skyGeometryWindow, type SkyReport } from "@starward/miniapp-contracts";
import { skyGeometryWindowKey, matchingSkyGeometryWindow } from "../../services/sky-geometry-window-response";
import { presentSkyTime, skyPresentationTimeModel, skyTimeRulerRows } from "./sky-time-presentation";
import { skyTimeTestFixture } from "./sky-time-test-support";
import { createSkyObservationTime } from "./sky-observation-time";
import { exactSkyTimeFrame } from "./sky-time-frame";
import * as timePresentationOwner from "./sky-time-presentation";
import { attachSkyCatalog } from "./sky-stellar-scene";
import { skyTimePreviewStatus } from "./sky-time-preview-status";

test("latest time demand, cancellation and window reuse share the existing query owner", () => {
  const { source, geometryWindow, prior } = skyTimeTestFixture();
  const slots: any[] = []; let cursor = 0, query: any;
  const cache = new Map<string, any>();
  const react = { useRef: (value: any) => slots[cursor++] ??= { current: value },
    useMemo: (make: () => any, deps: any[]) => {
      const index = cursor++, old = slots[index];
      if (!old || deps.some((value, i) => value !== old.deps[i])) slots[index] = { value: make(), deps };
      return slots[index].value;
    } };
  const exports: any = {};
  const bindings: Record<string, any> = { react, "@starward/miniapp-contracts": { skyGeometryWindow },
    "../../hooks/use-resource-query": { useResourceQuery: (options: any) => {
      query = options; return { data: cache.get(JSON.stringify(options.queryKey)), isError: false, refetch() {} };
    } }, "../../services/sky-celestial-client": { getSkyGeometryWindow() { throw new Error("no_external_network"); } },
    "../../services/sky-geometry-window-response": { skyGeometryWindowKey },
    "./sky-time-presentation": { skyPresentationTimeModel }, "./sky-time-frame": { exactSkyTimeFrame } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-sky-time-geometry.ts", import.meta.url), "utf8"),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
  { exports, require: (name: string) => { assert(name in bindings, name); return bindings[name]; } });
  const render = (at: string, active = true, report: SkyReport | undefined = source.data) => {
    cursor = 0; return exports.useSkyTimeGeometry(report, at, active);
  };
  const a = "2026-09-29T13:00:17.123Z", b = "2026-09-28T13:00:17.123Z";
  render(prior.data.selectedAtUtc); assert.equal(query.enabled, false);
  assert.equal(render(a).pending, true); const keyA = JSON.stringify(query.queryKey);
  assert.equal(render(b).pending, true); const keyB = JSON.stringify(query.queryKey);
  assert.notEqual(keyA, keyB);
  const observer = source.data.observationFrames![0]!.observer;
  matchingSkyGeometryWindow(geometryWindow, { spotId: source.data.context.spotId, contextId: prior.data.contextId,
    contextRevision: prior.data.revision, contextFingerprint: prior.data.contextFingerprint, at: a,
    timezone: prior.data.timezone, observer });
  cache.set(keyA, geometryWindow);
  const newest = render(b);
  assert.equal(newest.pending, true);
  assert.equal(presentSkyTime(source.data, b, newest.model), null, "late A never supplies newer B");
  const cancelled = render(prior.data.selectedAtUtc);
  assert.equal(query.enabled, false); assert.equal(cancelled.model, skyPresentationTimeModel(source.data));
  const admitted = render(a); assert.equal(admitted.pending, false);
  const current = presentSkyTime(source.data, a, admitted.model)!;
  assert.equal(current.row.at, a); assert.equal(current.weather, null); assert.equal(current.report.targetFrames.length, 0);
  assert.equal(skyTimeRulerRows(source.data, admitted.model).length, 49);
  assert(skyTimeRulerRows(source.data, admitted.model).every(row => !row.opportunityEligible), "a geometric ruler invents no advice");
  const time = createSkyObservationTime(); time.bind("current", prior.data.selectedAtUtc, admitted.model); time.preview(a);
  const next = "2026-09-29T13:00:18.123Z";
  time.play(0); assert.equal(time.tick(1000).at, next);
  const reused = render(next); assert.equal(query.enabled, false, "successive precise instants reuse one admitted model");
  assert.equal(reused.model, admitted.model);
  assert.equal(presentSkyTime(source.data, next, reused.model)!.row.at, next);
  time.cancel(); assert.equal(time.snapshot().at, prior.data.selectedAtUtc);
  render(b, false); assert.equal(query.enabled, false, "hide retires unsupplied demand");
  const replacement = { ...source.data, context: { ...source.data.context, contextRevision: source.data.context.contextRevision + 1 } };
  const invalidated = render(a, true, replacement);
  assert.equal(invalidated.pending, true); assert.equal(presentSkyTime(replacement, a, invalidated.model), null);
});

// Execute the real page selection and the real draw/resource input expressions.
// This covers their shared time meaning, not React, native pixels or latency.
function createPageTimePresentation() {
  const slots: { deps: readonly unknown[]; value: unknown }[] = [];
  return (input: Record<string, unknown>) => {
    let cursor = 0;
    return pageTimePresentation(input, (make, deps) => {
      const index = cursor++, old = slots[index];
      if (!old || deps.some((value, i) => value !== old.deps[i])) slots[index] = { deps, value: make() };
      return slots[index]!.value;
    });
  };
}

function pageTimePresentation(input: Record<string, unknown>, useMemo: (make: () => unknown, deps: readonly unknown[]) => unknown) {
  const source = ts.createSourceFile("sky.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
  const declarations = new Map<string, ts.VariableDeclaration>();
  for (const statement of page.body!.statements) if (ts.isVariableStatement(statement))
    for (const declaration of statement.declarationList.declarations) declarations.set(declaration.name.getText(source), declaration);
  const compile = (text: string) => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = vm.createContext({ ...timePresentationOwner, attachSkyCatalog, skyTimePreviewStatus,
    useMemo, fineTargetData: null, stellarCatalog: {},
    pageVisible: true, skyResourcesActive: true, mode: "NIGHT", canvasError: null,
    timeBinding: "current", skyInteractionRevision: 1, canvasNodeRevision: 1,
    canvasGenerationRef: { current: 1 }, timePlaying: false, timeIntent: { runStartAt: null },
    previewGeometry: { failed: false }, ...input });
  const names = ["timePresentationScope", "requestedTimePresentation", "acceptedTimePresentation", "timePresentation", "timeGeometryReady",
    "geometryReport", "renderTimePresentation", "reportData", "row", "timePreviewStatus"];
  vm.runInContext(compile(names.filter(name => declarations.has(name)).map(name =>
    `const ${declarations.get(name)!.getText(source)};`).join("\n")), context);
  const selection = vm.runInContext("({timePresentationScope,timePresentation,renderTimePresentation,timeGeometryReady,geometryReport,reportData,row,timePreviewStatus})", context);
  const draw = (declarations.get("draw")!.initializer as ts.CallExpression).arguments[0] as ts.ArrowFunction;
  const canvasData = (draw.body as ts.Block).statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations]).find(declaration => declaration.name.getText(source) === "canvasData");
  assert(canvasData);
  vm.runInContext(compile(`const ${canvasData.getText(source)};`), context);
  const requests: ts.CallExpression[] = [], resources: ts.CallExpression[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      if (node.expression.getText(source) === "canvasLifecycle.request") requests.push(node);
      if (["useSkyOpticalHips", "useSkyWideFieldW3", "useSkyBodyImages", "useSkyGalacticImage", "useSkyStellarSupplement"].includes(node.expression.getText(source))) resources.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(page); assert.equal(requests.length, 1); assert.equal(resources.length, 5);
  const frame = requests[0]!.arguments[0] as ts.ObjectLiteralExpression;
  const drawInput = Object.fromEntries(["data", "frameAt", "timePresentation", "timePresentationScope"].map(name => {
    const property = frame.properties.find(property => property.name?.getText(source) === name);
    const expression = property && (ts.isShorthandPropertyAssignment(property) ? property.name
      : ts.isPropertyAssignment(property) ? property.initializer : undefined);
    return [name, expression ? vm.runInContext(compile(expression.getText(source)), context) : undefined];
  }));
  const resourceInputs = resources.map(call => ({ name: call.expression.getText(source),
    report: vm.runInContext(compile(call.arguments[0]!.getText(source)), context),
    at: vm.runInContext(compile(call.arguments[1]!.getText(source)), context) }));
  return { ...selection, drawInput, resourceInputs };
}

function acceptedTimeFrame(result: ReturnType<typeof pageTimePresentation>) {
  return { data: result.reportData, frameAt: result.row.at, mode: "NIGHT", nativeCanvasGeneration: 1,
    timePresentation: result.drawInput.timePresentation, timePresentationScope: result.drawInput.timePresentationScope };
}

test("cross-window pending and failure preserve the accepted daytime in draw and every timed resource consumer", () => {
  const { source, prior } = skyTimeTestFixture();
  const committedAt = prior.data.selectedAtUtc, acceptedAt = "2026-10-01T02:00:17.123Z", requestedAt = "2026-09-30T02:00:17.123Z";
  const model = skyPresentationTimeModel(source.data), accepted = presentSkyTime(source.data, acceptedAt, model)!;
  assert(accepted && accepted.row.sunAltitudeDeg! > 0);
  assert(presentSkyTime(source.data, committedAt)!.row.sunAltitudeDeg! < 0);
  assert.equal(presentSkyTime(source.data, requestedAt, model), null);
  const render = createPageTimePresentation();
  const base = { rawReportData: source.data, committedAt, timeModel: model, timeGeometrySources: undefined,
    report: { isError: false, data: source }, acceptedClockAt: acceptedAt };
  const frame = acceptedTimeFrame(render({ ...base, requestedAt: acceptedAt, presentedSkyFrame: null }));
  for (const failed of [false, true]) {
    const result = render({ ...base, requestedAt, presentedSkyFrame: frame, previewGeometry: { failed } });
    assert.equal(result.row.at, acceptedAt, "a pending earlier day must not flash back to the committed night");
    assert.equal(result.timeGeometryReady, false, "retained output is not newly supplied target geometry");
    assert.equal(result.timePreviewStatus.ready, false);
    assert.equal(result.timePreviewStatus.failed, failed);
    assert.equal(result.timePreviewStatus.pending, !failed);
    assert.equal(result.timePreviewStatus.presentedAt, acceptedAt);
    assert.equal(result.drawInput.frameAt, acceptedAt);
    assert.strictEqual(result.drawInput.data, result.reportData);
    assert.strictEqual(result.drawInput.timePresentation, result.renderTimePresentation, "only this matching input can travel through native acceptance");
    for (const resource of result.resourceInputs) {
      assert.equal(resource.at, acceptedAt, resource.name);
      assert.strictEqual(resource.report, resource.name === "useSkyStellarSupplement" ? result.reportData.skyScene : result.geometryReport, resource.name);
    }
  }
});

test("pending time retains independently supplied targets from the accepted shared input", () => {
  const { source, prior } = skyTimeTestFixture();
  const committedAt = prior.data.selectedAtUtc, acceptedAt = "2026-09-30T14:15:17.123Z", requestedAt = "2026-09-30T02:00:17.123Z";
  const model = skyPresentationTimeModel(source.data), targets = [{ targetId: "accepted-target-fixture" }];
  const render = createPageTimePresentation();
  const base = { rawReportData: source.data, committedAt, timeModel: model, timeGeometrySources: undefined,
    report: { isError: false, data: source }, acceptedClockAt: acceptedAt };
  const ready = render({ ...base, requestedAt: acceptedAt, presentedSkyFrame: null,
    fineTargetData: { at: acceptedAt, targets } });
  const accepted = ready.drawInput.timePresentation;
  assert.strictEqual(accepted.report.targets, targets);
  const pending = render({ ...base, requestedAt, presentedSkyFrame: acceptedTimeFrame(ready) });
  assert.equal(pending.row.at, acceptedAt);
  assert.strictEqual(pending.geometryReport.targets, targets, "pending demand must not discard independently valid accepted target supply");
  assert.strictEqual(pending.drawInput.timePresentation, accepted);
});

test("the supplied window takes over only the latest request; cancellation wins over its late result", () => {
  const { source, prior, geometryWindow } = skyTimeTestFixture();
  const committedAt = prior.data.selectedAtUtc, acceptedAt = "2026-10-01T02:00:17.123Z", target = "2026-09-30T02:00:17.123Z";
  const original = skyPresentationTimeModel(source.data), render = createPageTimePresentation();
  const time = createSkyObservationTime(); time.bind("current", committedAt, original); time.preview(target);
  const base = { rawReportData: source.data, committedAt, timeGeometrySources: geometryWindow.sources,
    report: { isError: false, data: source }, acceptedClockAt: acceptedAt };
  const earlierFrame = acceptedTimeFrame(render({ ...base, requestedAt: acceptedAt, timeModel: original, presentedSkyFrame: null }));
  const supplied = render({ ...base, requestedAt: time.snapshot().at, timeModel: geometryWindow.data.model, presentedSkyFrame: earlierFrame });
  assert.equal(supplied.row.at, target); assert.equal(supplied.timeGeometryReady, true);
  assert.equal(supplied.drawInput.frameAt, target);
  assert(supplied.resourceInputs.every((value: { at: string }) => value.at === target));
  assert.equal(supplied.timePreviewStatus.ready, false, "arrival is not native acceptance");
  assert.equal(supplied.timePreviewStatus.presentedAt, acceptedAt);
  assert.strictEqual(supplied.timePresentation.model, geometryWindow.data.model);
  assert(supplied.geometryReport.sources.some((value: { id: string }) => value.id === geometryWindow.sources[0]!.id));
  const frame = acceptedTimeFrame(supplied);
  const painted = render({ ...base, requestedAt: target, timeModel: geometryWindow.data.model,
    presentedSkyFrame: frame, acceptedClockAt: target });
  assert.equal(painted.timePreviewStatus.ready, true);
  time.cancel();
  for (const model of [original, geometryWindow.data.model]) {
    const cancelled = render({ ...base, requestedAt: time.snapshot().at, timeModel: model,
      presentedSkyFrame: frame, acceptedClockAt: target });
    assert.equal(cancelled.row.at, committedAt, "a late cross-date supply cannot restore the cancelled preview");
    assert.equal(cancelled.drawInput.frameAt, committedAt);
    assert(cancelled.resourceInputs.every((value: { at: string }) => value.at === committedAt));
  }
  assert.equal(time.snapshot().at, committedAt, "presentation and provider results never write the observation-time owner");
});

test("report replacement, native retirement, mode changes and hidden or failed surfaces cannot reuse an accepted input", () => {
  const { source, prior } = skyTimeTestFixture();
  const committedAt = prior.data.selectedAtUtc, acceptedAt = "2026-10-01T02:00:17.123Z", requestedAt = "2026-09-30T02:00:17.123Z";
  const model = skyPresentationTimeModel(source.data);
  const base = { rawReportData: source.data, requestedAt, committedAt, timeModel: model,
    timeGeometrySources: undefined, report: { isError: false, data: source }, acceptedClockAt: undefined };
  const invalidations = (frame: ReturnType<typeof acceptedTimeFrame>) => [
    { rawReportData: { ...source.data } }, { presentedSkyFrame: { ...frame, nativeCanvasGeneration: 0 } },
    { mode: "OBSERVATION" }, { pageVisible: false }, { canvasError: "sky_canvas_native_error" },
    { skyResourcesActive: false }, { presentedSkyFrame: null }, { presentedSkyFrame: { ...frame, frameAt: committedAt } },
  ];
  for (let i = 0; i < 8; i++) {
    const render = createPageTimePresentation();
    const frame = acceptedTimeFrame(render({ ...base, requestedAt: acceptedAt, presentedSkyFrame: null }));
    const invalidation = invalidations(frame)[i]!;
    const result = render({ ...base, presentedSkyFrame: frame, ...invalidation });
    assert.equal(result.row.at, committedAt, JSON.stringify(Object.keys(invalidation)));
    assert.equal(result.timeGeometryReady, false);
  }
});

test("returning to earlier report, Context, mode or native values cannot revive an invalidated accepted input", () => {
  const { source, prior } = skyTimeTestFixture();
  const committedAt = prior.data.selectedAtUtc, acceptedAt = "2026-10-01T02:00:17.123Z", requestedAt = "2026-09-30T02:00:17.123Z";
  const base = { rawReportData: source.data, requestedAt, committedAt, timeModel: skyPresentationTimeModel(source.data),
    timeGeometrySources: undefined, report: { isError: false, data: source }, acceptedClockAt: undefined };
  for (const invalidation of [{ rawReportData: { ...source.data } }, { timeBinding: "replacement-context" },
    { mode: "OBSERVATION" }, { canvasNodeRevision: 2, canvasGenerationRef: { current: 2 } }, { pageVisible: false }]) {
    const render = createPageTimePresentation();
    const frame = acceptedTimeFrame(render({ ...base, requestedAt: acceptedAt, presentedSkyFrame: null }));
    assert.equal(render({ ...base, presentedSkyFrame: frame }).row.at, acceptedAt);
    render({ ...base, presentedSkyFrame: frame, ...invalidation });
    const returned = render({ ...base, presentedSkyFrame: frame });
    assert.equal(returned.row.at, committedAt, JSON.stringify(Object.keys(invalidation)));
    assert.notStrictEqual(returned.timePresentationScope, frame.timePresentationScope);
  }
});
