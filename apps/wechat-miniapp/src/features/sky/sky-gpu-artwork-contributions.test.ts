import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyGpuArtworkContributions, type SkyGpuArtworkContributionDraw } from "./sky-gpu-artwork-contributions";
import { skyArtworkLevelsFragment, unknownSkyArtworkLocalObservation,
  type SkyArtworkContributionBudget, type SkyArtworkLevelsDraw } from "./sky-artwork-level-composition";
import { registerSkyDeepSkyRegion } from "./sky-deep-sky-region";
import { OBSERVATION_FRAME_FORMAT } from "@starward/miniapp-contracts";

const submitted: SkyArtworkLevelsDraw = { submitted: true, finePrepared: true, coarsePrepared: true };
const prepared = { program: { program: {} } } as unknown as SkyGpuArtworkContributionDraw;
const expectedUnknown = { completed: false, qualification: { fine: "unknown", coarse: "unknown", any: "unknown" },
  finePhoto: "unknown", coarsePhoto: "unknown" };

test("default and invalid auxiliary policies perform no GL work and cannot turn submission into credit", () => {
  const forbidden = new Proxy({}, { get(_target, property) { throw new Error(`unexpected_gl_access:${String(property)}`); } }) as WebGLRenderingContext;
  const policies: (SkyArtworkContributionBudget | undefined)[] = [undefined,
    { auxiliaryBytesLimit: 0, maxGroups: 1 }, { auxiliaryBytesLimit: -1, maxGroups: 1 },
    { auxiliaryBytesLimit: NaN, maxGroups: 1 }, { auxiliaryBytesLimit: Infinity, maxGroups: 1 },
    { auxiliaryBytesLimit: 100, maxGroups: 0 }, { auxiliaryBytesLimit: 100, maxGroups: 1.5 },
    { auxiliaryBytesLimit: 100, maxGroups: Infinity }, { auxiliaryBytesLimit: 100, maxGroups: Number.MAX_SAFE_INTEGER + 1 }];
  for (const policy of policies) {
    const owner = createSkyGpuArtworkContributions(forbidden, policy);
    owner.begin(); owner.capture(submitted, prepared);
    owner.afterDraw(() => { throw new Error("unexpected_replay"); }); owner.clearPhoto(); owner.finish();
    assert.equal(owner.hasPending(), false);
    assert.equal(owner.failed(), false, "disabled policy UNKNOWN is not an auxiliary fault");
    assert.deepEqual(owner.contribution(submitted), expectedUnknown);
    assert(Object.isFrozen(owner.contribution(submitted)));
    assert(Object.isFrozen(owner.qualification(submitted)));
    assert.strictEqual(owner.observeRegion(submitted, null), unknownSkyArtworkLocalObservation);
    owner.reset(); owner.dispose();
  }
});

/** This mock verifies allocation refusal and ordinary-error ownership only.
 * It does not execute a shader or certify GPU selection/contribution output. */
function boundaryGl() {
  const constants = { NO_ERROR: 0, FRAMEBUFFER_BINDING: 1, DEPTH_TEST: 2, STENCIL_TEST: 3,
    COLOR_WRITEMASK: 4, MAX_TEXTURE_SIZE: 5, MAX_VIEWPORT_DIMS: 6, VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 7 };
  let error = 0, allocations = 0, attributeReads = 0;
  const implementation = { ...constants, drawingBufferWidth: 3, drawingBufferHeight: 5,
    getError: () => { const result = error; error = 0; return result; }, isContextLost: () => false,
    isEnabled: () => false, getAttribLocation: () => 0,
    getVertexAttrib: () => { attributeReads++; return {}; },
    getParameter: (parameter: number) => {
      if (parameter === constants.FRAMEBUFFER_BINDING) return null;
      if (parameter === constants.COLOR_WRITEMASK) return [true, true, true, true];
      if (parameter === constants.MAX_TEXTURE_SIZE) return 4096;
      if (parameter === constants.MAX_VIEWPORT_DIMS) return new Int32Array([4096, 4096]);
      throw new Error(`unexpected_parameter:${parameter}`);
    }, createProgram: () => { allocations++; throw new Error("unexpected_program_allocation"); },
  };
  return { gl: implementation as unknown as WebGLRenderingContext, allocations: () => allocations,
    attributeReads: () => attributeReads,
    // One current-pointer preflight is required before the budget boundary.
    // A second attribute read enters guarded setup, even if that mock's later
    // state query throws and auxiliary recovery returns UNKNOWN again.
    setupReads: () => Math.max(0, attributeReads - 1),
    setError: (value: number) => { error = value; } };
}

