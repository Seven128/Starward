import assert from "node:assert/strict";
import test from "node:test";
import { createSkyGpuTextures } from "./sky-gpu-textures";
import { registerSkyNativeImageLifetime } from "./sky-artwork-loader";

function fixture(budget = 512) {
  const uploaded: object[] = [], copies: number[][] = [], failures: object[] = [];
  const liveTextures = new Set<object>(), liveFramebuffers = new Set<object>();
  const deletedTextures: object[] = [], deletedFramebuffers: object[] = [];
  const foreignFramebuffer = {};
  let framebuffer: object | null = foreignFramebuffer, error = 0;
  const control = { failCopy: false, loseOnCopy: false, lost: false, failImage: null as object | null };
  const gl = {
    NO_ERROR: 0, TEXTURE_2D: 3553, TEXTURE_MIN_FILTER: 10241, TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242, TEXTURE_WRAP_T: 10243, LINEAR: 9729, CLAMP_TO_EDGE: 33071,
    UNPACK_FLIP_Y_WEBGL: 37440, UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
    RGBA: 6408, UNSIGNED_BYTE: 5121, FRAMEBUFFER: 36160, FRAMEBUFFER_BINDING: 36006,
    COLOR_ATTACHMENT0: 36064, FRAMEBUFFER_COMPLETE: 36053,
    getError() { const value = error; error = 0; return value; },
    isContextLost: () => control.lost,
    createTexture() { const value = {}; liveTextures.add(value); return value; },
    deleteTexture(value: object) { assert(liveTextures.delete(value), "release each owned texture exactly once"); deletedTextures.push(value); },
    bindTexture() {}, texParameteri() {}, pixelStorei() {},
    texImage2D(_target: number, _level: number, _internal: number, _format: number, _type: number, source: object) {
      uploaded.push(source); if (source === control.failImage) error = 1282;
    },
    createFramebuffer() { const value = {}; liveFramebuffers.add(value); return value; },
    deleteFramebuffer(value: object) { assert(liveFramebuffers.delete(value), "release each owned framebuffer exactly once"); deletedFramebuffers.push(value); },
    getParameter(parameter: number) { assert.equal(parameter, 36006); return framebuffer; },
    bindFramebuffer(_target: number, value: object | null) { framebuffer = value; },
    framebufferTexture2D() {}, checkFramebufferStatus: () => 36053,
    copyTexImage2D(_target: number, _level: number, _internal: number, x: number, y: number, width: number, height: number) {
      copies.push([x, y, width, height]);
      if (control.failCopy || control.loseOnCopy) error = 1282;
      if (control.loseOnCopy) control.lost = true;
    },
  } as unknown as WebGLRenderingContext;
  return { textures: createSkyGpuTextures(gl, source => failures.push(source), budget), control, uploaded, copies, failures,
    liveTextures, liveFramebuffers, deletedTextures, deletedFramebuffers, foreignFramebuffer,
    get framebuffer() { return framebuffer; } };
}

test("retired native sources cannot reuse a resident texture or upload through a queued frame", () => {
  const h = fixture(), image = { width: 4, height: 4 }, untouched = { width: 4, height: 4 };
  let live = true;
  registerSkyNativeImageLifetime(image, () => live);
  h.textures.begin(); assert(h.textures.get(image)); h.textures.finish(); assert.equal(h.uploaded.length, 1);
  live = false;
  assert.equal(h.textures.get(image), null); assert.equal(h.uploaded.length, 1); assert.equal(h.liveTextures.size, 0);
  assert.equal(h.failures.length, 0, "retirement does not invent an upload failure latch");
  assert(h.textures.get(untouched), "legacy independent sources preserve their existing semantics");
  const stop = registerSkyNativeImageLifetime(untouched, () => true); stop();
  h.textures.begin(); assert.equal(h.liveTextures.size, 0); assert.equal(h.textures.get(untouched), null);
  h.textures.dispose(); assert.equal(h.liveTextures.size, 0);
});

