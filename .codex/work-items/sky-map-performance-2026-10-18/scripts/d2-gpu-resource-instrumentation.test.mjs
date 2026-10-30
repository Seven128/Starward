import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { addD2GpuResourceOwners } from './d2-gpu-resource-instrumentation.mjs';
const require = createRequire(import.meta.url), ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
const feature = new URL('../../../../apps/wechat-miniapp/src/features/sky/', import.meta.url);
const read = name => fs.readFile(new URL(name, feature), 'utf8');
const [textures, contributions, renderer, textureFixtureSource, contributionFixtureSource] = await Promise.all([
  read('sky-gpu-textures.ts'), read('sky-gpu-artwork-contributions.ts'), read('sky-gpu-renderer.ts'),
  read('sky-gpu-textures.test.ts'), read('sky-gpu-artwork-contributions.test.ts'),
]);
const original = { textures, contributions, renderer }, observed = addD2GpuResourceOwners(original);
const plain = value => JSON.parse(JSON.stringify(value));
function compile(source, module = ts.ModuleKind.CommonJS) {
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module }, reportDiagnostics: true });
  assert.equal(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  return result.outputText;
}
function moduleOf(source, imports = {}) {
  const module = { exports: {} };
  vm.runInNewContext('(function(exports,require,module){' + compile(source) + '\n})', { Float32Array, Uint8Array, Int32Array })(
    module.exports, name => { assert(Object.hasOwn(imports, name), 'unapproved import:' + name); return imports[name]; }, module);
  return module.exports;
}
function select(source, predicate, label) {
  const file = ts.createSourceFile(label + '.ts', source, ts.ScriptTarget.Latest, true), matches = [];
  const walk = node => { if (predicate(node)) matches.push(node.getText(file)); ts.forEachChild(node, walk); };
  walk(file); assert.equal(matches.length, 1, label); return matches[0];
}
const fn = (source, name) => select(source, node => ts.isFunctionDeclaration(node) && node.name?.text === name, name);
const declaration = (source, name) => select(source, node => ts.isVariableDeclaration(node) && node.name.getText() === name, name);
const method = (source, name) => select(source, node => ts.isMethodDeclaration(node) && node.name.getText() === name, name);
const textureImports = { './sky-artwork-loader': { skyNativeImageIsCurrent: () => true }, '../../services/runtime-error': { reportRuntimeError() {} } };
function textureHarness(source = observed.textures, budget = 64) {
  // Reuse the production owner's established controlled GL allocation fixture.
  const fixture = fn(textureFixtureSource, 'fixture').replace('return { textures:', 'return { gl, textures:');
  const factory = vm.runInNewContext(compile(fixture + '\nfixture;', ts.ModuleKind.None), {
    assert, createSkyGpuTextures: moduleOf(source, textureImports).createSkyGpuTextures,
  });
  return factory(budget);
}
const unknown = { completed: false, qualification: { fine: 'unknown', coarse: 'unknown', any: 'unknown' }, finePhoto: 'unknown', coarsePhoto: 'unknown' };
const contributionImports = { 'twgl.js': {
  createProgramInfoFromProgram: (_gl, program) => ({ program }), setBuffersAndAttributes() {}, setUniforms() {}, drawBufferInfo() {},
}, './sky-artwork-level-composition': { skyArtworkLevelsFragment: () => '', unknownSkyArtworkLocalObservation: unknown },
'../../services/runtime-error': { reportRuntimeError() {} } };
const contributionFixtures = vm.runInNewContext(compile(fn(contributionFixtureSource, 'lifetimeGl') + '\n' +
  fn(contributionFixtureSource, 'backdropBoundary') + '\nconst ' + declaration(contributionFixtureSource, 'controlledPrepared') +
  ';\n({ backdropBoundary, controlledPrepared });', ts.ModuleKind.None), { assert, Uint8Array, Float32Array });