test("odd-size full signal and every shared MAX level must fit the original caller budget before setup", () => {
  // 3x5 signal=60 B; 4x4 ceil(MAX) chain 1x2 + 1x1 = 12 B.
  const boundary = boundaryGl(), policy = { auxiliaryBytesLimit: 71, maxGroups: 1 };
  const owner = createSkyGpuArtworkContributions(boundary.gl, policy);
  policy.auxiliaryBytesLimit = 72;
  owner.begin(); owner.capture(submitted, prepared);
  assert.equal(boundary.attributeReads(), 1, "only current-pointer preflight may precede budget refusal");
  assert.equal(boundary.setupReads(), 0, "budget refusal must occur before guarded setup, including failed setup");
  assert.equal(boundary.allocations(), 0);
  assert.deepEqual(owner.contribution(submitted), expectedUnknown);
  assert.equal(owner.failed(), false, "policy refusal is UNKNOWN, not a failed GL allocation");
  owner.dispose();
  assert.equal(owner.failed(), false, "a disposed owner cannot report a current failure");
});

test("an existing normal GL error reaches the renderer and latches this owner until explicit reset", () => {
  const boundary = boundaryGl(), owner = createSkyGpuArtworkContributions(boundary.gl, { auxiliaryBytesLimit: 71, maxGroups: 1 });
  owner.begin(); boundary.setError(1282);
  assert.throws(() => owner.capture(submitted, prepared), /sky_gpu_draw_failed:1282/);
  assert.equal(owner.failed(), true, "a latched fault is visible to the current consumer");
  owner.begin(); owner.capture(submitted, prepared);
  assert.equal(boundary.attributeReads(), 0, "begin must not retry the latched owner");
  assert.equal(boundary.allocations(), 0);
  assert.deepEqual(owner.contribution(submitted), expectedUnknown);
  assert.equal(owner.failed(), true, "ordinary frames do not clear the latch");
  owner.reset(); owner.begin(); owner.capture(submitted, prepared);
  assert.equal(owner.failed(), false, "explicit reset clears the fault without increasing policy");
  assert.equal(boundary.attributeReads(), 1, "explicit reset permits current-pointer preflight again");
  assert.equal(boundary.setupReads(), 0, "71 B still refuses the complete 72 B requirement before setup");
  assert.equal(boundary.allocations(), 0);
  assert.deepEqual(owner.contribution(submitted), expectedUnknown);
  owner.dispose();
});

/** Execute the unchanged current owner with controlled GL/TWGL method results.
 * The readback [10,0,255,0] is an explicit fixture, not rendered-pixel evidence.
 * This checks receipt currentness, recovery and resource ownership only. */
function controlledOwner(source = fs.readFileSync(new URL("./sky-gpu-artwork-contributions.ts", import.meta.url), "utf8")) {
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText;
  const exports: { createSkyGpuArtworkContributions?: typeof createSkyGpuArtworkContributions } = {};
  vm.runInNewContext(compiled, { exports, Float32Array, Uint8Array, require: (name: string) => {
    if (name === "twgl.js") return {
      createProgramInfoFromProgram: (_gl: unknown, program: object) => ({ program }),
      setBuffersAndAttributes: () => {}, setUniforms: () => {}, drawBufferInfo: () => {},
    };
    if (name === "./sky-artwork-level-composition") return { skyArtworkLevelsFragment, unknownSkyArtworkLocalObservation };
    throw new Error(`unexpected_controlled_import:${name}`);
  } });
  return exports.createSkyGpuArtworkContributions!;
}

