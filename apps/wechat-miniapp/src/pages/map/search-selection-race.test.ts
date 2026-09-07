import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("only the latest visible search selection may publish context or navigate", async () => {
  const source = ts.createSourceFile("search.tsx", readFileSync(new URL("./search-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const component = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "MapSearchSurface");
  const declaration = component?.body?.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => item.name.getText(source) === "moveMapReference"));
  assert.ok(declaration);
  const selectionVersion = { current: 0 };
  const pending: Array<{ resolve(value: unknown): void; reject(error: unknown): void }> = [];
  const adopted: unknown[] = [];
  let navigations = 0;
  let notices = 0;
  const move = vm.runInNewContext(ts.transpileModule(declaration.getText(source) + "\nmoveMapReference;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    selectionVersion, viewport: { zoom: 12 }, finderQuery: "测试",
    activeContext: { localDate: "2026-09-06", selectedAtUtc: "2026-09-06T12:00:00Z", eventInstanceId: null, targetProfile: "DAILY" },
    setSuggestionsOpen() {}, selectSpot() {}, setViewport() {}, addSearchHistory() {},
    gcj02ToWgs84: (point: unknown) => point, currentTimezoneHint: () => "Asia/Shanghai",
    resolveObservationContext: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
    setObservationContext: (value: unknown) => adopted.push(value), setAnnouncement() {},
    leaveSearch: async () => { navigations++; selectionVersion.current++; },
    isMiniappRequestCancelled: () => false, errorMessage: () => "network failed", notify: () => notices++,
  });
  const old = move({ label: "旧候选", location: { latitude: 22, longitude: 114 } });
  const latest = move({ label: "新候选", location: { latitude: 23, longitude: 115 } });
  pending[1]!.resolve({ data: "latest-context" });
  await latest;
  pending[0]!.resolve({ data: "old-context" });
  await old;
  assert.deepEqual(adopted, ["latest-context"]);
  assert.equal(navigations, 1);
  const hidden = move({ label: "离开前候选", location: { latitude: 24, longitude: 116 } });
  selectionVersion.current++;
  pending[2]!.reject(new Error("late failure"));
  await hidden;
  assert.equal(notices, 0);
  assert.equal(navigations, 1);
});
