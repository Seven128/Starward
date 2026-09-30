import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyArtworkLoader } from "./sky-artwork-loader";
import { startSkyArtworkRequest, type SkyArtworkImage } from "./sky-artwork-request";
import { skyImageFileSession } from "../../services/sky-image-file-session";
import { startDeepSkyImageRequest, type OwnedDeepSkyImageAsset } from "./deep-sky-image-request";

// Run the production hook with controlled React effects and native callbacks.
const source = ts.createSourceFile("use-sky-artwork.ts", readFileSync(new URL("./use-sky-artwork.ts", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const declaration = source.statements.find(statement => ts.isFunctionDeclaration(statement) &&
  statement.name?.text === "useSkyNativeImages") as ts.FunctionDeclaration;
assert.ok(declaration);

// Exercise the real page-to-hook ownership input, rather than bypassing the
// caller with an inactive flag that production never supplies for a layer toggle.
const pageSource = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const artworkCalls: ts.CallExpression[] = [];
function findArtworkCalls(node: ts.Node) {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "useSkyArtwork") artworkCalls.push(node);
  ts.forEachChild(node, findArtworkCalls);
}
findArtworkCalls(pageSource);
assert.equal(artworkCalls.length, 1);
const artworkActive = artworkCalls[0]!.arguments[3];
assert.ok(artworkActive);
const artworkActiveSource = artworkActive.getText(pageSource);
function pageArtworkActive(enabled: boolean): boolean {
  return Boolean(vm.runInNewContext(ts.transpileModule(`(${artworkActiveSource})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
      pageVisible: true, constellationsEnabled: enabled, rawReportData: {},
      report: { data: { dataState: "FRESH" }, isError: false },
    }));
}

function fixture() {
  const slots: any[] = [], pending: Array<() => void> = [];
  const requests: Array<{ success: (response: { statusCode: number; data: ArrayBuffer }) => void }> = [];
  const images: SkyArtworkImage[] = [], removed: string[] = [];
  let cursor = 0, dirty = false;
  const same = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length &&
    b.every((item, index) => Object.is(item, a![index]));
  const bindings = {
    EMPTY: { images: new Map(), retainedImages: new Map(), loading: false, failed: false },
    skyImageFileSession,
    createSkyArtworkLoader, startSkyArtworkRequest,
    Taro: { env: { USER_DATA_PATH: "/owned" },
      getFileSystemManager: () => ({ writeFile(options: { success(): void }) { options.success(); },
        unlink(options: { filePath: string }) { removed.push(options.filePath); } }),
      request(options: typeof requests[number]) { requests.push(options); return { abort() {} }; } },
    useRef(initial: unknown) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value: unknown) => {
        const next = typeof value === "function" ? value(slots[index]) : value;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; }
      }];
    },
    useCallback(callback: unknown) { cursor++; return callback; },
    useEffect(effect: () => void | (() => void), deps: unknown[]) {
      const index = cursor++, previous = slots[index];
      if (same(previous?.deps, deps)) return;
      slots[index] = { deps };
      pending.push(() => { previous?.cleanup?.(); slots[index].cleanup = effect(); });
    },
  };
  const hook = vm.runInNewContext(ts.transpileModule(`${declaration.getText(source).replace(/^export /u, "")}\nuseSkyNativeImages`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, bindings) as (
      canvas: object | null, revision: number, hash: string | undefined,
      active: boolean, wanted: readonly object[], resolve: (asset: any) => object) => {
        images: ReadonlyMap<string, object>;
      };
  const asset = { id: "w3:0:0", sha256: "asset-0", width: 512, height: 512, bytes: 32 };
  const bytes = new Uint8Array(32);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 8, 8, 2, 0, 2, 0, 0]);
  bytes.set([0xff, 0xda], 18); bytes.set([0xff, 0xd9], 30);
  function canvas() { return { createImage() {
    const image: SkyArtworkImage = { src: "", onload: null, onerror: null, width: 512, height: 512 };
    images.push(image); return image;
  } }; }
  const resolve = () => ({ url: "/published/asset-0.jpg", format: "jpeg" });
  function render(node: object | null, revision: number, hash: string | undefined, active = true,
    wanted: readonly object[] = [asset]) {
    cursor = 0; dirty = false;
    return hook(node, revision, hash, active, wanted, resolve);
  }
  function commit(node: object | null, revision: number, hash: string | undefined, active = true,
    wanted: readonly object[] = [asset]) {
    do {
      for (const effect of pending.splice(0)) effect();
      if (dirty) render(node, revision, hash, active, wanted);
    } while (pending.length || dirty);
    return render(node, revision, hash, active, wanted);
  }
  function finishRequest(index: number) {
    requests[index]!.success({ statusCode: 200, data: bytes.buffer });
    images.at(-1)!.onload!();
    return images.at(-1)!;
  }
  return { asset, canvas, render, commit, finishRequest, requests, images, removed,
    heldNativeState() { return slots.find(slot => slot?.owner && slot?.value?.images instanceof Map) ?? null; } };
}

test("shared artwork and selected-object requests use one runtime namespace with distinct file identities", () => {
  const h = fixture(), node = h.canvas();
  h.render(node, 1, "publication-a"); h.commit(node, 1, "publication-a");
  const image = h.finishRequest(0);
  let deep: OwnedDeepSkyImageAsset | undefined;
  startDeepSkyImageRequest({ asset: { reference: "M:31", level: "MEDIUM", tempFilePath: "/owned/deep-sky-M-31-MEDIUM.jpg" },
    url: "/objects/M31/image", request(options) {
      options.success({ statusCode: 200, data: new ArrayBuffer(4), header: { "X-Starward-Image-Field-Degrees": "4",
        "x-starward-image-publication-hash": "a".repeat(64), "x-starward-image-source-id": `imagery:fixture:${"a".repeat(64)}`,
        "x-starward-image-pixels": "512" } }); return {};
    }, writeFile: options => options.success(), removeFile() {}, onReady: value => { deep = value; },
    onError() { assert.fail("valid object image"); } });
  assert(deep);
  const artworkName = /\/sky-art-([a-z0-9]+_[a-z0-9]+)-(\d+)\.jpg$/.exec(image.src);
  const deepName = /\/deep-sky-M-31-MEDIUM-([a-z0-9]+_[a-z0-9]+)-(\d+)\.jpg$/.exec(deep.tempFilePath);
  assert(artworkName); assert(deepName);
  assert.equal(artworkName[1], deepName[1]);
  assert(Number(deepName[2]) > Number(artworkName[2]));
  deep.release(); h.render(node, 1, "publication-a", false); h.commit(node, 1, "publication-a", false);
});

test("a publication or Canvas generation switch fences old decoded images before effects and redecodes for the new owner", () => {
  const h = fixture(), firstCanvas = h.canvas(), nextCanvas = h.canvas();
  assert.equal(h.render(firstCanvas, 1, "publication-a").images.size, 0);
  h.commit(firstCanvas, 1, "publication-a");
  const firstImage = h.finishRequest(0);
  assert.equal(h.render(firstCanvas, 1, "publication-a").images.get(h.asset.id), firstImage);

  assert.equal(h.render(nextCanvas, 2, "publication-a").images.size, 0);
  h.commit(nextCanvas, 2, "publication-a");
  assert.equal(h.removed.length, 1);
  assert.equal(h.requests.length, 2);
  const nextImage = h.finishRequest(1);
  assert.notEqual(nextImage, firstImage);
  assert.equal(h.render(nextCanvas, 2, "publication-a").images.get(h.asset.id), nextImage);

  assert.equal(h.render(nextCanvas, 2, "publication-b").images.size, 0);
  h.commit(nextCanvas, 2, "publication-b");
  assert.equal(h.removed.length, 2);
  assert.equal(h.requests.length, 3);
  h.finishRequest(2);
  assert.equal(h.render(nextCanvas, 2, "publication-b").images.size, 1);

  assert.equal(h.render(nextCanvas, 2, "publication-b", false).images.size, 0);
  h.commit(nextCanvas, 2, "publication-b", false);
  assert.equal(h.removed.length, 3);
});

test("hide, Canvas removal and publication loss retire decoded images held by the Hook, not just its returned view", () => {
  for (const stop of ["hide", "canvas", "publication"] as const) {
    const h = fixture(), node = h.canvas();
    h.render(node, 1, "publication-a"); h.commit(node, 1, "publication-a");
    const image = h.finishRequest(0);
    h.render(node, 1, "publication-a");
    assert.equal(h.heldNativeState().value.images.get(h.asset.id), image);
    const next = { node: stop === "canvas" ? null : node,
      hash: stop === "publication" ? undefined : "publication-a", active: stop !== "hide" };
    assert.equal(h.render(next.node, 1, next.hash, next.active).images.size, 0);
    h.commit(next.node, 1, next.hash, next.active);
    assert.equal(h.removed.length, 1, `${stop} releases the request-owned file`);
    assert.equal(h.heldNativeState(), null, `${stop} must release the Hook's retired Canvas and decoded-image graph`);
    assert.equal(image.onload, null); assert.equal(image.onerror, null);
  }
});

test("the page's constellation off intent retires ready files and decoded state, and re-enabling creates a fresh owner", () => {
  const h = fixture(), node = h.canvas();
  h.render(node, 1, "publication-a", pageArtworkActive(true));
  h.commit(node, 1, "publication-a", pageArtworkActive(true));
  const first = h.finishRequest(0);
  h.render(node, 1, "publication-a", pageArtworkActive(true));
  assert.equal(h.heldNativeState().value.images.get(h.asset.id), first);

  // The production page also empties visibleFigures when the layer is off.
  h.render(node, 1, "publication-a", pageArtworkActive(false), []);
  h.commit(node, 1, "publication-a", pageArtworkActive(false), []);
  assert.equal(h.removed.length, 1, "switching off releases the completed layer's request-owned file");
  assert.equal(h.heldNativeState(), null, "an off layer must not retain its decoded-image/Canvas graph");

  h.render(node, 1, "publication-a", pageArtworkActive(true));
  h.commit(node, 1, "publication-a", pageArtworkActive(true));
  assert.equal(h.requests.length, 2, "re-enabling uses the same published source through a new live image owner");
  const restored = h.finishRequest(1);
  assert.notEqual(restored, first);
  assert.equal(h.render(node, 1, "publication-a", pageArtworkActive(true)).images.get(h.asset.id), restored);
  assert.notEqual(restored.src, first.src, "retired and restored requests have distinct owned files");
  h.render(node, 1, "publication-a", false); h.commit(node, 1, "publication-a", false);
  assert.equal(h.removed.length, 2);
  assert.equal(new Set(h.removed).size, 2);
});

test("an enabled layer with no currently wanted figures keeps its bounded bitmap cache for a reverse zoom", () => {
  const h = fixture(), node = h.canvas();
  h.render(node, 1, "publication-a", pageArtworkActive(true));
  h.commit(node, 1, "publication-a", pageArtworkActive(true));
  const image = h.finishRequest(0);
  h.render(node, 1, "publication-a", pageArtworkActive(true), []);
  h.commit(node, 1, "publication-a", pageArtworkActive(true), []);
  assert.equal(h.heldNativeState().value.retainedImages.get(h.asset.id), image);
  assert.equal(h.removed.length, 0, "local fading need not discard source files needed for a quick reverse zoom");
  h.render(node, 1, "publication-a", pageArtworkActive(true));
  assert.equal(h.commit(node, 1, "publication-a", pageArtworkActive(true)).images.get(h.asset.id), image);
  assert.equal(h.requests.length, 1, "returning to the same figure reuses its ready bitmap");
  h.render(node, 1, "publication-a", false); h.commit(node, 1, "publication-a", false);
});

test("an empty new Canvas generation cannot keep the old decoded-image state until another download finishes", () => {
  const h = fixture(), first = h.canvas(), next = h.canvas();
  h.render(first, 1, "publication-a"); h.commit(first, 1, "publication-a");
  h.finishRequest(0); h.render(first, 1, "publication-a");
  h.render(next, 2, "publication-a", true, []);
  h.commit(next, 2, "publication-a", true, []);
  assert.equal(h.requests.length, 1, "no new image is needed by the new view");
  assert.equal(h.removed.length, 1);
  assert.equal(h.heldNativeState(), null, "ownership retirement cannot depend on a future successful image response");
  h.render(next, 2, "publication-a"); h.commit(next, 2, "publication-a");
  const replacement = h.finishRequest(1);
  assert.equal(h.render(next, 2, "publication-a").images.get(h.asset.id), replacement);
  assert.equal(h.heldNativeState().canvas, next);
});

test("repeated hide/show with a late canceled response releases retired state and preserves each new owner", () => {
  const h = fixture();
  for (let generation = 1; generation <= 6; generation++) {
    const node = h.canvas();
    h.render(node, generation, "publication-a"); h.commit(node, generation, "publication-a");
    const canceledRequest = h.requests.at(-1)!;
    if (generation % 2 === 0) {
      h.render(null, generation, "publication-a", false);
      h.commit(null, generation, "publication-a", false);
      canceledRequest.success({ statusCode: 200, data: new ArrayBuffer(32) });
      assert.equal(h.heldNativeState(), null);
    } else {
      const image = h.finishRequest(h.requests.length - 1);
      h.render(node, generation, "publication-a");
      assert.equal(h.heldNativeState().value.images.get(h.asset.id), image);
      h.render(null, generation, "publication-a", false);
      h.commit(null, generation, "publication-a", false);
      assert.equal(h.heldNativeState(), null);
    }
  }
  assert.equal(h.requests.length, 6);
  assert.equal(h.images.length, 3, "canceled generations cannot recreate decoded images");
  assert.equal(h.removed.length, 3);
  assert.equal(new Set(h.removed).size, 3, "each completed generation releases only its own file");
});
