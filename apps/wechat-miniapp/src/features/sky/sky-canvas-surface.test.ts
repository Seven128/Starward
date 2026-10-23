import assert from "node:assert/strict";
import test from "node:test";
import { createSkyCanvasSurface, SKY_TEXT_MEASUREMENT_CACHE_ENTRIES, type SkyDisplayCanvas, type SkyWebGLCanvas } from "./sky-canvas-surface";
import { createSkySelectionLayer } from "./sky-selection-reticle";

function fixture() {
  let lost = false, copies = 0, losses = 0, allocations = 0, failed = false;
  const image = {}, events: string[] = [], arcs: number[][] = [], scales: number[][] = [],
    moves: number[][] = [], lines: number[][] = [], clears: number[][] = [];
  const gl = { isContextLost: () => lost, flush: () => events.push("flush"),
    getExtension: () => ({ loseContext: () => { losses++; lost = true; } }) } as unknown as WebGLRenderingContext;
  const node: SkyWebGLCanvas = { width: 0, height: 0, getContext: () => gl, createImage: () => image };
  const display: SkyDisplayCanvas = { width: 0, height: 0, getContext: () => ({
    drawImage(source, x, y, width, height) {
      events.push("copy"); assert.strictEqual(source, node); assert.equal(x, 0); assert.equal(y, 0);
      assert.equal(width, display.width); assert.equal(height, display.height);
      if (failed) throw Error("native_copy_failed"); copies++;
    }, clearRect(...values) { clears.push(values); }, save() {}, restore() {}, scale(x, y) { scales.push([x, y]); },
    beginPath() {}, arc(x, y, radius) { arcs.push([x, y, radius]); }, moveTo(...values) { moves.push(values); }, lineTo(...values) { lines.push(values); },
    stroke() { events.push("selection"); }, strokeStyle: "", lineWidth: 1, globalAlpha: 1,
  }) };
  const create = () => { allocations++; return node; };
  return { node, display, create, image, events, arcs, scales, moves, lines, clears, lose: () => { lost = true; }, fail: () => { failed = true; },
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

test("the selected reticle moves in the same accepted copy and never draws after a failed copy", () => {
  const h = fixture(), size = { width: 390, height: 844 };
  const surface = createSkyCanvasSurface(h.display, size, 2.625, h.create);
  surface.present({ x: 195, y: 422, radiusPx: 12, shape: "cross", color: "#DCE4EF" });
  surface.present({ x: 100, y: 250, radiusPx: 64, shape: "circle", color: "#DCE4EF" });
  assert.deepEqual(h.arcs, [], "the selected marker has no enclosing circle");
  assert.deepEqual(h.moves, [[172,422],[211,422],[195,438],[25,250],[168,250],[100,318]]);
  assert.deepEqual(h.lines, [[179,422],[218,422],[195,445],[32,250],[175,250],[100,325]]);
  assert.deepEqual(h.scales, [[2.625, 2.625], [2.625, 2.625]]);
  assert.deepEqual(h.events.filter(value => value !== "flush"), ["copy", "selection", "copy", "selection"]);
  h.fail();
  assert.throws(() => surface.present({ x: 20, y: 30, radiusPx: 12, shape: "cross", color: "#DCE4EF" }), /native_copy_failed/u);
  assert.equal(h.lines.length, 6, "a failed display copy cannot move the marker");
  surface.dispose();
});

test("an independent selection layer follows accepted copies without copying the background or an idle JS writer", () => {
  const h=fixture(), overlay=fixture(), size={width:390,height:844};
  const surface=createSkyCanvasSurface(h.display,size,3,h.create,overlay.display);
  assert.deepEqual([overlay.display.width,overlay.display.height],[0,0],"no backing until a marker is visible");
  const reticle={x:195,y:422,radiusPx:12,shape:'cross' as const,color:'#DCE4EF'};
  surface.present(reticle);
  assert.equal(h.lines.length,0,"scene display never draws a second marker");
  assert.equal(overlay.lines.length,3);assert.equal(overlay.counts().copies,0);
  assert.deepEqual([overlay.display.width,overlay.display.height],[1170,2532]);
  assert(surface.isCurrent(h.display,size,3,overlay.display));
  assert(!surface.isCurrent(h.display,size,3,{...overlay.display}));
  surface.present({...reticle,x:210,y:430});
  assert.equal(overlay.clears.length,3,"only old stroke regions are cleared when the scene moves");
  assert(overlay.clears.every(([, ,width,height])=>width!*height!<1000));
  const draws=overlay.lines.length;h.fail();
  assert.throws(()=>surface.present({...reticle,x:220}),/native_copy_failed/);
  assert.equal(overlay.lines.length,draws,"rejected scene cannot advance the independent layer");
  surface.clearSelection();
  assert.deepEqual([overlay.display.width,overlay.display.height],[0,0],"hide releases the optional backing");
  surface.dispose();surface.dispose();
  assert.deepEqual([overlay.display.width,overlay.display.height],[0,0]);
});

test("an unavailable selection layer logs and preserves the static three-stroke marker", () => {
  const h=fixture(),overlay=fixture();overlay.display.getContext=()=>null;
  const surface=createSkyCanvasSurface(h.display,{width:390,height:844},3,h.create,overlay.display);
  surface.present({x:195,y:422,radiusPx:12,shape:'cross',color:'#DCE4EF'});
  assert.equal(h.counts().copies,1);assert.equal(h.lines.length,3);
  assert.deepEqual([overlay.display.width,overlay.display.height],[0,0]);surface.dispose();
});

function dimensionWrites(display: SkyDisplayCanvas) {
  const writes: Array<[string, number]> = [];
  for (const axis of ["width", "height"] as const) {
    let value = display[axis];
    Object.defineProperty(display, axis, { get: () => value,
      set: (next: number) => { value = next; writes.push([axis, next]); } });
  }
  return writes;
}

test("inactive selection backing stays released across presents, hide and retirement, then lazily reactivates", () => {
  const h = fixture(), overlay = fixture(), writes = dimensionWrites(overlay.display);
  const surface = createSkyCanvasSurface(h.display, { width: 390, height: 844 }, 3, h.create, overlay.display);
  writes.length = 0;
  for (let frame = 0; frame < 120; frame++) surface.present();
  assert.deepEqual(writes, [], "inactive presentation must not write native backing dimensions");
  const reticle = { x: 195, y: 422, radiusPx: 12, shape: "cross" as const, color: "#DCE4EF" };
  surface.present(reticle);
  assert.deepEqual(writes, [["width", 1170], ["height", 2532]]);
  surface.present(null);
  assert.deepEqual(writes.slice(-2), [["width", 0], ["height", 0]]);
  writes.length = 0;
  for (let frame = 0; frame < 120; frame++) surface.present();
  surface.clearSelection(); surface.clearSelection();
  assert.deepEqual(writes, []);
  surface.present({ ...reticle, x: 210 });
  assert.equal(overlay.lines.length, 6, "reactivation draws the new current marker");
  surface.dispose(); surface.dispose(); surface.disableSelectionLayer();
  assert.deepEqual(writes, [["width", 1170], ["height", 2532], ["width", 0], ["height", 0]]);
});

test("selection clear releases partially allocated backing even when context acquisition failed", () => {
  const overlay = fixture(); overlay.display.getContext = () => null;
  const layer = createSkySelectionLayer(overlay.display, 1170, 2532, 3);
  const writes = dimensionWrites(overlay.display);
  assert.throws(() => layer.paint({ x: 195, y: 422, radiusPx: 12, shape: "cross", color: "#DCE4EF" }), /context_unavailable/);
  assert.deepEqual([overlay.display.width, overlay.display.height], [1170, 2532]);
  layer.clear(); layer.clear();
  assert.deepEqual(writes, [["width", 1170], ["height", 2532], ["width", 0], ["height", 0]]);
  assert(layer.isCurrent(overlay.display));
  layer.dispose();
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

test("decorative Chinese names share the successful display copy, centre and native state lifetime", () => {
  const h = fixture(), words: Array<{ text: string; x: number; y: number; alpha: number; font: string }> = [];
  let saves = 0, restores = 0, textFailed = false;
  const context = h.display.getContext("2d")!;
  Object.assign(context, { save() { saves++; }, restore() { restores++; }, font: "",
    measureText: () => ({ width: 12 }), fillText(text: string, x: number, y: number) {
      if (textFailed) throw Error("native_text_failed");
      words.push({ text, x, y, alpha: context.globalAlpha, font: context.font! });
      h.events.push("caption");
    } });
  h.display.getContext = () => context;
  const surface = createSkyCanvasSurface(h.display, { width: 750, height: 1000 }, 2, h.create);
  surface.present(null, [{ text: "仙王座", x: 300, y: 400, opacity: .5 }]);
  assert.deepEqual(h.events, ["flush", "copy", "caption", "caption", "caption"]);
  assert.deepEqual(words.map(word => [word.text, word.x, word.y, word.alpha]),
    [["仙", 281, 400, .5], ["王", 294, 400, .5], ["座", 307, 400, .5]]);
  assert(words.every(word => word.font === "12px sans-serif"));
  assert.deepEqual(h.scales, [[2, 2]]);
  assert.equal(saves, restores);
  textFailed = true;
  assert.throws(() => surface.present(null, [{ text: "仙王座", x: 310, y: 400, opacity: 1 }]), /native_text_failed/u);
  assert.equal(saves, restores, "a native font failure must restore its drawing state");
  textFailed = false; h.fail();
  assert.throws(() => surface.present(null, [{ text: "仙王座", x: 320, y: 400, opacity: 1 }]), /native_copy_failed/u);
  assert.equal(words.length, 3, "a rejected copy must not publish replacement text");
  surface.dispose();
  assert.throws(() => surface.present(null, [{ text: "仙王座", x: 320, y: 400, opacity: 1 }]), /invalidated/u);
});

test("whole catalog names use native glyph bounds and natural size in the successful copy",()=>{
  const h=fixture(),context=h.display.getContext("2d")!,words:unknown[][]=[];
  let saves=0,restores=0,markers=0;
  Object.assign(context,{font:"",save(){saves++;},restore(){restores++;},
    measureText(text:string){assert.equal(text,"NGC 300");assert.equal(context.font,"12px sans-serif");return{
      width:62,actualBoundingBoxLeft:2,actualBoundingBoxRight:65,actualBoundingBoxAscent:10,actualBoundingBoxDescent:4};},
    fill(){markers++;},fillText(...args:unknown[]){words.push([...args,context.font,context.globalAlpha]);}});
  h.display.getContext=()=>context;
  const surface=createSkyCanvasSurface(h.display,{width:360,height:780},3,h.create);
  assert.deepEqual(surface.measureText("NGC 300","12px sans-serif",18),{width:62,left:2,right:65,ascent:10,descent:9});
  surface.present(null,[{text:"NGC 300",x:280,y:300,opacity:.5,font:"12px sans-serif",letterSpacing:0,
    textAlign:"left",marker:{x:275,y:300,radius:1.2}}]);
  assert.deepEqual(words,[["NGC 300",280,300,"12px sans-serif",.5]],"no maxWidth, wrapping or font shrink");
  assert.equal(markers,1);assert.equal(saves,restores);
  h.fail();assert.throws(()=>surface.present(null,[{text:"NGC 300",x:290,y:300,opacity:1,letterSpacing:0}]),/native_copy_failed/);
  assert.equal(words.length,1);surface.dispose();
});

test("spaced constellation metrics and glyph positions describe the same complete native ink rectangle",()=>{
  const h=fixture(),context=h.display.getContext('2d')!,words:unknown[][]=[];
  Object.assign(context,{font:'',measureText(text:string){return text==='仙'?{
    width:12,actualBoundingBoxLeft:2,actualBoundingBoxRight:12,actualBoundingBoxAscent:8,actualBoundingBoxDescent:3}:
    {width:12,actualBoundingBoxLeft:0,actualBoundingBoxRight:text==='座'?14:12};},
    fillText(...args:unknown[]){words.push(args);}});
  h.display.getContext=()=>context;
  const surface=createSkyCanvasSurface(h.display,{width:750,height:1000},3,h.create);
  const metrics=surface.measureText('仙王座','12px sans-serif',18,1);
  assert.deepEqual(metrics,{width:38,left:2,right:40,ascent:9,descent:9});
  surface.present(null,[{text:'仙王座',x:300,y:400,opacity:.5,textAlign:'center',letterSpacing:1}]);
  assert.deepEqual(words,[['仙',281,400],['王',294,400],['座',307,400]]);
  assert.equal(300-metrics.width/2-metrics.left,279);
  assert.equal(300-metrics.width/2+metrics.right,321);
  assert.throws(()=>surface.measureText('仙王座','12px sans-serif',18,NaN),/caption_invalid/);
  surface.dispose();
});

function textFixture() {
  const h = fixture(), context = h.display.getContext("2d")!;
  const calls: Array<{ text: string; font: string | undefined }> = [], words: Array<[string, number, number]> = [];
  const states: Array<{ font: string | undefined; align: string | undefined; baseline: string | undefined }> = [];
  let native = (_text: string) => ({ width: 12 }), failRestore = false;
  Object.assign(context, {
    font: "10px sans-serif", textAlign: "start", textBaseline: "alphabetic",
    save() { states.push({ font: context.font, align: context.textAlign, baseline: context.textBaseline }); },
    restore() {
      const state = states.pop()!;
      Object.assign(context, { font: state.font, textAlign: state.align, textBaseline: state.baseline });
      if (failRestore) throw Error("native_restore_failed");
    },
    measureText(text: string) {
      calls.push({ text, font: context.font });
      assert.equal(context.textAlign, "left"); assert.equal(context.textBaseline, "middle");
      return native(text);
    },
    fillText(text: string, x: number, y: number) { words.push([text, x, y]); },
  });
  h.display.getContext = () => context;
  const surface = createSkyCanvasSurface(h.display, { width: 750, height: 1000 }, 2, h.create);
  return { ...h, context, surface, calls, words, states,
    measure: (next: typeof native) => { native = next; }, failRestore: (value: boolean) => { failRestore = value; } };
}

test("layout and centered painting reuse native whole-string shaping without retaining native or caller-owned metrics", () => {
  const h = textFixture(), native = { width: 17, actualBoundingBoxLeft: 2, actualBoundingBoxRight: 19,
    actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 4 };
  h.measure(text => { assert.equal(text, "AV"); return native; });
  const expected = { width: 17, left: 2, right: 19, ascent: 10, descent: 9 };
  const first = h.surface.measureText("AV", "12px sans-serif", 18);
  assert.deepEqual(first, expected);
  (first as { width: number }).width = 999;
  native.width = 888;
  assert.deepEqual(h.surface.measureText("AV", "12px sans-serif", 18), expected);
  for (const textAlign of ["center", "left"] as const) h.surface.present(null, [
    { text: "AV", x: 100, y: 60, opacity: 1, letterSpacing: 0, textAlign },
  ]);
  assert.deepEqual(h.words, [["AV", 91.5, 60], ["AV", 100, 60]]);
  assert.equal(h.calls.length, 1, "both consumers must use the same native whole-string result");
  assert.equal(h.context.font, "10px sans-serif");
  assert.equal(h.states.length, 0);
  h.surface.dispose();
});

test("spaced layout and painting share exact Unicode code-point advances and keep complete input identity", () => {
  const h = textFixture();
  h.measure(text => ({ width: ({ A: 7, "🌌": 11, B: 9 } as Record<string, number>)[text] ?? 40 }));
  const expected = { width: 29.5, left: 0, right: 29.5, ascent: 9, descent: 9 };
  assert.deepEqual(h.surface.measureText("A🌌B", "12px sans-serif", 18, 1.25), expected);
  h.surface.present(null, [{ text: "A🌌B", x: 100, y: 60, opacity: .5, letterSpacing: 1.25, textAlign: "center" }]);
  assert.deepEqual(h.calls.map(call => call.text), ["A", "🌌", "B"]);
  assert.deepEqual(h.words, [["A", 85.25, 60], ["🌌", 93.5, 60], ["B", 105.75, 60]]);
  assert.deepEqual(h.surface.measureText("A🌌B", "12px sans-serif", 24, 1.25),
    { ...expected, ascent: 12, descent: 12 });
  assert.equal(h.calls.length, 6, "line-height fallbacks cannot reuse another complete metrics record");
  h.surface.present(null, [{ text: "A🌌B", x: 100, y: 60, opacity: 1, lineHeight: 24, letterSpacing: 1.25 }]);
  assert.equal(h.calls.length, 6, "explicit caption line-height shares the layout record");
  h.surface.measureText("A🌌B", "12px sans-serif", 18, 2);
  h.surface.measureText("A🌌B", "600 14px sans-serif", 21, 1.25);
  h.surface.present(null, [{ text: "A🌌B", x: 100, y: 60, opacity: 1, font: "600 14px sans-serif", letterSpacing: 1.25 }]);
  assert.equal(h.calls.length, 12, "the heading painter resolves its original 21px line-height");
  h.surface.measureText("A🌌B", "12px sans-serif", 18, 0);
  assert.equal(h.calls.at(-1)!.text, "A🌌B", "zero spacing always delegates complete shaping to native");
  h.context.fontKerning = "none";
  h.surface.measureText("A🌌B", "12px sans-serif", 18, 0);
  assert.equal(h.calls.length, 14, "native shaping-state changes withdraw the previous key");
  assert.equal(h.states.length, 0);
  h.surface.dispose();
});

test("uncached custom fonts observe asynchronous replacement under the same requested font string", () => {
  const h = textFixture();
  let width = 10;
  h.measure(() => ({ width }));
  assert.equal(h.surface.measureText("星", "12px FutureFont", 18).width, 10);
  width = 20;
  assert.equal(h.surface.measureText("星", "12px FutureFont", 18).width, 20);
  width = 30;
  h.surface.present(null, [{ text: "星", x: 100, y: 60, opacity: 1, font: "12px FutureFont",
    letterSpacing: 0, textAlign: "center" }]);
  assert.deepEqual(h.words, [["星", 85, 60]]);
  assert.equal(h.calls.length, 3);
  h.surface.dispose();
});

test("native failure, invalid input and unavailable contexts cannot be hidden by a cache hit", () => {
  const h = textFixture();
  h.measure(() => ({ width: NaN }));
  assert.throws(() => h.surface.measureText("星", "12px sans-serif", 18), /caption_invalid/);
  h.measure(() => { throw Error("native_measure_failed"); });
  assert.throws(() => h.surface.measureText("星", "12px sans-serif", 18), /native_measure_failed/);
  h.measure(() => ({ width: 12 })); h.failRestore(true);
  assert.throws(() => h.surface.measureText("星", "12px sans-serif", 18), /native_restore_failed/);
  h.failRestore(false);
  assert.equal(h.surface.measureText("星", "12px sans-serif", 18).width, 12);
  assert.equal(h.calls.length, 4, "a failed restore must not publish a remembered measurement");
  for (const [height, spacing] of [[0, 0], [NaN, 0], [18, NaN], [18, -1]]) {
    assert.throws(() => h.surface.measureText("星", "12px sans-serif", height!, spacing!), /caption_invalid/);
  }
  assert.equal(h.calls.length, 4);
  const native = h.context.measureText;
  delete h.context.measureText;
  assert.throws(() => h.surface.measureText("星", "12px sans-serif", 18), /text_context_unavailable/);
  h.context.measureText = native!;
  h.surface.dispose(); h.surface.dispose();
  assert.throws(() => h.surface.measureText("星", "12px sans-serif", 18), /text_context_unavailable/);
  const replacement = textFixture();
  replacement.surface.measureText("星", "12px sans-serif", 18);
  assert.equal(replacement.calls.length, 1, "a replacement native surface cannot inherit measurements");
  replacement.surface.dispose();
});

test("the surface bounds both entry count and retained text while preserving exact native fallback", () => {
  const h = textFixture();
  for (let i = 0; i < SKY_TEXT_MEASUREMENT_CACHE_ENTRIES; i++) h.surface.measureText(`对象${i}`, "12px sans-serif", 18);
  h.surface.measureText("对象0", "12px sans-serif", 18);
  h.surface.measureText("another", "12px sans-serif", 18);
  h.surface.measureText("对象0", "12px sans-serif", 18);
  assert.equal(h.calls.length, SKY_TEXT_MEASUREMENT_CACHE_ENTRIES + 1, "the recently used entry survives");
  h.surface.measureText("对象1", "12px sans-serif", 18);
  assert.equal(h.calls.length, SKY_TEXT_MEASUREMENT_CACHE_ENTRIES + 2, "least recent entries are remeasured");
  const large = "星".repeat(8192), larger = "星".repeat(16_385);
  h.surface.measureText(large, "12px sans-serif", 18);
  h.surface.measureText(`${large}月`, "12px sans-serif", 18);
  const before = h.calls.length;
  h.surface.measureText(large, "12px sans-serif", 18);
  assert.equal(h.calls.length, before + 1, "the text budget evicts even before reaching the entry limit");
  h.surface.measureText(larger, "12px sans-serif", 18);
  h.surface.measureText(larger, "12px sans-serif", 18);
  assert.equal(h.calls.length, before + 3, "oversize input is measured exactly without retention");
  h.surface.dispose();
});
