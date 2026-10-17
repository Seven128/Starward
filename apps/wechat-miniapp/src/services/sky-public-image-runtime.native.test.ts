import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { skyResourceOriginTestOwner } from "./sky-resource-origin-test-support";
import { skyNativeArrayBuffer } from "./sky-native-array-buffer.ts";

/** Exercise the real Taro-facing adapter; the cache core is covered separately.
 * Native callbacks deliberately return a foreign buffer as observed in WEAPP. */
function runtime() {
  const body = runInNewContext("Uint8Array.from([83,107,121,10]).buffer");
  let readBody: unknown = body, responseBody: unknown = body, status = 200, requestFailure: unknown;
  let deps: any;
  const taro = {
    env: { USER_DATA_PATH: "/isolated-native-fixture" },
    getFileSystemManager: () => ({ readFile: (options: any) => options.success({ data: readBody }) }),
    request: (options: any) => {
      if (requestFailure !== undefined) options.fail(requestFailure);
      else options.success({ statusCode: status, data: responseBody });
      return { abort() {}, catch() {} };
    },
  };
  const exports: any = {};
  const code = ts.transpileModule(readFileSync(new URL("./sky-public-image-runtime.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { exports, ArrayBuffer, Uint8Array, Date, Math, Set, Promise,
    __MINIAPP_API_BASE__: "http://fixture.invalid", __MINIAPP_OPERATOR_PREVIEW_TOKEN__: "",
    require(id: string) {
      if (id === "./sky-resource-origin") return skyResourceOriginTestOwner("http://fixture.invalid");
      if (id === "./sky-image-diagnostics") return skyResourceOriginTestOwner("http://fixture.invalid");
      if (id === "@tarojs/taro") return { default: taro };
      if (id === "@starward/miniapp-contracts") return { skyImageContentHash: () => "a".repeat(64) };
      if (id === "./sky-native-array-buffer") return { skyNativeArrayBuffer };
      if (id === "./sky-public-image-cache") return { createSkyPublicImageCache(value: any) {
        deps = value; return { ready: async () => {}, inspect: () => ({ epoch: 0 }) };
      } };
      throw Error(`unexpected adapter dependency: ${id}`);
    },
  });
  return { exports, body, get deps() { return deps; },
    read(value: unknown) { readBody = value; }, response(value: unknown, code = 200) { responseBody = value; status = code; },
    failure(value: unknown) { requestFailure = value; } };
}

test("actual native filesystem and HTTP adapters accept foreign bytes without a copy", async () => {
  const h = runtime();
  await h.exports.initializeSkyPublicImageCache();
  assert.equal(h.body instanceof ArrayBuffer, false);
  assert.equal(await h.deps.fs.read("/isolated-native-fixture/file", 4), h.body);
  assert.equal(await h.deps.transfer({ url: "http://fixture.invalid/bytes" }).promise, h.body);
});

test("actual native adapters reject spoofed binary and non-success HTTP responses", async () => {
  const h = runtime(); await h.exports.initializeSkyPublicImageCache();
  const fake = { [Symbol.toStringTag]: "ArrayBuffer", byteLength: 4 };
  h.read(fake);
  await assert.rejects(h.deps.fs.read("/isolated-native-fixture/file", 4), /sky_public_image_read_invalid/);
  h.response(fake);
  await assert.rejects(h.deps.transfer({ url: "http://fixture.invalid/bytes" }).promise, /sky_public_image_response_invalid/);
  h.response(h.body, 404);
  await assert.rejects(h.deps.transfer({ url: "http://fixture.invalid/bytes" }).promise, /sky_image_http_404/);
  const cause = { errMsg: "request:fail private native detail", errno: 600001 };
  h.failure(cause);
  await assert.rejects(h.deps.transfer({ url: "http://fixture.invalid/bytes" }).promise,
    (error: any) => error.message === "sky_public_image_request_failed" && error.cause === cause);
});
