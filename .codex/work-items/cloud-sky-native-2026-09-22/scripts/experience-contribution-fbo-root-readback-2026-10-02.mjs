// Read frozen facts only: no GPU/browser, source processing or production edit.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = process.cwd(), output = 'output/contribution-fbo-root-readback-1002-r1';
await fs.mkdir(output); // exclusive generation
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = async file => {
  const absolute = path.resolve(root, file), relative = path.relative(root, absolute);
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  return fs.readFile(absolute);
};
const json = async file => JSON.parse(await read(file));
const qualify = async binding => {
  const bytes = await read(binding.path);
  assert.equal(bytes.length, binding.bytes, binding.path);
  assert.equal(sha(bytes), binding.sha256, binding.path);
};
const sourceResult = 'output/playwright/cloud-sky-contribution-fbo-1002-r1/result.json';
assert.equal(sha(await read(sourceResult)), '8ebb2321834b493646eac022b1c6c2df9b7c1fccfd6283ab85a68bc81334f014');
const actual = await json(sourceResult);
assert.deepEqual(actual.before, actual.after);
const currentExceptions = [];
for (const binding of actual.before) {
  if (binding.path.endsWith('/sky-artwork-registration.ts')) {
    assert.equal(binding.sha256, '85e16452de821088531ee9f19a4bfe6f791f6da26818ead6f3d53fd8e23c2513');
    const current = sha(await read(binding.path));
    assert.equal(current, '85f9843fb004260360cb06f047b49f403cdb49fde0a97c367cdea7f63b718b89');
    currentExceptions.push({ path: binding.path, historical: binding.sha256, current,
      meaning: 'Separate authorized raw-plane extension after trial sealed; not replayed or validated by trial' });
  } else await qualify(binding);
}
await qualify(actual.actualRaw);
const raw = await json(actual.actualRaw.path);
for (const capture of actual.captures) {
  await qualify(capture.raw);
  if (capture.pngFile) await qualify(capture.pngFile);
}
const signal = async stage => read(actual.captures.find(c => c.name === stage).raw.path);
const maxima = bytes => {
  const values = [0, 0, 0, 0];
  bytes.forEach((value, i) => values[i % 4] = Math.max(values[i % 4], value));
  return values;
};
const group = await signal('real-pair.group.signal'), additive = await signal('real-pair.additive.signal');
assert.deepEqual(group, additive);
const finished = await signal('real-pair.finished.signal'), terrain = await signal('real-pair.terrain.signal');
let clearedPositivePhotoBytes = 0;
for (let i = 0; i < finished.length; i++) {
  const row = Math.floor(i / (96 * 4)), photo = i % 4 < 2;
  if (row >= 120 && photo) {
    assert.equal(finished[i], 0);
    if (terrain[i] > 0) clearedPositivePhotoBytes++;
  } else assert.equal(finished[i], terrain[i]);
}
assert.equal(clearedPositivePhotoBytes, 763);
const black = await signal('valid-black.finished.signal');
black.forEach((value, i) => assert.equal(value, i % 4 < 2 ? 0 : 255));
assert(raw.quantization.analyticRemaining > 0);
assert.equal(raw.quantization.after[0], 0);
assert.equal(raw.final.glError, 0);
assert.equal(raw.final.contextLost, false); // no context loss induced
assert.equal(raw.final.afterRendererDispose.logicalTextureBytes, 0);
Object.values(raw.final.afterRendererDispose.counts).forEach(value => assert.equal(value, 0));

const closurePath = 'output/contribution-fbo-independent-closure-1002-r1/result.json';
assert.equal(sha(await read(closurePath)), '45caa22367f7d835c0cd45ffb738bdd9ece47fd7113bc928d0cbf2d057e9582a');
const closure = await json(closurePath);
for (const binding of closure.inventory) await qualify(binding);
assert(closure.newRawPlaneNotValidated && closure.immutableOutputsUnchanged && closure.noNewGpuOrHttp);
const independent = await json(closure.result), numeric = await json(closure.diagnostic);
assert.equal(independent.status, 'INDEPENDENT_CONTRIBUTION_FBO_BOUNDED_READBACK_CLOSED_NOT_ADOPTED');
assert(numeric.sourceShaderGeneratorAndSavedFragmentExact);

const result = { status: 'ROOT_FROZEN_FBO_READBACK_CLOSED_NOT_ADOPTED',
  executionInputs: actual.before.length, currentExceptions, capturesQualified: actual.captures.length,
  independentArtifactsQualified: closure.inventory.length,
  groupMaxima: maxima(group), finishedMaxima: maxima(finished), clearedPositivePhotoBytes,
  fineBlackEligiblePhotoZero: true, mathematicalPositiveQuantizedZero: raw.quantization,
  final: raw.final, independentStatus: independent.status,
  scope: 'Readonly historical 96x128 trial qualification. No new GPU/normal scene/native/quality/performance or exact-zero certification.' };
await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, status: result.status, inputs: result.executionInputs,
  captures: result.capturesQualified, independentArtifacts: result.independentArtifactsQualified,
  currentExceptions: currentExceptions.length }));
