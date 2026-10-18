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
