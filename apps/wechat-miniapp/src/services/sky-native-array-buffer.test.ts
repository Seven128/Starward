import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { skyNativeArrayBuffer } from "./sky-native-array-buffer.ts";

test("native foreign ArrayBuffer keeps its exact backing bytes and identity", () => {
  const foreign = runInNewContext("Uint8Array.from([83,107,121,10]).buffer");
  assert.equal(foreign instanceof ArrayBuffer, false);
  assert.equal(skyNativeArrayBuffer(foreign), foreign);
  assert.deepEqual(Array.from(new Uint8Array(skyNativeArrayBuffer(foreign)!)), [83,107,121,10]);
  const local = new ArrayBuffer(0);
  assert.equal(skyNativeArrayBuffer(local), local);
});

test("native buffer boundary rejects objects that spoof the binary tag or constructor", () => {
  const fake = { [Symbol.toStringTag]: "ArrayBuffer", constructor: ArrayBuffer, byteLength: 4 };
  assert.equal(Object.prototype.toString.call(fake), "[object ArrayBuffer]");
  for (const value of [fake, null, undefined, "Sky", [83,107,121], new Proxy(new ArrayBuffer(4), {})])
    assert.equal(skyNativeArrayBuffer(value), null);
});

test("views, shared memory and transferred backing stores cannot masquerade as native response bytes", () => {
  const detached = new ArrayBuffer(4);
  structuredClone(detached, { transfer: [detached] });
  for (const value of [new Uint8Array(4), new DataView(new ArrayBuffer(4)), new SharedArrayBuffer(4), detached])
    assert.equal(skyNativeArrayBuffer(value), null);
});
