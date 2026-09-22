import assert from "node:assert/strict";
import test from "node:test";
import {
  startDeepSkyImageRequest,
  type DeepSkyImageAsset,
  type OwnedDeepSkyImageAsset,
  type DeepSkyImageRequestOptions,
  type DeepSkyImageWriteOptions,
} from "./deep-sky-image-request.ts";

const asset: DeepSkyImageAsset = {
  reference: "M:31",
  level: "MEDIUM",
  fieldDegrees: 4,
  tempFilePath: "/tmp/m31-medium.jpg",
};
const responseHeader = { "X-Starward-Image-Field-Degrees": "4" };

function harness(files = new Map<string, ArrayBuffer>()) {
  let requestOptions: DeepSkyImageRequestOptions | null = null;
  let writeOptions: DeepSkyImageWriteOptions | null = null;
  let aborts = 0;
  let cancels = 0;
  let rejectionHandlers = 0;
  const ready: OwnedDeepSkyImageAsset[] = [];
  let errors = 0;
  const cancel = startDeepSkyImageRequest({
    asset: { reference: asset.reference, level: asset.level, tempFilePath: asset.tempFilePath },
    url: "https://example.invalid/m31",
    request: (options) => {
      requestOptions = options;
      return {
        abort: () => { aborts += 1; },
        catch: () => { rejectionHandlers += 1; },
      };
    },
    writeFile: (options) => { writeOptions = options; },
    removeFile: (path: string) => { files.delete(path); },
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
    commitWrite() { const write = writeOptions as DeepSkyImageWriteOptions; files.set(write.filePath, write.data); write.success(); },
  };
}

test("selection or level changes abort and ignore every late request callback", () => {
  const h = harness();
  h.cancel();
  h.cancel();
  h.request.success({ statusCode: 200, data: new ArrayBuffer(4), header: responseHeader });
  h.request.fail();
  assert.equal(h.aborts, 1);
  assert.equal(h.cancels, 1);
  assert.equal(h.rejectionHandlers, 1);
  assert.equal(h.write, null);
  assert.deepEqual(h.ready, []);
  assert.equal(h.errors, 0);
});

test("a canceled late write cannot overwrite the retry's published bytes", () => {
  const files = new Map<string, ArrayBuffer>();
  const old = harness(files), current = harness(files);
  old.request.success({ statusCode: 200, data: new Uint8Array([1, 1, 1, 1]).buffer, header: responseHeader });
  old.cancel();
  current.request.success({ statusCode: 200, data: new Uint8Array([2, 2, 2, 2]).buffer, header: responseHeader });
  current.commitWrite();
  assert.equal(current.ready.length, 1);
  old.commitWrite();
  const actual = files.get(current.ready[0]!.tempFilePath);
  assert(actual);
  assert.deepEqual([...new Uint8Array(actual)], [2, 2, 2, 2]);
  assert.equal(files.size, 1, "the canceled request removes only its own completed file");
  current.ready[0]!.release(); current.ready[0]!.release();
  assert.equal(files.size, 0, "published file ownership can be released idempotently");
});

test("leaving during file persistence prevents the old asset becoming ready", () => {
  const h = harness();
  h.request.success({ statusCode: 200, data: new ArrayBuffer(4), header: responseHeader });
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
  success.request.success({ statusCode: 200, data: new ArrayBuffer(4), header: responseHeader });
  assert.ok(success.write);
  success.write.success();
  success.cancel();
  assert.equal(success.ready.length, 1);
  assert.deepEqual({ ...success.ready[0], tempFilePath: asset.tempFilePath, release: undefined }, { ...asset, release: undefined });
  assert.equal(success.aborts, 0);
  assert.equal(success.cancels, 0);

  for (const finish of [
    (h: ReturnType<typeof harness>) => h.request.success({ statusCode: 503, data: new ArrayBuffer(0) }),
    (h: ReturnType<typeof harness>) => h.request.success({ statusCode: 200, data: "not binary", header: responseHeader }),
    (h: ReturnType<typeof harness>) => h.request.fail(),
    (h: ReturnType<typeof harness>) => {
      h.request.success({ statusCode: 200, data: new ArrayBuffer(4), header: responseHeader });
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

test("missing or invalid angular metadata cannot publish a misregistered image", () => {
  for (const header of [undefined, { "x-starward-image-field-degrees": "0" }, { "x-starward-image-field-degrees": "not-a-number" }]) {
    const h = harness();
    h.request.success({ statusCode: 200, data: new ArrayBuffer(4), ...(header ? { header } : {}) });
    assert.equal(h.errors, 1);
    assert.equal(h.write, null);
    assert.deepEqual(h.ready, []);
  }
});

test("synchronous native request and filesystem failures stay in the retryable error channel", () => {
  for (const stage of ["request", "write"] as const) {
    let errors = 0, ready = 0;
    assert.doesNotThrow(() => startDeepSkyImageRequest({
      asset, url: "https://example.invalid/image",
      request(options) {
        if (stage === "request") throw new Error("native request unavailable");
        options.success({ statusCode: 200, data: new ArrayBuffer(4), header: responseHeader });
        return {};
      },
      writeFile() { throw new Error("storage unavailable"); }, removeFile() {},
      onReady() { ready++; }, onError() { errors++; },
    }));
    assert.equal(errors, 1); assert.equal(ready, 0);
  }
});
