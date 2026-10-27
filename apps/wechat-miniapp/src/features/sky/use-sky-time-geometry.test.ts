import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { MutationCache, QueryCache, QueryClient, QueryObserver } from "@tanstack/react-query";
import { skyGeometryWindow, type SkyReport } from "@starward/miniapp-contracts";
import { skyGeometryWindowKey, matchingSkyGeometryWindow } from "../../services/sky-geometry-window-response";
import { presentSkyTime, skyPresentationTimeModel, skyTimeRulerRows } from "./sky-time-presentation";
import { skyTimeTestFixture } from "./sky-time-test-support";
import { createSkyObservationTime, skyObservationFrameAt, skyObservationFrameCurrent, skyContinuousTimeCoverage } from "./sky-observation-time";
import { exactSkyTimeFrame } from "./sky-time-frame";
import * as timePresentationOwner from "./sky-time-presentation";
import { attachSkyCatalog } from "./sky-stellar-scene";
import { skyTimePreviewStatus } from "./sky-time-preview-status";
import { MiniappRequestCancelled, isMiniappRequestCancelled } from "../../services/request-lifecycle";
import { createSkyContextSession } from "./sky-context-session";
import { evaluateSkyTimeModel } from "@starward/astronomy-core/sky-time-model";
import { skyPagePaintCommit, skyPageEmptyPick } from "./sky-optical-page-test-support";

function productionQueryClient(): QueryClient {
  const exports: any = {};
  const dependencies: Record<string, unknown> = {
    "@tanstack/react-query": { MutationCache, QueryCache, QueryClient },
    "./platform-polyfills": { installAbortControllerPolyfill() {} },
    "./request-lifecycle": { isMiniappRequestCancelled },
    "./runtime-error": { reportRuntimeError() {} },
  };
  vm.runInNewContext(ts.transpileModule(
    readFileSync(new URL("../../services/query-client.ts", import.meta.url), "utf8"),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  ).outputText, { exports, require: (name: string) => {
    assert(name in dependencies, name); return dependencies[name];
  } });
  return exports.miniappQueryClient;
}

