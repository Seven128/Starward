import assert from "node:assert/strict";
import test from "node:test";
import { installAbortControllerPolyfill } from "./platform-polyfills";

test("the WEAPP runtime receives a functional AbortController without replacing native support", () => {
  const runtime: {
    AbortController?: typeof globalThis.AbortController;
    AbortSignal?: typeof globalThis.AbortSignal;
  } = {};
  assert.equal(installAbortControllerPolyfill(runtime), true);
  const controller = new runtime.AbortController!();
  let observed = false;
  controller.signal.addEventListener("abort", () => {
    observed = true;
  });
  controller.abort();
  assert.equal(controller.signal.aborted, true);
  assert.equal(observed, true);

  const installed = runtime.AbortController;
  assert.equal(installAbortControllerPolyfill(runtime), false);
  assert.equal(runtime.AbortController, installed);
});
