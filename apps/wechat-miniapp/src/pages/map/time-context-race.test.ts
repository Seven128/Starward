import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { instantForCivilDate } from "../../components/observation-date";

function runtime(bypassOwnershipGuard = false, kind: "time" | "date" = "time") {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callback = kind === "date" ? "commitMapDate" : "commitMapTime";
  let declaration = "";
  const expressions = new Map<string, string>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === callback) declaration = `const ${node.getText(source)};`;
    if (ts.isVariableDeclaration(node) && node.initializer) expressions.set(node.name.getText(source), node.initializer.getText(source));
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  if (bypassOwnershipGuard) {
    // Test-only mutation of the extracted production callback; source stays intact.
    const mutated = declaration.replace(
      /const isCurrentTimeRequest = \(\) => \{[\s\S]*?\n\s*\};/,
      "const isCurrentTimeRequest = () => true;",
    );
    assert.notEqual(mutated, declaration, "the intended ownership guard must be located");
    declaration = mutated;
  }
  const activeContext = { contextId: "a", revision: 1, contextFingerprint: "first", timezone: "Asia/Shanghai",
    selectedAtUtc: kind === "date" ? "2026-10-11T16:00:00.264Z" : "2026-09-06T12:00:00Z" };
  const state = { mapResetVersion: 0, selectedSpotId: "a", observationContext: { ...activeContext },
    retiredObservationContextId: null as string | null,
    beginObservationContextEdit: () => ({}), finishObservationContextEdit() {} };
  const generation = { current: 0 }, busy = { current: false };
  const contexts: unknown[] = [], failures: unknown[] = [], saving: boolean[] = [];
  const requests: { resolve(value: unknown): void; reject(error: Error): void; patch: Record<string, unknown> }[] = [];
  const scope: Record<string, any> = {
    activeContext, mapResetVersion: 0, detailRequestGeneration: generation, timeRequestBusy: busy,
    timeFrames: [{ atUtc: "2026-09-06T13:00:00Z" }],
    useAppStore: { getState: () => state },
    setPreviewAt() {}, setTimePreviewing() {}, setAnnouncement() {},
    setTimeSaving: (value: boolean) => saving.push(value),
    setTemporalFailure: (value: unknown) => { failures.push(value); scope.temporalFailure = value; },
    setObservationContext: (value: unknown) => contexts.push(value),
    formatContextTime: () => "time", errorMessage: () => "failure",
    selectedMapCivilDate: "2026-10-12", instantForCivilDate,
    isMiniappRequestCancelled: () => false,
    updateObservationContext: (_context: unknown, patch: Record<string, unknown>) => new Promise((resolve, reject) => requests.push({ resolve, reject, patch })),
  };
  const evaluate = (code: string) => vm.runInNewContext(ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, scope);
  const commit = evaluate(declaration + `\n${callback};`) as (value: string) => Promise<void>;
  const expression = (name: string) => { const value = expressions.get(name); assert.ok(value); return evaluate(`(${value});`); };
  return { commit, state, generation, busy, requests, contexts, failures, saving, scope, expression };
}

function assertNoStaleEffects(map: ReturnType<typeof runtime>) {
  assert.deepEqual(map.contexts, []);
  assert.deepEqual(map.failures, [null]);
  assert.equal(map.busy.current, false);
}

test("late time success and failure cannot affect a replaced spot, reset, or context revision", async () => {
  for (const change of ["spot", "reset", "revision", "selection-generation", "retired-aba"] as const) {
    for (const failure of [false, true]) {
      const map = runtime();
      const pending = map.commit("2026-09-06T13:00:00Z");
      if (change === "spot") map.state.selectedSpotId = "b";
      if (change === "reset") map.state.mapResetVersion++;
      if (change === "revision") map.state.observationContext.revision++;
      if (change === "selection-generation") map.generation.current++;
      if (change === "retired-aba") map.state.retiredObservationContextId = map.state.observationContext.contextId;
      if (failure) map.requests[0]!.reject(new Error("late"));
      else map.requests[0]!.resolve({ data: { selectedAtUtc: "late" } });
      await pending;
      assertNoStaleEffects(map);
    }
  }
});

