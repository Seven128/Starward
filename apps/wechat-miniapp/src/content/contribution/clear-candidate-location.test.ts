import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function clearSelectedPlace(mutate = (source: string) => source) {
  const source = ts.createSourceFile("use-contribution-form.ts", mutate(readFileSync(new URL("./use-contribution-form.ts", import.meta.url), "utf8")), ts.ScriptTarget.Latest, true);
  let body: string | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === "clearCandidateLocation") body = node.initializer.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(body, "exercise the actual location-clear owner");
  const state: Record<string, any> = { candidatePlaceLabel: "已选位置", candidateRegion: "原地址",
    candidateFields: { address: "原地址", name: "用户名称", detail: "独立说明" }, latitude: "22.650000", longitude: "114.110000",
    preciseLocationConsent: true, candidateSelectionVersion: 4 };
  const setters = Object.fromEntries(Object.keys(state).map(key => ["set" + key[0]!.toUpperCase() + key.slice(1),
    (value: any) => { state[key] = typeof value === "function" ? value(state[key]) : value; }]));
  vm.runInNewContext(ts.transpileModule(`(${body})();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, setters);
  return JSON.parse(JSON.stringify(state));
}

test("clearing an address retires its selected coordinates, marker version and consent while preserving independent text", () => {
  assert.deepEqual(clearSelectedPlace(), { candidatePlaceLabel: "", candidateRegion: "", candidateFields: { address: "", name: "用户名称", detail: "独立说明" },
    latitude: "", longitude: "", preciseLocationConsent: false, candidateSelectionVersion: 5 });
  assert.throws(() => assert.equal(clearSelectedPlace(source => source.replace('setLongitude("");', "")).longitude, ""), assert.AssertionError,
    "leaving half of the old coordinate must fail the actual owner assertion");
});
