import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

for (const hasContext of [true, false]) test(`only the latest visible search selection may publish context or navigate (existing context: ${hasContext})`, async () => {
  const source = ts.createSourceFile("search.tsx", readFileSync(new URL("./search-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const component = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "MapSearchSurface");
  const declaration = component?.body?.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => item.name.getText(source) === "moveMapReference"));
  assert.ok(declaration);
  const selectionVersion = { current: 0 };
  const pending: Array<{ resolve(value: unknown): void; reject(error: unknown): void }> = [];
  const adopted: unknown[] = [];
  let navigations = 0;
  let notices = 0;
  const centers: unknown[] = [];
  let selections = 0;
  const requests: any[] = [];
  const move = vm.runInNewContext(ts.transpileModule(declaration.getText(source) + "\nmoveMapReference;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    selectionVersion, viewport: { zoom: 12 }, finderQuery: "测试",
    activeContext: hasContext ? { localDate: "2026-09-06", selectedAtUtc: "2026-09-06T12:00:00Z", eventInstanceId: null, targetProfile: "DAILY" } : null,
    localDateForNow: () => "2026-09-15",
    setSuggestionsOpen() {}, selectSpot() { selections++; }, setViewport(value: unknown) { centers.push(value); }, addSearchHistory() {}, setFinderQuery() {},
    gcj02ToWgs84: (point: unknown) => point, currentTimezoneHint: () => "Asia/Shanghai",
    resolveObservationContext: (input: any) => { requests.push(input); return new Promise((resolve, reject) => pending.push({ resolve, reject })); },
    setObservationContext: (value: unknown) => adopted.push(value), setAnnouncement() {},
    leaveSearch: async () => { navigations++; selectionVersion.current++; },
    isMiniappRequestCancelled: () => false, errorMessage: () => "network failed", notify: () => notices++,
  });
  const old = move({ label: "旧候选", location: { latitude: 22, longitude: 114 } });
  const latest = move({ label: "新候选", location: { latitude: 23, longitude: 115 } });
  assert.equal(selections, 0);
  assert.deepEqual(centers, []);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].localDate, hasContext ? "2026-09-06" : "2026-09-15");
  assert.equal("selectedAt" in requests[1], hasContext);
  pending[1]!.resolve({ data: "latest-context" });
  await latest;
  pending[0]!.resolve({ data: "old-context" });
  await old;
  assert.deepEqual(adopted, ["latest-context"]);
  assert.equal(navigations, 1);
  assert.equal(selections, 1);
  assert.equal(centers.length, 1);
  const hidden = move({ label: "离开前候选", location: { latitude: 24, longitude: 116 } });
  selectionVersion.current++;
  pending[2]!.reject(new Error("late failure"));
  await hidden;
  assert.equal(notices, 0);
  assert.equal(navigations, 1);
  const failed = move({ label: "失败候选", location: { latitude: 25, longitude: 117 } });
  pending[3]!.reject(new Error("current failure"));
  await failed;
  assert.equal(notices, 1);
  assert.equal(selections, 1);
  assert.equal(centers.length, 1);
  assert.deepEqual(adopted, ["latest-context"]);
});
