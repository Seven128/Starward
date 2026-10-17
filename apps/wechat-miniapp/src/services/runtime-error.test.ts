import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as query from "@tanstack/react-query";
import { reportRuntimeError } from "./runtime-error";
import { transportHarness } from "./api-request-test-support";
import { isMiniappRequestCancelled, MiniappRequestCancelled } from "./request-lifecycle";
import { createSkyCanvasLifecycle } from "../features/sky/sky-canvas-lifecycle";

async function captureErrors(work: (rows: unknown[][]) => unknown) {
  const before = console.error, rows: unknown[][] = [];
  console.error = (...parts) => { rows.push(parts); };
  try { await work(rows); } finally { console.error = before; }
}

test("shared error output is safe, keeps numeric native causes and reports one failure across owners", async () => {
  await captureErrors(rows => {
    const failure = Object.assign(new Error("https://private.invalid/?token=private-value"), { errno: 600001, errCode: -1202 });
    reportRuntimeError("request", "bff_transport_failed", failure, { stage: "transport" });
    reportRuntimeError("query", "query_failed", failure);
    reportRuntimeError("render", "sky_gpu_shader_failed", new Error("private native source"));
    assert.equal(rows.length, 2);
    assert.match(JSON.stringify(rows), /600001|-1202/u);
    assert.doesNotMatch(JSON.stringify(rows), /private|token|https/u);
    reportRuntimeError("native", "native_failed", Object.assign(new Error("native wrapper"), { cause: { errno: 600001 } }));
    reportRuntimeError("render", "sky_gpu_draw_failed", new Error("sky_gpu_draw_failed:1282"));
    assert.match(JSON.stringify(rows.at(-2)), /600001/u); assert.match(JSON.stringify(rows.at(-1)), /1282/u);
    const before = console.error; console.error = () => { throw Error("console unavailable"); };
    try { assert.doesNotThrow(() => reportRuntimeError("native", "native_failed", { get errno() { throw Error("private"); } })); }
    finally { console.error = before; }
  });
});

test("the common transport logs real HTTP, contract, timeout and native failures once, including successful stale fallback", async () => {
  const h = transportHarness(false, () => {}, true);
  await h.seed();
  const pending = h.request("scene", "/scene");
  const failure = { errMsg: "request:fail connection refused private-value" };
  h.calls.at(-1)!.fail(failure);
  h.taskRejections.at(-1)!(failure);
  assert.equal((await pending).dataState, "STALE_USABLE");
  assert.equal(h.runtimeErrors.length, 1, "native callback and task rejection share settlement");
  const cancel = new AbortController();
  const cancelled = h.request("cancel", "/cancel", { signal: cancel.signal }).catch(error => error);
  cancel.abort(); assert(isMiniappRequestCancelled(await cancelled));
  assert.equal(h.runtimeErrors.length, 1, "ordinary cancellation is not a failed request");
  for (const [statusCode, data, stage] of [[503, {}, "http"], [200, {}, "contract"]] as const) {
    const failed = h.request(stage, "/failure").catch(error => error);
    h.calls.at(-1)!.success({ statusCode, data }); await failed;
    assert.equal((h.runtimeErrors.at(-1)![3] as { stage: string }).stage, stage);
  }
  const timeout = h.request("scene", "/scene"); h.timeout();
  assert.equal((await timeout).dataState, "STALE_USABLE");
  assert.equal(h.runtimeErrors.length, 4);
  const dispatch = transportHarness(false, () => { throw Error("dispatch private-value"); });
  await assert.rejects(dispatch.request("dispatch", "/dispatch"));
  assert.equal(dispatch.runtimeErrors[0]![1], "bff_dispatch_failed");
});

test("actual Query and Mutation caches report handled errors and skip normal request cancellation", async () => {
  const file = process.env.MINIAPP_QUERY_CLIENT_TEST_SOURCE ?? new URL("./query-client.ts", import.meta.url);
  const exports: { miniappQueryClient?: query.QueryClient } = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: (id: string) => id === "@tanstack/react-query" ? query :
    id === "./platform-polyfills" ? { installAbortControllerPolyfill() {} } :
    id === "./request-lifecycle" ? { isMiniappRequestCancelled } : { reportRuntimeError } });
  const client = exports.miniappQueryClient!;
  client.setDefaultOptions({ queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } });
  try { await captureErrors(async rows => {
    await assert.rejects(client.fetchQuery({ queryKey: ["public-query"], retry: false, queryFn: () => { throw Error("private query body"); } }));
    const mutation = client.getMutationCache().build(client, { mutationFn: async () => { throw Error("private mutation body"); } });
    await assert.rejects(mutation.execute(undefined));
    assert.equal(rows.length, 2);
    await assert.rejects(client.fetchQuery({ queryKey: ["cancelled-query"], retry: false, queryFn: () => { throw new MiniappRequestCancelled("manual"); } }));
    assert.equal(rows.length, 2); assert.doesNotMatch(JSON.stringify(rows), /private/u);
  }); } finally { client.clear(); }
});

