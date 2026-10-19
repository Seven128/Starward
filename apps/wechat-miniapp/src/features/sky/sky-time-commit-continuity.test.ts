import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import type { ApiEnvelope, ObservationContext, SkyReport } from "@starward/miniapp-contracts";
import { observationNightBounds } from "@starward/miniapp-contracts";
import { createSkyTimeCommitContinuity, skyReportMatchesContext } from "./sky-time-commit-continuity";
import { presentSkyTime, selectSkyTimePresentation, skyPresentationTimeModel } from "./sky-time-presentation";
import { attachSkyCatalog } from "./sky-stellar-scene";
import { confirmedObservationContextEdit, type ConfirmedObservationContextReply } from "../../services/observation-context-recovery";
import { skyForecastPresentation } from "../../services/forecast-presentation";
import { skyTimeTestFixture } from "./sky-time-test-support";

function fixture() {
  const { prior, source } = skyTimeTestFixture();
  const from = prior.data;
  const target = { ...from, ...observationNightBounds(from), selectedAtUtc: "2026-09-30T14:15:17.000Z", revision: from.revision + 1,
    contextFingerprint: "confirmed-time-edit-fixture", weatherView: { primaryPolicy: "QWEATHER", cloudLayer: "TOTAL" as const,
      selectedModel: null, comparisonModels: [] } };
  const reply: ApiEnvelope<ObservationContext> = { ...prior, dataState: "FRESH", data: target, validAt: target.selectedAtUtc,
    contextRevision: target.revision };
  assert(confirmedObservationContextEdit(from, { selectedAt: target.selectedAtUtc }, reply));
  const response = reply as ConfirmedObservationContextReply;
  let now = Date.parse(from.createdAt) + 1000;
  const owner = createSkyTimeCommitContinuity(skyForecastPresentation, () => now);
  return { from, source, target, response, owner, spotId: source.data.context.spotId,
    read: (query = { data: undefined as ApiEnvelope<SkyReport> | undefined, pending: true, failed: false }, context: ObservationContext | null = target,
      allowed = true) => owner.read(context, source.data.context.spotId, allowed, query), advance: (at: number) => { now = at; } };
}

test("confirmed time-only continuity preserves source identity and exact new-instant geometry without mutating the reply", () => {
  const f = fixture(), before = JSON.stringify(f.source);
  assert(f.owner.stage(f.from, f.response, f.source, f.spotId, f.target.selectedAtUtc));
  const carried = f.read(); assert(carried);
  assert.strictEqual(carried.data.context, f.source.data.context, "never claim that the prior provider reply has the new Context revision");
  const current = presentSkyTime(carried.data, f.target.selectedAtUtc); assert(current);
  assert.equal(current.row.at, f.target.selectedAtUtc);
  assert.equal(current.mode, "MODEL");
  const previous = presentSkyTime(carried.data, new Date(Date.parse(f.from.selectedAtUtc)).toISOString()); assert(previous);
  assert.notEqual(current.row.sunAltitudeDeg, previous.row.sunAltitudeDeg);
  assert.strictEqual(current.report.sources, f.source.data.sources);
  assert.strictEqual(current.report.decision, f.source.data.decision, "preview does not relabel advice to the new instant");
  assert.deepEqual(current.report.targetFrames, [], "unsupported fine event/target facts are not invented");
  assert.equal(JSON.stringify(f.source), before);
  assert.strictEqual(f.read(), carried, "unchanged validity keeps one projected view, not a per-frame clone");
});

test("real reply, failure, ownership change and expiry terminate continuity without A-to-B-to-A revival", () => {
  for (const exit of ["reply", "failure", "selection", "hide", "idle", "expiry", "clear"] as const) {
    const f = fixture(); assert(f.owner.stage(f.from, f.response, f.source, f.spotId, f.target.selectedAtUtc));
    if (exit === "expiry") f.advance(Date.parse(f.target.expiresAt));
    if (exit === "clear") f.owner.clear();
    const result = f.read({ data: exit === "reply" ? f.source : undefined,
      pending: exit !== "idle", failed: exit === "failure" },
      exit === "selection" ? { ...f.target, revision: f.target.revision + 1 } : f.target, exit !== "hide");
    assert.equal(result, undefined, exit);
    assert.equal(f.read(), undefined, "returning to the earlier identity cannot revive the entry");
  }
});