function geometryHarness(report: SkyReport, real?: {
  time: ReturnType<typeof createSkyObservationTime>;
  request: (binding: any, signal: AbortSignal | undefined) => Promise<any>;
  active?: () => boolean;
  demand?: () => any;
}) {
  const slots: any[] = []; let cursor = 0, query: any;
  const cache = new Map<string, any>(), errors = new Set<string>();
  let demand: { at: string; fullWindow: boolean } | null = null;
  const client = real ? productionQueryClient() : null;
  let nativeOptions: any, observer: QueryObserver<any> | undefined, unsubscribe: (() => void) | undefined;
  const resource = real ? vm.runInNewContext(ts.transpileModule(
    readFileSync(new URL("../../hooks/use-resource-query.ts", import.meta.url), "utf8"),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText + "\nexports.useResourceQuery;",
  { exports: {}, require: (name: string) => ({
    "@tanstack/react-query": { useQueryClient: () => client, useQuery: (options: any) => {
      nativeOptions = client!.defaultQueryOptions({ ...options, _optimisticResults: "optimistic" });
      observer ??= new QueryObserver(client!, nativeOptions);
      return observer.getOptimisticResult(nativeOptions);
    } }, react: { useEffect() {} }, "@/services/acceptance-diagnostics": { recordAcceptanceDiagnostic() {} },
  }[name]) }) : null;
  const react = { useRef: (value: any) => slots[cursor++] ??= { current: value },
    useMemo: (make: () => any, deps: any[]) => {
      const index = cursor++, old = slots[index];
      if (!old || deps.some((value, i) => value !== old.deps[i])) slots[index] = { value: make(), deps };
      return slots[index].value;
    } };
  const exports: any = {};
  const bindings: Record<string, any> = { react, "@starward/miniapp-contracts": { skyGeometryWindow },
    "../../hooks/use-resource-query": { useResourceQuery: (options: any) => {
      query = options; const key = JSON.stringify(options.queryKey);
      if (resource) return resource(options);
      return { data: cache.get(key), isError: errors.has(key), refetch() {} };
    } }, "../../services/sky-celestial-client": { getSkyGeometryWindow: real?.request ?? (() => { throw new Error("no_external_network"); }) },
    "../../services/sky-geometry-window-response": { skyGeometryWindowKey },
    "../../services/request-lifecycle": { MiniappRequestCancelled },
    "./sky-time-presentation": { skyPresentationTimeModel }, "./sky-time-frame": { exactSkyTimeFrame } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-sky-time-geometry.ts", import.meta.url), "utf8"),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
  { exports, require: (name: string) => { assert(name in bindings, name); return bindings[name]; } });
  const render = (at: string, active = true, currentReport: SkyReport | undefined = report, fullWindow = false) => {
    demand = active ? { at, fullWindow } : null;
    cursor = 0; return exports.useSkyTimeGeometry(currentReport, at, active, fullWindow, () => {
      if (!real) return demand;
      if (real.active?.() === false) return null;
      if (real.demand) return real.demand();
      return real.time.preparationDemand();
    });
  };
  return { render, cache, errors, get query() { return query; },
    commit() { observer!.setOptions(nativeOptions); unsubscribe ??= observer!.subscribe(() => {}); },
    close() { unsubscribe?.(); client?.clear(); },
    get queryResult() { return observer?.getCurrentResult(); },
    get client() { return client; },
  };
}

function shortWindow(full: ReturnType<typeof skyTimeTestFixture>["geometryWindow"], at: string, timezone: string) {
  const window = skyGeometryWindow(at, timezone, "TWO_HOURS");
  return { ...full, validAt: window.startAt,
    sources: full.sources.map(source => ({ ...source, validFrom: window.startAt, validTo: window.endAt })),
    data: { ...full.data, model: { ...full.data.model, startAt: window.startAt, endAt: window.endAt,
      knots: full.data.model.knots.filter(knot => knot.at >= window.startAt && knot.at <= window.endAt) } } };
}

test("a delayed Query effect cannot start a superseded geometry window", async () => {
  const { source, prior } = skyTimeTestFixture(), time = createSkyObservationTime();
  time.bind("current", prior.data.selectedAtUtc, skyPresentationTimeModel(source.data));
  const requested: string[] = [];
  const h = geometryHarness(source.data, { time, request: (binding) => {
    requested.push(binding.at); return new Promise(() => {});
  } });
  try {
    h.render(time.snapshot().at); h.commit();
    const a = "2026-09-29T13:00:17.123Z", b = "2026-09-28T13:00:17.123Z";
    time.preview(a); h.render(a);
    // Installed useBaseQuery calls setOptions in a passive effect. A native
    // input can already have changed the synchronous clock before it runs.
    time.preview(b); h.commit();
    assert.deepEqual(requested, [], "the A render must not send A after the authoritative clock already chose B");
    h.render(b); h.commit();
    assert.deepEqual(requested, [b], "the current demand still starts without a debounce or new scheduler");
  } finally { h.close(); }
});

const settleQuery = () => new Promise<void>(resolve => setImmediate(resolve));

function heldQueryFixture() {
  const fixture = skyTimeTestFixture(), time = createSkyObservationTime();
  const original = skyPresentationTimeModel(fixture.source.data)!;
  time.bind("current", fixture.prior.data.selectedAtUtc, original); time.edit("fields", true);
  const origin = time.snapshot().at;
  let epoch = {}, available = true;
  let presented: { at: string; generation: number; model: typeof original } | undefined;
  const requests: { binding: any; signal?: AbortSignal; complete(value: unknown): void; reject(error: unknown): void }[] = [];
  const h = geometryHarness(fixture.source.data, { time, demand: () => available ? {
    ...time.preparationDemand(), epoch, ...(presented ? { presented } : {}),
  } : null, request: (binding, signal) => new Promise((complete, reject) => {
    requests.push({ binding, ...(signal ? { signal } : {}), complete, reject });
  }) });
  const render = (commit = true) => {
    const result = h.render(time.snapshot().at); if (commit) h.commit(); return result;
  };
  return { ...fixture, time, original, origin, h, requests, render,
    step(at: string, commit = true) {
      time.preview(at, { fromAt: presented?.at ?? origin, elapsedAt: 0, reducedMotion: true }); return render(commit);
    },
    async complete(index: number) {
      const request = requests[index]!, response = shortWindow(fixture.geometryWindow, request.binding.at, fixture.prior.data.timezone);
      request.complete(response); await settleQuery(); return response;
    },
    presented(at: string, model: typeof original) { presented = { at, model, generation: time.snapshot().presentationGeneration }; },
    available(value: boolean) { available = value; },
    replaceEpoch() { epoch = {}; },
  };
}

test("one held edit completes a real earlier window while only its latest target waits", async () => {
  const { source, prior, geometryWindow } = skyTimeTestFixture(), time = createSkyObservationTime();
  const original = skyPresentationTimeModel(source.data)!;
  time.bind("current", prior.data.selectedAtUtc, original);
  const origin = time.snapshot().at;
  const canvas = timePreviewCanvas(time), renderPage = createPageTimePresentation();
  let geometry: any = { model: original, sources: undefined, heldSample: null, failed: false };
  const page = () => renderPage({ observationTime: time, rawReportData: source.data, committedAt: prior.data.selectedAtUtc,
    timeModel: geometry.model, timeGeometrySources: geometry.sources, previewGeometry: geometry,
    timeIntent: time.snapshot(), requestedAt: time.snapshot().at, report: { isError: false, data: source },
    presentedSkyFrame: canvas.presentedSkyFrameRef.current, presentedSkyFrameRef: canvas.presentedSkyFrameRef,
    acceptedClockAt: canvas.presentedSkyFrameRef.current?.frameAt });
  canvas.prepare(page()).complete(); time.edit("fields", true);
  const targets = ["2026-09-29T17:00:17.123Z", "2026-09-29T15:00:17.123Z", "2026-09-29T13:00:17.123Z"] as const;
  const requests: { binding: any; signal?: AbortSignal; complete(value: unknown): void }[] = [];
  const demand = () => {
    const frame = canvas.presentedSkyFrameRef.current;
    return { ...time.preparationDemand(), ...(frame?.timePresentation ? {
      presented: { at: frame.frameAt, model: frame.timePresentation.model, generation: frame.timeGeneration },
    } : {}) };
  };
  const h = geometryHarness(source.data, { time, demand, request: (binding, signal) => new Promise(resolve => {
    requests.push({ binding, ...(signal ? { signal } : {}), complete: resolve });
  }) });
  try {
    for (const at of targets) {
      time.preview(at, { fromAt: origin, elapsedAt: 0, reducedMotion: true }); h.render(at); h.commit();
    }
    assert.equal(requests.length, 1, "later held targets must not cancel an already started useful preparation");
    assert.equal(requests[0]!.signal?.aborted, false);
    const intermediate = shortWindow(geometryWindow, targets[0]!, prior.data.timezone);
    requests[0]!.complete(intermediate); await settleQuery();
    const supplied = geometry = h.render(targets[2]!);
    assert.strictEqual(supplied.model, intermediate.data.model);
    assert.equal(supplied.heldSample?.at, targets[0], "the sample carries request time, not completion wall time");
    assert.equal(time.snapshot().at, targets[2], "supply cannot rewrite the latest exact target");
    h.commit(); assert.equal(requests.length, 1, "a prepared intermediate is not yet a visible frame");
    time.bind("current", prior.data.selectedAtUtc, supplied.model);
    const intermediatePage = page(), native = canvas.prepare(intermediatePage);
    assert.equal(intermediatePage.row.at, targets[0]);
    for (const input of intermediatePage.resourceInputs) {
      assert(input.report === (input.name === "useSkyStellarSupplement" ? intermediatePage.reportData.skyScene : intermediatePage.geometryReport), input.name);
      assert.equal(input.at, targets[0], input.name);
    }
    geometry = h.render(targets[2]!); h.commit(); assert.equal(requests.length, 1);
    native.complete();
    assert.equal(canvas.presentedSkyFrameRef.current.frameAt, targets[0]);
    geometry = h.render(targets[2]!); h.commit(); assert.equal(requests.length, 2);
    assert.equal(requests[1]!.binding.at, targets[2], "only the newest waiting target is prepared next");
    const finalAt = "2026-09-29T09:00:20.789Z";
    time.preview(finalAt, { fromAt: targets[0], elapsedAt: 0, reducedMotion: true });
    geometry = h.render(finalAt); h.commit(); assert.equal(requests.length, 2);
    const second = shortWindow(geometryWindow, targets[2]!, prior.data.timezone);
    requests[1]!.complete(second); await settleQuery();
    geometry = h.render(finalAt); h.commit();
    assert.equal(requests.length, 2, "the prior model's receipt cannot consume this newer prepared model");
    assert.equal(geometry.heldSample?.at, targets[2]);
    time.bind("current", prior.data.selectedAtUtc, geometry.model);
    const secondNative = canvas.prepare(page());
    geometry = h.render(finalAt); h.commit(); assert.equal(requests.length, 2);
    secondNative.complete(); assert.equal(canvas.presentedSkyFrameRef.current.frameAt, targets[2]);
    geometry = h.render(finalAt); h.commit(); assert.equal(requests.length, 3);
    assert.equal(requests[2]!.binding.at, finalAt);
    const final = shortWindow(geometryWindow, finalAt, prior.data.timezone);
    requests[2]!.complete(final); await settleQuery();
    const complete = geometry = h.render(finalAt); h.commit();
    assert.strictEqual(complete.model, final.data.model); assert.equal(complete.heldSample, null);
    assert.equal(complete.pending, false); assert(time.snapshot().editing.includes("fields"));
    time.bind("current", prior.data.selectedAtUtc, complete.model); canvas.prepare(page()).complete();
    assert.equal(canvas.presentedSkyFrameRef.current.frameAt, finalAt);
    time.edit("fields", false); assert.strictEqual(h.render(finalAt).model, final.data.model); h.commit();
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(h.client!.getQueryCache().findAll({ queryKey: ["spot-sky-geometry"] })
      .filter(query => query.queryKey[2]).length, 0, "finished detached windows do not form a query history");
  } finally { h.close(); }
});

test("a newer same-window sample consumes the prepared model before a later window advances", async () => {
  const f = heldQueryFixture();
  const a = "2026-09-29T13:00:17.123Z", b = "2026-09-29T12:30:19.456Z", c = "2026-09-29T11:00:20.789Z";
  try {
    f.step(a); f.step(b); assert.equal(f.requests.length, 1);
    const first = await f.complete(0), readyB = f.render();
    assert(readyB.model === first.data.model); assert.equal(readyB.heldSample, null);
    assert.equal(presentSkyTime(f.source.data, b, readyB.model)!.row.at, b, "same-window precision stays immediate");
    const waitingC = f.step(c);
    assert.equal(f.requests.length, 1, "the first model has not yet reached native copy");
    assert.equal(waitingC.heldSample?.at, b, "keep the latest legal sample that was prepared from the same model");
    f.presented(b, first.data.model); f.render();
    assert.equal(f.requests.length, 2); assert.equal(f.requests[1]!.binding.at, c);
    assert.equal(f.requests[0]!.signal?.aborted, false, "success is not retroactively relabelled cancellation");
  } finally { f.h.close(); }
});

test("calendar input follows the latest requested day without inventing geometry from the earlier sample", () => {
  const { source, prior, geometryWindow } = skyTimeTestFixture();
  const earlier = shortWindow(geometryWindow, "2026-09-29T13:00:17.123Z", prior.data.timezone).data.model;
  const requestedAt = "2027-09-29T13:00:19.456Z";
  for (const model of [earlier, skyPresentationTimeModel(source.data)]) {
    const rows = skyTimeRulerRows(source.data, model, requestedAt);
    assert.equal(rows[0]!.at, skyGeometryWindow(requestedAt, prior.data.timezone).startAt);
    assert.equal(rows.length, 49);
    assert(rows.every(row => row.opportunityEligible === undefined && row.opportunityBlockers === undefined));
    assert.equal(presentSkyTime(source.data, requestedAt, model), null,
      "calendar ticks do not turn the retained model into a cross-year ephemeris");
  }
  const render = createPageTimePresentation(), model = earlier;
  const base = { rawReportData: source.data, timeModel: model, timeGeometrySources: undefined,
    committedAt: prior.data.selectedAtUtc, acceptedClockAt: prior.data.selectedAtUtc,
    report: { isError: false, data: source }, presentedSkyFrame: null };
  const first = render({ ...base, requestedAt });
  const nextSecond = render({ ...base, requestedAt: "2027-09-29T13:00:20.456Z" });
  assert.strictEqual(nextSecond.timeRows, first.timeRows, "Play and held seconds reuse one set of civil ticks");
  const nextDay = render({ ...base, requestedAt: "2027-09-30T13:00:20.456Z" });
  assert.notStrictEqual(nextDay.timeRows, first.timeRows);
  assert.equal(nextDay.timeRows[0].at, skyGeometryWindow("2027-09-30T13:00:20.456Z", prior.data.timezone).startAt);
});

test("release reuses a running final window but cancels a different obsolete held window", async () => {
  const a = "2026-09-29T13:00:17.123Z";
  for (const target of ["2026-09-29T12:30:19.456Z", "2026-09-29T11:00:20.789Z"]) {
    const f = heldQueryFixture(), same = skyGeometryWindow(a, f.prior.data.timezone, "TWO_HOURS").startAt ===
      skyGeometryWindow(target, f.prior.data.timezone, "TWO_HOURS").startAt;
    try {
      f.step(a); f.step(target); f.time.edit("fields", false); f.render();
      assert.equal(f.requests.length, same ? 1 : 2);
      assert.equal(f.requests[0]!.signal?.aborted, !same);
      if (!same) {
        await f.complete(0);
        assert(f.render().model === f.original, "a retired response cannot become the final supply");
      }
      const final = await f.complete(same ? 0 : 1), ready = f.render();
      assert(ready.model === final.data.model); assert.equal(ready.heldSample, null);
      assert.equal(presentSkyTime(f.source.data, target, ready.model)!.row.at, target);
      assert.equal(f.time.snapshot().at, target);
    } finally { f.h.close(); }
  }
});

test("a held queued render cannot start before the latest native window or revive after retirement", async () => {
  const a = "2026-09-29T17:00:17.123Z", b = "2026-09-29T15:00:17.123Z";
  const queued = heldQueryFixture();
  try {
    queued.step(a, false);
    queued.time.preview(b, { fromAt: queued.origin, elapsedAt: 70, reducedMotion: true }); queued.h.commit();
    assert.equal(queued.requests.length, 0);
    queued.render(); assert.equal(queued.requests.length, 1); assert.equal(queued.requests[0]!.binding.at, b);
  } finally { queued.h.close(); }
  for (const boundary of ["reverse", "new-touch", "hide", "epoch", "Context", "cancel", "Play", "ruler"] as const) {
    const f = heldQueryFixture();
    try {
      f.step(a);
      if (boundary === "reverse") f.time.preview("2026-09-29T17:01:17.123Z", { fromAt: f.origin, elapsedAt: 70, reducedMotion: true });
      else if (boundary === "new-touch") { f.time.edit("fields", false); f.time.edit("fields", true); }
      else if (boundary === "hide") { f.time.hide(0); f.available(false); }
      else if (boundary === "epoch") f.replaceEpoch();
      else if (boundary === "Context") f.time.bind("replacement", f.prior.data.selectedAtUtc, f.original);
      else if (boundary === "cancel") f.time.cancel();
      else if (boundary === "Play") f.time.requestPlay();
      else f.time.edit("ruler", true);
      await f.complete(0);
      assert.equal(f.h.queryResult?.data, undefined, `${boundary}: a pre-render native retirement wins over completion`);
      assert(f.h.queryResult?.error instanceof MiniappRequestCancelled, boundary);
    } finally { f.h.close(); }
  }
});

test("an unpainted prepared sample cannot block the existing unavailable and native-epoch recovery", async () => {
  const f = heldQueryFixture(), a = "2026-09-29T17:00:17.123Z", b = "2026-09-29T15:00:17.123Z";
  try {
    f.step(a); f.step(b); await f.complete(0);
    assert.equal(f.render().heldSample?.at, a); assert.equal(f.requests.length, 1);
    f.available(false);
    const unavailable = f.render(); assert.equal(unavailable.heldSample, null);
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(f.h.client!.getQueryCache().findAll({ queryKey: ["spot-sky-geometry"] })
      .filter(query => query.queryKey[2] && query.state.data !== undefined).length, 0);
    f.replaceEpoch(); f.available(true);
    const recovered = f.render();
    assert.equal(recovered.heldSample, null, "an old prepared receipt is not a copy on the replacement surface");
    assert.equal(f.requests.length, 2); assert.equal(f.requests[1]!.binding.at, b);
  } finally { f.h.close(); }
});

test("failed intermediate work advances without retrying an obsolete window and final failures retain one retry", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const settleRetry = async () => {
    // Let the rejected query install its retry, then execute that timer.
    // A short wall-clock sleep can finish before this nested timer under load.
    await settleQuery(); t.mock.timers.tick(0); await settleQuery();
  };
  const f = heldQueryFixture(), a = "2026-09-29T17:00:17.123Z", b = "2026-09-29T15:00:17.123Z";
  f.h.client!.setQueryDefaults(["spot-sky-geometry"], { retryDelay: 0 });
  try {
    f.step(a); f.step(b);
    f.requests[0]!.reject(new Error("controlled_intermediate_failure")); await settleRetry();
    assert.equal(f.requests.length, 1, "obsolete progress does not consume another network attempt");
    f.render(); assert.equal(f.requests.length, 2); assert.equal(f.requests[1]!.binding.at, b);
    f.requests[1]!.reject(new Error("controlled_current_failure"));
    await settleRetry();
    assert.equal(f.requests.length, 3); assert.equal(f.requests[2]!.binding.at, b);
    const successful = await f.complete(2), ready = f.render();
    assert(ready.model === successful.data.model); assert.equal(ready.failed, false);
  } finally { f.h.close(); }
});