test("native Canvas failure reports once, fences stale callbacks and keeps original recovery", async () => {
  await captureErrors(rows => {
    const scheduled: (() => void)[] = [], failed: unknown[] = [];
    const clock = { schedule: (callback: () => void) => { scheduled.push(callback); return callback; }, cancel() {} };
    const canvas = createSkyCanvasLifecycle<number, object>({
      measure() { throw new Error("native private-value"); }, createContext: () => ({}), paint() {},
      presented() {}, invalidated() {}, failed: error => { failed.push(error); },
    }, clock);
    canvas.ready(); canvas.request(1); scheduled.shift()!();
    assert.equal(failed.length, 1); assert.equal(rows.length, 1);
    canvas.fail(new Error("late private failure")); assert.equal(rows.length, 1);
    assert.doesNotMatch(JSON.stringify(rows), /private/u); canvas.dispose();
  });
});

test("a shared optional shader failure is logged before its existing fallback absorbs it, with no per-frame retry", async () => {
  const file = ts.createSourceFile("renderer.ts", readFileSync(process.env.MINIAPP_RENDERER_TEST_SOURCE ??
    new URL("../features/sky/sky-gpu-renderer.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = new Map<string, string>();
  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ["makeProgram", "ensureSkyMesh"].includes(node.name.getText(file)))
      declarations.set(node.name.getText(file), node.getText(file));
    ts.forEachChild(node, visit);
  } visit(file); assert.equal(declarations.size, 2);
  await captureErrors(rows => {
    let attempts = 0;
    const prepare = vm.runInNewContext(ts.transpileModule(`let skyMesh=null,skyMeshBuffer=null,skyMeshUnavailable=false;
      const programs=[],buffers=[],gl={},skyMeshVertex='',skyMeshFragment='';
      const ${declarations.get("makeProgram")}; const ${declarations.get("ensureSkyMesh")}; ensureSkyMesh;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
      reportRuntimeError, createProgramInfo() { attempts++; throw new Error("private shader source"); }, assertAvailable() {},
    });
    assert.equal(prepare(), false); assert.equal(prepare(), false);
    assert.equal(attempts, 1); assert.equal(rows.length, 1);
    assert.match(JSON.stringify(rows), /sky_gpu_shader_failed/u); assert.doesNotMatch(JSON.stringify(rows), /private/u);
  });
});

test("optional ring draw reports consumed GL state before its fallback and keeps normal false results quiet",async()=>{
  const file=ts.createSourceFile('renderer.ts',readFileSync(new URL('../features/sky/sky-gpu-renderer.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
  let check='',method='';
  function visit(node:ts.Node):void{
    if(ts.isVariableDeclaration(node)&&node.name.getText(file)==='assertDrawCompleted')check=node.getText(file);
    if(ts.isMethodDeclaration(node)&&node.name.getText(file)==='saturnRings')method=node.getText(file);
    ts.forEachChild(node,visit);
  }visit(file);assert(method);
  await captureErrors(rows=>{
    let error=0,draws=0;
    const renderer=vm.runInNewContext(ts.transpileModule(`
      let ringsUnavailable=false,ringProgram={},ringBuffer={};const width=100,height=100;
      ${check?`const ${check};`:''}({${method}});`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
      reportRuntimeError,assertAvailable(){},flush(){},color:()=>[1,1,1],bodyDisplayUniforms:()=>({}),
      skyArtworkViewParameters:()=>({center:{x:50,y:50},scale:1}),SATURN_BANDS:[{},{},{outerKm:2}],SATURN_REFERENCE_RADIUS_KM:1,
      gl:{NO_ERROR:0,TRIANGLES:4,getError(){const value=error;error=0;return value;}},
      submit(){draws++;error=1282;},
    });
    const disc={x:50,y:50,radiusPx:10,oblate:{majorRadiusPx:10,minorRadiusPx:9,minorDirection:[0,1]},
      ringProjection:{majorScreen:[1,0],minorScreen:[0,1],opening:.5,majorEnu:[1,0,0],planeMinorEnu:[0,1,0],poleEnu:[0,0,1]}};
    const view={basis:{right:[1,0,0],up:[0,1,0],forward:[0,0,1]}};
    assert.equal(renderer.saturnRings({...disc,ringProjection:null},view,'#FFFFFF',false),false);assert.equal(rows.length,0);
    assert.equal(renderer.saturnRings(disc,view,'#FFFFFF',false),false);
    assert.equal(renderer.saturnRings(disc,view,'#FFFFFF',false),false);
    assert.equal(draws,1);assert.equal(rows.length,1,'the fallback absorbs this draw failure before Canvas/Page boundaries');
    assert.equal((rows[0]![1] as {gl:number}).gl,1282);assert.match(JSON.stringify(rows),/sky_gpu_saturn_rings_draw_failed/u);
  });
});
