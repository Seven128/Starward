import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createSkyArtworkLoader, type SkyArtworkLoadState } from "./sky-artwork-loader";
import { startSkyArtworkRequest, type SkyArtworkImage } from "./sky-artwork-request";
import { createSkyGpuTextures } from "./sky-gpu-textures";
type LegacyArtworkRequest = Extract<Parameters<typeof startSkyArtworkRequest>[0], { filePath: string }>;

const root = new URL("../../../../../workers/miniapp-api/assets/deep-sky/wide-field-w3/", import.meta.url);
const publication = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8")) as {
  tiles: Array<{ pixel: number; file: string; sha256: string; bytes: number }>;
};
const assets = publication.tiles.slice(0, 3).map(tile => ({
  ...tile, id: `w3:0:${tile.pixel}`, width: 512, height: 512,
}));

function nativeFixture() {
  type Asset = (typeof assets)[number];
  type Request = { asset: Asset; options: Parameters<LegacyArtworkRequest["request"]>[0]; aborted: boolean };
  type Write = { options: Parameters<LegacyArtworkRequest["writeFile"]>[0] };
  const requests: Request[] = [], writes: Write[] = [], images: SkyArtworkImage[] = [];
  const files = new Map<string, ArrayBuffer>();
  const removed: string[] = [];
  let state: SkyArtworkLoadState | null = null;
  let nextFile = 0;
  const owner = createSkyArtworkLoader<Asset>({
    changed(value) { state = value; },
    start(asset, ready, fail) {
      return startSkyArtworkRequest({
        asset, format: "jpeg", url: `/v2/sky/wide-field/hash/${asset.file}`,
        filePath: `/owned/${++nextFile}.jpg`,
        canvas: { createImage() {
          const image: SkyArtworkImage = { src: "", onload: null, onerror: null, width: 512, height: 512 };
          images.push(image);
          return image;
        } },
        request(options) {
          const request: Request = { asset, options, aborted: false };
          requests.push(request);
          return { abort() { request.aborted = true; } };
        },
        writeFile(options) { writes.push({ options }); },
        removeFile(path) { removed.push(path); files.delete(path); },
        ready, fail,
      });
    },
  });
  function respond(index: number) {
    const request = requests[index]!;
    const body = readFileSync(new URL(request.asset.file, root));
    assert.equal(body.byteLength, request.asset.bytes);
    assert.equal(createHash("sha256").update(body).digest("hex"), request.asset.sha256);
    request.options.success({ statusCode: 200, data: Uint8Array.from(body).buffer });
    return writes.at(-1)?.options;
  }
  function write(options: Write["options"]) {
    files.set(options.filePath, options.data);
    options.success();
  }
  function decode() { images.at(-1)!.onload!(); return images.at(-1)!; }
  return { owner, requests, writes, images, files, removed, respond, write, decode,
    get state() { return state!; } };
}

function gpuFixture(byteBudget?: number, failedImage?: object) {
  const uploaded: object[] = [], deleted: object[] = [], failures: object[] = [];
  let uploadError = 0;
  const gl = {
    NO_ERROR: 0, TEXTURE_2D: 3553, TEXTURE_MIN_FILTER: 10241, TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242, TEXTURE_WRAP_T: 10243, LINEAR: 9729, CLAMP_TO_EDGE: 33071,
    UNPACK_FLIP_Y_WEBGL: 37440, UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
    RGBA: 6408, UNSIGNED_BYTE: 5121,
    getError() { const error = uploadError; uploadError = 0; return error; }, isContextLost: () => false,
    createTexture: () => ({}), deleteTexture: (texture: object) => deleted.push(texture),
    bindTexture() {}, texParameteri() {}, pixelStorei() {},
    texImage2D(_target: number, _level: number, _internal: number, _format: number,
      _type: number, image: object) { uploaded.push(image); if (image === failedImage) uploadError = 1282; },
  } as unknown as WebGLRenderingContext;
  return { textures: createSkyGpuTextures(gl, image => failures.push(image), byteBudget), uploaded, deleted, failures };
}

test("retention pressure does not retry a failed current image, and valid independent images still draw", () => {
  const failed = { width: 512, height: 512 };
  const gpu = gpuFixture(2 * 1024 * 1024, failed);
  const valid = Array.from({ length: 3 }, () => ({ width: 512, height: 512 }));
  for (let frame = 0; frame < 4; frame++) {
    gpu.textures.begin();
    assert.equal(gpu.textures.get(failed), null);
    for (const image of valid) assert.ok(gpu.textures.get(image), "independent layers survive the failure");
    gpu.textures.finish();
  }
  assert.equal(gpu.failures.length, 1, "same decoded identity remains failed until unused/replaced");
  assert.equal(gpu.uploaded.filter(image => image === failed).length, 1, "trim cannot schedule another failed upload");
  const recovered = { width: 512, height: 512 };
  gpu.textures.begin();
  assert.ok(gpu.textures.get(recovered), "a newly decoded retry identity recovers normally");
  assert.ok(gpu.textures.get(valid[2]!));
  gpu.textures.finish();
  assert.equal(gpu.failures.length, 1);
  gpu.textures.dispose();
  assert.equal(gpu.uploaded.length, gpu.deleted.length, "failed partial and valid textures all release");
  assert.equal(new Set(gpu.deleted).size, gpu.deleted.length, "each resource releases once");
});

