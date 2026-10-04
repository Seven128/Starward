import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as contracts from "@starward/miniapp-contracts";
import { publishedDeepSkyDiscovery } from "../features/sky/deep-sky-image-test-support.ts";

function module(file: string, bindings: Record<string, unknown>) {
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, Error, Promise, __MINIAPP_API_BASE__: "https://approved.fixture.invalid",
    __MINIAPP_OPERATOR_PREVIEW_TOKEN__: "controlled-test-token", require(name: string) { assert(name in bindings, name); return bindings[name]; } });
  return exports;
}

test("actual bare discovery and immutable acquisition use typed operation, exact metadata and preview boundary", async () => {
  const calls: any[] = [], acquisitions: any[] = [];
  const body = publishedDeepSkyDiscovery();
  const bare = module("./bare-sky-resource.ts", { "@tarojs/taro": { default: {
    request(options: any) { calls.push(options); queueMicrotask(() => options.success({ statusCode: 200, data: body })); return { abort() {} }; },
  } } });
  const client = module("./deep-sky-image-client.ts", { "@starward/miniapp-contracts": contracts, "./bare-sky-resource": bare,
    "./sky-public-image-runtime": { acquirePublishedSkyImage(...args: unknown[]) { acquisitions.push(args); return { promise: Promise.resolve(null), cancel() {} }; } } });
  const result = await client.getDeepSkyImageDiscovery("M:42");
  assert.equal(result, body); assert.equal(calls[0].url, "https://approved.fixture.invalid/v2/sky/deep-sky/selected/M%3A42?imageVersion=source-finite-v3");
  assert.equal(calls[0].header["X-Starward-Operator-Preview"], "controlled-test-token");
  assert.equal(Object.keys(calls[0].header).length, 1);
  client.acquireDeepSkyImage(body.levels.DETAIL, body.publicationHash);
  assert.equal(acquisitions[0][0], body.levels.DETAIL); assert.equal(acquisitions[0][1], "https://approved.fixture.invalid" + body.levels.DETAIL.downloadUrl);
  assert.equal(acquisitions[0][2], body.publicationHash);
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
