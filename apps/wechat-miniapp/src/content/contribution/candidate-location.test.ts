import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("choosing a point without a platform address never copies its name or the previous point's address", () => {
  const ast = ts.createSourceFile("form.ts", readFileSync(new URL("./use-contribution-form.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  let handler = "";
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === "selectCandidateLocation") handler = node.initializer.getText(ast);
    ts.forEachChild(node, visit);
  }; visit(ast); assert.ok(handler);
  let fields = { name: "我的点位名称", address: "旧点位地址" }, region = "旧地区", label = "", latitude = "", longitude = "";
  const select = vm.runInNewContext(ts.transpileModule(`(${handler})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    setCandidatePlaceLabel: (v: string) => { label = v; }, setCandidateName() {}, setCandidateRegion: (v: string) => { region = v; },
    setCandidateFields: (update: (v: typeof fields) => typeof fields) => { fields = update(fields); },
    setLatitude: (v: string) => { latitude = v; }, setLongitude: (v: string) => { longitude = v; }, setCandidateSelectionVersion() {},
  });
  select({ name: "所选地点", address: "", latitude: 22.5, longitude: 113.5 });
  assert.equal(fields.address, ""); assert.equal(region, ""); assert.equal(label, "所选地点");
  assert.equal(fields.name, "我的点位名称"); assert.equal(latitude, "22.500000"); assert.equal(longitude, "113.500000");
  select({ name: "", address: "", latitude: 0, longitude: 0 }); assert.equal(label, "0.0000, 0.0000");
  select({ name: "有效平台名称", address: "有效平台地址", latitude: 23, longitude: 114 });
  assert.equal(fields.address, "有效平台地址"); assert.equal(region, "有效平台地址");
});