test("a stable field above allocation pressure stays resident and a moving field retires unused images", () => {
  // The actual wide constellation field exceeds the pressure target. Scale that
  // case to three 1 MiB images and a 2 MiB target without changing its mechanism.
  const gpu = gpuFixture(2 * 1024 * 1024);
  const images = Array.from({ length: 3 }, () => ({ width: 512, height: 512 }));
  const paint = (field: readonly object[]) => {
    const start = gpu.uploaded.length;
    gpu.textures.begin();
    for (const image of field) assert.ok(gpu.textures.get(image), "every valid layer remains drawable");
    gpu.textures.finish();
    assert.equal(gpu.uploaded.length - gpu.deleted.length, new Set(field).size, "only this completed frame's sources remain resident");
    return gpu.uploaded.length - start;
  };
  assert.equal(paint(images), 3);
  assert.equal(paint(images), 0, "every visible source remains reusable above the pressure target");
  assert.equal(paint(images), 0, "an unchanged field does not cyclically upload its working set");
  const replacement = { width: 512, height: 512 };
  paint([replacement, images[1]!]);
  assert.equal(paint([replacement, images[1]!]), 0, "a smaller new field settles to full reuse");
  paint([]);
  assert.equal(gpu.uploaded.length, gpu.deleted.length, "retired field releases every GPU texture");
  gpu.textures.dispose();
  assert.equal(new Set(gpu.deleted).size, gpu.deleted.length, "each texture releases once");
});

test("published W3 bytes survive refinement failure and retry, while late writes and old GPU images release", () => {
  const h = nativeFixture(), gpu = gpuFixture();
  h.owner.update([assets[0]!, assets[1]!]);
  assert.equal(h.requests.length, 2);
  h.write(h.respond(0)!);
  const coarse = h.decode();
  gpu.textures.begin();
  assert.ok(gpu.textures.get(coarse));
  gpu.textures.finish();
  assert.deepEqual(gpu.uploaded, [coarse]);

  const canceledWrite = h.respond(1)!;
  h.owner.update([assets[2]!]);
  assert.equal(h.requests[1]!.aborted, true);
  assert.equal(h.state.retainedImages.get(assets[0]!.id), coarse);
  h.write(canceledWrite);
  assert.equal(h.files.has(canceledWrite.filePath), false);
  assert.equal(h.requests.length, 3);

  h.write(h.respond(2)!);
  h.images.at(-1)!.onerror!();
  assert.equal(h.state.failed, true);
  assert.equal(h.state.retainedImages.get(assets[0]!.id), coarse);
  h.owner.retry();
  assert.equal(h.requests.length, 4);
  h.write(h.respond(3)!);
  const fine = h.decode();
  assert.equal(h.state.images.get(assets[2]!.id), fine);
  assert.equal(h.state.failed, false);
  gpu.textures.begin();
  assert.ok(gpu.textures.get(fine));
  gpu.textures.finish();
  assert.deepEqual(gpu.uploaded, [coarse, fine]);
  assert.equal(gpu.deleted.length, 1, "old GPU identity is not retained after replacement");

  h.owner.dispose();
  gpu.textures.dispose();
  assert.equal(h.files.size, 0);
  assert.equal(gpu.deleted.length, 2);
  assert.equal(new Set(h.removed).size, h.removed.length, "each owned file is removed once");
});

test("published fixed-body and 2MASS files use the shared decode/GPU boundary with their real formats", () => {
  const publications = [
    { dir: "moon", file: "manifest.json", format: "jpeg" as const },
    { dir: "mars", file: "manifest.json", format: "jpeg" as const },
    { dir: "mercury", file: "manifest.json", format: "jpeg" as const },
    { dir: "deep-sky/galactic-2mass", file: "manifest.json", format: "jpeg" as const },
    { dir: "jupiter", file: "manifest.json", format: "png" as const },
    { dir: "saturn", file: "manifest.json", format: "png" as const },
    { dir: "uranus", file: "manifest.json", format: "png" as const },
    { dir: "neptune", file: "manifest.json", format: "png" as const },
  ];
  for (const candidate of publications) {
    const directory = new URL(`../../../../../workers/miniapp-api/assets/${candidate.dir}/`, import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL(candidate.file, directory), "utf8")) as {
      image: { file: string; sha256: string; bytes: number; width: number; height: number };
    };
    const asset = manifest.image;
    const file = readFileSync(new URL(asset.file, directory));
    assert.equal(file.byteLength, asset.bytes, candidate.dir);
    assert.equal(createHash("sha256").update(file).digest("hex"), asset.sha256, candidate.dir);
    const gpu = gpuFixture();
    let request: Parameters<LegacyArtworkRequest["request"]>[0] | undefined;
    let write: Parameters<LegacyArtworkRequest["writeFile"]>[0] | undefined;
    let image: SkyArtworkImage | undefined, loaded: { image: object; release(): void } | undefined;
    const removed: string[] = [];
    startSkyArtworkRequest({ asset, format: candidate.format, url: `/published/${asset.file}`,
      filePath: `/owned/${candidate.dir.replaceAll("/", "-")}.${candidate.format === "png" ? "png" : "jpg"}`,
      canvas: { createImage() {
        image = { src: "", onload: null, onerror: null, width: asset.width, height: asset.height };
        return image;
      } },
      request(options) { request = options; return {}; },
      writeFile(options) { write = options; },
      removeFile(path) { removed.push(path); },
      ready(value) { loaded = value; },
      fail() { assert.fail(`valid ${candidate.dir} publication failed native decode`); },
    });
    request!.success({ statusCode: 200, data: Uint8Array.from(file).buffer });
    assert.ok(write, `${candidate.dir} passed encoded geometry validation`);
    write!.success();
    image!.onload!();
    assert.equal(loaded!.image, image);
    gpu.textures.begin();
    assert.ok(gpu.textures.get(image!));
    gpu.textures.finish();
    assert.deepEqual(gpu.uploaded, [image]);
    loaded!.release();
    gpu.textures.dispose();
    assert.equal(removed.length, 1);
    assert.equal(gpu.deleted.length, 1);
  }
});
