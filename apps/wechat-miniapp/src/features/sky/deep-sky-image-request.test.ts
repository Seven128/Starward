import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
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
const imageIdentity = { publicationHash: "a".repeat(64), sourceId: `imagery:test:${"a".repeat(64)}`, pixelSize: 512 };
const responseHeader = { "X-Starward-Image-Field-Degrees": "4", "x-starward-image-publication-hash": imageIdentity.publicationHash,
  "x-starward-image-source-id": imageIdentity.sourceId, "x-starward-image-pixels": "512" };

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
  assert.deepEqual({ ...success.ready[0], tempFilePath: asset.tempFilePath, release: undefined }, { ...asset, ...imageIdentity, release: undefined });
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

test("an unbound successful reply cannot paint old bytes under the current publication's credit", () => {
  const h = harness();
  h.request.success({ statusCode: 200, data: new ArrayBuffer(4), header: { "x-starward-image-field-degrees": "4" } });
  assert.equal(h.write, null);
  assert.equal(h.errors, 1);
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

test("real published PNG bytes retain source binding and use their own cancellable file format", () => {
  const root = new URL("../../../../../workers/miniapp-api/assets/deep-sky/", import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8"));
  const published = manifest.entries.find((entry: { objectRef: string }) => entry.objectRef === "M:42").levels.DETAIL;
  const png = Uint8Array.from(readFileSync(new URL(published.file, root))).buffer;
  const publicationHash = "a".repeat(64), sourceId = `imagery:${manifest.publicationId}:${publicationHash}`;
  const header = { "content-type": "image/png", "x-starward-image-field-degrees": "0.9",
    "x-starward-image-publication-hash": publicationHash, "x-starward-image-source-id": sourceId,
    "x-starward-image-pixels": "512", "x-starward-image-missing-pixels": "5095",
    "X-Starward-Image-Display-Support": JSON.stringify(published.displaySupport) };
  const files = new Map<string, ArrayBuffer>(), h = harness(files);
  h.request.success({ statusCode: 200, data: png, header });
  const pending = h.write;
  assert.ok(pending?.filePath.endsWith(".png"), "native decoding must receive the actual response format");
  assert.ok(pending);
  const ownPath = pending.filePath;
  h.request.success({ statusCode: 200, data: new ArrayBuffer(4), header: responseHeader });
  assert.equal(h.write?.filePath, ownPath, "a duplicate response cannot switch a pending write's format or owner");
  h.commitWrite();
  assert.equal(h.ready[0]?.publicationHash, publicationHash);
  assert.equal(h.ready[0]?.sourceId, sourceId);
  assert.equal(h.ready[0]?.sourceMissingPixels, 5095);
  assert.deepEqual(h.ready[0]?.displaySupport, published.displaySupport);
  h.ready[0]!.release();
  assert.equal(files.size, 0);
  const canceled = harness(files);
  canceled.request.success({ statusCode: 200, data: png, header });
  canceled.cancel(); canceled.commitWrite();
  assert.equal(files.size, 0, "a canceled PNG write releases only its own late file");
  assert.equal(canceled.ready.length, 0);
  for (const invalid of [
    { ...header, "x-starward-image-source-id": `imagery:other:${"b".repeat(64)}` },
    { ...header, "x-starward-image-pixels": "256" },
    { ...header, "x-starward-image-missing-pixels": "262145" },
    { ...header, "x-starward-image-publication-hash": "" },
    { ...header, "content-type": "image/jpeg" },
    { ...header, "X-Starward-Image-Display-Support": "{" },
    { ...header, "X-Starward-Image-Display-Support": JSON.stringify({ ...published.displaySupport, sourceSha256: "0".repeat(64) }) },
    { ...header, "X-Starward-Image-Display-Support": JSON.stringify({ ...published.displaySupport, emptyRuns: [-1, 1] }) },
  ]) {
    const bad = harness(); bad.request.success({ statusCode: 200, data: png, header: invalid });
    assert.equal(bad.errors, 1); assert.equal(bad.write, null);
  }
  const changedBytes = new Uint8Array(png.slice(0)); changedBytes[40] = changedBytes[40]! ^ 1;
  const changed = harness(); changed.request.success({ statusCode: 200, data: changedBytes.buffer, header });
  assert.equal(changed.errors, 1); assert.equal(changed.write, null, "an altered body must not inherit the original display support");
  const oldHeader = { ...header }; delete (oldHeader as Partial<typeof header>)["X-Starward-Image-Display-Support"];
  const old = harness(); old.request.success({ statusCode: 200, data: png, header: oldHeader }); old.commitWrite();
  assert.equal(old.errors, 0); assert.equal(old.ready[0]?.displaySupport, undefined, "old v3 responses remain readable without claiming a spatial certificate");
  old.ready[0]!.release();
});