test("returning to A before B renders restarts a previously suppressed A observer", () => {
  const { source, prior } = skyTimeTestFixture(), time = createSkyObservationTime();
  time.bind("current", prior.data.selectedAtUtc, skyPresentationTimeModel(source.data));
  const a = "2026-09-29T13:00:17.123Z", b = "2026-09-28T13:00:17.123Z", requested: string[] = [];
  const h = geometryHarness(source.data, { time, request: binding => {
    requested.push(binding.at); return new Promise(() => {});
  } });
  try {
    h.render(time.snapshot().at); h.commit();
    time.preview(a); h.render(a); time.preview(b); h.commit();
    assert.deepEqual(requested, []);
    time.preview(a); h.render(a); h.commit();
    assert.deepEqual(requested, [a], "a live enabled callback must not make Query forget that the preceding A was disabled");
  } finally { h.close(); }
});

test("superseded in-flight A does not enter retry backoff before an unrendered B returns to A", async () => {
  const { source, prior, geometryWindow } = skyTimeTestFixture(), time = createSkyObservationTime();
  time.bind("current", prior.data.selectedAtUtc, skyPresentationTimeModel(source.data));
  const a = "2026-09-29T13:00:17.123Z", b = "2026-09-28T13:00:17.123Z";
  const requests: { at: string; complete: (value: unknown) => void }[] = [];
  const h = geometryHarness(source.data, { time, request: binding => new Promise(resolve => {
    requests.push({ at: binding.at, complete: resolve });
  }) });
  try {
    time.preview(a); h.render(a); h.commit();
    time.preview(b);
    requests[0]!.complete(shortWindow(geometryWindow, a, prior.data.timezone));
    await settleQuery();
    assert.equal(h.queryResult?.fetchStatus, "idle", "a cancelled result must not keep a network retryer pending");
    time.preview(a); h.render(a); h.commit();
    assert.deepEqual(requests.map(request => request.at), [a, a], "current A starts without waiting for the obsolete attempt's backoff");
  } finally { h.close(); }
});

