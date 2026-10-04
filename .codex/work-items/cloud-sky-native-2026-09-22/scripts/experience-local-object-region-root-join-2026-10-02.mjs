import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const out = 'output/local-object-region-root-join-1002-r1';
await mkdir(out);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const bind = async file => { const bytes = await readFile(file); return { path: file, bytes: bytes.length, sha256: hash(bytes) }; };
const bases = [
  ['center', 'output/catalog-center-boundary-1002-r2/inputs-before.json', 'output/catalog-center-boundary-1002-r2/inputs-after.json'],
  ['author-final', 'output/local-object-region-development-1002-r2/inputs-before.json', 'output/local-object-region-development-1002-r2/inputs-after.json'],
  ['production-cpu', 'output/local-object-region-production-1002-r1/inputs-before.json', 'output/local-object-region-production-1002-r1/inputs-after.json'],
  ['independent', 'output/catalog-region-independent-1002-r6/inputs-before.json', 'output/catalog-region-independent-1002-r6/inputs-after.json'],
  ['independent-final', 'output/catalog-region-independent-closure-1002-r2/inputs-before.json', 'output/catalog-region-independent-closure-1002-r2/inputs-after.json'],
];
const joins = [];
for (const [name, first, last] of bases) {
  const a = await json(first), b = await json(last);
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${name}: before/after differs`);
  const current = await Promise.all(a.map(async item => ({ expected: item, current: await bind(item.path) })));
  const mismatches = current.filter(row => row.expected.sha256 !== row.current.sha256 || row.expected.bytes !== row.current.bytes);
  if (mismatches.length) throw new Error(`${name}: current differs ${JSON.stringify(mismatches)}`);
  joins.push({ name, count: a.length, before: await bind(first), after: await bind(last), currentMatches: true });
}
const historic = await json('output/local-object-region-development-1002-r1/inputs-before.json');
const historicDiff = [];
for (const item of historic) {
  const current = await bind(item.path);
  if (item.sha256 !== current.sha256) historicDiff.push({ path: item.path, before: item.sha256, current: current.sha256 });
}
if (historicDiff.length !== 1 || historicDiff[0].path !== 'apps/wechat-miniapp/src/features/sky/sky-deep-sky-region.test.ts')
  throw new Error('historical author typing repair scope changed');
const results = {
  center: await json('output/catalog-center-boundary-1002-r2/result.json'),
  author: await json('output/local-object-region-development-1002-r2/check-results.json'),
  independent: await json('output/catalog-region-independent-1002-r6/result.json'),
  independentFinal: await json('output/catalog-region-independent-closure-1002-r2/result.json'),
};
if (!results.center.changedBoundaryPass || results.center.fullWorkerTypecheckPass ||
  results.author.status !== 'PASS_BOUNDED_REGION_DEVELOPMENT' || results.author.results.some(row => row.exit !== 0) ||
  results.independent.status !== 'PASS_BOUNDED_INDEPENDENT_CPU_RAW_REVIEW') throw new Error('actual result scope/status differs');
const behaviorLog = await readFile('output/local-object-region-development-1002-r1/checks.log', 'utf8');
if (!behaviorLog.includes('ℹ pass 75') || !behaviorLog.includes('ℹ fail 0')) throw new Error('actual consumer behavior log differs');
const rootChecks = results.center.checks;
if (rootChecks.find(row => row.id === 'provider-typecheck').code !== 2) throw new Error('full worker failed receipt differs');
const old = await readFile('output/local-object-region-development-1002-r1/prior-common-opacity-scene-e11.txt');
if (hash(old) !== 'e11b2bdbbb1cd419511f468830bfe203a45626be7fb3efd86e6dd13399447eca') throw new Error('historical Scene copy differs');
const preservedBase = await json('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json');
const preserved = await Promise.all(preservedBase.map(async item => { const current = await bind(item.path);
  if (current.sha256 !== item.sha256) throw new Error(`preserved changed: ${item.path}`); return current; }));
const sourceFiles = ['packages/miniapp-contracts/src/types.ts', 'packages/miniapp-contracts/src/sky-scene.ts',
  'workers/miniapp-api/src/deep-sky-scene-provider.ts', 'apps/wechat-miniapp/src/features/sky/sky-deep-sky-region.ts',
  'apps/wechat-miniapp/src/features/sky/sky-sdss-science-scene.ts', 'apps/wechat-miniapp/src/features/sky/sky-scene-render.ts',
  'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'];
const production = await Promise.all(sourceFiles.map(bind));
const docs = ['.codex/work-items/cloud-sky-native-2026-09-22/PLAN.md', '.codex/work-items/cloud-sky-native-2026-09-22/STATE.md',
  '.codex/work-items/cloud-sky-native-2026-09-22/INDEX.md', '.codex/work-items/cloud-sky-native-2026-09-22/HANDOFF-2026-10-01.md',
  '.codex/work-items/cloud-sky-native-2026-09-22/PROGRESS.md', 'project_context/architecture/runtime-and-domain.md',
  'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',
  '.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-catalog-center-contract-2026-10-02.md',
  '.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-local-object-region-development-2026-10-02.md',
  '.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-local-object-region-independent-review-2026-10-02.md',
  '.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-local-object-region-development-closure-2026-10-02.md',
  '.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-complete-resource-composition-preparation-2026-10-02.md'];
const docBindings = await Promise.all(docs.map(bind));
for (const file of docs.slice(0, 4)) {
  const text = await readFile(file, 'utf8');
  if (text.includes('当前依赖：先按真实目录') || !text.includes('当前依赖：依据既有参考和actual selected支持')) throw new Error(`current plan stale: ${file}`);
}
const reports = await Promise.all([
  'output/catalog-center-boundary-1002-r2/result.json', 'output/local-object-region-development-1002-r2/check-results.json',
  'output/local-object-region-production-1002-r1/result.json', 'output/catalog-region-independent-1002-r6/result.json',
  'output/catalog-region-independent-closure-1002-r2/result.json', 'output/complete-resource-scope-preparation-1002-r2/result.json',
].map(bind));
const result = { status: 'PASS_BOUNDED_GEOMETRY_SOURCE_AND_DOCUMENT_JOIN',
  branch: execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  joins, historicDiff, production, preserved, reports, docs: docBindings,
  limits: ['readonly join; not a new test/GPU execution', 'whole worker TypeScript remains FAILED; changed provider/contract/app checks passed',
    'region geometry is not local readability, spectral segmentation or conservative EMPTY boundary proof',
    'software GPU/native/quality/default/200DAU/final delivery not accepted', 'new full resource journey in preparation; no measured result yet'],
};
if (result.branch !== 'codex/remote-main-20260908' || result.head !== '72e65cf309d700cb7d40c5b7afd53660fd39fa35') throw new Error('workspace changed');
await writeFile(`${out}/result.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.status, joins: joins.map(row => ({ name: row.name, count: row.count })),
  production: production.length, preserved: preserved.length, docs: docBindings.length, result: await bind(`${out}/result.json`) }));