function contributionHarness(alphaBits, source = observed.contributions) {
  const boundary = contributionFixtures.backdropBoundary(alphaBits), factory = moduleOf(source, contributionImports);
  return { ...boundary, owner: factory.createSkyGpuArtworkContributions(boundary.gl, factory.skyArtworkContributionFrameBudget(3, 5, 1)) };
}
const submitted = () => ({ submitted: true, finePrepared: true, coarsePrepared: true });
function contributionFrame(h) {
  const draw = submitted(); h.owner.begin();
  assert.equal(h.owner.withBackdropSnapshot(contributionFixtures.controlledPrepared, () => {}), true);
  h.owner.capture(draw, contributionFixtures.controlledPrepared); h.owner.finish();
  assert.equal(h.owner.contribution(draw).completed, true); return draw;
}
function scalarTree(value) {
  for (const entry of Object.values(value)) {
    if (entry !== null && typeof entry === 'object') scalarTree(entry);
    else assert(entry === null || typeof entry === 'boolean' || (typeof entry === 'number' && Number.isFinite(entry)), 'only declared finite scalar leaves');
  }
}

test('only task copies change; every actual owner boundary fails closed when changed or already instrumented', () => {
  for (const value of Object.values(observed)) compile(value);
  assert.equal(original.textures, textures); assert.equal(original.contributions, contributions); assert.equal(original.renderer, renderer);
  assert.throws(() => addD2GpuResourceOwners({ ...original, textures: textures.replace('gl.copyTexImage2D(', 'gl.changedCopy(') }), /d2_gpu_resource_boundary_changed/);
  assert.throws(() => addD2GpuResourceOwners({ ...original, contributions: contributions.replace('const format = (gl.getParameter', 'const changedFormat = (gl.getParameter') }), /d2_gpu_resource_boundary_changed/);
  assert.throws(() => addD2GpuResourceOwners(observed), /d2_gpu_resource_boundary_changed/);
});

test('stable working set returns scalar copies with no additional upload and no instrumentation-driven GL reads', () => {
  const h = textureHarness(), base = textureHarness(textures), images = [{ width: 12, height: 4 }, { width: 4, height: 4 }];
  let reads = 0; const parameter = h.gl.getParameter.bind(h.gl), error = h.gl.getError.bind(h.gl);
  h.gl.getParameter = (...args) => { reads++; return parameter(...args); };
  h.gl.getError = (...args) => { reads++; return error(...args); };
  for (let frame = 0; frame < 3; frame++) for (const current of [h, base]) {
    current.textures.begin(); current.textures.getWindow(images[0], { x: 1, y: 0, width: 4, height: 4 });
    current.textures.get(images[1]); current.textures.finish();
  }
  assert.deepEqual(Array.from(h.uploaded), Array.from(base.uploaded)); assert.deepEqual(plain(h.copies), plain(base.copies));
  const before = reads, facts = plain(h.textures.__d2ResourceFacts());
  assert.equal(reads, before); scalarTree(facts);
  assert.equal(facts.sourceUploadAttempts, 2); assert.equal(facts.sourceUploadReturned, 2); assert.equal(facts.sourceUploadFailed, 0);
  assert.equal(facts.sourceUploadPixels, 64); assert.equal(facts.cropCopyAttempts, 1); assert.equal(facts.cropCopyPixels, 16);
  assert.equal(facts.residentTextureCount, 2); assert.equal(facts.residentRgbaBytes, 128); assert.equal(facts.maxLogicalRgbaBytes, 256);
  facts.residentRgbaBytes = 999; assert.equal(h.textures.__d2ResourceFacts().residentRgbaBytes, 128);
  h.textures.dispose(); assert.equal(h.textures.__d2ResourceFacts().residentRgbaBytes, 0); assert.equal(h.liveTextures.size, 0);
});

test('copying a containing cached resident counts local source plus crop once before transfer', () => {
  const h = textureHarness(), image = { width: 12, height: 4 };
  h.textures.begin(); h.textures.get(image); h.textures.finish();
  assert.equal(h.textures.__d2ResourceFacts().maxLogicalRgbaBytes, 192);
  h.textures.begin(); h.textures.getWindow(image, { x: 2, y: 1, width: 4, height: 2 }); h.textures.finish();
  const facts = h.textures.__d2ResourceFacts();
  assert.equal(facts.sourceUploadAttempts, 1); assert.equal(facts.cropCopyAttempts, 1);
  assert.equal(facts.residentRgbaBytes, 32); assert.equal(facts.maxLogicalRgbaBytes, 224, '192 local + 32 crop, neither 32-only nor 416 double count');
  h.textures.begin(); h.textures.getWindow(image, { x: 3, y: 1, width: 1, height: 1 }); h.textures.finish();
  assert.equal(h.textures.__d2ResourceFacts().cropCopyAttempts, 1); h.textures.dispose();
});