test("production query policy retries genuine failures once but never retries explicit cancellation", async () => {
  const client = productionQueryClient();
  const failure = new Error("controlled_network_failure");
  try {
    for (const reason of ["query_signal", "superseded", "manual", "transport_abort"] as const) {
      const cancelled = new MiniappRequestCancelled(reason); let attempts = 0;
      await assert.rejects(client.fetchQuery({
        queryKey: ["cancelled", reason], retryDelay: 0,
        queryFn: async () => { attempts++; throw cancelled; },
      }), error => error === cancelled);
      assert.equal(attempts, 1);
    }
    let attempts = 0;
    await assert.rejects(client.fetchQuery({
      queryKey: ["real_failure"], retryDelay: 0,
      queryFn: async () => { attempts++; throw failure; },
    }), error => error === failure);
    assert.equal(attempts, 2, "the existing one retry for a genuine failure remains");
  } finally { client.clear(); }
});

test("seconds within one pending window reuse its request and admit the latest exact time", async () => {
  const { source, prior, geometryWindow } = skyTimeTestFixture(), time = createSkyObservationTime();
  time.bind("current", prior.data.selectedAtUtc, skyPresentationTimeModel(source.data));
  const a = "2026-09-29T13:00:17.123Z", later = "2026-09-29T13:01:19.456Z";
  const requests: { at: string; signal: AbortSignal | undefined }[] = [];
  let complete!: (value: unknown) => void;
  const h = geometryHarness(source.data, { time, request: (binding, signal) => {
    requests.push({ at: binding.at, signal }); return new Promise(resolve => { complete = resolve; });
  } });
  try {
    time.preview(a); h.render(a);
    time.preview(later); h.commit();
    assert.equal(requests.length, 1, "a different exact instant inside the same grid must not suppress useful supply");
    h.render(later); h.commit();
    assert.equal(requests.length, 1); assert.equal(requests[0]!.signal?.aborted, false);
    const short = shortWindow(geometryWindow, a, prior.data.timezone);
    complete(short); await settleQuery();
    const admitted = h.render(later);
    assert.strictEqual(admitted.model, short.data.model);
    assert.equal(presentSkyTime(source.data, later, admitted.model)!.row.at, later);
    assert.equal(time.snapshot().at, later, "supply must never write the clock back to the request's original second");
  } finally { h.close(); }
});

test("A to B to A keeps Query cancellation and cannot revive the first A attempt", async () => {
  const { source, prior, geometryWindow } = skyTimeTestFixture(), time = createSkyObservationTime();
  time.bind("current", prior.data.selectedAtUtc, skyPresentationTimeModel(source.data));
  const a = "2026-09-29T13:00:17.123Z", b = "2026-09-28T13:00:17.123Z";
  const requests: { at: string; signal: AbortSignal | undefined; complete: (value: unknown) => void }[] = [];
  const h = geometryHarness(source.data, { time, request: (binding, signal) => new Promise(resolve => {
    requests.push({ at: binding.at, signal, complete: resolve });
  }) });
  try {
    for (const at of [a, b, a]) { time.preview(at); h.render(at); h.commit(); }
    assert.deepEqual(requests.map(request => request.at), [a, b, a]);
    assert.equal(requests[0]!.signal?.aborted, true); assert.equal(requests[1]!.signal?.aborted, true);
    assert.equal(requests[2]!.signal?.aborted, false);
    const short = shortWindow(geometryWindow, a, prior.data.timezone);
    requests[0]!.complete(short); await settleQuery();
    assert.equal(h.queryResult?.data, undefined, "the first A promise stays retired after returning to its values");
    requests[2]!.complete(short); await settleQuery();
    assert.strictEqual(h.render(a).model, short.data.model);
    assert.equal(time.snapshot().at, a);
  } finally { h.close(); }
});