test("a stable visible working set stays resident above the allocation pressure target", () => {
  const h = fixture(192), panorama = { width: 12, height: 4 }, window = { x: 4, y: 0, width: 4, height: 4 };
  const art = Array.from({ length: 3 }, () => ({ width: 4, height: 4 }));
  for (let frame = 0; frame < 5; frame++) {
    const before = h.uploaded.length;
    h.textures.begin();
    assert(h.textures.getWindow(panorama, window).texture);
    for (const image of art) assert(h.textures.get(image), "all valid independent images draw");
    h.textures.finish();
    assert.equal(h.liveTextures.size, 4, "retain every source used by the completed frame");
    if (frame > 0) assert.equal(h.uploaded.length - before, 0, "a stationary frame does not upload its visible sources again");
  }
  assert.equal(h.uploaded.filter(image => image === panorama).length, 1, "do not reconstruct the complete source every frame");
  assert.equal(h.copies.length, 1);
  assert.equal(h.framebuffer, h.foreignFramebuffer, "restore the caller's framebuffer");
  h.textures.begin(); h.textures.finish();
  assert.equal(h.liveTextures.size, 0, "an empty completed frame retires its old working set before disposal");
  h.textures.dispose();
  assert.equal(h.liveTextures.size, 0); assert.equal(h.liveFramebuffers.size, 0);
  assert.equal(h.failures.length, 0);
});

test("returning from a full panorama copies its existing texture and a contained crop reuses it", () => {
  const h = fixture(), image = { width: 12, height: 4 };
  h.textures.begin(); assert(h.textures.get(image)); h.textures.finish();
  h.textures.begin();
  const cropped = h.textures.getWindow(image, { x: 2, y: 1, width: 4, height: 2 });
  assert.deepEqual(cropped.window, { x: 2, y: 1, width: 4, height: 2 });
  assert.equal(h.uploaded.length, 1, "the full resident supplies source pixels without reupload");
  assert.deepEqual(h.copies, [[2, 1, 4, 2]]);
  const contained = h.textures.getWindow(image, { x: 3, y: 1, width: 1, height: 1 });
  assert.equal(contained.texture, cropped.texture);
  assert.deepEqual(contained.window, cropped.window, "sampler receives the actual retained window");
  assert.equal(h.copies.length, 1);
  h.textures.finish();
  h.textures.begin(); assert(h.textures.get(image), "a consumer requiring the whole image still obtains it"); h.textures.finish();
  assert.equal(h.uploaded.length, 2);
  h.textures.dispose();
  assert.equal(h.liveTextures.size, 0); assert.equal(h.liveFramebuffers.size, 0);
  assert.equal(h.framebuffer, h.foreignFramebuffer);
});

test("ordinary camera overlap releases unused A under pressure while preserving current B for BC", () => {
  const h = fixture(64), a = {width:4,height:4}, b = {width:4,height:4}, c = {width:4,height:4};
  h.textures.begin(); const ta = h.textures.get(a), tb = h.textures.get(b);
  assert(ta && tb); h.textures.finish(); assert.equal(h.liveTextures.size, 2);
  h.textures.begin(); assert.equal(h.textures.get(b), tb);
  const tc = h.textures.get(c); assert(tc);
  assert(!h.liveTextures.has(ta), "still-current A leaves during allocation without a weak-owner retirement");
  assert(h.liveTextures.has(tb) && h.liveTextures.has(tc), "preparation of C preserves the already-used B");
  assert.deepEqual(h.uploaded, [a,b,c], "the overlapping source B is not uploaded again");
  h.textures.finish(); assert.equal(h.liveTextures.size, 2, "the completed frame contains exactly BC");
  h.textures.begin(); h.textures.finish(); assert.equal(h.liveTextures.size, 0);
  h.textures.dispose(); assert.equal(h.liveTextures.size, 0);
});

test("a copy failure retains valid original pixels and latches only the optional copy path", () => {
  const h = fixture(), image = { width: 12, height: 4 };
  h.textures.begin(); const whole = h.textures.get(image); h.textures.finish();
  h.control.failCopy = true;
  for (let frame = 0; frame < 3; frame++) {
    h.textures.begin();
    const result = h.textures.getWindow(image, { x: 4, y: 1, width: 4, height: 2 });
    assert.equal(result.texture, whole); assert.deepEqual(result.window, { x: 0, y: 0, width: 12, height: 4 });
    h.textures.finish();
  }
  assert.equal(h.copies.length, 1, "do not retry copy on each frame");
  assert.equal(h.uploaded.length, 1, "borrowed full texture remains valid after failed copy");
  assert.deepEqual(h.failures, [], "a valid image is not marked unavailable by an optimization failure");
  assert.equal(h.liveFramebuffers.size, 0); assert.equal(h.framebuffer, h.foreignFramebuffer);
  h.textures.dispose(); assert.equal(h.liveTextures.size, 0);
});