function lifetimeGl(width = 1, height = 1) {
  let code = 100, lost = false, queries = 0, allocationCount = 0, reads = 0, draws = 0;
  const codes = new Map<string, number>([["NO_ERROR", 0], ["ZERO", 0], ["ONE", 1]]);
  const constant = (name: string) => {
    if (!codes.has(name)) codes.set(name, code++);
    return codes.get(name)!;
  };
  const live = new Set<object>(), positionBuffer = {};
  const create = () => { const value = {}; live.add(value); allocationCount++; return value; };
  const remove = (value: object) => { live.delete(value); };
  const state: Record<string, unknown> = {
    drawingBufferWidth: width, drawingBufferHeight: height, getError: () => 0,
    isContextLost: () => { queries++; return lost; }, isEnabled: () => false, getAttribLocation: () => 0,
    getParameter: (parameter: number) => {
      const name = [...codes].find(([_name, value]) => value === parameter)?.[0];
      switch (name) {
        case "FRAMEBUFFER_BINDING": case "CURRENT_PROGRAM": case "TEXTURE_BINDING_2D": return null;
        case "COLOR_WRITEMASK": return [true, true, true, true];
        case "MAX_TEXTURE_SIZE": return 4096;
        case "MAX_VIEWPORT_DIMS": return [4096, 4096];
        case "VIEWPORT": case "SCISSOR_BOX": return [0, 0, 1, 1];
        case "ARRAY_BUFFER_BINDING": return positionBuffer;
        case "ACTIVE_TEXTURE": return constant("TEXTURE0");
        case "MAX_VERTEX_ATTRIBS": return 1;
        case "COLOR_CLEAR_VALUE": return [0, 0, 0, 0];
        case "BLEND_SRC_RGB": case "BLEND_SRC_ALPHA": return 1;
        case "BLEND_DST_RGB": case "BLEND_DST_ALPHA": return 0;
        case "BLEND_EQUATION_RGB": case "BLEND_EQUATION_ALPHA": return constant("FUNC_ADD");
        default: throw new Error(`unexpected_controlled_parameter:${name}`);
      }
    },
    getVertexAttrib: (_index: number, parameter: number) => {
      if (parameter === constant("VERTEX_ATTRIB_ARRAY_BUFFER_BINDING")) return positionBuffer;
      if (parameter === constant("VERTEX_ATTRIB_ARRAY_SIZE")) return 2;
      if (parameter === constant("VERTEX_ATTRIB_ARRAY_TYPE")) return constant("FLOAT");
      if (parameter === constant("VERTEX_ATTRIB_ARRAY_ENABLED")) return true;
      return 0;
    },
    getVertexAttribOffset: () => 0, getShaderParameter: () => true, getProgramParameter: () => true,
    checkFramebufferStatus: () => constant("FRAMEBUFFER_COMPLETE"),
    readPixels: (_x: number, _y: number, _w: number, _h: number, _format: number, _type: number, bytes: Uint8Array) => {
      reads++;
      bytes.set([10, 0, 255, 0]);
    },
  };
  for (const suffix of ["Program", "Shader", "Buffer", "Texture", "Framebuffer"]) {
    state[`create${suffix}`] = create; state[`delete${suffix}`] = remove;
  }
  for (const name of ["activeTexture", "bindTexture", "bindFramebuffer", "viewport", "useProgram", "bindBuffer",
    "vertexAttribPointer", "enableVertexAttribArray", "disableVertexAttribArray", "enable", "disable", "blendFuncSeparate",
    "blendEquation", "blendEquationSeparate", "scissor", "colorMask", "clearColor", "shaderSource", "compileShader", "attachShader",
    "bindAttribLocation", "linkProgram", "detachShader", "texParameteri", "texImage2D", "framebufferTexture2D",
    "bufferData", "clear"]) state[name] = () => {};
  state.drawArrays = () => { draws++; };
  const gl = new Proxy(state, { get(target, name) {
    if (name in target) return target[String(name)];
    if (typeof name === "string" && /^[A-Z0-9_]+$/.test(name)) return constant(name);
    throw new Error(`unexpected_controlled_gl:${String(name)}`);
  } }) as unknown as WebGLRenderingContext;
  return { gl, lose: () => { lost = true; }, restore: () => { lost = false; },
    resize: (width: number) => { state.drawingBufferWidth = width; }, queries: () => queries,
    allocations: () => allocationCount, live: () => live.size, reads: () => reads, draws: () => draws };
}
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
const foreignDraw: SkyArtworkLevelsDraw = { ...submitted };
const controlledPrepared = { program: { program: {} }, buffer: {}, primitive: 4,
  uniforms: { u_resolution: [1, 1], u_center: [.5, .5], u_scale: 1,
    u_right: [1, 0, 0], u_up: [0, 1, 0], u_forward: [0, 0, 1] },
  vertex: "void main(){}", cameraRay: "" } as unknown as SkyGpuArtworkContributionDraw;