test("queued preview, manual retry and full Play supply follow the live intent before the next render", async () => {
  const { source, prior, geometryWindow } = skyTimeTestFixture(), time = createSkyObservationTime();
  time.bind("current", prior.data.selectedAtUtc, skyPresentationTimeModel(source.data));
  const a = "2026-09-29T13:59:59.000Z", b = "2026-09-28T13:59:59.000Z";
  let active = true;
  const requests: { mode: string; complete: (value: unknown) => void }[] = [];
  const h = geometryHarness(source.data, { time, active: () => active,
    request: (binding) => new Promise(resolve => { requests.push({ mode: binding.windowMode, complete: resolve }); }) });
  try {
    time.preview(a); const preview = h.render(a);
    time.requestPlay(); h.commit();
    assert.equal(requests.length, 0, "a queued short-window effect cannot run after Play requests full supply");
    assert.equal(await preview.retry(), undefined, "manual refetch cannot bypass the current demand gate");
    h.render(a, true, source.data, true); h.commit();
    assert.equal(requests.length, 1); assert.equal(requests[0]!.mode, "NIGHT");
    requests[0]!.complete(geometryWindow); await settleQuery();
    const ready = h.render(a, true, source.data, true);
    assert.equal(ready.playbackReady, true);
    time.bind("current", prior.data.selectedAtUtc, ready.model); time.play(1000);
    assert.equal(time.tick(3000).at, "2026-09-29T14:00:01.000Z", "ordinary Play retains supply beyond a short window boundary");

    time.preview(b); const manual = h.render(b);
    active = false; h.commit();
    assert.equal(requests.length, 1, "immediate hide eligibility applies before its React render");
    assert.equal(await manual.retry(), undefined);
    await assert.rejects(h.query.queryFn(new AbortController().signal), MiniappRequestCancelled,
      "a queued Query retry is checked too, independently of enabled");
    assert.equal(requests.length, 1);
    active = true; time.cancel();
    assert.equal(await manual.retry(), undefined, "cancel cannot restart the previously requested day");
    assert.equal(time.snapshot().at, prior.data.selectedAtUtc);
  } finally { h.close(); }
});

test("geometry response admission rechecks current demand before Query can publish an older window", async () => {
  const { source, prior, geometryWindow } = skyTimeTestFixture(), time = createSkyObservationTime();
  time.bind("current", prior.data.selectedAtUtc, skyPresentationTimeModel(source.data));
  const a = "2026-09-29T13:00:17.123Z", b = "2026-09-28T13:00:17.123Z";
  let complete!: (value: unknown) => void;
  const h = geometryHarness(source.data, { time, request: () => new Promise(resolve => { complete = resolve; }) });
  try {
    time.preview(a); h.render(a); h.commit();
    time.preview(b); // B has not yet rendered or unsubscribed from A.
    complete(shortWindow(geometryWindow, a, prior.data.timezone)); await settleQuery();
    assert.equal(h.queryResult?.data, undefined);
    assert(h.queryResult?.error instanceof MiniappRequestCancelled);
    assert.equal(h.render(b).pending, true);
    assert.equal(time.snapshot().at, b);
  } finally { h.close(); }
});

test("the actual page supplies synchronous time, visibility and Context ownership to geometry", () => {
  const { source, prior } = skyTimeTestFixture(), observationTime = createSkyObservationTime();
  const activeContext = prior.data, committedAt = activeContext.selectedAtUtc;
  const timeBinding = `${activeContext.contextId}:${activeContext.revision}:${activeContext.contextFingerprint}`;
  observationTime.bind(timeBinding, committedAt, skyPresentationTimeModel(source.data));
  let state = { observationContext: activeContext, selectedSpotId: source.data.context.spotId,
    mapResetVersion: 0, spotOpenRequestVersion: 0 };
  const contextSession = createSkyContextSession(activeContext.contextId, () => state);
  const ast = ts.createSourceFile("page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const page = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
  const declarations = page.body!.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]);
  const geometry = declarations.find(node => node.name.getText(ast) === "previewGeometry")!.initializer as ts.CallExpression;
  assert.equal(geometry.arguments.length, 5, "the production caller must supply the live owner, not its render snapshot");
  const names = ["skyPageVisibleCurrent", "skyInteractionCurrent", "skyTimeIntentCurrent", "acceptedTimePresentationFor"];
  const code = declarations.filter(node => names.includes(node.name.getText(ast))).map(node => `const ${node.getText(ast)};`).join("\n") +
    `\n(${geometry.arguments[4]!.getText(ast)});`;
  const read = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { observationTime, contextSession, skyInteractionRevision: contextSession.visibilityRevision, timeBinding, committedAt,
      pageVisible: true, viewportActiveRef: { current: true }, viewportMountedRef: { current: true }, contextComplete: true,
      activeContext, timeSaving: false, orientationController: { snapshot: () => ({ alignment: { mode: "auto" } }) },
      skyResourcesActive: true, canvasError: null, canvasGenerationRef: { current: 1 }, geometryCanvasGeneration: 1,
      timePresentationScope: {}, rawReportData: source.data, mode: "NIGHT", presentedSkyFrameRef: { current: null } });
  const at = "2026-09-29T13:00:17.123Z";
  observationTime.preview(at); assert.equal(read().at, at);
  observationTime.requestPlay(); assert.equal(read().fullWindow, true);
  const commit = contextSession.begin(activeContext)!;
  assert.equal(read(), null, "Apply's existing Context lock retires read-only preparation immediately");
  contextSession.finish(commit); assert.equal(read().at, at);
  state = { ...state, mapResetVersion: 1 }; assert.equal(read(), null);
  state = { ...state, mapResetVersion: 0 }; contextSession.hide(); contextSession.show();
  assert.equal(read(), null, "a pre-hide callback cannot revive after show with the same values");
});

