import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { skyResourceOriginTestOwner } from "./sky-resource-origin-test-support";
import * as contracts from "@starward/miniapp-contracts";
import {skyNativeArrayBuffer} from "./sky-native-array-buffer";
import { publishedDeepSkyDiscovery } from "../features/sky/deep-sky-image-test-support.ts";
import { withSkyPublicImageOwner } from './sky-public-image-runtime-test-support';

function module(file: string, bindings: Record<string, unknown>) {
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, Error, Promise, AbortController, __MINIAPP_API_BASE__: "https://approved.fixture.invalid",
    __MINIAPP_OPERATOR_PREVIEW_TOKEN__: "controlled-test-token", require: withSkyPublicImageOwner((name: string) => {
      if(name==='./sky-resource-origin'||name==='./sky-image-diagnostics')return skyResourceOriginTestOwner("https://approved.fixture.invalid", "", "controlled-test-token");
      if(name==='@starward/miniapp-contracts')return contracts;
      if(name==='./sky-native-array-buffer')return {skyNativeArrayBuffer};
      assert(name in bindings, name); return bindings[name]; }, {Error, Promise, AbortController}) });
  return exports;
}

test("actual bare discovery and its immutable epoch resource use typed operation and preview boundary", async () => {
  const calls: any[] = [];
  const body = publishedDeepSkyDiscovery();
  const bare = module("./bare-sky-resource.ts", { "@tarojs/taro": { default: {
    request(options: any) { calls.push(options); queueMicrotask(() => options.success({ statusCode: 200, data: body })); return { abort() {} }; },
  } } });
  let current=true;
  const resource=module("./sky-publication-resource.ts",{"./sky-public-image-runtime":{
    capturePublishedSkyImageGeneration:()=>({isCurrent:()=>current}),
    beginPublishedSkyImageDemand:()=>({isCurrent:()=>current,onRetire:()=>()=>{},release(){}}),
  }});
  const client = module("./deep-sky-image-client.ts", { "@starward/miniapp-contracts": contracts, "./bare-sky-resource": bare,
    "./sky-publication-resource":resource });
  const result = await client.getDeepSkyImageDiscovery("M:42");
  assert.equal(result, body); assert.equal(calls[0].url, "https://approved.fixture.invalid/v2/sky/deep-sky/selected/M%3A42?imageVersion=source-finite-v3");
  assert.equal(calls[0].header["X-Starward-Operator-Preview"], "controlled-test-token");
  assert.equal(Object.keys(calls[0].header).length, 1);
  const owned=await client.getDeepSkyImageResource("M:42");
  assert.notStrictEqual(owned.publication,body);assert.equal(owned.publication.publicationHash,body.publicationHash);
  assert(Object.isFrozen(owned.publication.levels.DETAIL));assert.equal(owned.isCurrent(),true);
  current=false;assert.equal(owned.isCurrent(),false,"settled metadata cannot refill a cleared image-cache epoch");
  for (const path of [body.levels.DETAIL.downloadUrl + "?anything=1", body.levels.DETAIL.downloadUrl.replace("/M-42/", "/M-31/"),
    body.levels.DETAIL.downloadUrl.replace("/M-42/", "/../"), "/v2/celestial-objects/M%3A42/image?level=DETAIL",
    "/v2/sky/deep-sky/selected/M%3A42?imageVersion=old"])
    assert.throws(() => bare.skyResourceUrl(path, "deep-sky"), /path_invalid/);
  await assert.rejects(client.getDeepSkyImageDiscovery("M:111"), /reference_invalid/);
  body.sourceId = "wrong";
  await assert.rejects(client.getDeepSkyImageDiscovery("M:42"), /discovery_invalid/);
});

test("bare cancellation settles before throwing/reentrant abort and observes duplicate Promise failure", async () => {
  let response: any, aborted = 0, rejectTask!: (cause: Error) => void;
  const bare = module("./bare-sky-resource.ts", { "@tarojs/taro": { default: {
    request(options: any) {
      response = options;
      const task = new Promise((_resolve, reject) => { rejectTask = reject; });
      return Object.assign(task, { abort() { aborted++; options.fail(); rejectTask(new Error("duplicate rejection")); throw new Error("abort failure"); } });
    },
  } } });
  const controller = new AbortController();
  const promise = bare.requestBareSkyResource("/v2/sky/deep-sky/selected/M%3A42?imageVersion=source-finite-v3", "deep-sky", controller.signal);
  assert.doesNotThrow(() => controller.abort()); response.success({ statusCode: 200, data: {} });
  await assert.rejects(promise, /request_cancelled/); assert.equal(aborted, 1);
  await new Promise<void>(resolve => setImmediate(resolve));
  await assert.rejects(bare.requestBareSkyResource("/v2/sky/deep-sky/not-canonical", "deep-sky"), /request_failed/);
});

