import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { localParts } from "@starward/miniapp-contracts";
import { observationNightForInstant } from "../../components/observation-date";

const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
const helpers = source.statements.filter(node => ts.isFunctionDeclaration(node) &&
  ["isDate", "isSelectedAt", "validTimezone", "observationDateFor"].includes(node.name?.text ?? ""));
assert.equal(helpers.length, 4);
const gate = page.body!.statements.find(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(item => item.name.getText(source) === "routeContextComplete"));
assert(gate);
const recovery = page.body!.statements.find(node => ts.isIfStatement(node) &&
  node.expression.getText(source) === "!contextComplete || !activeContext") as ts.IfStatement;
assert(recovery);
assert(recovery.thenStatement.getText(source).includes("return"));
const timeControls = source.text.indexOf("<SkyTimeControls");
assert(timeControls > recovery.end, "unresolved route returns before constructing civil time controls");
const code = ts.transpileModule(helpers.map(node => node.getText(source)).join("\n") + "\n" +
  gate.getText(source) + "\nrouteContextComplete", {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
const instant = "2026-09-28T16:00:00.000Z";
const route = (timezone: string) => ({spotId: "spot:a", contextId: "ctx:a", localDate: "2026-09-28",
  selectedAt: instant, timezone, dataRevision: "data:1"});
const complete = (routeContext: ReturnType<typeof route>) => vm.runInNewContext(code,
  {routeContext, observationNightForInstant, useMemo: (factory: () => unknown) => factory()});

test("invalid route time stays behind Context recovery instead of constructing civil controls", () => {
  for (const timezone of ["", "Asia%2FShanghai", "not-a-timezone"])
    assert.equal(complete(route(timezone)), false);
  assert.equal(complete({...route("Asia/Shanghai"), selectedAt: ""}), false);
  assert.equal(complete(route("Asia/Shanghai")), true);
});

test("resolved route metadata becomes usable without requiring a timezone change", () => {
  assert.equal(complete({...route("Asia/Shanghai"), dataRevision: ""}), false);
  assert.equal(complete(route("Asia/Shanghai")), true);
  assert.equal(complete({...route("Asia/Shanghai"), contextId: ""}), false);
});

test("current six-field time controls format the requested instant across midnight and timezone changes", () => {
  let at = "", timezone = "";
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "SkyTimeControls") {
      for (const prop of node.attributes.properties) if (ts.isJsxAttribute(prop) && prop.initializer &&
        ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
        if (prop.name.getText(source) === "at") at = prop.initializer.expression.getText(source);
        if (prop.name.getText(source) === "timezone") timezone = prop.initializer.expression.getText(source);
      }
    }
    ts.forEachChild(node, visit);
  }; visit(source); assert.equal(at, "requestedAt"); assert.equal(timezone, "routeContext.timezone");
  const controls = ts.createSourceFile("time.tsx", readFileSync(new URL("./sky-time-controls.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let parts: ts.Expression | undefined;
  const find = (node: ts.Node) => {if (ts.isVariableDeclaration(node) && node.name.getText(controls) === "parts") parts = node.initializer;
    ts.forEachChild(node, find);}; find(controls); assert(parts);
  const fields = (zone: string) => vm.runInNewContext(parts!.getText(controls), {localParts, draft: instant, timezone: zone});
  assert.equal(fields("Asia/Shanghai").day, 29); assert.equal(fields("Asia/Shanghai").hour, 0);
  assert.equal(fields("UTC").day, 28); assert.equal(fields("UTC").hour, 16);
});