test("both completed-token getters retire late loss/resize; loss requires reset and resize permits a fresh begin", () => {
  const createOwner = controlledOwner();
  for (const change of ["loss", "resize"] as const) for (const firstGetter of ["qualification", "contribution"] as const) {
    const boundary = lifetimeGl(), owner = createOwner(boundary.gl, { auxiliaryBytesLimit: 12, maxGroups: 1 });
    owner.begin(); owner.capture(submitted, controlledPrepared); owner.finish();
    assert.equal(owner.contribution(submitted).finePhoto, "positive");
    assert.equal(owner.contribution(submitted).completed, true);
    assert(boundary.live() > 0);
    const beforeForeign = boundary.queries();
    assert.deepEqual(plain(owner.contribution(foreignDraw)), expectedUnknown);
    assert.equal(boundary.queries(), beforeForeign, "a foreign draw must not query GL even with a live receipt");
    change === "loss" ? boundary.lose() : boundary.resize(2);
    owner[firstGetter](submitted);
    assert(boundary.queries() > beforeForeign, "the current entry getter must fence actual context currentness");
    assert.deepEqual(plain(owner.contribution(submitted)), expectedUnknown);
    assert.deepEqual(plain(owner.qualification(submitted)), expectedUnknown.qualification);
    assert.equal(boundary.live(), 0, "late invalidation must retire all auxiliary GL objects");
    const afterRetirement = boundary.queries();
    owner.qualification(submitted); owner.contribution(submitted); owner.contribution(foreignDraw);
    assert.equal(boundary.queries(), afterRetirement, "retired and foreign draws no longer query GL");
    const freshDraw = { ...submitted }, beforeRecovery = boundary.allocations();
    if (change === "loss") {
      boundary.restore(); owner.begin(); owner.capture(freshDraw, controlledPrepared);
      assert.equal(boundary.allocations(), beforeRecovery, "begin must not retry a lost-context probe latch");
      owner.reset();
    } else {
      owner.capture(freshDraw, controlledPrepared);
      assert.equal(boundary.allocations(), beforeRecovery, "resized frame is closed until a new begin");
    }
    owner.begin(); owner.capture(freshDraw, controlledPrepared); owner.finish();
    assert(boundary.allocations() > beforeRecovery, "authorized recovery must actually reconstruct probe objects");
    assert.equal(owner.contribution(freshDraw).finePhoto, "positive");
    assert.deepEqual(plain(owner.contribution(submitted)), expectedUnknown);
    owner.dispose(); assert.equal(boundary.live(), 0);
  }
});

test("a fresh begin after getter-detected resize rechecks the new full target against the original budget", () => {
  const boundary = lifetimeGl(), owner = controlledOwner()(boundary.gl, { auxiliaryBytesLimit: 4, maxGroups: 1 });
  owner.begin(); owner.capture(submitted, controlledPrepared); owner.finish();
  assert.equal(owner.contribution(submitted).finePhoto, "positive");
  boundary.resize(2); assert.deepEqual(plain(owner.contribution(submitted)), expectedUnknown);
  const allocations = boundary.allocations(), freshDraw = { ...submitted };
  owner.begin(); owner.capture(freshDraw, controlledPrepared); owner.finish();
  assert.equal(boundary.allocations(), allocations, "2x1 signal plus MAX needs 12 B, beyond the retained 4 B policy");
  assert.deepEqual(plain(owner.contribution(freshDraw)), expectedUnknown);
  owner.dispose(); assert.equal(boundary.live(), 0);
});

const region = registerSkyDeepSkyRegion({ objectRef: "M:51", displayName: "M51", kind: "GALAXY", aliases: [],
  magnitude: 8.4, magnitudeBand: "V", majorAxisArcmin: 60, minorAxisArcmin: 30, positionAngleDeg: 0,
  icrsCenter: { raDeg: 0, decDeg: 0 } }, { format: OBSERVATION_FRAME_FORMAT, at: "2026-10-03T00:00:00.000Z",
  observer: { latitude: 0, longitude: 0, elevationM: 0 }, equatorialToEnu: [1, 0, 0, 0, 1, 0, 0, 0, 1] })!;
const localPrepared = { ...controlledPrepared, uniforms: { ...controlledPrepared.uniforms, u_resolution: [2, 2], u_center: [1, 1] } };

