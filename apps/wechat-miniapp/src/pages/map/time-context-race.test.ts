import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function runtime() {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "commitMapTime") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  const activeContext = { contextId: "a", revision: 1, contextFingerprint: "first", selectedAtUtc: "2026-09-06T12:00:00Z" };
  const state = { mapResetVersion: 0, selectedSpotId: "a", observationContext: { ...activeContext } };
  const generation = { current: 0 }, busy = { current: false };
  const contexts: unknown[] = [], notifications: unknown[] = [], saving: boolean[] = [];
  const requests: { resolve(value: unknown): void; reject(error: Error): void }[] = [];
  const commit = vm.runInNewContext(ts.transpileModule(declaration + "\ncommitMapTime;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    activeContext, mapResetVersion: 0, detailRequestGeneration: generation, timeRequestBusy: busy,
    timeFrames: [{ atUtc: "2026-09-06T13:00:00Z" }],
    useAppStore: { getState: () => state },
    setPanelPreviewFrameIndex() {}, setTimePreviewing() {}, setAnnouncement() {},
    setTimeSaving: (value: boolean) => saving.push(value),
    setObservationContext: (value: unknown) => contexts.push(value),
    notify: (value: unknown) => notifications.push(value),
    nearestMapTimeFrameIndex: () => 0, formatContextTime: () => "time", errorMessage: () => "failure",
    isMiniappRequestCancelled: () => false,
    updateObservationContext: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
  }) as (index: number) => Promise<void>;
  return { commit, state, generation, busy, requests, contexts, notifications, saving };
}

test("late time success and failure cannot affect a replaced spot, reset, or context revision", async () => {
  for (const change of ["spot", "reset", "revision", "selection-generation"] as const) {
    for (const failure of [false, true]) {
      const map = runtime();
      const pending = map.commit(0);
      if (change === "spot") map.state.selectedSpotId = "b";
      if (change === "reset") map.state.mapResetVersion++;
      if (change === "revision") map.state.observationContext.revision++;
      if (change === "selection-generation") map.generation.current++;
      if (failure) map.requests[0]!.reject(new Error("late"));
      else map.requests[0]!.resolve({ data: { selectedAtUtc: "late" } });
      await pending;
      assert.deepEqual(map.contexts, []);
      assert.deepEqual(map.notifications, []);
      assert.equal(map.busy.current, false);
    }
  }
});

test("same-turn duplicate submit is ignored while a current response still commits", async () => {
  const map = runtime();
  const pending = map.commit(0);
  await map.commit(0);
  assert.equal(map.requests.length, 1);
  const context = { selectedAtUtc: "2026-09-06T13:00:00Z", timezone: "UTC" };
  map.requests[0]!.resolve({ data: context });
  await pending;
  assert.deepEqual(map.contexts, [context]);
  assert.deepEqual(map.saving, [true, false]);
});

test("current time failure remains actionable", async () => {
  const map = runtime();
  const pending = map.commit(0);
  map.requests[0]!.reject(new Error("current"));
  await pending;
  assert.equal(map.notifications.length, 1);
});
