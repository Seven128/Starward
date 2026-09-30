import assert from "node:assert/strict";
import test from "node:test";
import type { SkyLandscapeManifestData, SkyLandscapeResource } from "@starward/miniapp-contracts";
import { createSkyLandscapeMasks, selectSkyLandscapePanorama, selectSkyLandscapeResource,
  type SkyLandscapeMaskState } from "./sky-landscape-resources.ts";
import { createSkyPanoramaMask } from "./sky-landscape-mask.ts";

const overview = { id: "overview", image: { width: 1024, height: 512 } } as SkyLandscapeResource;
const detail = { id: "detail", image: { width: 2048, height: 1024 } } as SkyLandscapeResource;
const publication = { resources: [overview, detail] } as SkyLandscapeManifestData;
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test("foreground detail shares the actual GPU budget without counting a decoded identity twice or guessing unknown inputs", () => {
  const galaxy = { width: 2048, height: 1024 }, art = { width: 512, height: 512 };
  assert.equal(selectSkyLandscapeResource(publication, [galaxy, galaxy], false), detail);
  assert.equal(selectSkyLandscapeResource(publication, [galaxy, art], false), overview);
  assert.equal(selectSkyLandscapeResource(publication, [art], false), detail);
  assert.equal(selectSkyLandscapeResource(publication, [], true), overview);
  assert.equal(selectSkyLandscapeResource(publication, [{}], false), overview);
});

test("a failed detail alpha request preserves the same valid coarse image/mask and retries only the failed resource", async () => {
  let state: SkyLandscapeMaskState = { masks: new Map(), failed: false }, requests: string[] = [], failDetail = true;
  const owner = createSkyLandscapeMasks(publication, {
    async load(resource) {
      requests.push(resource.id);
      if (resource.id === "detail" && failDetail) throw Error("actual alpha boundary failure");
      return new Uint8Array(resource.image.width * resource.image.height).fill(resource.id === "detail" ? 255 : 0);
    }, changed(value) { state = value; },
  });
  owner.update([overview]); await flush();
  const coarseMask = state.masks.get("overview"), coarseImage = { width: 1024, height: 512 };
  assert.ok(coarseMask);
  owner.update([overview, detail]); await flush();
  assert.equal(state.failed, true); assert.equal(state.masks.get("overview"), coarseMask);
  const images = new Map([["landscape:overview", coarseImage]]);
  assert.deepEqual(selectSkyLandscapePanorama(detail, state.masks, images, new Map()), { image: coarseImage, mask: coarseMask });
  failDetail = false; owner.retry(); await flush();
  assert.deepEqual(requests, ["overview", "detail", "detail"]); assert.equal(state.failed, false);
  const fineImage = { width: 2048, height: 1024 }, fineMask = state.masks.get("detail")!;
  const ready = new Map([["landscape:detail", fineImage]]), retained = new Map([["landscape:overview", coarseImage]]);
  assert.deepEqual(selectSkyLandscapePanorama(detail, state.masks, ready, retained), { image: fineImage, mask: fineMask });
  assert.deepEqual(selectSkyLandscapePanorama(overview, state.masks, ready, retained), { image: coarseImage, mask: coarseMask });
  assert.equal(coarseMask.alpha[0], 0); assert.equal(fineMask.alpha[0], 255, "resolution alpha identities cannot be exchanged");
  owner.dispose();
});

test("late canceled detail alpha cannot replace a valid overview or publish into a hidden canvas", async () => {
  let resolveDetail!: (value: Uint8Array) => void, detailSignal!: AbortSignal, changes = 0;
  let state: SkyLandscapeMaskState = { masks: new Map(), failed: false };
  const owner = createSkyLandscapeMasks(publication, {
    load(resource, signal) {
      if (resource.id === "overview") return Promise.resolve(new Uint8Array(1024 * 512));
      detailSignal = signal; return new Promise(resolve => { resolveDetail = resolve; });
    }, changed(value) { changes++; state = value; },
  });
  owner.update([overview, detail]); await flush();
  const coarse = state.masks.get("overview"); assert.ok(coarse);
  owner.update([overview]); assert.equal(detailSignal.aborted, true);
  resolveDetail(new Uint8Array(2048 * 1024).fill(255)); await flush();
  assert.equal(state.masks.has("detail"), false); assert.equal(state.masks.get("overview"), coarse);
  owner.update([overview, detail]); await flush(); owner.dispose(); const afterHide = changes;
  assert.equal(detailSignal.aborted, true); resolveDetail(new Uint8Array(2048 * 1024)); await flush();
  assert.equal(changes, afterHide); owner.retry(); owner.update([overview]); assert.equal(changes, afterHide);
});

test("detail image failure still selects valid coarse alpha, without granting a missing mask or stale detail image credit", () => {
  const coarse = createSkyPanoramaMask(publication, overview, new Uint8Array(1024 * 512));
  const fine = createSkyPanoramaMask(publication, detail, new Uint8Array(2048 * 1024));
  const image = { width: 1024, height: 512 };
  const masks = new Map([["overview", coarse], ["detail", fine]]);
  assert.deepEqual(selectSkyLandscapePanorama(detail, masks, new Map(), new Map([["landscape:overview", image]])), { image, mask: coarse });
  assert.equal(selectSkyLandscapePanorama(detail, masks, new Map(), new Map()), null);
  assert.equal(selectSkyLandscapePanorama(detail, new Map(), new Map([["landscape:detail", {}]]), new Map()), null);
});