test('existing upload and copy failures keep their product latch and mark unmeasured peak unknown', () => {
  const image = { width: 12, height: 4 }, h = textureHarness(); h.control.failImage = image;
  h.textures.begin(); assert.equal(h.textures.get(image), null); assert.equal(h.textures.get(image), null); h.textures.finish();
  let facts = h.textures.__d2ResourceFacts();
  assert.equal(facts.sourceUploadAttempts, 1); assert.equal(facts.sourceUploadReturned, 1); assert.equal(facts.sourceUploadFailed, 1);
  assert.equal(facts.failedIdentityCount, 1); assert.equal(facts.residentRgbaBytes, 0); assert.equal(facts.maxLogicalRgbaBytes, null);
  const c = textureHarness(); c.control.failCopy = true;
  c.textures.begin(); assert(c.textures.getWindow(image, { x: 2, y: 1, width: 4, height: 2 }).texture); c.textures.finish();
  facts = c.textures.__d2ResourceFacts(); assert.equal(facts.cropCopyAttempts, 1); assert.equal(facts.cropCopyReturned, 1);
  assert.equal(facts.cropCopyFailed, 1); assert.equal(facts.copyUnavailable, true); assert.equal(facts.residentRgbaBytes, 192);
  assert.equal(facts.maxLogicalRgbaBytes, null); c.textures.dispose(); h.textures.dispose();
});

test('throwing texture deletion does not fabricate empty ownership or swallow the native exception', () => {
  const h = textureHarness(), failure = new Error('delete failed'); h.textures.begin(); h.textures.get({ width: 4, height: 4 }); h.textures.finish();
  h.gl.deleteTexture = () => { throw failure; };
  assert.throws(() => h.textures.dispose(), error => error === failure);
  const facts = h.textures.__d2ResourceFacts();
  assert.equal(facts.deleteFailures, 1); assert.equal(facts.logicalOwnershipComplete, false);
  assert.equal(facts.residentRgbaBytes, null); assert.equal(facts.residentTextureCount, null); assert.equal(h.liveTextures.size, 1);
});

test('RGB and RGBA backdrop branches measure actual storage redefinition while pool and scratch stay stable', () => {
  for (const alpha of [0, 8]) {
    const h = contributionHarness(alpha), base = contributionHarness(alpha, contributions);
    for (let frame = 0; frame < 2; frame++) { contributionFrame(h); contributionFrame(base); }
    assert.equal(h.allocations(), base.allocations()); assert.equal(h.copies(), base.copies()); assert.equal(h.reads(), base.reads());
    let reads = 0; const parameter = h.gl.getParameter.bind(h.gl); h.gl.getParameter = (...args) => { reads++; return parameter(...args); };
    const facts = plain(h.owner.__d2ResourceFacts()); scalarTree(facts); assert.equal(reads, 0);
    assert.equal(facts.targetAllocationAttempts, 3); assert.equal(facts.targetAllocationReturned, 3); assert.equal(facts.targetAllocationPixels, 18);
    assert.equal(facts.lastDefaultAlphaBits, alpha); assert.equal(facts.poolCount, 1); assert.equal(facts.scratchCount, 2); assert.equal(facts.groupCount, 1);
    assert.equal(facts.poolRgbaBytes, 60); assert.equal(facts.scratchRgbaBytes, 12); assert.equal(facts.residentRgbaBytes, 72);
    assert.equal(facts.maxLogicalRgbaBytes, 72);
    assert.equal(facts.backdropStorageRedefineAttempts, alpha === 0 ? 2 : 0);
    assert.equal(facts.signalStorageRedefineAttempts, alpha === 0 ? 2 : 0);
    assert.equal(facts.backdropCopySubAttempts, alpha === 0 ? 0 : 2);
    assert.equal(facts.backdropStorageRedefinePixels, alpha === 0 ? 30 : 0);
    assert.equal(facts.signalStorageRedefinePixels, alpha === 0 ? 30 : 0);
    h.owner.dispose(); const after = h.owner.__d2ResourceFacts();
    assert.equal(after.disposed, true); assert.equal(after.residentRgbaBytes, 0); assert.equal(after.poolCount, 0); assert.equal(after.scratchCount, 0);
    assert.equal(h.live(), 0); base.owner.dispose();
  }
});

