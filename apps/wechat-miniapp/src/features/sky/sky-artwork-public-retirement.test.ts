import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import { createSkyPublicImageCache, type SkyPublicImageFileSystem } from "../../services/sky-public-image-cache";
import { startSkyArtworkRequest, type SkyArtworkImage } from "./sky-artwork-request";
import * as nativeImages from "./sky-artwork-loader";
import type { SkyArtworkLoadState } from "./sky-artwork-loader";

// Real approved source bytes, controlled native image callbacks/FS. This proves
// actual owner/Promise lifecycle, not native decode, quota or driver behavior.
function harness() {
  const bytes = readFileSync(new URL("../../../../../workers/miniapp-api/assets/constellations/lyra.png", import.meta.url));
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const asset = { id: "lyra", sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length, width, height };
  const files = new Map<string, ArrayBuffer>(), images: SkyArtworkImage[] = []; let transfers = 0;
  const fs: SkyPublicImageFileSystem = {
    async mkdir() {}, async list(root) { return [...files.keys()].filter(p => p.startsWith(root + "/")).map(p => p.slice(root.length + 1)); },
    async size(p) { const b = files.get(p); if (!b) throw Error("missing"); return b.byteLength; },
    async read(p) { const b = files.get(p); if (!b) throw Error("missing"); return b.slice(0); },
    async write(p, b) { files.set(p, b.slice(0)); },
    async rename(p, q) { const b = files.get(p); if (!b) throw Error("missing"); files.set(q, b); files.delete(p); },
    async remove(p) { files.delete(p); },
  };
  const cache = createSkyPublicImageCache({ fs, root: "/owned/sky-public-images-v1", session: "retirement_test", byteBudget: 1024 * 1024,
    maxFileBytes: 256 * 1024, cleanupWaitMs: 10, transfer() { transfers++; return { promise: Promise.resolve(body.slice(0)), cancel() {} }; } });
  let state: SkyArtworkLoadState | undefined, emissions = 0;
  const loader = nativeImages.createSkyArtworkLoader<typeof asset>({changed(v) { state = v; emissions++; },
    start(a, ready, fail) { return startSkyArtworkRequest({ asset: a, url: "https://fixture.invalid/approved.png",
      acquire: () => cache.acquire({ ...a, format: "png", environment: "e".repeat(64), url: "https://fixture.invalid/approved.png" }),
      canvas: {createImage() { const image = {src: "", width, height, onload: null, onerror: null} as SkyArtworkImage; images.push(image); return image; }}, ready, fail }); }});
  return { asset, files, images, cache, loader, get state() { return state!; }, get emissions() { return emissions; }, get transfers() { return transfers; } };
}
async function waitFor(test: () => boolean) { for (let i = 0; i < 500; i++) { if (test()) return; await Promise.resolve(); } assert.fail("owner callback not reached"); }
const isCurrent = (image: object) => (nativeImages as unknown as {skyNativeImageIsCurrent(image: object): boolean}).skyNativeImageIsCurrent(image);

test("actual public ready clear removes the bitmap, releases its lease and waits for explicit retry", async () => {
  const h = harness(); h.loader.update([h.asset]); await waitFor(() => !!h.images[0]?.onload); h.images[0]!.onload!();
  assert.equal(h.state.images.get(h.asset.id), h.images[0]); assert.equal(h.cache.inspect().leased, 1);
  const queued = h.state.images.get(h.asset.id)!;
  const clearing = h.cache.clear();
  assert.equal(h.state.images.size, 0, "retirement must synchronously withdraw a previously ready image");
  assert.equal(h.state.failed, true); assert.equal(isCurrent(queued), false); assert.equal(h.cache.inspect().leased, 0);
  assert.equal((await clearing).status, "complete");
  h.loader.update([h.asset]); assert.equal(h.transfers, 1, "pose updates do not automatically reacquire a cleared image");
  h.loader.retry(); await waitFor(() => !!h.images[1]?.onload); h.images[1]!.onload!();
  assert.equal(h.transfers, 2); assert.equal(h.state.failed, false); assert.equal(isCurrent(h.images[1]!), true);
  h.loader.dispose(); assert.equal(isCurrent(h.images[1]!), false); assert.equal((await h.cache.clear()).status, "complete");
});

test("actual public cold file retirement cannot resurrect an old decoded graph or file", async () => {
  const h = harness(); h.loader.update([h.asset]); await waitFor(() => !!h.images[0]?.onload); h.images[0]!.onload!();
  h.loader.update([]); h.loader.suspendUnusedDecoded();
  assert.equal(h.state.retainedImages.size, 0); assert.equal(h.cache.inspect().leased, 1);
  assert.equal((await h.cache.clear()).status, "complete", "cold owner retirement must release its actual file lease");
  assert.equal(h.cache.inspect().leased, 0); assert.equal(isCurrent(h.images[0]!), false);
  h.loader.update([h.asset]); assert.equal(h.state.failed, true); assert.equal(h.transfers, 1);
  h.loader.retry(); await waitFor(() => !!h.images[1]?.onload); h.images[1]!.onload!();
  assert.equal(h.transfers, 2); assert.equal(h.state.images.get(h.asset.id), h.images[1]);
  h.loader.dispose(); await h.cache.clear();
});

test("actual public decode clear ignores a captured late onload and repeated retirement", async () => {
  const h = harness(); h.loader.update([h.asset]); await waitFor(() => !!h.images[0]?.onload);
  const late = h.images[0]!.onload!; const clear = h.cache.clear(); late();
  assert.equal(h.state.images.size, 0); assert.equal(h.state.failed, true); assert.equal(h.cache.inspect().leased, 0);
  assert.equal((await clear).status, "complete"); assert.equal((await h.cache.clear()).status, "complete");
  assert.equal(h.transfers, 1); h.loader.dispose();
});
