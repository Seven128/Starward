// Qualify independently executed observations, without rerunning behavior.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = process.cwd(), base = 'output/sdss-registration-retirement-independent-closure-1002-r1';
const output = 'output/sdss-registration-retirement-root-readback-1002-r1';
await fs.mkdir(output);
const read = file => fs.readFile(path.resolve(root, file));
const json = async file => JSON.parse(await read(file));
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(sha(await read(base + '/result.json')), '29efe6bac942256e3f3745dbda04386ac2768ef1c25e34647f9ab16bd4f8fdfb');
assert.equal(sha(await read(base + '/closure-binding.json')), '5c2a4b62b2baa5d8e9b76ea458330c21d134eee702b9b24d053fa6eaf2160066');
const result = await json(base + '/result.json'), binding = await json(base + '/closure-binding.json');
assert.deepEqual(binding.inputsBefore, binding.inputsAfter);
for (const input of binding.inputsBefore) {
  const bytes = await read(input.path);
  assert.equal(bytes.length, input.bytes, input.path);
  assert.equal(sha(bytes), input.sha256, input.path);
}
assert(result.frozenSixSourceBindingsCurrent && result.unrelatedSixPreserved && result.originalManifestCurrent);
const rawBase = result.closureOfActualBehavior;
const geometry = await json(rawBase + 'geometry-observations.json');
const computed = geometry.observations.map(row => Math.hypot(row.actual[0] - row.expected[0], row.actual[1] - row.expected[1]) * 512);
assert.equal(computed.length, 108);
assert(computed.every(error => error < 1e-6));
const page = await json(rawBase + 'page-retirement-observations.json');
assert(page.usesActualPageAst && page.usesActualNativeLifetimeRegistry && page.fullReactNativeNotExecuted);
const observed = name => page.observations.find(row => row.name === name).value;
const before = observed('actual frozen before source under same retired handles');
const after = observed('both actual handles retired before queued envelope replacement');
assert.equal(before.status, 'CREDIT'); assert.equal(before.recovery, true); assert.equal(before.cueImagePainted, true);
assert.equal(after.status, 'NONE'); assert.equal(after.recovery, false); assert.equal(after.cueImagePainted, false);
assert.deepEqual(before.informationBinding, {}); assert.deepEqual(after.informationBinding, {});
const independentW3 = observed('independently live W3 survives optical retirement');
assert(!independentW3.optical && independentW3.infrared && independentW3.cueImagePainted);
assert.equal(observed('retry state under retired optical').status, 'RETRY');
assert.equal(observed('loading state under retired optical').status, 'LOADING');
const mutation = await json(rawBase + 'normalization-mutations.json');
assert.equal(mutation.scienceMutantRejectedAtQualificationTolerance, false);
const wide = await json(base + '/controlled-wide-observations.json');
assert(wide.originalManifestUntouched && wide.noSourceCoverageOrAdoptionClaim);
assert(wide.scienceNormalizeMutantRejectedAtOriginalTolerance);
assert(wide.observations.every(row => row.pixelError < wide.originalTolerancePixels));
assert(wide.observations.some(row => row.mutantPixelError > wide.originalTolerancePixels));
const receipt = { status: 'ROOT_GEOMETRY_AND_RETIREMENT_READBACK_DEVELOPMENT_CLOSED',
  boundInputsCurrent: binding.inputsBefore.length, recomputedGeometryMaxPixelError: Math.max(...computed),
  actualBefore: before, actualAfter: after, independentW3, tinyScienceMutantNotKilled: true,
  controlledWideMutantKilled: true, sourceAndNativeNotAdopted: true,
  scope: 'Frozen CPU published-TAN and complete page AST/controlled native-registry observations. No new behavior/GPU/native/source processing.' };
await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, status: receipt.status, bindings: receipt.boundInputsCurrent,
  maxPixelError: receipt.recomputedGeometryMaxPixelError }));