test("bare metadata transport preserves native causes and reports abort failure without turning cancellation into failure",async()=>{
  const before=console.error,errors:unknown[][]=[];console.error=(...parts)=>{errors.push(parts);};
  const path="/v2/sky/deep-sky/selected/M%3A42?imageVersion=source-finite-v3";
  try{
    for(const mode of ['callback','rejection','dispatch']){
      const cause={errno:600001,errCode:-1202,errMsg:'private signed URL'};
      const bare=module('./bare-sky-resource.ts',{'@tarojs/taro':{default:{request(options:any){
        if(mode==='dispatch')throw cause;
        if(mode==='callback')queueMicrotask(()=>options.fail(cause));
        return Object.assign(Promise.reject(cause),{abort(){}});
      }}}});
      await assert.rejects(bare.requestBareSkyResource(path,'deep-sky'),(error:any)=>error.cause===cause);
      await new Promise<void>(resolve=>setImmediate(resolve));
    }
    assert.equal(errors.length,3,'callback and task rejection share the original settlement');
    for(const row of errors){assert.equal((row[1] as {errno:number}).errno,600001);assert.equal((row[1] as {errCode:number}).errCode,-1202);}
    let aborts=0;const abortCause={errCode:999,errMsg:'private abort'};
    const bare=module('./bare-sky-resource.ts',{'@tarojs/taro':{default:{request(){return {abort(){aborts++;throw abortCause;}};}}}});
    const controller=new AbortController(),pending=bare.requestBareSkyResource(path,'deep-sky',controller.signal);
    controller.abort();await assert.rejects(pending,/request_cancelled/);assert.equal(aborts,1);
    assert.equal(errors.length,4);assert.equal((errors[3]![1] as {errCode:number}).errCode,999);
    const quiet=module('./bare-sky-resource.ts',{'@tarojs/taro':{default:{request(options:any){return {abort(){options.fail({errCode:123});}};}}}});
    const normal=new AbortController(),cancelled=quiet.requestBareSkyResource(path,'deep-sky',normal.signal);
    normal.abort();await assert.rejects(cancelled,/request_cancelled/);assert.equal(errors.length,4);
    assert.doesNotMatch(JSON.stringify(errors),/private|signed|URL/u);
  }finally{console.error=before;}
});

test("public runtime admits only selected immutable identities, with PNG route digest equal to descriptor", () => {
  const descriptors: unknown[] = [];
  const runtime = module("./sky-public-image-runtime.ts", { "@tarojs/taro": { default: { env: { USER_DATA_PATH: "/controlled" }, getFileSystemManager: () => ({}) } },
    "@starward/miniapp-contracts": contracts, "./sky-public-image-cache": { createSkyPublicImageCache() { return { acquire(asset: unknown) { descriptors.push(asset); } }; } } });
  const discovery = publishedDeepSkyDiscovery();
  runtime.acquirePublishedSkyImage(discovery.levels.DETAIL, "https://approved.fixture.invalid" + discovery.levels.DETAIL.downloadUrl, discovery.publicationHash);
  assert.equal(descriptors.length, 1);
  for (const [url, hash, asset] of [
    ["https://other.fixture.invalid" + discovery.levels.DETAIL.downloadUrl, discovery.publicationHash, discovery.levels.DETAIL],
    ["https://approved.fixture.invalid" + discovery.levels.DETAIL.downloadUrl, "0".repeat(64), discovery.levels.DETAIL],
    ["https://approved.fixture.invalid" + discovery.levels.DETAIL.downloadUrl, discovery.publicationHash, { ...discovery.levels.DETAIL, sha256: "0".repeat(64) }],
    ["https://approved.fixture.invalid/v2/celestial-objects/M%3A42/image?level=DETAIL", discovery.publicationHash, discovery.levels.DETAIL],
  ]) assert.throws(() => runtime.acquirePublishedSkyImage(asset, url, hash), /route_invalid/);
  assert.equal(descriptors.length, 1);
});

test("runtime clear fences metadata demands before abort callbacks and normal handoff releases only its own subscription", async () => {
  let epoch = 0;
  const runtime = module("./sky-public-image-runtime.ts", {
    "@tarojs/taro": { default: { env: { USER_DATA_PATH: "/controlled" }, getFileSystemManager: () => ({}) } },
    "@starward/miniapp-contracts": contracts, "./sky-public-image-cache": { createSkyPublicImageCache() {
      return { inspect: () => ({ epoch }), clear() { epoch++; return Promise.resolve({ status: "complete" }); } };
    } },
  });
  const handed = runtime.beginPublishedSkyImageDemand(), pending = runtime.beginPublishedSkyImageDemand();
  let called = 0;
  const handler = () => { called++; assert.equal(pending.isCurrent(), false); throw new Error("abort failure"); };
  handed.onRetire(handler); pending.onRetire(handler); handed.release();
  const other = runtime.beginPublishedSkyImageDemand(); other.onRetire(() => { called++; assert.equal(other.isCurrent(), false); });
  assert.equal((await runtime.clearSkyPublicImageCache()).status, "complete"); assert.equal(called, 2);
  const late = runtime.beginPublishedSkyImageDemand(); assert.equal(late.isCurrent(), true); late.release();
  await runtime.clearSkyPublicImageCache(); assert.equal(called, 2);
});