test("latest time demand, cancellation and short-window reuse share the existing query owner", () => {
  const { source, geometryWindow, prior } = skyTimeTestFixture();
  const harness = geometryHarness(source.data), { render, cache } = harness;
  const a = "2026-09-29T13:00:17.123Z", b = "2026-09-28T13:00:17.123Z";
  render(prior.data.selectedAtUtc); assert.equal(harness.query.enabled, false);
  assert.equal(render(a).pending, true); const keyA = JSON.stringify(harness.query.queryKey);
  assert.equal(harness.query.queryKey.at(-1), "TWO_HOURS");
  assert.equal(render(b).pending, true); const keyB = JSON.stringify(harness.query.queryKey);
  assert.notEqual(keyA, keyB);
  const observer = source.data.observationFrames![0]!.observer;
  const short = shortWindow(geometryWindow, a, prior.data.timezone);
  matchingSkyGeometryWindow(short, { spotId: source.data.context.spotId, contextId: prior.data.contextId,
    contextRevision: prior.data.revision, contextFingerprint: prior.data.contextFingerprint, at: a,
    timezone: prior.data.timezone, observer, windowMode: "TWO_HOURS" });
  cache.set(keyA, short);
  const newest = render(b);
  assert.equal(newest.pending, true);
  assert.equal(presentSkyTime(source.data, b, newest.model), null, "late A never supplies newer B");
  const cancelled = render(prior.data.selectedAtUtc);
  assert.equal(harness.query.enabled, false); assert.equal(cancelled.model, skyPresentationTimeModel(source.data));
  const admitted = render(a); assert.equal(admitted.pending, false);
  const current = presentSkyTime(source.data, a, admitted.model)!;
  assert.equal(current.row.at, a); assert.equal(current.weather, null); assert.equal(current.report.targetFrames.length, 0);
  assert.equal(skyTimeRulerRows(source.data, admitted.model).length, 49);
  assert.equal(admitted.model.knots.length, 5, "a small supplied model does not shrink the calendar ruler");
  assert.equal(admitted.playbackReady, false, "a short preview is not complete playback supply");
  assert(skyTimeRulerRows(source.data, admitted.model).every(row => !row.opportunityEligible), "a geometric ruler invents no advice");
  const time = createSkyObservationTime(); time.bind("current", prior.data.selectedAtUtc, admitted.model); time.preview(a);
  const next = "2026-09-29T13:00:18.123Z";
  time.play(0); assert.equal(time.tick(1000).at, next);
  const reused = render(next); assert.equal(harness.query.enabled, false, "successive precise instants reuse one admitted model");
  assert.equal(reused.model, admitted.model);
  assert.equal(presentSkyTime(source.data, next, reused.model)!.row.at, next);
  // The real page binds coverage whenever this returned model changes identity.
  // Returning through the original window then requesting a third day switches
  // to the retained model while that latest request is still pending.
  time.preview(prior.data.selectedAtUtc);
  const originalAgain = render(time.snapshot().at);
  time.bind("current", prior.data.selectedAtUtc, originalAgain.model);
  time.preview(b);
  const pendingNewDay = render(time.snapshot().at);
  assert.equal(pendingNewDay.pending, true);
  assert.strictEqual(pendingNewDay.model, admitted.model);
  assert.notStrictEqual(pendingNewDay.model, originalAgain.model);
  assert.equal(time.bind("current", prior.data.selectedAtUtc, pendingNewDay.model).at, b,
    "the page's coverage effect must not undo a six-field input when it selects fallback supply");
  time.cancel(); assert.equal(time.snapshot().at, prior.data.selectedAtUtc);
  render(b, false); assert.equal(harness.query.enabled, false, "hide retires unsupplied demand");
  const replacement = { ...source.data, context: { ...source.data.context, contextRevision: source.data.context.contextRevision + 1 } };
  const invalidated = render(a, true, replacement);
  assert.equal(invalidated.pending, true); assert.equal(presentSkyTime(replacement, a, invalidated.model), null);
});

test("explicit Play upgrades the same query to full supply without imposing a short-window playback stop", () => {
  const { source, geometryWindow, prior } = skyTimeTestFixture();
  const harness = geometryHarness(source.data), at = "2026-09-29T13:59:59.000Z";
  const short = shortWindow(geometryWindow, at, prior.data.timezone);
  harness.render(at); const previewKey = JSON.stringify(harness.query.queryKey);
  harness.cache.set(previewKey, short);
  const preview = harness.render(at);
  assert.equal(preview.model, short.data.model); assert.equal(preview.playbackReady, false);
  const time = createSkyObservationTime();
  time.bind("current", prior.data.selectedAtUtc, preview.model); time.preview(at); time.requestPlay();
  const pending = harness.render(at, true, source.data, time.snapshot().playRequested);
  const playKey = JSON.stringify(harness.query.queryKey);
  assert.notEqual(playKey, previewKey); assert.equal(harness.query.queryKey.at(-1), "NIGHT");
  assert.equal(pending.playbackPending, true); assert.equal(pending.model, short.data.model);
  assert.equal(pending.pending, false, "current preview remains valid while Play prepares");
  harness.errors.add(playKey);
  assert.equal(harness.render(at, true, source.data, true).playbackFailed, true);
  assert.equal(time.snapshot().mode, "PREVIEW", "a failed full request cannot begin playback using short coverage");
  harness.errors.delete(playKey); harness.cache.set(playKey, geometryWindow);
  const ready = harness.render(at, true, source.data, true);
  assert.equal(ready.playbackReady, true); assert.equal(ready.model, geometryWindow.data.model);
  time.bind("current", prior.data.selectedAtUtc, ready.model); time.play(10_000);
  const beyondShort = time.tick(12_000);
  assert.equal(beyondShort.mode, "PLAYING"); assert(Date.parse(beyondShort.at) > Date.parse(short.data.model.endAt));
  assert.equal(presentSkyTime(source.data, beyondShort.at, ready.model)!.row.at, beyondShort.at);
  harness.render(beyondShort.at, true, source.data, true);
  assert.equal(harness.query.enabled, false, "1x uses the already admitted full model without polling another window");
});

test("a cancelled Play query cannot install its full window over newer manual demand, hide or replacement", () => {
  const { source, geometryWindow, prior } = skyTimeTestFixture();
  const harness = geometryHarness(source.data), a = "2026-09-29T13:00:00.000Z", b = "2026-09-28T13:00:00.000Z";
  harness.render(a); const shortKey = JSON.stringify(harness.query.queryKey);
  const short = shortWindow(geometryWindow, a, prior.data.timezone); harness.cache.set(shortKey, short);
  harness.render(a); harness.render(a, true, source.data, true); const retiredKey = JSON.stringify(harness.query.queryKey);
  const time = createSkyObservationTime(); time.bind("current", prior.data.selectedAtUtc, short.data.model);
  time.preview(a); time.requestPlay(); time.preview(b);
  const pending = harness.render(b, true, source.data, time.snapshot().playRequested);
  assert.equal(harness.query.queryKey.at(-1), "TWO_HOURS"); assert.equal(pending.pending, true);
  harness.cache.set(retiredKey, geometryWindow);
  assert.equal(harness.render(b).model, short.data.model, "late full A remains outside the current B query and retained input");
  assert.equal(presentSkyTime(source.data, b, harness.render(b).model), null);
  harness.render(a, true, source.data, true); time.preview(a); time.requestPlay();
  time.hide(0); harness.render(a, false, source.data, time.snapshot().playRequested);
  assert.equal(time.snapshot().playRequested, false); assert.equal(harness.query.enabled, false);
  const replacement = { ...source.data, context: { ...source.data.context, contextRevision: source.data.context.contextRevision + 1 } };
  const fresh = harness.render(a, true, replacement);
  assert.equal(fresh.pending, true); assert.equal(fresh.playbackReady, false);
  assert.equal(presentSkyTime(replacement, a, fresh.model), null);
});