test("the stale-response regression detects removal of the production ownership guard", async () => {
  for (const failure of [false, true]) {
    const map = runtime(true);
    const pending = map.commit("2026-09-06T13:00:00Z");
    map.state.selectedSpotId = "b";
    if (failure) map.requests[0]!.reject(new Error("late"));
    else map.requests[0]!.resolve({ data: { selectedAtUtc: "late" } });
    await pending;
    assert.throws(() => assertNoStaleEffects(map), { name: "AssertionError" });
  }
});

test("same-turn duplicate submit is ignored while a current response still commits", async () => {
  const map = runtime();
  const pending = map.commit("2026-09-06T13:00:00Z");
  await map.commit("2026-09-06T13:00:00Z");
  assert.equal(map.requests.length, 1);
  const context = { selectedAtUtc: "2026-09-06T13:00:00Z", timezone: "UTC" };
  map.requests[0]!.resolve({ data: context });
  await pending;
  assert.deepEqual(map.contexts, [context]);
  assert.deepEqual(map.saving, [true, false]);
});

test("current time failure remains actionable", async () => {
  const map = runtime();
  const pending = map.commit("2026-09-06T13:00:00Z");
  map.requests[0]!.reject(new Error("current"));
  await pending;
  assert.equal(map.failures.length, 2);
  assert.equal((map.failures[1] as { kind: string; target: string }).kind, "time");
  assert.equal((map.failures[1] as { kind: string; target: string }).target, "2026-09-06T13:00:00Z");
});

test("cloud time failure remains visible and retries its exact intent while the independent Scene is pending", async () => {
  const map = runtime(), instant = "2026-09-06T13:00:00Z";
  map.scope.timeFrames = [];
  map.scope.selectedSpotId = map.state.selectedSpotId;
  map.scope.mapDateOptions = [];
  const pending = map.commit(instant);
  map.requests[0]!.reject(new Error("temporary time failure")); await pending;
  const failure = map.expression("visibleTemporalFailure");
  assert.ok(failure, "a ready cloud axis must not wait for Scene to show its time failure");
  assert.equal(failure.target, instant);
  map.scope.visibleTemporalFailure = failure;
  let retried: Promise<void> | undefined;
  map.scope.commitMapTime = (value: string) => { retried = map.commit(value); return retried; };
  map.expression("retryTemporalFailure")();
  assert.equal(map.requests.length, 2);
  assert.equal(map.requests[1]!.patch.selectedAt, instant);
  map.requests[1]!.resolve({ data: { ...map.state.observationContext, selectedAtUtc: instant } }); await retried;
  assert.equal(map.expression("visibleTemporalFailure"), null);
  map.scope.temporalFailure = failure;
  map.generation.current++;
  assert.equal(map.expression("visibleTemporalFailure"), null, "replaced selection still retires the failure");
});

test("Map date commit sends the precise local time and observation night through the shared date owner", async () => {
  const map = runtime(false, "date");
  const pending = map.commit("2026-10-13");
  await map.commit("2026-10-14");
  assert.equal(map.requests.length, 1, "a busy date commit cannot submit another request");
  assert.deepEqual({ ...map.requests[0]!.patch }, {
    localDate: "2026-10-12", selectedAt: "2026-10-12T16:00:00.264Z", eventInstanceId: null,
  });
  const next = { ...map.state.observationContext, revision: 2, selectedAtUtc: "2026-10-12T16:00:00.264Z" };
  map.requests[0]!.resolve({ data: next });
  await pending;
  assert.deepEqual(map.contexts, [next]);
  assert.deepEqual(map.failures, [null], "a successful date commit must not also publish a failure");
  assert.equal(map.busy.current, false);
});

test("Map date success and failure stay retired after a Context or selection replacement", async () => {
  for (const change of ["spot", "reset", "revision", "selection-generation"] as const) {
    for (const failure of [false, true]) {
      const map = runtime(false, "date");
      const pending = map.commit("2026-10-13");
      if (change === "spot") map.state.selectedSpotId = "b";
      if (change === "reset") map.state.mapResetVersion++;
      if (change === "revision") map.state.observationContext.revision++;
      if (change === "selection-generation") map.generation.current++;
      if (failure) map.requests[0]!.reject(new Error("late date"));
      else map.requests[0]!.resolve({ data: { selectedAtUtc: "late date" } });
      await pending;
      assertNoStaleEffects(map);
    }
  }
});
