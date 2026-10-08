import assert from "node:assert/strict";
import test from "node:test";
import { createSkyCanvasSurface, type SkyDisplayCanvas, type SkyWebGLCanvas } from "./sky-canvas-surface";

function fixture() {
  let lost = false, copies = 0, losses = 0, allocations = 0, failed = false;
  const image = {}, events: string[] = [];
  const gl = { isContextLost: () => lost, flush: () => events.push("flush"),
    getExtension: () => ({ loseContext: () => { losses++; lost = true; } }) } as unknown as WebGLRenderingContext;
  const node: SkyWebGLCanvas = { width: 0, height: 0, getContext: () => gl, createImage: () => image };
  const display: SkyDisplayCanvas = { width: 0, height: 0, getContext: () => ({
    drawImage(source, x, y, width, height) {
      events.push("copy"); assert.strictEqual(source, node); assert.equal(x, 0); assert.equal(y, 0);
      assert.equal(width, display.width); assert.equal(height, display.height);
      if (failed) throw Error("native_copy_failed"); copies++;
    }, clearRect() {},
  }) };
  const create = () => { allocations++; return node; };
  return { node, display, create, image, events, lose: () => { lost = true; }, fail: () => { failed = true; },
    counts: () => ({ copies, losses, allocations }) };
}

test("one native image/GL owner copies completed pixels without a second Scene or per-frame allocation", () => {
  const h = fixture(), size = { width: 390.4, height: 844 };
  const surface = createSkyCanvasSurface(h.display, size, 2.625, h.create);
  assert.equal(h.display.width, Math.round(390.4 * 2.625));
  assert.equal(h.node.height, 2216);
  assert.strictEqual(surface.node.createImage(), h.image);
  surface.present(); surface.present();
  assert.deepEqual(h.events, ["flush", "copy", "flush", "copy"]);
  assert.deepEqual(h.counts(), { copies: 2, losses: 0, allocations: 1 });
  assert(surface.isCurrent(h.display, size, 2.625));
  assert(!surface.isCurrent({ ...h.display }, size, 2.625));
  assert(!surface.isCurrent(h.display, size, 3));
  h.display.width--;
  assert(!surface.isCurrent(h.display, size, 2.625));
  assert.throws(() => surface.present(), /invalidated/u);
  surface.dispose(); surface.dispose();
  assert.deepEqual([h.node.width, h.node.height, h.display.width, h.display.height], [0, 0, 0, 0]);
  assert.equal(h.counts().losses, 1);
  assert.throws(() => surface.present(), /invalidated/u);
});

test("copy and context loss failures cannot silently retain a valid surface", () => {
  const h = fixture(), size = { width: 16, height: 16 };
  const surface = createSkyCanvasSurface(h.display, size, 1, h.create);
  h.fail(); assert.throws(() => surface.present(), /native_copy_failed/u);
  assert.equal(h.counts().copies, 0);
  h.lose(); assert(!surface.isCurrent(h.display, size, 1));
  assert.throws(() => surface.present(), /invalidated/u);
  surface.dispose();
});

test("partial construction retires both backing stores and never allocates for invalid geometry", () => {
  for (const mode of ["2d", "create", "webgl"] as const) {
    const h = fixture();
    if (mode === "2d") h.display.getContext = () => null;
    if (mode === "webgl") h.node.getContext = () => null;
    assert.throws(() => createSkyCanvasSurface(h.display, { width: 16, height: 16 }, 1,
      () => { if (mode === "create") throw Error("native_allocation_failed"); return h.create(); }));
    assert.deepEqual([h.display.width, h.display.height, h.node.width, h.node.height], [0, 0, 0, 0]);
  }
  const h = fixture();
  assert.throws(() => createSkyCanvasSurface(h.display, { width: 16, height: 16 }, NaN, h.create), /size_invalid/u);
  assert.equal(h.counts().allocations, 0);
});
