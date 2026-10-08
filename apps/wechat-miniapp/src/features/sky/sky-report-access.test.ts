import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

class MiniappApiError extends Error {
  constructor(readonly code: string) { super(code); }
}
const policy = readFileSync(new URL("./sky-report-access.ts", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/u, "");
const reject = vm.runInNewContext(ts.transpileModule(policy + "\nskyReportAccessRejection;", {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText.replace(/^export /gmu, ""), { MiniappApiError, exports: {} }) as (error: unknown) => MiniappApiError | null;
const client = ts.createSourceFile("api-client.ts", readFileSync(new URL("../../services/api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const errorMessage = client.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "errorMessage");
assert.ok(errorMessage);
const recovery = vm.runInNewContext(ts.transpileModule(errorMessage.getText(client) + "\n" + policy + "\nskyReportRecovery;", {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText.replace(/^export /gmu, ""), { MiniappApiError, exports: {} }) as (error: unknown, data: boolean, state?: string) => { reason: string; label: string; detail: string };

test("recovery explains authoritative rejection without promising a network repair", () => {
  for (const [code, meaning] of [["PERMISSION_DENIED", "权限"], ["NOT_FOUND", "不存在或已失效"], ["STALE_REJECTED", "过期"], ["INVALID_INPUT", "观测信息"]] as const) {
    const result = recovery(new MiniappApiError(code), false);
    assert.equal(result.reason, code); assert.equal(result.label, "重新核验");
    assert.ok(result.detail.includes(meaning));
    assert.ok(result.detail.includes("所选地点与时刻已保留"));
    assert.ok(result.detail.includes("返回入口")); assert.ok(!result.detail.includes("网络恢复"));
  }
});
test("temporary failure keeps usable data meaning distinct from denied access", () => {
  const error = new MiniappApiError("PROVIDER_UNAVAILABLE");
  assert.equal(recovery(error, true).label, "重试更新");
  assert.ok(recovery(error, true).detail.includes("保留已取得的有效星空"));
  assert.equal(recovery(error, false).label, "重试天空");
  assert.ok(!recovery(error, false).detail.includes("有效星空"));
  assert.equal(recovery(undefined, false, "EXPIRED").label, "重新加载天空");
});

test("current-scope permission, missing, expired and invalid responses revoke Sky data", () => {
  for (const code of ["PERMISSION_DENIED", "NOT_FOUND", "STALE_REJECTED", "INVALID_INPUT"]) {
    const error = new MiniappApiError(code);assert.equal(reject(error), error);
  }
});
test("ordinary outages keep independently valid astronomy usable", () => {
  for (const code of ["PROVIDER_UNAVAILABLE", "CAPABILITY_DISABLED", "BUDGET_EXCEEDED", "CONFLICT"]) {
    assert.equal(reject(new MiniappApiError(code)), null);
  }
  assert.equal(reject(new Error("request:fail network")), null);
  assert.equal(reject({ code: "PERMISSION_DENIED" }), null);
});
test("Sky applies the rejection before every report consumer without changing shared Query", () => {
  const source=ts.createSourceFile("spot-sky-page.tsx",readFileSync(new URL("./spot-sky-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declarations=new Map<string,ts.Expression>();
  function visit(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.initializer)declarations.set(node.name.getText(source),node.initializer);ts.forEachChild(node,visit);}visit(source);
  const expression=declarations.get("report");assert.ok(expression);
  const query={data:{skyScene:{state:"READY"}},error:null,isError:false,isPending:false,refreshError:new MiniappApiError("PERMISSION_DENIED"),refetch:async()=>undefined};
  const rejected=reject(query.refreshError);
  const read=(error:unknown)=>vm.runInNewContext(ts.transpileModule(expression.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{reportQuery:query,rejectedReportError:error});
  const blocked=read(rejected);assert.equal(blocked.data,undefined);assert.equal(blocked.isError,true);assert.equal(blocked.error,rejected);assert.equal(blocked.refetch,query.refetch);assert.equal(query.data.skyScene.state,"READY","don't evict or mutate shared cache");
  assert.equal(read(null),query);
});