test('contribution validation failure and a thrown native delete remain distinct from successful release', () => {
  const failed = contributionHarness(0); failed.failCopy(true); failed.owner.begin();
  assert.equal(failed.owner.withBackdropSnapshot(contributionFixtures.controlledPrepared, () => assert.fail('failed work painted')), false);
  let facts = failed.owner.__d2ResourceFacts();
  assert.equal(facts.backdropStorageRedefineReturned, 1); assert.equal(facts.backdropStorageRedefineThrew, 0);
  assert.equal(facts.auxiliaryFailures, 1); assert.equal(facts.faulted, true); assert.equal(facts.residentRgbaBytes, 0); assert.equal(facts.maxLogicalRgbaBytes, null);
  const h = contributionHarness(8); contributionFrame(h); const failure = new Error('delete failed');
  h.gl.deleteTexture = () => { throw failure; };
  assert.throws(() => h.owner.dispose(), error => error === failure); facts = h.owner.__d2ResourceFacts();
  assert.equal(facts.deleteFailures, 1); assert.equal(facts.disposed, true); assert.equal(facts.logicalOwnershipComplete, false);
  assert.equal(facts.residentRgbaBytes, null); assert.equal(facts.poolRgbaBytes, null); assert.equal(facts.scratchRgbaBytes, null);
});

function rendererDisposeHarness(source, failureStage) {
  const calls = [], failure = new Error('same native failure'), observedSource = source.includes('__d2ResourceFacts()');
  const step = name => { calls.push(name); if (failureStage === name) throw failure; };
  const product = vm.runInNewContext(compile(`
    let disposed=false,kind='points',quad=[1],uploadedQuads=new WeakMap();
    let d2DisposeAttempts=0,d2DisposeReturned=0,d2DisposeThrew=0;
    const programs=[{program:{}}],buffers=[{}],colors=new Map();
    const ${declaration(source, 'dispose')};
    ({ dispose, ${observedSource ? method(source, '__d2ResourceFacts') : ''} });
  `, ts.ModuleKind.None), { vertices: { release: () => step('vertices') },
    contributions: { dispose: () => step('contributions'), __d2ResourceFacts: () => ({ fixture: true }) },
    textures: { dispose: () => step('textures'), __d2ResourceFacts: () => ({ fixture: true }) },
    gl: { getParameter: () => { step('getParameter'); return null; }, useProgram: () => step('useProgram'),
      deleteBuffer: () => step('buffer'), deleteProgram: () => step('program') } });
  return { product, calls, failure };
}
test('renderer disposal preserves original call order, thrown identity and original second-call guard', () => {
  for (const fail of [undefined, 'contributions', 'textures', 'getParameter', 'buffer']) {
    const h = rendererDisposeHarness(observed.renderer, fail), base = rendererDisposeHarness(renderer, fail);
    if (fail) { assert.throws(() => h.product.dispose(), error => error === h.failure); assert.throws(() => base.product.dispose(), error => error === base.failure); }
    else { h.product.dispose(); base.product.dispose(); }
    assert.deepEqual(h.calls, base.calls);
    const facts = plain(h.product.__d2ResourceFacts()); scalarTree(facts);
    assert.equal(facts.disposed, true); assert.equal(facts.disposeAttempts, 1); assert.equal(facts.disposeReturned, fail ? 0 : 1); assert.equal(facts.disposeThrew, fail ? 1 : 0);
    h.product.dispose(); base.product.dispose(); assert.deepEqual(h.calls, base.calls); assert.equal(h.product.__d2ResourceFacts().disposeAttempts, 1);
  }
});
