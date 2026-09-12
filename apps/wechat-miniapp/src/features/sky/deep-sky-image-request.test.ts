import assert from "node:assert/strict";
import test from "node:test";
import {
  startDeepSkyImageRequest,
  type DeepSkyImageAsset,
  type DeepSkyImageRequestOptions,
  type DeepSkyImageWriteOptions,
} from "./deep-sky-image-request.ts";

const asset: DeepSkyImageAsset = {
  reference: "M:31",
  level: "MEDIUM",
  fieldDegrees: 4,
  tempFilePath: "/tmp/m31-medium.jpg",
};

function harness() {
  let requestOptions: DeepSkyImageRequestOptions | null = null;
  let writeOptions: DeepSkyImageWriteOptions | null = null;
  let aborts = 0;
  let cancels = 0;
  let rejectionHandlers = 0;
  const ready: DeepSkyImageAsset[] = [];
  let errors = 0;
  const cancel = startDeepSkyImageRequest({
    asset,
    url: "https://example.invalid/m31",
    request: (options) => {
      requestOptions = options;
      return {
        abort: () => { aborts += 1; },
        catch: () => { rejectionHandlers += 1; },
      };
    },
    writeFile: (options) => { writeOptions = options; },
    onReady: (value) => ready.push(value),
    onError: () => { errors += 1; },
    onCancel: () => { cancels += 1; },
  });
  return {
    cancel,
    get request() { return requestOptions as DeepSkyImageRequestOptions; },
    get write() { return writeOptions as DeepSkyImageWriteOptions | null; },
    get aborts() { return aborts; },
    get cancels() { return cancels; },
    get rejectionHandlers() { return rejectionHandlers; },
    ready,
    get errors() { return errors; },
  };
}

test("selection or level changes abort and ignore every late request callback", () => {
  const h = harness();
  h.cancel();
  h.cancel();
  h.request.success({ statusCode: 200, data: new ArrayBuffer(4) });
  h.request.fail();
  assert.equal(h.aborts, 1);
  assert.equal(h.cancels, 1);
  assert.equal(h.rejectionHandlers, 1);
  assert.equal(h.write, null);
  assert.deepEqual(h.ready, []);
  assert.equal(h.errors, 0);
});

test("leaving during file persistence prevents the old asset becoming ready", () => {
  const h = harness();
  h.request.success({ statusCode: 200, data: new ArrayBuffer(4) });
  assert.ok(h.write);
  h.cancel();
  h.write.success();
  h.write.fail();
  assert.equal(h.aborts, 1);
  assert.equal(h.cancels, 1);
  assert.deepEqual(h.ready, []);
  assert.equal(h.errors, 0);
});

test("only active binary success publishes while active failures remain retryable", () => {
  const success = harness();
  success.request.success({ statusCode: 200, data: new ArrayBuffer(4) });
  assert.ok(success.write);
  success.write.success();
  success.cancel();
  assert.deepEqual(success.ready, [asset]);
  assert.equal(success.aborts, 0);
  assert.equal(success.cancels, 0);

  for (const finish of [
    (h: ReturnType<typeof harness>) => h.request.success({ statusCode: 503, data: new ArrayBuffer(0) }),
    (h: ReturnType<typeof harness>) => h.request.success({ statusCode: 200, data: "not binary" }),
    (h: ReturnType<typeof harness>) => h.request.fail(),
    (h: ReturnType<typeof harness>) => {
      h.request.success({ statusCode: 200, data: new ArrayBuffer(4) });
      assert.ok(h.write);
      h.write.fail();
    },
  ]) {
    const failure = harness();
    finish(failure);
    failure.cancel();
    assert.equal(failure.errors, 1);
    assert.equal(failure.aborts, 0);
    assert.equal(failure.cancels, 0);
    assert.deepEqual(failure.ready, []);
  }
});