test("continuity rejects unconfirmed scope changes, unrelated receipts, unavailable and unsupported time supply", () => {
  const changes = [
    (f: ReturnType<typeof fixture>) => ({ ...f.response, dataState: "STALE_USABLE" as const }),
    (f: ReturnType<typeof fixture>) => ({ ...f.response, data: { ...f.target, revision: f.from.revision } }),
    (f: ReturnType<typeof fixture>) => ({ ...f.response, data: { ...f.target, contextId: "ctx:another" as ObservationContext["contextId"] } }),
    (f: ReturnType<typeof fixture>) => ({ ...f.response, data: { ...f.target, location: { ...f.target.location, locationVersion: 99 } } }),
    (f: ReturnType<typeof fixture>) => ({ ...f.response, data: { ...f.target, algorithmVersions: { ...f.target.algorithmVersions, astronomy: "other" } } }),
    (f: ReturnType<typeof fixture>) => ({ ...f.response, validAt: f.from.selectedAtUtc }),
    (f: ReturnType<typeof fixture>) => ({ ...f.response, validAt: f.from.selectedAtUtc, data: { ...f.target, selectedAtUtc: f.from.selectedAtUtc } }),
    (f: ReturnType<typeof fixture>) => ({ ...f.response, data: { ...f.target, localDate: "2026-10-01" } }),
  ];
  for (const change of changes) {
    const f = fixture();
    assert.equal(confirmedObservationContextEdit(f.from, { selectedAt: f.target.selectedAtUtc }, change(f)), false,
      "the existing acknowledgement owner rejects the changed scope before granting continuity");
    assert.equal(f.read(), undefined);
  }
  const mismatched = fixture();
  assert.equal(mismatched.owner.stage(mismatched.from, mismatched.response, mismatched.source, mismatched.spotId, mismatched.from.selectedAtUtc), false,
    "a valid acknowledgement for another instant cannot bridge this page's requested time");
  for (const source of [undefined, "EXPIRED", "UNAVAILABLE", "unrelated", "wrong-at", "missing-model"] as const) {
    const f = fixture();
    const reply = source === undefined ? undefined : source === "unrelated" ? { ...f.source, data: { ...f.source.data,
      context: { ...f.source.data.context, contextRevision: f.from.revision - 1 } } }
      : source === "wrong-at" ? { ...f.source, data: { ...f.source.data, context: { ...f.source.data.context, at: f.target.selectedAtUtc } } }
        : source === "missing-model" ? { ...f.source, data: { ...f.source.data, timeModel: null } }
          : { ...f.source, dataState: source };
    assert.equal(f.owner.stage(f.from, f.response, reply, f.spotId, f.target.selectedAtUtc), false); assert.equal(f.read(), undefined);
  }
});

test("retained geometry respects the existing provider-hour weather expiry", () => {
  const f = fixture(), index = f.source.data.hourly.findIndex(row => Date.parse(row.at) > Date.parse(f.from.createdAt));
  assert(index >= 0);
  const validHour = new Date(Math.floor(Date.parse(f.source.data.hourly[index]!.at) / 3_600_000) * 3_600_000).toISOString();
  f.advance(Date.parse(validHour) + 60_000);
  const source = { ...f.source, dataState: "FRESH" as const, data: { ...f.source.data,
    hourly: f.source.data.hourly.map((row, i) => i !== index ? row : { ...row, weatherAt: validHour, cloudPercent: 24 }) } };
  assert(f.owner.stage(f.from, f.response, source, f.spotId, f.target.selectedAtUtc));
  assert.equal(f.read()!.data.hourly[index]!.cloudPercent, 24);
  f.advance(Date.parse(validHour) + 3_600_000);
  const expired = f.read(); assert(expired); assert.equal(expired.dataState, "PARTIAL");
  assert.equal(expired.data.hourly[index]!.weatherAt, null); assert.equal(expired.data.hourly[index]!.cloudPercent, null);
  assert.equal(source.data.hourly[index]!.cloudPercent, 24, "original query reply remains untouched");
  assert(presentSkyTime(expired.data, f.target.selectedAtUtc), "independent actual astronomy stays available");
});

