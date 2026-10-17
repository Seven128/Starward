import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the real submit boundary with controlled native GL/TWGL ports.
// Uploaded bytes and repeated draw semantics are evidence here, not GPU pixels.
function fixture(source = fs.readFileSync(new URL("./sky-gpu-renderer.ts", import.meta.url), "utf8")) {
  const file = ts.createSourceFile("renderer.ts", source, ts.ScriptTarget.Latest, true);
  const renderer = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "createSkyGpuRenderer") as ts.FunctionDeclaration;
  const declarations = new Set<string>();
  let submit = "", hasQuad = false;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node)) {
      const name = node.name.getText(file);
      if (["quad", "uploadedQuads", "screenQuad"].includes(name) && node.parent.parent.parent === renderer.body) {
        declarations.add(node.parent.parent.getText(file));
        if (name === "screenQuad") hasQuad = true;
      }
      if (name === "submit") submit = node.getText(file);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert(submit);
  const storage = new Map<object, number[]>(), errors: unknown[][] = [];
  const uploads: number[][] = [], draws: { bytes: number[]; uniforms: unknown }[] = [];
  let bound: object | null = null, uniforms: unknown, disabled = 0;
  const control = { error: 0, uploadError: 0, throwUpload: false, pending: false, replays: 0, invalidated: 0 };
  const gl = {
    ARRAY_BUFFER: 1, DYNAMIC_DRAW: 2, POINTS: 3, TRIANGLES: 4, NO_ERROR: 0,
    disableVertexAttribArray() { disabled++; },
    bindBuffer(_target: number, buffer: object) { bound = buffer; },
    bufferData(_target: number, values: Float32Array) {
      if (control.throwUpload) throw Error("controlled_upload_exception");
      if (control.uploadError) { control.error = control.uploadError; control.uploadError = 0; return; }
      const bytes = Array.from(values);
      storage.set(bound!, bytes); uploads.push(bytes);
    },
    useProgram() {},
    getError() { const error = control.error; control.error = 0; return error; },
  };
  const program = { program: {} };
  const code = ts.transpileModule(`
    let width=390,height=844;
    ${[...declarations].join("\n")}
    ${hasQuad ? "" : "const screenQuad=()=>[0,0,width,0,0,height,0,height,width,0,width,height];"}
    const ${submit};
    ({resize(w,h){width=w;height=h;},
      quad(buffer,uniforms={}){submit(program,buffer,screenQuad(),2,gl.TRIANGLES,uniforms);},
      dynamic(buffer,values){submit(program,buffer,values,2,gl.TRIANGLES);}});
  `, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const port = vm.runInNewContext(code, {
    Float32Array, gl, program, maxAttributes: 16, pixelRatio: 3, maxPointSize: 128, pointDisplayTuning: 1,
    groupDrawing: false,
    contributions: {
      hasPending: () => control.pending, invalidate() { control.invalidated++; },
      afterDraw(callback: () => void) { control.replays++; callback(); },
    },
    setBuffersAndAttributes(_gl: unknown, _program: unknown, buffer: { attribs: { a_position: { buffer: object } } }) {
      bound = buffer.attribs.a_position.buffer;
    },
    setUniforms(_program: unknown, value: unknown) { uniforms = value; },
    drawBufferInfo() { draws.push({ bytes: storage.get(bound!)!, uniforms }); },
    reportRuntimeError(...args: unknown[]) { errors.push(args); },
  });
  const buffer = () => ({ numElements: 0, attribs: { a_position: { buffer: {} } } });
  return { port, buffer, control, uploads, draws, errors, disabled: () => disabled };
}
const rectangle = (w: number, h: number) => [0, 0, w, 0, 0, h, 0, h, w, 0, w, h];

test("same-size full-surface passes retain exact geometry while camera uniforms and draws stay live", () => {
  const h = fixture(), first = h.buffer(), second = h.buffer();
  h.port.quad(first, { u_center: [195, 422], u_opacity: .2 });
  h.port.quad(first, { u_center: [215, 400], u_opacity: .1 });
  h.port.quad(second, { u_center: [215, 400] });
  assert.equal(h.uploads.length, 2, "each owned buffer uploads once, not each image or camera change");
  assert.equal(h.draws.length, 3);
  assert.deepEqual(h.draws.map(draw => draw.bytes), [rectangle(390, 844), rectangle(390, 844), rectangle(390, 844)]);
  assert.deepEqual(Array.from((h.draws[1]!.uniforms as { u_center: number[] }).u_center), [215, 400]);
  assert.equal((h.draws[1]!.uniforms as { u_opacity: number }).u_opacity, .1);
  assert.equal(h.disabled(), 3 * 16, "the dense-star attribute retirement remains intact");
});

test("resize, returning dimensions and interleaved dynamic writes cannot reuse stale rectangle bytes", () => {
  const h = fixture(), buffer = h.buffer();
  h.port.quad(buffer); h.port.resize(844, 390); h.port.quad(buffer);
  h.port.resize(390, 844); h.port.quad(buffer);
  h.port.dynamic(buffer, [1, 2, 3, 4, 5, 6]); h.port.quad(buffer); h.port.quad(buffer);
  assert.deepEqual(h.uploads, [rectangle(390, 844), rectangle(844, 390), rectangle(390, 844),
    [1, 2, 3, 4, 5, 6], rectangle(390, 844)]);
  assert.equal(h.draws.length, 6);
  const successor = fixture(), next = successor.buffer(); successor.port.quad(next);
  assert.deepEqual(successor.uploads, [rectangle(390, 844)], "a successor renderer has no predecessor upload claim");
});

test("throwing and numeric GL upload failures stay errors and do not establish reusable geometry", () => {
  for (const failure of ["throw", "gl"] as const) {
    const h = fixture(), buffer = h.buffer();
    if (failure === "throw") h.control.throwUpload = true;
    else h.control.uploadError = 1285;
    assert.throws(() => h.port.quad(buffer), /controlled_upload_exception|sky_gpu_draw_failed:1285/);
    assert.equal(h.draws.length, 0); assert.equal(h.errors.length, 1);
    if (failure === "gl") assert.equal(h.control.invalidated, 1, "numeric upload error also retracts pending auxiliary credit");
    h.control.throwUpload = false;
    h.port.quad(buffer); h.port.quad(buffer);
    assert.equal(h.uploads.length, 1); assert.equal(h.draws.length, 2);
  }
});

test("reused rectangle still participates in pending contribution replay and its normal error check", () => {
  const h = fixture(), buffer = h.buffer(); h.port.quad(buffer);
  h.control.pending = true; h.port.quad(buffer);
  assert.equal(h.control.replays, 1); assert.equal(h.draws.length, 3); assert.equal(h.uploads.length, 1);
  h.control.error = 1282;
  assert.throws(() => h.port.quad(buffer), /sky_gpu_draw_failed:1282/);
  assert.equal(h.control.replays, 1); assert.equal(h.errors.length, 1);
});
