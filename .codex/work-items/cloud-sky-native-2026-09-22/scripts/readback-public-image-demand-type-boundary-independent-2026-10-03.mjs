import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const input = path.join(root, 'output/public-image-demand-type-boundary-probe-1003-r1');
const output = path.join(root, 'output/public-image-demand-type-boundary-independent-1003-r1');
await fs.mkdir(output);
const sha = value => createHash('sha256').update(value).digest('hex');
const bindings = [];
async function read(absolute) {
  const bytes = await fs.readFile(absolute);
  bindings.push({ path: path.relative(root, absolute).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) });
  return bytes;
}
const originalResult = JSON.parse(await read(path.join(input, 'result.json')));
const before = JSON.parse(await read(path.join(input, 'inputs-before.json')));
const after = JSON.parse(await read(path.join(input, 'inputs-after.json')));
assert.deepEqual(before, after);
assert.equal(before.length, 1733);
const current = {}, candidates = {};
for (const row of originalResult.candidateOriginalSourceBindings) {
  const name = path.basename(row.path);
  const bytes = await read(path.join(root, row.path));
  current[name] = bytes.toString('utf8');
  await fs.writeFile(path.join(output, name + '.observed-source.txt'), bytes, { flag: 'wx' });
  const candidate = await read(path.join(input, name + '.candidate.txt'));
  candidates[name] = candidate.toString('utf8');
}
const runtime = current['sky-public-image-runtime.ts'];
const exactInterface = /export interface SkyPublicImageDemand \{\s*isCurrent\(\): boolean;\s*onRetire\(handler: \(\) => void\): \(\) => void;\s*release\(\): void;\s*\}/.exec(runtime)?.[0];
const originalMatch = originalResult.candidateOriginalSourceBindings.every(row => {
  const binding = bindings.find(bound => bound.path === row.path);
  return binding?.sha256 === row.sha256 && binding?.bytes === row.bytes;
});
let exactCandidateConstruction = null;
if (originalMatch) {
  assert(exactInterface);
  assert.equal(candidates['sky-public-image-cache.ts'], current['sky-public-image-cache.ts'] + '\n' + exactInterface + '\n');
  assert.equal(candidates['sky-public-image-runtime.ts'],
    'import type { SkyPublicImageDemand } from "./sky-public-image-cache";\nexport type { SkyPublicImageDemand } from "./sky-public-image-cache";\n' + runtime.replace(exactInterface, ''));
  assert.equal(candidates['deep-sky-image-request.ts'], current['deep-sky-image-request.ts'].replace(
    'import type { SkyPublicImageDemand } from "../../services/sky-public-image-runtime";',
    'import type { SkyPublicImageDemand } from "../../services/sky-public-image-cache";'));
  exactCandidateConstruction = true;
} else {
  // Root may have adopted the reviewed type-only patch after our initial read.
  assert.equal(candidates['sky-public-image-cache.ts'], current['sky-public-image-cache.ts']);
  assert.equal(candidates['sky-public-image-runtime.ts'], current['sky-public-image-runtime.ts']);
  assert.equal(candidates['deep-sky-image-request.ts'], current['deep-sky-image-request.ts']);
}
assert.equal(originalResult.originalDiagnostics.length, 7);
assert.deepEqual(originalResult.candidateDiagnostics, []);
assert(originalResult.emittedJavaScript.every(row => row.identicalJavaScript && row.originalJsSha256 === row.candidateJsSha256));
const result = {
  status: 'READONLY_SOURCE_BOUNDARY_NO_ADOPTION_BLOCKER', originalMatch, exactCandidateConstruction,
  candidateMatchesAlreadyAdoptedCurrent: !originalMatch, originalInventoryBeforeAfterEqual: true, originalInventoryEntries: before.length,
  findings: [
    'The exact three-method interface has one definition in the existing platform-free cache contract; runtime type-import and type-re-export retain compatibility.',
    'Deep-sky request depends on the portable contract. Runtime value consumers remain runtime consumers; no cancellation, epoch, lease or byte behavior was changed.',
    'Seven original worker diagnostics and zero candidate diagnostics are actual saved compiler observations, not rerun or suppression. The removed platform import also removes platform ambient timer contamination.',
    'Three saved emitted-JS digests match within their declared ESNext/ES2022 removeComments transpile scope; this is not a complete build or runtime claim.'
  ],
  limits: [
    'This readback performed no compiler/test/GPU/network invocation and did not edit production.',
    'The original 1733 inventory records source files and listed tool identities; it omits the Node executable and is not a complete vendor/runtime reproduction certificate.',
    'Real changed-source type checking belongs to the implementation owner; old seven-error source state is not retroactively upgraded.'
  ], bindings
};
await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: path.relative(root, output), resultSha256: sha(await fs.readFile(path.join(output, 'result.json'))), originalMatch, exactCandidateConstruction }));