test("a confirmed cross-date apply retains the admitted model and its actual sources through report refresh", () => {
  const f = fixture(), supplied = skyTimeTestFixture().geometryWindow;
  const selectedAtUtc = "2026-09-29T13:00:17.123Z", localDate = "2026-09-29";
  const target = { ...f.target, localDate, selectedAtUtc, ...observationNightBounds({ localDate, timezone: f.from.timezone }) };
  const reply = { ...f.response, validAt: selectedAtUtc, data: target };
  const edit = { selectedAt: selectedAtUtc, localDate, eventInstanceId: null };
  assert(confirmedObservationContextEdit(f.from, edit, reply));
  const confirmed = reply as ConfirmedObservationContextReply;
  assert.equal(f.owner.stage(f.from, confirmed, f.source, f.spotId, selectedAtUtc), false,
    "a successful Context edit alone does not supply the cross-date sky");
  assert(f.owner.stage(f.from, confirmed, f.source, f.spotId, selectedAtUtc, supplied.data.model, supplied.sources));
  const carried = f.read({ data: undefined, pending: true, failed: false }, target)!;
  const current = presentSkyTime(carried.data, selectedAtUtc, f.owner.model(), f.owner.sources())!;
  assert.equal(current.row.at, selectedAtUtc); assert.equal(current.weather, null);
  assert(current.report.sources.some(source => source.id === supplied.sources[0]!.id));
  assert.equal(current.report.context, f.source.data.context, "the original report is not relabeled as a new reply");
  assert.deepEqual(current.report.targetFrames, []);
  f.owner.clear(); assert.equal(f.owner.model(), null); assert.equal(f.owner.sources(), undefined);
});

test("actual page keeps its native Canvas and resource eligibility during the admitted query gap", () => {
  const f = fixture(); assert(f.owner.stage(f.from, f.response, f.source, f.spotId, f.target.selectedAtUtc));
  const file = ts.createSourceFile("sky.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const page = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
  const declarations = new Map<string, ts.VariableDeclaration>();
  for (const statement of page.body!.statements) if (ts.isVariableStatement(statement))
    for (const declaration of statement.declarationList.declarations) declarations.set(declaration.name.getText(file), declaration);
  const names = ["carriedReport", "report", "data", "contextMatches", "rawReportData", "skyResourcesActive", "timeModel", "timeBinding", "committedAt",
    "requestedAt", "timeGeometrySources", "requestedTimePresentation", "acceptedTimePresentation", "timePresentation", "timeGeometryReady", "timePlaying", "fineTargetBinding", "geometryReport", "reportData", "row", "nativeCanvasMounted"];
  const code = ts.transpileModule(names.map(name => { const declaration = declarations.get(name); assert(declaration); return `const ${declaration.getText(file)};`; }).join("\n") +
    "\n({report,rawReportData,skyResourcesActive,nativeCanvasMounted,fineTargetBinding,row});", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const reportQuery = { data: undefined, isPending: true, isFetching: true, isError: false };
  const result = vm.runInNewContext(code, { timeCommitContinuity: f.owner, activeContext: f.target, routeContext: { spotId: f.spotId },
    resourcePageVisible: true, contextComplete: true, contextSession: { ownsContext: () => true }, reportQuery, rejectedReportError: null,
    skyReportMatchesContext, skyPresentationTimeModel, presentSkyTime, selectSkyTimePresentation, useMemo: (fn: () => unknown) => fn(), timeIntent: {},
    pageVisible: true, mode: "NIGHT", canvasError: null, presentedSkyFrame: null,
    previewGeometry: { model: skyPresentationTimeModel(f.source.data) },
    fineTargetData: null, timeScrubbing: false, stellarCatalog: {}, attachSkyCatalog,
    manualBasis: { forward: [0, Math.SQRT1_2, Math.SQRT1_2] }, devicePose: null, orientation: { presented: { current: null } } });
  assert.equal(result.skyResourcesActive, true); assert.equal(result.nativeCanvasMounted, true);
  assert.equal(result.row.at, f.target.selectedAtUtc); assert.equal(result.fineTargetBinding, null);
  assert.strictEqual(result.rawReportData.context, f.source.data.context); assert.equal(reportQuery.data, undefined, "no fake reply enters Query");
  f.owner.clear();
  const revoked = vm.runInNewContext(code, { timeCommitContinuity: f.owner, activeContext: f.target, routeContext: { spotId: f.spotId },
    resourcePageVisible: true, contextComplete: true, contextSession: { ownsContext: () => true }, reportQuery, rejectedReportError: null,
    skyReportMatchesContext, skyPresentationTimeModel, presentSkyTime, selectSkyTimePresentation, useMemo: (fn: () => unknown) => fn(), timeIntent: {},
    pageVisible: true, mode: "NIGHT", canvasError: null, presentedSkyFrame: null,
    previewGeometry: { model: null },
    fineTargetData: null, timeScrubbing: false, stellarCatalog: {}, attachSkyCatalog,
    manualBasis: {}, devicePose: null, orientation: { presented: { current: null } } });
  assert.equal(revoked.skyResourcesActive, false); assert.equal(revoked.nativeCanvasMounted, false, "the case must detect the original empty-query regression");
});
