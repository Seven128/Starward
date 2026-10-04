import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import vm from "node:vm";
import assert from "node:assert/strict";
import ts from "typescript";
import sdk from "miniprogram-automator";
import { MINIAPP_API_BASE_PATH, MINIAPP_API_OPERATIONS } from "@starward/miniapp-contracts";
import * as recovery from "../../../../apps/wechat-miniapp/src/services/observation-context-recovery.ts";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const phase = process.argv[2]; assert.ok(["before", "after"].includes(phase));
const root = path.resolve("."), evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output = path.join(evidence, `experience-context-response-loss-${phase}-2026-09-28.json`);
assert.equal(await fs.access(output).then(() => true, () => false), false);
const source = ts.createSourceFile("api-client.ts", await fs.readFile(path.join(root, "apps/wechat-miniapp/src/services/api-client.ts"), "utf8"), ts.ScriptTarget.Latest, true);
const functionNames = ["getObservationContext", "restoreObservationContext", "updateObservationContext"];
const declarations = source.statements.filter(node => ts.isFunctionDeclaration(node) && functionNames.includes(node.name?.text ?? ""));
assert.equal(declarations.length, functionNames.length);
const errorClass = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === "MiniappApiError")!;
const compile = (text:string) => ts.transpileModule(text, {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const ApiError = vm.runInNewContext(compile(errorClass.getText(source).replace(/^export /u, "") + "\nMiniappApiError;"));
const proxyStats = { puts: 0, gets: 0, upstreamStatus: [] as number[], droppedSuccessfulResponse: 0 };
let drop = true;
const proxy = http.createServer((request,response) => {
  const isContext = /^\/v2\/observation-contexts\/[^/?]+$/.test(request.url ?? "");
  const isPut = isContext && request.method === "PUT";
  if(isPut) proxyStats.puts++; if(isContext && request.method === "GET") proxyStats.gets++;
  const upstream = http.request({hostname:"127.0.0.1",port:8789,path:request.url,method:request.method,headers:{...request.headers,host:"127.0.0.1:8789"}}, received => {
    if(isPut) proxyStats.upstreamStatus.push(received.statusCode ?? 0);
    if(isPut && drop && (received.statusCode ?? 0) >= 200 && (received.statusCode ?? 0) < 300) {
      drop = false; proxyStats.droppedSuccessfulResponse++; received.resume();
      received.once("end",()=>response.destroy()); return;
    }
    response.writeHead(received.statusCode ?? 502,received.headers); received.pipe(response);
  });
  upstream.setTimeout(8000,()=>upstream.destroy());
  upstream.on("error",()=>response.destroy()); request.on("aborted",()=>upstream.destroy()); request.pipe(upstream);
});
await new Promise<void>(resolve=>proxy.listen(0,"127.0.0.1",resolve));
const address = proxy.address(); assert.ok(address && typeof address === "object");
const base = `http://127.0.0.1:${address.port}`;
const program = await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:"ws://127.0.0.1:9441"}),5000); boundWechatProtocol(program);
let first:any, firstError:any, retry:any, retryError:any, direct:any;
const invalidations:string[] = [];
try {
  const page = await program.currentPage(); assert.equal(page.path,"sky/detail/index");
  // Only the current public fixture location is used. Identifiers remain in memory.
  const originalResponse = await fetch("http://127.0.0.1:8789/v2/observation-contexts/"+encodeURIComponent(decodeURIComponent(page.query.contextId)),{signal:AbortSignal.timeout(5000)});
  assert.equal(originalResponse.status,200); const original = (await originalResponse.json()).data;
  assert.equal(original.location.kind,"FORMAL_SPOT");
  const resolved = await fetch("http://127.0.0.1:8789/v2/observation-contexts/resolve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({location:{kind:"FORMAL_SPOT",spotId:original.location.spotId},localDate:"2026-09-28",selectedAt:"2026-09-28T16:00:00.000Z"}),signal:AbortSignal.timeout(5000)});
  assert.equal(resolved.status,201); const initial = (await resolved.json()).data;
  let keySequence = 0;
  const requestOperation = async (_key:string, operation:string, options:any) => {
    const declared = MINIAPP_API_OPERATIONS[operation as keyof typeof MINIAPP_API_OPERATIONS]; assert.ok(declared);
    let route:string = MINIAPP_API_BASE_PATH + declared.path;
    for(const [key,value] of Object.entries(options.pathParams ?? {})) route = route.replace("{"+key+"}",encodeURIComponent(String(value)));
    const response = await fetch(base+route,{method:declared.method,headers:{"content-type":"application/json",...(options.idempotencyKey?{"Idempotency-Key":options.idempotencyKey}:{})},...(options.body===undefined?{}:{body:JSON.stringify(options.body)}),signal:options.signal ?? AbortSignal.timeout(5000)});
    const data = await response.json(); if(!response.ok)throw new ApiError(data,response.status); return data;
  };
  const updater = vm.runInNewContext(compile(declarations.map(node=>node.getText(source).replace(/^export /u,"")).join("\n")+"\nupdateObservationContext;"),{
    MiniappApiError:ApiError,MiniappRequestCancelled:class extends Error{},requestOperation,
    idempotencyKey:()=>"local-probe:"+(++keySequence),invalidateApiCache:(prefix:string)=>invalidations.push(prefix),
    observationContextRecoveryInput:recovery.observationContextRecoveryInput,
    confirmedObservationContextEdit:(recovery as Record<string,unknown>).confirmedObservationContextEdit,
  });
  try { first = await updater(initial,{selectedAt:"2026-09-28T16:30:00.000Z"}); } catch(error) {firstError=error;}
  if(!first) {try{retry=await updater(initial,{selectedAt:"2026-09-28T16:30:00.000Z"});}catch(error){retryError=error;}}
  const directResponse = await fetch("http://127.0.0.1:8789/v2/observation-contexts/"+encodeURIComponent(initial.contextId),{signal:AbortSignal.timeout(5000)});
  assert.equal(directResponse.status,200); direct = (await directResponse.json()).data;
  assert.equal(direct.selectedAtUtc,"2026-09-28T16:30:00.000Z"); assert.equal(direct.revision,initial.revision+1);
  const ok = first?.data?.selectedAtUtc === direct.selectedAtUtc && first?.data?.revision === direct.revision && proxyStats.puts === 1 && proxyStats.gets === 1;
  const record = {scope:"Current production Context domain functions/class, real LOCAL/MEMORY_TEST BFF state and loopback streamed HTTP; successful PUT response is physically dropped before reaching the client. Transport projection is Node fetch, not native Taro/device/GPU proof. No private IDs, headers or bodies retained; GUI context unchanged.",phase,ok,
    before:{selectedAtUtc:initial.selectedAtUtc,revision:initial.revision},serverReadback:{selectedAtUtc:direct.selectedAtUtc,revision:direct.revision},
    firstReadback:first?{selectedAtUtc:first.data.selectedAtUtc,revision:first.data.revision}:null,
    firstError:firstError?{name:firstError.name,code:firstError.code??null}:null,retryReadback:retry?{selectedAtUtc:retry.data.selectedAtUtc,revision:retry.data.revision}:null,
    retryError:retryError?{name:retryError.name,code:retryError.code??null}:null,proxyStats,invalidations};
  await fs.writeFile(output,JSON.stringify(record,null,2)+"\n",{flag:"wx"}); console.log(JSON.stringify(record));
  assert.ok(ok,"a lost successful time edit must reconcile without a second PUT or false old-time result");
} finally {await program.disconnect(); await new Promise<void>(resolve=>proxy.close(()=>resolve()));}