test("client opts short preview into both the HTTP request and admission identity, preserving the legacy full default", async () => {
  const { source, geometryWindow, prior } = skyTimeTestFixture(), at = "2026-09-29T13:00:17.123Z";
  const binding = { spotId: source.data.context.spotId, contextId: prior.data.contextId, contextRevision: prior.data.revision,
    contextFingerprint: prior.data.contextFingerprint, at, timezone: prior.data.timezone,
    observer: source.data.observationFrames![0]!.observer };
  const short = shortWindow(geometryWindow, at, prior.data.timezone);
  const noonBinding = { ...binding, at: geometryWindow.data.model.startAt };
  assert.notDeepEqual(skyGeometryWindowKey(noonBinding), skyGeometryWindowKey({ ...noonBinding, windowMode: "TWO_HOURS" }),
    "sharing a start instant does not make full and short responses interchangeable");
  const parsed = ts.createSourceFile("sky-celestial-client.ts", readFileSync(new URL("../../services/sky-celestial-client.ts", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true);
  const declaration = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "getSkyGeometryWindow")!;
  const requests: any[] = [], invalidated: string[] = []; let response = geometryWindow;
  const get = vm.runInNewContext(ts.transpileModule(declaration.getText(parsed).replace(/^export /, "") + "\ngetSkyGeometryWindow;",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    skyGeometryWindowKey, matchingSkyGeometryWindow, encodeURIComponent,
    requestOperation: (key: string, operation: string, options: unknown) => { requests.push({ key, operation, options }); return Promise.resolve(response); },
    invalidateApiCache: (key: string) => invalidated.push(key),
  });
  const signal = new AbortController().signal;
  assert.strictEqual(await get(binding, signal), geometryWindow);
  assert(!requests[0].options.query.includes("window=")); assert.strictEqual(requests[0].options.signal, signal);
  response = short;
  assert.strictEqual(await get({ ...binding, windowMode: "TWO_HOURS" }, signal), short);
  assert(requests[1].options.query.endsWith("&window=TWO_HOURS")); assert.notEqual(requests[0].key, requests[1].key);
  response = geometryWindow;
  await assert.rejects(get({ ...binding, windowMode: "TWO_HOURS" }, signal), /sky_geometry_window_binding_invalid|sky_time_model_invalid/);
  assert.deepEqual(invalidated, [requests[2].key + ":"], "a response for the other mode cannot poison the selected window's cache");
});

// Execute the real page selection and the real draw/resource input expressions.
// This covers their shared time meaning, not React, native pixels or latency.
function createPageTimePresentation() {
  const slots: { deps: readonly unknown[]; value: unknown }[] = [];
  const observationTime = createSkyObservationTime();
  return (input: Record<string, unknown>) => {
    let cursor = 0;
    return pageTimePresentation({ observationTime, ...input }, (make, deps) => {
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
  const geometrySource = ts.createSourceFile("geometry.ts", readFileSync(new URL("./use-sky-time-geometry.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const covers = geometrySource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "skyTimeModelCovers");
  assert(covers);
  const skyTimeModelCovers = vm.runInNewContext(compile(`(${covers.getText(geometrySource).replace(/^export /, "")})`));
  // Existing presenter-only cases use one explicit neutral time generation.
  // Motion/retirement cases supply the real time owner's complete snapshot.
  const timeIntent = { ...createSkyObservationTime().snapshot(), binding: input.timeBinding ?? "current",
    committedAt: input.committedAt, at: input.requestedAt, ...(input.timeIntent as object ?? {}) };
  const context = vm.createContext({ ...timePresentationOwner, attachSkyCatalog, skyTimePreviewStatus,
    skyObservationFrameAt, skyObservationFrameCurrent, skyContinuousTimeCoverage, skyTimeModelCovers,
    useMemo, fineTargetData: null, stellarCatalog: {},
    pageVisible: true, skyResourcesActive: true, mode: "NIGHT", canvasError: null,
    timeBinding: "current", skyInteractionRevision: 1, canvasNodeRevision: 1,
    canvasGenerationRef: { current: 1 }, timePlaying: false,
    previewGeometry: { failed: false }, presentedSkyFrameRef: { current: input.presentedSkyFrame ?? null }, ...input, timeIntent });
  const names = ["restoredAt", "intentPresentationAt", "timePresentationScope", "acceptedTimePresentationFor", "acceptedTimePresentation", "acceptedMotionPresentation",
    "preparedTimeSample", "presentationAt", "previewCoverage", "presentationModel", "presentationSources", "requestedTimePresentation", "timePresentation", "timeGeometryReady",
    "timeRuler", "timeRows",
    "geometryReport", "renderTimePresentation", "reportData", "row", "timePreviewStatus"];
  vm.runInContext(compile(names.filter(name => declarations.has(name)).map(name =>
    `const ${declarations.get(name)!.getText(source)};`).join("\n")), context);
  const selection = vm.runInContext("({timePresentationScope,timePresentation,renderTimePresentation,timeGeometryReady,timeRows,geometryReport,reportData,row,timePreviewStatus})", context);
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
  const drawInput = Object.fromEntries(["data", "frameAt", "timePresentation", "timePresentationScope", "timeGeneration"].map(name => {
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
    timeGeneration: result.drawInput.timeGeneration,
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

// The real page stages and publishes the controlled renderer receipt. This
// boundary proves ordering and time identity, not GPU pixels or full catalogs.
function timePreviewCanvas(time: ReturnType<typeof createSkyObservationTime>) {
  const page = ts.createSourceFile("sky.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const presentedSkyFrameRef = { current: null as any }, paintedSkyObjectsRef = { current: null as any };
  let copies = 0;
  return {
    presentedSkyFrameRef, paintedSkyObjectsRef, copies: () => copies,
    prepare(result: ReturnType<typeof pageTimePresentation>, clear = false) {
      const owner = skyPagePaintCommit(page, { observationTime: time, presentedSkyFrameRef, paintedSkyObjectsRef,
        canvasSurfaceRef: { current: { present() { copies++; } } }, setPresentedCamera() {},
        frame: { ...result.drawInput, mode: "NIGHT", sceneReady: !clear,
          ...(clear ? { data: undefined, frameAt: undefined } : {}) } });
      const identity = owner.submitted()!.identity;
      owner.stage(clear ? null : { ...skyPageEmptyPick(identity), objects: [
        { reference: "HR:1", displayName: "controlled receipt", kind: "STAR", magnitude: 1, x: 190, y: 420 },
      ] }, { sdssOptical: null, deepSkyImage: null });
      return owner;
    },
  };
}

test("a minute step feeds real intermediate geometry to every consumer and becomes ready only after final native acceptance", () => {
  const { source, prior } = skyTimeTestFixture(), model = skyPresentationTimeModel(source.data)!;
  const from = "2026-09-30T14:15:17.123Z", target = "2026-09-30T14:16:17.123Z";
  const committedAt = prior.data.selectedAtUtc, time = createSkyObservationTime();
  time.bind("current", committedAt, model); time.preview(from);
  const canvas = timePreviewCanvas(time), render = createPageTimePresentation();
  const base = { observationTime: time, rawReportData: source.data, committedAt, timeModel: model,
    timeGeometrySources: undefined, report: { isError: false, data: source } };
  const current = () => render({ ...base, timeIntent: time.snapshot(), requestedAt: time.snapshot().at,
    presentedSkyFrame: canvas.presentedSkyFrameRef.current, presentedSkyFrameRef: canvas.presentedSkyFrameRef,
    acceptedClockAt: canvas.presentedSkyFrameRef.current?.frameAt });
  const origin = current(); canvas.prepare(origin).complete();
  assert.equal(current().timePreviewStatus.ready, true);
  time.preview(target, { fromAt: canvas.presentedSkyFrameRef.current.frameAt, elapsedAt: 1000 });
  const originalGeometry = evaluateSkyTimeModel(model, from)!;
  for (const elapsed of [16, 80, 160]) {
    time.tick(1000 + elapsed);
    const at = skyObservationFrameAt(time.snapshot()), result = current();
    assert.equal(time.snapshot().at, target); assert.equal(time.snapshot().committedAt, committedAt);
    assert.equal(result.row.at, at); assert.equal(result.drawInput.frameAt, at);
    const expected = evaluateSkyTimeModel(model, at)!;
    assert(expected && at !== from);
    assert.deepEqual(result.geometryReport.observationFrames[0], expected.observationFrame);
    assert.notDeepEqual(expected.observationFrame.equatorialToEnu, originalGeometry.observationFrame.equatorialToEnu);
    assert.equal(result.geometryReport.skyScene.frames[0].at, at);
    assert.deepEqual(result.geometryReport.skyScene.frames[0].geometry.equatorialToEnu, expected.observationFrame.equatorialToEnu);
    assert.strictEqual(result.geometryReport.skyScene.deepSky.catalog, source.data.skyScene.deepSky!.catalog);
    for (const resource of result.resourceInputs) {
      assert.equal(resource.at, at, resource.name);
      assert.strictEqual(resource.report, resource.name === "useSkyStellarSupplement" ? result.reportData.skyScene : result.geometryReport);
    }
    const priorCopies = canvas.copies(), oldFrame = canvas.presentedSkyFrameRef.current;
    const submission = canvas.prepare(result);
    assert.equal(canvas.copies(), priorCopies); assert.strictEqual(canvas.presentedSkyFrameRef.current, oldFrame);
    assert.equal(current().timePreviewStatus.ready, false, "geometry and staged receipts cannot certify native copy");
    submission.complete();
    assert.equal(canvas.copies(), priorCopies + 1); assert.equal(canvas.presentedSkyFrameRef.current.frameAt, at);
    assert.equal(canvas.paintedSkyObjectsRef.current.objects.length, 1, "a nonempty controlled receipt must actually publish");
    assert.equal(current().timePreviewStatus.ready, elapsed === 160);
    assert.equal(current().timePreviewStatus.presentedAt, at);
  }
  assert.equal(time.snapshot().previewMotion, null); assert.equal(time.snapshot().at, target);
});

test("late native completions cannot revive retired time intents or rewind a settled forward or reverse step", () => {
  const { source, prior } = skyTimeTestFixture(), model = skyPresentationTimeModel(source.data)!;
  const from = "2026-09-30T14:15:17.123Z", to = "2026-09-30T14:16:17.123Z", committedAt = prior.data.selectedAtUtc;
  for (const reverse of [false, true]) {
    const origin = reverse ? to : from, target = reverse ? from : to;
    const time = createSkyObservationTime(); time.bind("current", committedAt, model); time.preview(origin);
    const canvas = timePreviewCanvas(time), render = createPageTimePresentation();
    const current = () => render({ observationTime: time, rawReportData: source.data, committedAt,
      timeModel: model, timeIntent: time.snapshot(), requestedAt: time.snapshot().at, timeGeometrySources: undefined,
      report: { isError: false, data: source }, presentedSkyFrame: canvas.presentedSkyFrameRef.current,
      presentedSkyFrameRef: canvas.presentedSkyFrameRef, acceptedClockAt: canvas.presentedSkyFrameRef.current?.frameAt });
    canvas.prepare(current()).complete();
    time.preview(target, { fromAt: origin, elapsedAt: 1000 }); time.tick(1040);
    const early = canvas.prepare(current());
    time.tick(1160); canvas.prepare(current()).complete();
    const accepted = canvas.presentedSkyFrameRef.current, copies = canvas.copies();
    assert.equal(accepted.frameAt, target); early.complete();
    assert.strictEqual(canvas.presentedSkyFrameRef.current, accepted); assert.equal(canvas.copies(), copies);
    // The clock may visit exactly the same instant again, but the old paint
    // belongs to a retired intent even when its geometry still matches.
    for (const retire of [() => { time.cancel(); time.preview(target); },
      () => { time.hide(2000); time.preview(target); },
      () => { time.preview(origin); time.preview(target); }]) {
      const pending = canvas.prepare(current()), before = canvas.copies();
      retire(); pending.complete();
      assert.equal(canvas.copies(), before); assert.strictEqual(canvas.presentedSkyFrameRef.current, accepted);
    }
    canvas.prepare(current()).complete();
    assert.equal(canvas.presentedSkyFrameRef.current.frameAt, target);
    assert.equal(canvas.presentedSkyFrameRef.current.timeGeneration, time.snapshot().presentationGeneration);
    const beforeClear = canvas.copies(); canvas.prepare(current(), true).complete();
    assert.equal(canvas.copies(), beforeClear + 1); assert.equal(canvas.presentedSkyFrameRef.current, null);
    assert.equal(canvas.paintedSkyObjectsRef.current, null, "current unavailability must still retire the old pixels and picks");
  }
});

test("a held field can copy a real completed frame after the next same-direction repeat arrives", () => {
  const { source, prior } = skyTimeTestFixture(), model = skyPresentationTimeModel(source.data)!;
  const from = "2026-09-30T14:15:17.123Z", committedAt = prior.data.selectedAtUtc;
  const stepAt = (minutes: number) => new Date(Date.parse(from) + minutes * 60_000).toISOString();
  const time = createSkyObservationTime(); time.bind("current", committedAt, model); time.preview(from);
  const canvas = timePreviewCanvas(time), render = createPageTimePresentation();
  const current = () => render({ observationTime: time, rawReportData: source.data, committedAt,
    timeModel: model, timeIntent: time.snapshot(), requestedAt: time.snapshot().at, timeGeometrySources: undefined,
    report: { isError: false, data: source }, presentedSkyFrame: canvas.presentedSkyFrameRef.current,
    presentedSkyFrameRef: canvas.presentedSkyFrameRef, acceptedClockAt: canvas.presentedSkyFrameRef.current?.frameAt });
  canvas.prepare(current()).complete();
  time.edit("fields", true);
  time.preview(stepAt(1), { fromAt: from, elapsedAt: 0 }); time.tick(160);
  canvas.prepare(current()).complete();
  const firstAccepted = canvas.presentedSkyFrameRef.current.frameAt;
  time.preview(stepAt(2), { fromAt: firstAccepted, elapsedAt: 380 }); time.tick(420);
  const queued = current(), delayed = canvas.prepare(queued), before = canvas.copies();
  assert(queued.row.at > firstAccepted && queued.row.at < stepAt(2));
  time.preview(stepAt(3), { fromAt: firstAccepted, elapsedAt: 450 });
  delayed.complete();
  assert.equal(canvas.copies(), before + 1, "the next repeat must not starve the already completed native draw");
  assert.equal(canvas.presentedSkyFrameRef.current.frameAt, queued.row.at);
  assert.equal(current().timePreviewStatus.presentedAt, queued.row.at, "report the actual copied time while the target advances");
  assert.equal(current().timePreviewStatus.ready, false, "an earlier visible frame is not the final target");
  time.edit("fields", false); time.tick(610);
  canvas.prepare(current()).complete();
  assert.equal(canvas.presentedSkyFrameRef.current.frameAt, stepAt(3));
  assert.equal(current().timePreviewStatus.ready, true);
});
