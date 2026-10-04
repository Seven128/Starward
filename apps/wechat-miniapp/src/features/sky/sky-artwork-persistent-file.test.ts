import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createSkyPublicImageCache, type SkyPublicImageFileSystem } from "../../services/sky-public-image-cache";
import { startSkyArtworkRequest, type SkyArtworkImage } from "./sky-artwork-request";
import type { LoadedSkyArtwork } from "./sky-artwork-loader";

function fixture() {
  const body = new Uint8Array(64); body.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(body.buffer); view.setUint32(12, 0x49484452); view.setUint32(16, 128); view.setUint32(20, 256);
  const asset = { bytes: 64, width: 128, height: 256, sha256: createHash("sha256").update(body).digest("hex"),
    format: "png" as const, environment: "e".repeat(64), url: "https://fixture.invalid/approved.png" };
  const files = new Map<string, ArrayBuffer>(); let downloads = 0;
  const fs: SkyPublicImageFileSystem = {
    async mkdir() {}, async list(root) { return [...files.keys()].filter(p => p.startsWith(root + "/")).map(p => p.slice(root.length + 1)); },
    async size(path) { const data = files.get(path); if (!data) throw Error("missing"); return data.byteLength; },
    async read(path) { const data = files.get(path); if (!data) throw Error("missing"); return data.slice(0); },
    async write(path, data) { files.set(path, data.slice(0)); },
    async rename(from, to) { files.set(to, files.get(from)!); files.delete(from); },
    async remove(path) { files.delete(path); },
  };
  const cache = createSkyPublicImageCache({ fs, root: "/owned/sky-public-images-v1", byteBudget: 256, maxFileBytes: 128,
    session: "real_adapter", transfer() { downloads++; return { promise: Promise.resolve(body.buffer.slice(0)), cancel() {} }; } });
  const begin = () => {
    const images: SkyArtworkImage[] = []; let loaded: LoadedSkyArtwork | undefined, failed = 0;
    const cancel = startSkyArtworkRequest({ asset, url: asset.url,
      canvas: { createImage() { const image: SkyArtworkImage = { src: "", onload: null, onerror: null, width: 128, height: 256 }; images.push(image); return image; } },
      acquire: () => cache.acquire(asset),
      ready(value) { loaded = value; }, fail() { failed++; } });
    return { images, cancel, get loaded() { return loaded; }, get failed() { return failed; } };
  };
  return { begin, cache, files, get downloads() { return downloads; } };
}
async function waitFor(condition: () => boolean) { for (let i = 0; i < 200; i++) { if (condition()) return; await Promise.resolve(); } assert.fail("callback not reached"); }
async function drain() { for (let i = 0; i < 30; i++) await Promise.resolve(); }

test("production Canvas adapter transfers the public lease to cold file and returns without another download", async () => {
  const h = fixture(), first = h.begin(); await waitFor(() => first.images.length === 1);
  const path = first.images[0]!.src; first.images[0]!.onload!(); assert.ok(first.loaded);
  const file = first.loaded!.retainFile!(); first.loaded!.release(); assert.equal(h.cache.inspect().leased, 1);
  let decoded: LoadedSkyArtwork | undefined;
  file.decode(value => { decoded = value; }, () => assert.fail("valid lease"));
  assert.equal(first.images[1]!.src, path); first.images[1]!.onload!(); decoded!.release(); await drain();
  assert.equal(h.cache.inspect().leased, 0); assert.ok(h.files.has(path));
  const second = h.begin(); await waitFor(() => second.images.length === 1); second.images[0]!.onload!();
  assert.equal(second.images[0]!.src, path); assert.equal(h.downloads, 1); second.loaded!.release();
});

test("native decode/GPU owner retirement preserves valid encoded bytes for explicit retry", async () => {
  const h = fixture(), first = h.begin(); await waitFor(() => first.images.length === 1);
  const path = first.images[0]!.src; first.images[0]!.onerror!(); await drain();
  assert.equal(first.failed, 1); assert.equal(h.cache.inspect().leased, 0); assert.ok(h.files.has(path));
  const retry = h.begin(); await waitFor(() => retry.images.length === 1); retry.images[0]!.onload!();
  assert.equal(h.downloads, 1); retry.loaded!.release();
});

test("clear retires an in-flight native decode; a retained stale onload cannot deliver old content", async () => {
  const h = fixture(), first = h.begin(); await waitFor(() => first.images.length === 1);
  const image = first.images[0]!, late = image.onload!;
  await h.cache.clear(); late(); await drain();
  assert.equal(first.failed, 1); assert.equal(first.loaded, undefined); assert.equal(h.cache.inspect().leased, 0);
  assert.equal(h.files.has(image.src), false);
});