test("local facts cache exact draw/region/revision once and retire after signal changes, finish, begin and dispose", () => {
  const boundary = lifetimeGl(2, 2), owner = controlledOwner()(boundary.gl, { auxiliaryBytesLimit: 20, maxGroups: 1 });
  owner.begin(); owner.capture(submitted, localPrepared);
  const first = owner.observeRegion(submitted, region); assert.equal(first.fine.photo, "positive");
  assert.equal(first.precision, "unknown"); assert(Object.isFrozen(first)); assert(Object.isFrozen(first.fine));
  const reads = boundary.reads(), draws = boundary.draws(), allocations = boundary.allocations();
  assert.strictEqual(owner.observeRegion(submitted, region), first);
  assert.equal(boundary.reads(), reads); assert.equal(boundary.draws(), draws); assert.equal(boundary.allocations(), allocations);
  owner.afterDraw(() => {}); const second = owner.observeRegion(submitted, region);
  assert.notStrictEqual(second, first); assert(second.signalRevision! > first.signalRevision!); assert.equal(boundary.reads(), reads + 1);
  owner.clearPhoto(); const cleared = owner.observeRegion(submitted, region);
  assert.notStrictEqual(cleared, second); assert(cleared.signalRevision! > second.signalRevision!);
  owner.finish(); assert.strictEqual(owner.observeRegion(submitted, region), unknownSkyArtworkLocalObservation);
  owner.begin(); const queries = boundary.queries();
  assert.strictEqual(owner.observeRegion(submitted, region), unknownSkyArtworkLocalObservation); assert.equal(boundary.queries(), queries);
  owner.dispose(); assert.equal(boundary.live(), 0);
  assert.strictEqual(owner.observeRegion(submitted, region), unknownSkyArtworkLocalObservation);
});

test("a bounded replay-revision mutant demonstrates the stale local-cache regression", () => {
  const source = fs.readFileSync(new URL("./sky-gpu-artwork-contributions.ts", import.meta.url), "utf8");
  const mutant = source.replace("replay(); changed(entry);", "replay();"); assert.notEqual(mutant, source);
  const stale = (text: string) => {
    const boundary = lifetimeGl(2, 2), owner = controlledOwner(text)(boundary.gl, { auxiliaryBytesLimit: 20, maxGroups: 1 });
    owner.begin(); owner.capture(submitted, localPrepared); const first = owner.observeRegion(submitted, region);
    owner.afterDraw(() => {}); const next = owner.observeRegion(submitted, region); owner.dispose();
    return first === next;
  };
  assert.equal(stale(source), false); assert.equal(stale(mutant), true);
});

test("actual renderer observation method asserts, flushes queued drawing, then reasserts before the owner", () => {
  const text = fs.readFileSync(new URL("./sky-gpu-renderer.ts", import.meta.url), "utf8");
  const source = ts.createSourceFile("sky-gpu-renderer.ts", text, ts.ScriptTarget.Latest, true);
  let method: ts.MethodDeclaration | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isMethodDeclaration(node) && node.name.getText(source) === "artworkLevelsObserveRegion") method = node;
    ts.forEachChild(node, visit);
  };
  visit(source); assert(method);
  const expression = ts.transpileModule(`({${method.getText(source)}}).artworkLevelsObserveRegion`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const trace: string[] = []; let unavailable = false, retireDuringFlush = false;
  const observe = vm.runInNewContext(expression, { assertAvailable() { trace.push("assert"); if (unavailable) throw Error("disposed"); },
    flush() { trace.push("flush"); if (retireDuringFlush) unavailable = true; },
    contributions: { observeRegion(exact: unknown, domain: unknown) {
      trace.push("observe"); assert.strictEqual(exact, submitted); assert.strictEqual(domain, region);
      return unknownSkyArtworkLocalObservation;
    } } });
  assert.strictEqual(observe(submitted, region), unknownSkyArtworkLocalObservation);
  assert.deepEqual(trace, ["assert", "flush", "assert", "observe"]);
  trace.length = 0; retireDuringFlush = true;
  assert.throws(() => observe(submitted, region), /disposed/); assert.deepEqual(trace, ["assert", "flush", "assert"]);
  trace.length = 0; assert.throws(() => observe(submitted, region), /disposed/); assert.deepEqual(trace, ["assert"]);
});
