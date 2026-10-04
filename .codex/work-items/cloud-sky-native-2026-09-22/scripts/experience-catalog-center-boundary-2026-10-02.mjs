import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const task = '.codex/work-items/cloud-sky-native-2026-09-22';
const out = path.join(root, 'output/catalog-center-boundary-1002-r2');
await mkdir(out); // Exclusive generation; never rewrite a prior result.
const hash = data => createHash('sha256').update(data).digest('hex');
const files = [
  `${task}/scripts/experience-catalog-center-boundary-2026-10-02.mjs`,
  'packages/miniapp-contracts/src/types.ts', 'packages/miniapp-contracts/src/sky-scene.ts',
  'packages/miniapp-contracts/src/sky-scene.test.ts', 'packages/miniapp-contracts/src/index.ts',
  'workers/miniapp-api/src/deep-sky-scene-provider.ts',
  'workers/miniapp-api/src/deep-sky-scene-provider.test.ts',
  'packages/astronomy-core/src/deep-sky-catalog.ts',
  'packages/astronomy-core/src/deep-sky-catalog-data.ts',
  'tools/run-node.cjs', 'packages/miniapp-contracts/tsconfig.json',
  'workers/miniapp-api/tsconfig.json',
  'packages/miniapp-contracts/node_modules/typescript/lib/tsc.js',
  'workers/miniapp-api/node_modules/typescript/lib/tsc.js',
];
async function bindings() {
  return Promise.all(files.map(async file => {
    const bytes = await readFile(path.join(root, file));
    return { path: file, bytes: bytes.length, sha256: hash(bytes) };
  }));
}
const before = await bindings();
await writeFile(path.join(out, 'inputs-before.json'), JSON.stringify(before, null, 2));
const provider = await readFile(path.join(root, files[5]), 'utf8');
const removed = '      icrsCenter: { raDeg: row.raDeg, decDeg: row.decDeg },';
if (provider.split(removed).length !== 2) throw new Error('center mutation guard');
const probe = path.join(out, 'mutant');
await mkdir(probe);
await writeFile(path.join(probe, 'deep-sky-scene-provider.ts'), provider.replace(removed, ''));
await writeFile(path.join(probe, 'deep-sky-scene-provider.test.ts'), await readFile(path.join(root, files[6])));
const providerConfig = path.join(out, 'changed-provider.tsconfig.json');
await writeFile(providerConfig, JSON.stringify({
  extends: '../../workers/miniapp-api/tsconfig.json',
  include: [path.join(root, files[5]), path.join(root, files[6])],
}, null, 2));

function run(id, cwd, args) {
  return new Promise(resolve => {
    const started = Date.now();
    const child = spawn(process.execPath, [path.join(root, 'tools/run-node.cjs'), ...args],
      { cwd: path.join(root, cwd), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    child.stdout.on('data', bytes => chunks.push(bytes));
    child.stderr.on('data', bytes => chunks.push(bytes));
    child.on('error', error => chunks.push(Buffer.from(String(error))));
    child.on('close', async (code, signal) => {
      const bytes = Buffer.concat(chunks);
      await writeFile(path.join(out, `${id}.log`), bytes);
      resolve({ id, cwd, args, code, signal, elapsedMs: Date.now() - started,
        log: `${id}.log`, bytes: bytes.length, sha256: hash(bytes) });
    });
  });
}
const checks = await Promise.all([
  run('contract', 'packages/miniapp-contracts', ['--import', 'tsx', '--test', 'src/sky-scene.test.ts']),
  run('provider', 'workers/miniapp-api', ['--import', 'tsx', '--test', 'src/deep-sky-scene-provider.test.ts']),
  run('contract-typecheck', 'packages/miniapp-contracts', ['./node_modules/typescript/lib/tsc.js', '--noEmit', '-p', 'tsconfig.json']),
  run('provider-typecheck', 'workers/miniapp-api', ['./node_modules/typescript/lib/tsc.js', '--noEmit', '-p', 'tsconfig.json']),
  run('changed-provider-typecheck', 'workers/miniapp-api', ['./node_modules/typescript/lib/tsc.js', '--noEmit', '-p', providerConfig]),
]);
await writeFile(path.join(out, 'checks.json'), JSON.stringify(checks, null, 2));
const mutant = await run('missing-center-mutant', '.', ['--import', 'tsx', '--test',
  path.relative(root, path.join(probe, 'deep-sky-scene-provider.test.ts'))]);
const mutantLog = await readFile(path.join(out, mutant.log), 'utf8');
const detection = mutant.code !== 0 && mutantLog.includes('report carries exact catalog centers') &&
  mutantLog.includes('undefined') && mutantLog.includes('raDeg');
await writeFile(path.join(out, 'mutant-check.json'), JSON.stringify({ mutant, detection }, null, 2));
const { buildDeepSkyScene, deepSkySceneCacheKey } = await import(pathToFileURL(path.join(root, files[5])).href);
const scene = buildDeepSkyScene(['2026-09-30T20:00:00.000Z'], {
  wgs84: { latitude: 22.4826799, longitude: 114.5557147, system: 'WGS84' }, altitudeM: 0,
});
if (scene.state !== 'AVAILABLE') throw new Error('actual catalog unavailable');
const entries = scene.catalog.entries;
const legacyEntries = entries.map(({ icrsCenter, ...entry }) => entry);
const after = await bindings();
await writeFile(path.join(out, 'inputs-after.json'), JSON.stringify(after, null, 2));
const stable = JSON.stringify(before) === JSON.stringify(after);
const changedBoundaryPass = checks.filter(check => check.id !== 'provider-typecheck').every(check => check.code === 0) && detection && stable;
const result = {
  scope: 'Source/contract/server-cache development only. No native, pixels, readability, traffic capacity or scientific mask acceptance.',
  toolchain: { node: process.version, executable: process.execPath }, checks, mutant, detection, stable,
  catalog: { hash: scene.catalog.catalogHash, count: entries.length,
    missingMinor: entries.filter(entry => entry.minorAxisArcmin === null).length,
    missingPa: entries.filter(entry => entry.positionAngleDeg === null).length,
    completeAxesPa: entries.filter(entry => entry.majorAxisArcmin !== null && entry.minorAxisArcmin !== null && entry.positionAngleDeg !== null).length,
    entryBytesBefore: Buffer.byteLength(JSON.stringify(legacyEntries)), entryBytesAfter: Buffer.byteLength(JSON.stringify(entries)),
    cacheKey: deepSkySceneCacheKey(), m51: entries.find(entry => entry.objectRef === 'M:51') },
  changedBoundaryPass,
  fullWorkerTypecheckPass: checks.find(check => check.id === 'provider-typecheck').code === 0,
  pass: checks.every(check => check.code === 0) && detection && stable,
};
await writeFile(path.join(out, 'result.json'), JSON.stringify(result, null, 2));
process.stdout.write(JSON.stringify(result));
if (!result.pass) process.exitCode = 1;