test("failed decoded identities stay latched and a new identity recovers the cropped path", () => {
  const h = fixture(), failed = { width: 12, height: 4 }, window = { x: 4, y: 1, width: 4, height: 2 };
  h.control.failImage = failed;
  for (let frame = 0; frame < 3; frame++) { h.textures.begin(); assert.equal(h.textures.getWindow(failed, window).texture, null); h.textures.finish(); }
  assert.equal(h.uploaded.length, 1); assert.deepEqual(h.failures, [failed]); assert.equal(h.copies.length, 0);
  const replacement = { width: 12, height: 4 };
  h.textures.begin(); assert(h.textures.getWindow(replacement, window).texture); h.textures.finish();
  assert.equal(h.copies.length, 1); assert.deepEqual(h.failures, [failed]);
  h.textures.dispose(); assert.equal(h.liveTextures.size, 0); assert.equal(h.liveFramebuffers.size, 0);
});

test("context loss during copy releases temporary resources and rejects image success", () => {
  const h = fixture(), image = { width: 12, height: 4 };
  h.textures.begin(); assert(h.textures.get(image)); h.textures.finish();
  h.control.loseOnCopy = true; h.textures.begin();
  assert.throws(() => h.textures.getWindow(image, { x: 4, y: 1, width: 4, height: 2 }), /sky_gpu_context_lost/);
  h.textures.dispose();
  assert.equal(h.liveTextures.size, 0); assert.equal(h.liveFramebuffers.size, 0);
  assert.equal(h.framebuffer, h.foreignFramebuffer); assert.deepEqual(h.failures, []);
});

test("nested paired pins protect not-yet-used samplers and release before the next moving frame", () => {
  const h = fixture(64), coarse = {width:4,height:4}, fine = {width:4,height:4}, next = {width:4,height:4};
  h.textures.begin();
  const first = h.textures.get(coarse), second = h.textures.get(fine);
  assert(first && second); h.textures.finish();
  h.textures.begin();
  h.textures.withPinned([coarse,fine], () => {
    h.textures.withPinned([coarse], () => assert(h.textures.get(next)));
    assert(h.textures.get({width:4,height:4}), "new allocation after inner exit still respects the outer future-sampler pins");
    assert(h.liveTextures.has(first), "inner scope exit must keep the outer coarse pin");
    assert(h.liveTextures.has(second), "allocation cannot delete the fine sampler before it is used");
    assert.equal(h.textures.get(coarse), first); assert.equal(h.textures.get(fine), second);
  });
  h.textures.finish();
  assert.equal(h.liveTextures.size, 4, "the current frame owns all four used images");
  h.textures.begin(); assert(h.textures.get({width:4,height:4}));
  assert(!h.liveTextures.has(first) && !h.liveTextures.has(second), "released pins do not preserve inactive samplers under pressure");
  h.textures.finish(); assert.equal(h.liveTextures.size, 1);
  h.textures.dispose();assert.equal(h.liveTextures.size,0);
});

test("a failed finer upload keeps coarse usable and an exceptional submission releases its pins", () => {
  const h = fixture(64), coarse = {width:4,height:4}, failed = {width:4,height:4}, next = {width:4,height:4};
  h.control.failImage = failed;h.textures.begin();
  let first: WebGLTexture | null = null;
  assert.throws(() => h.textures.withPinned([coarse,failed], () => {
    first=h.textures.get(coarse);
    assert.equal(h.textures.get(failed),null);
    assert(first && h.liveTextures.has(first));
    throw new Error("controlled_submission_failure");
  }),/controlled_submission_failure/);
  assert.equal(h.textures.get(failed),null,"failed identity remains latched");
  assert.deepEqual(h.failures,[failed]);assert.equal(h.uploaded.filter(image=>image===failed).length,1);
  assert(h.textures.get(next)); assert(h.liveTextures.has(first!), "the coarse source remains owned by this frame after a failed fine upload");
  h.textures.finish(); h.textures.begin(); assert(h.textures.get({width:4,height:4}));
  assert(!h.liveTextures.has(first!), "throw must release the pin before an inactive source meets next-frame pressure");
  h.textures.finish();h.textures.dispose();assert.equal(h.liveTextures.size,0);
});
